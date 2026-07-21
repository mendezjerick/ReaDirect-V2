from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
MODEL_PATH = SERVICE_ROOT / ".cache/models/openbmb--VoxCPM2"
CACHE_PATH = SERVICE_ROOT / "storage/cache"
REFERENCE_CACHE_PATH = SERVICE_ROOT / "storage/reference-cache"
REFERENCE_ROOT = REPOSITORY_ROOT / "assets/audio/voice-references/sh"
REFERENCE_TARGET_PEAK_DBFS = -6.0
REFERENCE_TARGET_PEAK = 10 ** (REFERENCE_TARGET_PEAK_DBFS / 20)
REFERENCE_CONDITIONING_VERSION = "mono-peak-minus-6db-v1"

REFERENCE_FILES = {
    "introduce": REFERENCE_ROOT / "introduce.wav",
    "instruction": REFERENCE_ROOT / "instruction.wav",
    "question": REFERENCE_ROOT / "question.wav",
    "praise": REFERENCE_ROOT / "praise.wav",
    "result": REFERENCE_ROOT / "result.wav",
}

logger = logging.getLogger("readirect.tts")


class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    reference: Literal[
        "introduce",
        "instruction",
        "question",
        "praise",
        "result",
    ]


class VoxRuntime:
    """Own the single process-wide VoxCPM model and serialize generation."""

    def __init__(self) -> None:
        self._model: Any | None = None
        self._device: str | None = None
        self._load_lock = threading.Lock()
        self._generation_lock = threading.Lock()

    @property
    def ready(self) -> bool:
        return self._model is not None

    @property
    def device(self) -> str | None:
        return self._device

    def warmup(self) -> None:
        if self._model is not None:
            return

        with self._load_lock:
            if self._model is not None:
                return

            if not MODEL_PATH.is_dir():
                raise FileNotFoundError(f"VoxCPM2 model is missing: {MODEL_PATH}")

            from voxcpm import VoxCPM

            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info("Loading VoxCPM2 on %s", device)
            self._model = VoxCPM.from_pretrained(
                str(MODEL_PATH),
                local_files_only=True,
                load_denoiser=False,
                optimize=device == "cuda",
                device=device,
            )
            self._device = device
            logger.info("VoxCPM2 is ready on %s", device)

    def synthesize(self, text: str, reference_path: Path, output_path: Path) -> None:
        self.warmup()

        with self._generation_lock:
            if output_path.is_file():
                return

            waveform = self._model.generate(
                text=text,
                reference_wav_path=str(reference_path),
                cfg_value=2.0,
                inference_timesteps=10,
                normalize=True,
                denoise=False,
                retry_badcase=True,
                retry_badcase_max_times=3,
                retry_badcase_ratio_threshold=6.0,
            )
            sample_rate = int(self._model.tts_model.sample_rate)
            temporary_path = output_path.with_suffix(".tmp.wav")
            sf.write(temporary_path, waveform, sample_rate, subtype="PCM_16")
            os.replace(temporary_path, output_path)


runtime = VoxRuntime()
reference_conditioning_lock = threading.Lock()


@asynccontextmanager
async def lifespan(_: FastAPI):
    CACHE_PATH.mkdir(parents=True, exist_ok=True)
    REFERENCE_CACHE_PATH.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="ReaDirect TTS", version="1.0.0", lifespan=lifespan)


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


@app.get("/health")
async def health() -> dict[str, str | bool | None]:
    return {
        "service": "tts",
        "status": "ready",
        "runtime_ready": runtime.ready,
        "device": runtime.device,
    }


@app.post("/warmup")
async def warmup() -> dict[str, str | bool | None]:
    try:
        await asyncio.to_thread(runtime.warmup)
    except (FileNotFoundError, RuntimeError) as error:
        logger.exception("VoxCPM2 warm-up failed")
        raise HTTPException(status_code=503, detail=str(error)) from error

    return {"ready": True, "device": runtime.device}


@app.post("/synthesize")
async def synthesize(request: SynthesisRequest) -> FileResponse:
    reference_path = REFERENCE_FILES[request.reference]

    if not reference_path.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Clara reference audio is missing for {request.reference}.",
        )

    normalized_request = request.model_copy(update={"text": request.text.strip()})
    output_path = cache_path_for(normalized_request, reference_path)
    was_cached = output_path.is_file()

    try:
        conditioned_reference = await asyncio.to_thread(
            condition_reference,
            reference_path,
        )
        # Warm-up is intentional even on a cache hit: this screen guarantees that
        # the live TTS runtime is resident before the learner enters an activity.
        await asyncio.to_thread(runtime.warmup)
        if not was_cached:
            await asyncio.to_thread(
                runtime.synthesize,
                normalized_request.text,
                conditioned_reference,
                output_path,
            )
    except (FileNotFoundError, RuntimeError, ValueError) as error:
        logger.exception("Clara speech synthesis failed")
        raise HTTPException(status_code=503, detail=str(error)) from error

    return FileResponse(
        output_path,
        media_type="audio/wav",
        filename="clara-speech.wav",
        headers={
            "Cache-Control": "no-store",
            "X-ReaDirect-TTS-Cache": "hit" if was_cached else "miss",
        },
    )
