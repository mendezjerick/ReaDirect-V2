from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import os
import re
import threading
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Generic, Literal, TypeVar

import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator
from readirect_gpu_runtime import GpuCoordinator, InferenceCapacity, ServiceProcessGuard

from inference_queue import (
    InferenceQueue,
    InferenceQueueFull,
    InferenceQueueUnavailable,
    InferenceQueueWaitTimeout,
)

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
MODEL_PATH = SERVICE_ROOT / ".cache/models/openbmb--VoxCPM2"
CACHE_PATH = SERVICE_ROOT / "storage/cache"
REFERENCE_CACHE_PATH = SERVICE_ROOT / "storage/reference-cache"
REFERENCE_ROOT = REPOSITORY_ROOT / "assets/audio/voice-references/sh"
REFERENCE_TARGET_PEAK_DBFS = -6.0
REFERENCE_TARGET_PEAK = 10 ** (REFERENCE_TARGET_PEAK_DBFS / 20)
REFERENCE_CONDITIONING_VERSION = "mono-peak-minus-6db-v1"
STARTUP_WARMUP_ENABLED = os.getenv("READIRECT_TTS_STARTUP_WARMUP", "1") not in {
    "0",
    "false",
    "False",
}
PROFILE_PROBE_TEXT = "Ma'am Clara is ready to help."
MAX_HTTP_REQUEST_BYTES = int(os.getenv("TTS_MAX_HTTP_REQUEST_BYTES", "16384"))
SERVICE_TOKEN = os.getenv("TTS_SERVICE_TOKEN", "").strip()
SERVICE_TOKEN_CONFIGURED = len(SERVICE_TOKEN) >= 32
PUBLIC_PATHS = frozenset({"/health"})

REFERENCE_FILES = {
    "introduce": REFERENCE_ROOT / "introduce.wav",
    "instruction": REFERENCE_ROOT / "instruction.wav",
    "question": REFERENCE_ROOT / "question.wav",
    "result": REFERENCE_ROOT / "result.wav",
}

logger = logging.getLogger("readirect.tts")
QueueResult = TypeVar("QueueResult")

ReferenceProfile = Literal[
    "introduce",
    "instruction",
    "question",
    "result",
]


class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    reference: ReferenceProfile

    @field_validator("text")
    @classmethod
    def text_must_use_stable_vox_punctuation(cls, text: str) -> str:
        normalized = re.sub(r"!+", ".", text).strip()

        if not normalized:
            raise ValueError("text cannot be empty")

        return normalized


class WarmupRequest(BaseModel):
    profiles: list[ReferenceProfile] = Field(default_factory=list, max_length=4)

    @field_validator("profiles")
    @classmethod
    def profiles_must_be_unique(
        cls,
        profiles: list[ReferenceProfile],
    ) -> list[ReferenceProfile]:
        if len(profiles) != len(set(profiles)):
            raise ValueError("profiles cannot contain duplicates")

        return profiles


@dataclass(frozen=True)
class PreparedProfile:
    fingerprint: str
    prompt_cache: dict[str, Any]


@dataclass(frozen=True)
class CoordinatedInferenceOutcome(Generic[QueueResult]):
    value: QueueResult
    queue_wait_seconds: float
    gpu_wait_seconds: float


