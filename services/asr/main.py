from __future__ import annotations

import os
import json
import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.mu import get_mu_transcriber

SERVICE_NAME = "ReaDirect ASR"
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

app = FastAPI(title=SERVICE_NAME, version="0.1.0")
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
def ready() -> dict[str, object]:
    mu = get_mu_transcriber().status()
    available = bool(mu["available"])
    return {
        "status": "ready" if available else "not_ready",
        "service": SERVICE_NAME,
        "mu": mu,
    }


@app.get("/models/status")
def model_status() -> dict[str, object]:
    return {"mu": get_mu_transcriber().status()}


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

    path = await _store_upload(audio)
    try:
        return get_mu_transcriber().resolve_letter(
            path,
            expected_letter,
            reviewed_equivalences,
        )
    finally:
        path.unlink(missing_ok=True)


@app.post("/mu/transcribe")
async def transcribe_mu(
    audio: Annotated[UploadFile, File()],
    expected_text: Annotated[str, Form()] = "",
    task_type: Annotated[str, Form()] = "word",
    noise_reduction_enabled: Annotated[bool, Form()] = False,
) -> dict[str, object]:
    path = await _store_upload(audio)
    try:
        return get_mu_transcriber().transcribe(
            path,
            expected_text,
            task_type,
            noise_reduction_enabled=noise_reduction_enabled,
        )
    finally:
        path.unlink(missing_ok=True)


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
