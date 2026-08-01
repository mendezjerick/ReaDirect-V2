from __future__ import annotations

import json
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Callable

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from readirect_gpu_runtime import GpuCoordinator, InferenceCapacity, ServiceProcessGuard

from app.inference_queue import (
    InferenceQueue,
    InferenceQueueFull,
    InferenceQueueUnavailable,
    InferenceQueueWaitTimeout,
)
from app.mu import get_mu_transcriber

SERVICE_NAME = "ReaDirect ASR"
SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def _environment_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() not in {"0", "false", "no", "off"}

inference_queue = InferenceQueue(
    concurrency=int(os.getenv("ASR_INFERENCE_CONCURRENCY", "1")),
    max_waiting=int(os.getenv("ASR_QUEUE_MAX_WAITING", "8")),
    wait_timeout_seconds=float(os.getenv("ASR_QUEUE_WAIT_TIMEOUT_SECONDS", "90")),
    retry_after_seconds=int(os.getenv("ASR_QUEUE_RETRY_AFTER_SECONDS", "2")),
)
gpu_resource_key = os.getenv("READIRECT_GPU_RESOURCE_KEY", "cuda-default")
gpu_lock_directory = Path(
    os.getenv(
        "READIRECT_GPU_LOCK_DIRECTORY",
        str(REPOSITORY_ROOT / ".runtime" / "gpu-locks"),
    )
)
gpu_coordination_enabled = _environment_flag("READIRECT_GPU_COORDINATION_ENABLED", True) and (
    get_mu_transcriber().status()["device"] == "cuda"
)
gpu_coordinator = GpuCoordinator(
    service_name="asr",
    lock_directory=gpu_lock_directory,
    resource_key=gpu_resource_key,
    enabled=gpu_coordination_enabled,
    acquire_timeout_seconds=float(os.getenv("READIRECT_GPU_PERMIT_TIMEOUT_SECONDS", "150")),
)
gpu_process_guard = ServiceProcessGuard(
    service_name="asr",
    lock_directory=gpu_lock_directory,
    resource_key=gpu_resource_key,
    enabled=gpu_coordination_enabled,
)
_startup_capacity = InferenceCapacity(
    service_name="asr",
    concurrency=inference_queue.concurrency,
    max_waiting=inference_queue.max_waiting,
    queue_wait_timeout_seconds=inference_queue.wait_timeout_seconds,
    gpu_coordination_enabled=gpu_coordination_enabled,
    gpu_permit_timeout_seconds=gpu_coordinator.acquire_timeout_seconds,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    gpu_process_guard.acquire()
    try:
        await inference_queue.start()
        try:
            yield
        finally:
            await inference_queue.close()
    finally:
        gpu_process_guard.release()


app = FastAPI(title=SERVICE_NAME, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "ASR_CORS_ORIGINS",
            "http://127.0.0.1:8000,http://localhost:8000",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(ValueError)
async def handle_value_error(_: Request, error: ValueError):
    return JSONResponse(status_code=422, content={"detail": str(error)})


@app.exception_handler(RuntimeError)
async def handle_runtime_error(_: Request, error: RuntimeError):
    return JSONResponse(status_code=503, content={"detail": str(error)})


@app.get("/live")
def live() -> dict[str, str]:
    return {"status": "alive", "service": SERVICE_NAME}


@app.get("/ready")
async def ready() -> dict[str, object]:
    mu = get_mu_transcriber().status()
    queue = inference_queue.snapshot()
    gpu = _gpu_coordination_status()
    available = bool(mu["available"]) and bool(queue["healthy"])
    return {
        "status": "ready" if available else "not_ready",
        "service": SERVICE_NAME,
        "mu": mu,
        "inference_queue": queue,
        "gpu_coordination": gpu,
        "capacity": _capacity_status(queue, gpu),
    }


@app.get("/models/status")
async def model_status() -> dict[str, object]:
    queue = inference_queue.snapshot()
    gpu = _gpu_coordination_status()
    return {
        "mu": get_mu_transcriber().status(),
        "inference_queue": queue,
        "gpu_coordination": gpu,
        "capacity": _capacity_status(queue, gpu),
    }


@app.post("/mu/resolve-letter")
async def resolve_letter_with_mu(
    audio: Annotated[UploadFile, File()],
    expected_letter: Annotated[str, Form()],
    equivalences: Annotated[str, Form()] = "[]",
) -> dict[str, object]:
    try:
        reviewed_equivalences = json.loads(equivalences)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=422, detail="invalid_letter_equivalences") from error
    if not isinstance(reviewed_equivalences, list):
        raise HTTPException(status_code=422, detail="invalid_letter_equivalences")

    transcriber = get_mu_transcriber()
    path = await _store_upload(audio)
    return await _run_inference(
        operation="resolve_letter",
        path=path,
        work=lambda: transcriber.resolve_letter(
            path,
            expected_letter,
            reviewed_equivalences,
        ),
    )


@app.post("/mu/transcribe")
async def transcribe_mu(
    audio: Annotated[UploadFile, File()],
    expected_text: Annotated[str, Form()] = "",
    task_type: Annotated[str, Form()] = "word",
    noise_reduction_enabled: Annotated[bool, Form()] = False,
) -> dict[str, object]:
    transcriber = get_mu_transcriber()
    path = await _store_upload(audio)
    return await _run_inference(
        operation="transcribe",
        path=path,
        work=lambda: transcriber.transcribe(
            path,
            expected_text,
            task_type,
            noise_reduction_enabled=noise_reduction_enabled,
        ),
    )


async def _run_inference(
    *,
    operation: str,
    path: Path,
    work: Callable[[], dict[str, object]],
) -> dict[str, object]:
    def coordinated_work() -> dict[str, object]:
        gpu_outcome = gpu_coordinator.run(operation, work)
        performance = gpu_outcome.value.setdefault("performance", {})
        if isinstance(performance, dict):
            performance["gpu_wait_seconds"] = round(gpu_outcome.wait_seconds, 4)
        return gpu_outcome.value

    try:
        outcome = await inference_queue.submit(
            operation,
            coordinated_work,
            cleanup=lambda: path.unlink(missing_ok=True),
        )
    except (InferenceQueueFull, InferenceQueueWaitTimeout, InferenceQueueUnavailable) as error:
        raise HTTPException(
            status_code=503,
            detail=error.code,
            headers={"Retry-After": str(inference_queue.retry_after_seconds)},
        ) from error

    performance = outcome.value.setdefault("performance", {})
    if isinstance(performance, dict):
        performance["queue_wait_seconds"] = round(outcome.queue_wait_seconds, 4)
    return outcome.value


def _gpu_coordination_status() -> dict[str, object]:
    return {
        **gpu_coordinator.snapshot(),
        "process_guard": gpu_process_guard.snapshot(),
    }


def _capacity_status(
    queue: dict[str, object],
    gpu: dict[str, object],
) -> dict[str, object]:
    return InferenceCapacity(
        service_name="asr",
        concurrency=inference_queue.concurrency,
        max_waiting=inference_queue.max_waiting,
        queue_wait_timeout_seconds=inference_queue.wait_timeout_seconds,
        gpu_coordination_enabled=gpu_coordinator.enabled,
        gpu_permit_timeout_seconds=gpu_coordinator.acquire_timeout_seconds,
    ).snapshot(queue, gpu)


async def _store_upload(audio: UploadFile) -> Path:
    suffix = Path(audio.filename or "recording.webm").suffix.lower()
    if suffix not in ALLOWED_AUDIO_EXTENSIONS:
        await audio.close()
        raise HTTPException(status_code=422, detail="Unsupported audio format.")

    contents = await audio.read(MAX_UPLOAD_BYTES + 1)
    await audio.close()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Audio exceeds the 25 MB limit.")

    descriptor, name = tempfile.mkstemp(prefix="readirect-asr-", suffix=suffix)
    with os.fdopen(descriptor, "wb") as stream:
        stream.write(contents)
    return Path(name)