class VoxRuntime:
    """Own the single process-wide VoxCPM model and serialize generation."""

    def __init__(self) -> None:
        self._model: Any | None = None
        self._device: str | None = None
        self._load_lock = threading.Lock()
        self._generation_lock = threading.Lock()
        self._state_lock = threading.Lock()
        self._model_warming = False
        self._model_error: str | None = None
        self._prepared_profiles: dict[str, PreparedProfile] = {}
        self._profile_events: dict[str, threading.Event] = {}
        self._profile_errors: dict[str, str] = {}

    @property
    def ready(self) -> bool:
        return self.model_ready

    @property
    def model_ready(self) -> bool:
        with self._state_lock:
            return self._model is not None

    @property
    def device(self) -> str | None:
        with self._state_lock:
            return self._device

    def warmup_model(self) -> None:
        if self._model is not None:
            return

        with self._load_lock:
            if self._model is not None:
                return

            with self._state_lock:
                self._model_warming = True
                self._model_error = None

            try:
                model, device = self._load_model()
            except Exception as error:
                with self._state_lock:
                    self._model_error = str(error)
                raise
            else:
                with self._state_lock:
                    self._model = model
                    self._device = device
                logger.info("VoxCPM2 is ready on %s", device)
            finally:
                with self._state_lock:
                    self._model_warming = False

    def warmup(self) -> None:
        """Backward-compatible model-only warm-up."""

        self.warmup_model()

    def prepare_profiles(self, profiles: list[ReferenceProfile]) -> None:
        self.warmup_model()

        for profile in profiles:
            self._prepare_profile(profile)

    def synthesize(
        self,
        text: str,
        profile: ReferenceProfile,
        output_path: Path,
    ) -> None:
        self.prepare_profiles([profile])

        with self._generation_lock:
            if output_path.is_file():
                return

            prepared = self._prepared_profile(profile)
            waveform = self._generate_with_prompt_cache(
                text,
                prepared.prompt_cache,
                retry_badcase=True,
            )
            sample_rate = int(self._model.tts_model.sample_rate)
            temporary_path = output_path.with_suffix(".tmp.wav")
            sf.write(temporary_path, waveform, sample_rate, subtype="PCM_16")
            os.replace(temporary_path, output_path)

    def state(self) -> dict[str, Any]:
        stale_profiles: list[str] = []

        with self._state_lock:
            prepared_profiles = dict(self._prepared_profiles)

        for profile, prepared in prepared_profiles.items():
            reference_path = REFERENCE_FILES.get(profile)

            try:
                current_fingerprint = reference_fingerprint(reference_path)
            except (FileNotFoundError, OSError):
                stale_profiles.append(profile)
                continue

            if current_fingerprint != prepared.fingerprint:
                stale_profiles.append(profile)

        if stale_profiles:
            with self._state_lock:
                for profile in stale_profiles:
                    self._prepared_profiles.pop(profile, None)

        with self._state_lock:
            profiles_ready = sorted(self._prepared_profiles)
            profiles_warming = sorted(self._profile_events)

            return {
                "model_ready": self._model is not None,
                "device": self._device,
                "warming": self._model_warming or profiles_warming != [],
                "profiles_ready": profiles_ready,
                "profiles_warming": profiles_warming,
                "profiles_failed": sorted(self._profile_errors),
                "model_error": self._model_error,
            }

    def _load_model(self) -> tuple[Any, str]:
        if not MODEL_PATH.is_dir():
            raise FileNotFoundError(f"VoxCPM2 model is missing: {MODEL_PATH}")

        from voxcpm import VoxCPM

        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info("Loading VoxCPM2 on %s", device)
        model = VoxCPM.from_pretrained(
            str(MODEL_PATH),
            local_files_only=True,
            load_denoiser=False,
            optimize=device == "cuda",
            device=device,
        )

        return model, device

    def _prepare_profile(self, profile: ReferenceProfile) -> None:
        reference_path = REFERENCE_FILES[profile]
        fingerprint = reference_fingerprint(reference_path)
        owner = False

        with self._state_lock:
            prepared = self._prepared_profiles.get(profile)

            if prepared is not None and prepared.fingerprint == fingerprint:
                return

            event = self._profile_events.get(profile)

            if event is None:
                event = threading.Event()
                self._profile_events[profile] = event
                self._profile_errors.pop(profile, None)
                owner = True

        if not owner:
            event.wait()

            with self._state_lock:
                prepared = self._prepared_profiles.get(profile)
                error = self._profile_errors.get(profile)

            if prepared is not None and prepared.fingerprint == fingerprint:
                return

            raise RuntimeError(error or f"VoxCPM2 profile {profile} did not become ready.")

        try:
            conditioned_reference = condition_reference(reference_path)

            with self._generation_lock:
                prompt_cache = self._model.tts_model.build_prompt_cache(
                    reference_wav_path=str(conditioned_reference),
                )
                self._generate_with_prompt_cache(
                    PROFILE_PROBE_TEXT,
                    prompt_cache,
                    retry_badcase=True,
                )

            with self._state_lock:
                self._prepared_profiles[profile] = PreparedProfile(
                    fingerprint=fingerprint,
                    prompt_cache=prompt_cache,
                )
                self._profile_errors.pop(profile, None)
            logger.info("VoxCPM2 reference profile %s is ready", profile)
        except Exception as error:
            with self._state_lock:
                self._prepared_profiles.pop(profile, None)
                self._profile_errors[profile] = str(error)
            raise
        finally:
            with self._state_lock:
                completed_event = self._profile_events.pop(profile, event)
                completed_event.set()

    def _prepared_profile(self, profile: ReferenceProfile) -> PreparedProfile:
        with self._state_lock:
            prepared = self._prepared_profiles.get(profile)

        if prepared is None:
            raise RuntimeError(f"VoxCPM2 reference profile {profile} is not ready.")

        return prepared

    def _generate_with_prompt_cache(
        self,
        text: str,
        prompt_cache: dict[str, Any],
        *,
        retry_badcase: bool,
    ) -> np.ndarray:
        normalized_text = text.replace("\n", " ").strip()

        if self._model.text_normalizer is None:
            from voxcpm.utils.text_normalize import TextNormalizer

            self._model.text_normalizer = TextNormalizer()

        normalized_text = self._model.text_normalizer.normalize(normalized_text)
        result = self._model.tts_model.generate_with_prompt_cache(
            target_text=normalized_text,
            prompt_cache=prompt_cache,
            min_len=2,
            max_len=4096,
            inference_timesteps=10,
            cfg_value=2.0,
            retry_badcase=retry_badcase,
            retry_badcase_max_times=3 if retry_badcase else 0,
            retry_badcase_ratio_threshold=6.0,
        )
        waveform = result[0]

        if hasattr(waveform, "detach"):
            waveform = waveform.detach()
        if hasattr(waveform, "cpu"):
            waveform = waveform.cpu()
        if hasattr(waveform, "numpy"):
            waveform = waveform.numpy()

        audio = np.asarray(waveform, dtype=np.float32).squeeze()

        if audio.size == 0 or not np.isfinite(audio).all():
            raise RuntimeError("VoxCPM2 returned invalid audio.")

        return audio


