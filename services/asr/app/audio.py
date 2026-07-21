from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np
from faster_whisper.audio import decode_audio

from app.noise_reduction import analyze_noise_profile

SAMPLE_RATE = 16_000


def prepare_audio(path: str | Path, maximum_seconds: float) -> tuple[np.ndarray, dict[str, Any]]:
    waveform = np.asarray(decode_audio(str(path), sampling_rate=SAMPLE_RATE), dtype=np.float32)
    if waveform.size == 0:
        raise ValueError("empty_audio")

    return waveform, analyze_audio(waveform, maximum_seconds)


def analyze_audio(waveform: np.ndarray, maximum_seconds: float) -> dict[str, Any]:

    duration = waveform.size / SAMPLE_RATE
    absolute = np.abs(waveform)
    peak = float(np.max(absolute))
    rms = float(np.sqrt(np.mean(np.square(waveform))))
    rms_dbfs = 20 * math.log10(max(rms, 1e-12))
    silence_ratio = float(np.mean(absolute < 0.01))
    clipped_ratio = float(np.mean(absolute >= 0.98))
    warnings: list[str] = []

    if duration < 0.25:
        warnings.append("audio_too_short")
    if duration > maximum_seconds:
        warnings.append("audio_too_long")
    if rms_dbfs < -45:
        warnings.append("audio_too_quiet")
    if silence_ratio >= 0.92:
        warnings.append("mostly_silent")
    if clipped_ratio >= 0.01:
        warnings.append("audio_clipped")

    blocking = {"audio_too_short", "audio_too_long", "audio_too_quiet", "mostly_silent"}
    usable = not bool(blocking.intersection(warnings))
    noise_profile = analyze_noise_profile(waveform, SAMPLE_RATE)
    if noise_profile["conditional_noise_reduction_recommended"]:
        warnings.append("background_noise_detected")

    return {
        "usable": usable,
        "status": "USABLE" if usable else "UNUSABLE_AUDIO",
        "duration_seconds": round(duration, 4),
        "sample_rate": SAMPLE_RATE,
        "rms_dbfs": round(rms_dbfs, 3),
        "peak_amplitude": round(peak, 6),
        "silence_ratio": round(silence_ratio, 6),
        "clipped_ratio": round(clipped_ratio, 6),
        "warnings": warnings,
        "quality_flags": {
            "too_short": "audio_too_short" in warnings,
            "too_long": "audio_too_long" in warnings,
            "too_quiet": "audio_too_quiet" in warnings,
            "mostly_silent": "mostly_silent" in warnings,
            "clipped": "audio_clipped" in warnings,
        },
        **noise_profile,
    }