runtime = VoxRuntime()
inference_queue = InferenceQueue(
    max_waiting=int(os.getenv("TTS_QUEUE_MAX_WAITING", "4")),
    wait_timeout_seconds=float(os.getenv("TTS_QUEUE_WAIT_TIMEOUT_SECONDS", "60")),
    retry_after_seconds=int(os.getenv("TTS_QUEUE_RETRY_AFTER_SECONDS", "2")),
)
gpu_resource_key = os.getenv("READIRECT_GPU_RESOURCE_KEY", "cuda-default")
gpu_lock_directory = Path(
    os.getenv(
        "READIRECT_GPU_LOCK_DIRECTORY",
        str(REPOSITORY_ROOT / ".runtime" / "gpu-locks"),
    )
)
gpu_coordination_enabled = (
    os.getenv("READIRECT_GPU_COORDINATION_ENABLED", "true").strip().lower()
    not in {"0", "false", "no", "off"}
    and torch.cuda.is_available()
)
gpu_coordinator = GpuCoordinator(
    service_name="tts",
    lock_directory=gpu_lock_directory,
    resource_key=gpu_resource_key,
    enabled=gpu_coordination_enabled,
    acquire_timeout_seconds=float(os.getenv("READIRECT_GPU_PERMIT_TIMEOUT_SECONDS", "150")),
)
gpu_process_guard = ServiceProcessGuard(
    service_name="tts",
    lock_directory=gpu_lock_directory,
    resource_key=gpu_resource_key,
    enabled=gpu_coordination_enabled,
)
_startup_capacity = InferenceCapacity(
    service_name="tts",
    concurrency=1,
    max_waiting=inference_queue.max_waiting,
    queue_wait_timeout_seconds=inference_queue.wait_timeout_seconds,
    gpu_coordination_enabled=gpu_coordination_enabled,
    gpu_permit_timeout_seconds=gpu_coordinator.acquire_timeout_seconds,
)
reference_conditioning_lock = threading.Lock()


@asynccontextmanager
async def lifespan(_: FastAPI):
    CACHE_PATH.mkdir(parents=True, exist_ok=True)
    REFERENCE_CACHE_PATH.mkdir(parents=True, exist_ok=True)
    gpu_process_guard.acquire()
    try:
        await inference_queue.start()
        startup_task: asyncio.Task[None] | None = None

        if STARTUP_WARMUP_ENABLED:
            startup_task = asyncio.create_task(warm_model_at_startup())
            await asyncio.sleep(0)

        try:
            yield
        finally:
            await inference_queue.close()
            if startup_task is not None:
                await startup_task
    finally:
        gpu_process_guard.release()


app = FastAPI(title="ReaDirect TTS", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def enforce_service_boundary(request: Request, call_next):
    if request.url.path in PUBLIC_PATHS:
        return await call_next(request)

    if not SERVICE_TOKEN_CONFIGURED:
        return JSONResponse(status_code=503, content={"detail": "service_auth_not_configured"})

    scheme, separator, supplied_token = request.headers.get("authorization", "").partition(" ")
    if (
        separator == ""
        or scheme.lower() != "bearer"
        or not supplied_token
        or not hmac.compare_digest(supplied_token, SERVICE_TOKEN)
    ):
        return JSONResponse(
            status_code=401,
            content={"detail": "service_auth_required"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            parsed_content_length = int(content_length)
            if parsed_content_length < 0:
                return JSONResponse(status_code=400, content={"detail": "invalid_content_length"})
            if parsed_content_length > MAX_HTTP_REQUEST_BYTES:
                return JSONResponse(status_code=413, content={"detail": "request_too_large"})
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "invalid_content_length"})

    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_HTTP_REQUEST_BYTES:
            return JSONResponse(status_code=413, content={"detail": "request_too_large"})
    request._body = bytes(body)

    return await call_next(request)


def cache_path_for(request: SynthesisRequest, reference_path: Path) -> Path:
    reference_stat = reference_path.stat()
    cache_key = "|".join(
        [
            "voxcpm2",
            request.reference,
            request.text.strip(),
            str(reference_stat.st_size),
            str(reference_stat.st_mtime_ns),
            REFERENCE_CONDITIONING_VERSION,
            "cfg=2.0",
            "steps=10",
        ]
    )
    digest = hashlib.sha256(cache_key.encode("utf-8")).hexdigest()
    return CACHE_PATH / f"{digest}.wav"


def conditioned_reference_path(reference_path: Path) -> Path:
    reference_stat = reference_path.stat()
    fingerprint = "|".join(
        [
            str(reference_path.resolve()),
            str(reference_stat.st_size),
            str(reference_stat.st_mtime_ns),
            REFERENCE_CONDITIONING_VERSION,
        ]
    )
    digest = hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()[:16]
    return REFERENCE_CACHE_PATH / f"{reference_path.stem}-{digest}.wav"


def reference_fingerprint(reference_path: Path | None) -> str:
    if reference_path is None or not reference_path.is_file():
        raise FileNotFoundError(f"Clara reference audio is missing: {reference_path}")

    reference_stat = reference_path.stat()

    return "|".join(
        [
            str(reference_path.resolve()),
            str(reference_stat.st_size),
            str(reference_stat.st_mtime_ns),
            REFERENCE_CONDITIONING_VERSION,
        ]
    )


def condition_reference(reference_path: Path) -> Path:
    """Create a mono, non-boosted reference capped at -6 dBFS for VoxCPM."""

    output_path = conditioned_reference_path(reference_path)

    if output_path.is_file():
        return output_path

    with reference_conditioning_lock:
        if output_path.is_file():
            return output_path

        output_path.parent.mkdir(parents=True, exist_ok=True)

        audio, sample_rate = sf.read(
            reference_path,
            dtype="float32",
            always_2d=True,
        )

        if audio.size == 0 or not np.isfinite(audio).all():
            raise ValueError(f"Clara reference audio is invalid: {reference_path.name}")

        mono = np.mean(audio, axis=1, dtype=np.float32)
        peak = float(np.max(np.abs(mono)))

        if peak <= 0:
            raise ValueError(f"Clara reference audio is silent: {reference_path.name}")

        if peak > REFERENCE_TARGET_PEAK:
            mono *= REFERENCE_TARGET_PEAK / peak

        temporary_path = output_path.with_suffix(".tmp.wav")
        sf.write(temporary_path, mono, sample_rate, subtype="PCM_16")
        os.replace(temporary_path, output_path)

    return output_path


async def warm_model_at_startup() -> None:
    try:
        await run_coordinated_inference("startup_warmup", runtime.warmup_model)
    except Exception:
        logger.exception("VoxCPM2 startup warm-up failed")


async def submit_inference(
    operation: str,
    work: Callable[[], QueueResult],
) -> CoordinatedInferenceOutcome[QueueResult]:
    try:
        return await run_coordinated_inference(operation, work)
    except (InferenceQueueFull, InferenceQueueWaitTimeout, InferenceQueueUnavailable) as error:
        raise HTTPException(
            status_code=503,
            detail=error.code,
            headers={"Retry-After": str(inference_queue.retry_after_seconds)},
        ) from error


async def run_coordinated_inference(
    operation: str,
    work: Callable[[], QueueResult],
) -> CoordinatedInferenceOutcome[QueueResult]:
    queue_outcome = await inference_queue.submit(
        operation,
        lambda: gpu_coordinator.run(operation, work),
    )
    return CoordinatedInferenceOutcome(
        value=queue_outcome.value.value,
        queue_wait_seconds=queue_outcome.queue_wait_seconds,
        gpu_wait_seconds=queue_outcome.value.wait_seconds,
    )


@app.get("/health")
async def health() -> dict[str, Any]:
    state = runtime.state()
    queue = inference_queue.snapshot()
    ready = SERVICE_TOKEN_CONFIGURED and bool(queue["healthy"]) and bool(state["model_ready"])

    return {
        "service": "tts",
        "status": "ready" if ready else "not_ready",
        "runtime_ready": state["model_ready"],
    }


@app.get("/internal/status")
async def internal_status() -> dict[str, Any]:
    state = _sanitized_runtime_state()
    queue = inference_queue.snapshot()
    gpu = _gpu_coordination_status()
    ready = SERVICE_TOKEN_CONFIGURED and bool(queue["healthy"]) and bool(state["model_ready"])

    return {
        "service": "tts",
        "status": "ready" if ready else "not_ready",
        "runtime_ready": state["model_ready"],
        "service_auth_configured": SERVICE_TOKEN_CONFIGURED,
        **state,
        "inference_queue": queue,
        "gpu_coordination": gpu,
        "capacity": _capacity_status(queue, gpu),
    }


@app.post("/warmup")
async def warmup(request: WarmupRequest | None = None) -> dict[str, Any]:
    requested_profiles = request.profiles if request is not None else []
    state = runtime.state()
    warmup_required = (
        not inference_queue.snapshot()["healthy"]
        or not state["model_ready"]
        or any(profile not in state["profiles_ready"] for profile in requested_profiles)
    )

    if warmup_required:
        try:
            await submit_inference(
                "profile_warmup",
                lambda: runtime.prepare_profiles(requested_profiles),
            )
        except (OSError, RuntimeError, ValueError) as error:
            logger.exception("VoxCPM2 warm-up failed")
            raise HTTPException(status_code=503, detail="tts_unavailable") from error

    state = runtime.state()

    return {
        "ready": all(profile in state["profiles_ready"] for profile in requested_profiles),
        "device": state["device"],
        "profiles_ready": state["profiles_ready"],
    }


@app.post("/synthesize")
async def synthesize(request: SynthesisRequest) -> FileResponse:
    reference_path = REFERENCE_FILES[request.reference]

    if not reference_path.is_file():
        raise HTTPException(
            status_code=503,
            detail="tts_unavailable",
        )

    normalized_request = request.model_copy(update={"text": request.text.strip()})
    output_path = cache_path_for(normalized_request, reference_path)
    was_cached = output_path.is_file()
    state = runtime.state()
    profile_ready = request.reference in state["profiles_ready"]
    queue_wait_seconds = 0.0
    gpu_wait_seconds = 0.0

    try:
        # Warm-up is intentional even on a cache hit: this screen guarantees that
        # the live TTS runtime is resident before the learner enters an activity.
        if was_cached and profile_ready:
            pass
        elif was_cached:
            outcome = await submit_inference(
                "cached_profile_warmup",
                lambda: runtime.prepare_profiles([request.reference]),
            )
            queue_wait_seconds = outcome.queue_wait_seconds
            gpu_wait_seconds = outcome.gpu_wait_seconds
        else:
            outcome = await submit_inference(
                "synthesize",
                lambda: runtime.synthesize(
                    normalized_request.text,
                    normalized_request.reference,
                    output_path,
                ),
            )
            queue_wait_seconds = outcome.queue_wait_seconds
            gpu_wait_seconds = outcome.gpu_wait_seconds
    except (OSError, RuntimeError, ValueError) as error:
        logger.exception("Clara speech synthesis failed")
        raise HTTPException(status_code=503, detail="tts_unavailable") from error

    return FileResponse(
        output_path,
        media_type="audio/wav",
        filename="clara-speech.wav",
        headers={
            "Cache-Control": "no-store",
            "X-ReaDirect-TTS-Cache": "hit" if was_cached else "miss",
            "X-ReaDirect-TTS-Queue-Wait": f"{queue_wait_seconds:.4f}",
            "X-ReaDirect-TTS-GPU-Wait": f"{gpu_wait_seconds:.4f}",
        },
    )


def _gpu_coordination_status() -> dict[str, object]:
    return {
        **gpu_coordinator.snapshot(),
        "process_guard": gpu_process_guard.snapshot(),
    }


def _sanitized_runtime_state() -> dict[str, Any]:
    state = dict(runtime.state())
    model_error = state.pop("model_error", None)
    state["model_load_failed"] = model_error is not None
    return state


def _capacity_status(
    queue: dict[str, object],
    gpu: dict[str, object],
) -> dict[str, object]:
    return InferenceCapacity(
        service_name="tts",
        concurrency=1,
        max_waiting=inference_queue.max_waiting,
        queue_wait_timeout_seconds=inference_queue.wait_timeout_seconds,
        gpu_coordination_enabled=gpu_coordinator.enabled,
        gpu_permit_timeout_seconds=gpu_coordinator.acquire_timeout_seconds,
    ).snapshot(queue, gpu)
