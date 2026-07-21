from __future__ import annotations

import math
from typing import Any

import numpy as np

DEFAULT_SAMPLE_RATE = 16_000
SNR_TRIGGER_DB = 18.0


def analyze_noise_profile(
    waveform: np.ndarray,
    sample_rate: int = DEFAULT_SAMPLE_RATE,
) -> dict[str, Any]:
    """Estimate whether a conservative noise-only frame sample is available."""
    frame_length = max(1, int(sample_rate * 0.02))
    hop_length = max(1, frame_length // 2)
    frame_rms = _frame_rms(waveform, frame_length, hop_length)

    if waveform.size < int(sample_rate * 0.5) or frame_rms.size < 8:
        return _profile(reliable=False, reason="recording_too_short_for_noise_profile")

    quiet_count = max(2, int(math.ceil(frame_rms.size * 0.2)))
    quiet_rms = float(np.median(np.partition(frame_rms, quiet_count - 1)[:quiet_count]))
    active_rms = float(np.percentile(frame_rms, 80))

    if quiet_rms <= 1e-6:
        return _profile(reliable=False, reason="no_measurable_background_noise")
    if active_rms <= quiet_rms * 1.35:
        return _profile(reliable=False, reason="speech_and_noise_not_separable")

    snr_db = 20 * math.log10(max(active_rms, 1e-12) / max(quiet_rms, 1e-12))
    return _profile(
        reliable=True,
        reason="noise_profile_available",
        snr_db=round(snr_db, 3),
        recommended=snr_db < SNR_TRIGGER_DB,
    )


def reduce_stationary_noise(
    waveform: np.ndarray,
    sample_rate: int = DEFAULT_SAMPLE_RATE,
) -> tuple[np.ndarray, dict[str, float | str]]:
    """Apply a bounded spectral gate and blend original speech back in."""
    if waveform.size == 0:
        raise ValueError("empty_audio")

    frame_length = 512
    hop_length = 128
    original_length = waveform.size
    padding = (
        (-(original_length - frame_length)) % hop_length if original_length > frame_length else 0
    )
    total_padding = frame_length + padding
    padded = np.pad(waveform, (frame_length // 2, total_padding - frame_length // 2))
    window = np.sqrt(np.hanning(frame_length).astype(np.float32) + 1e-8)
    starts = range(0, padded.size - frame_length + 1, hop_length)
    spectra: list[np.ndarray] = []
    powers: list[np.ndarray] = []

    for start in starts:
        spectrum = np.fft.rfft(padded[start : start + frame_length] * window)
        spectra.append(spectrum)
        powers.append(np.square(np.abs(spectrum)))

    power_matrix = np.asarray(powers)
    frame_energy = np.mean(power_matrix, axis=1)
    noise_count = max(2, int(math.ceil(len(spectra) * 0.2)))
    noise_indices = np.argpartition(frame_energy, noise_count - 1)[:noise_count]
    noise_power = np.median(power_matrix[noise_indices], axis=0)

    output = np.zeros(padded.size, dtype=np.float64)
    normalization = np.zeros(padded.size, dtype=np.float64)
    minimum_gain = 10 ** (-10 / 20)

    for index, (start, spectrum) in enumerate(zip(starts, spectra, strict=True)):
        power = power_matrix[index]
        wiener_gain = power / (power + (1.15 * noise_power) + 1e-12)
        gain = np.clip(wiener_gain, minimum_gain, 1.0)
        frame = np.fft.irfft(spectrum * gain, n=frame_length).real * window
        output[start : start + frame_length] += frame
        normalization[start : start + frame_length] += np.square(window)

    enhanced = output / np.maximum(normalization, 1e-8)
    enhanced = enhanced[frame_length // 2 : frame_length // 2 + original_length]
    original = waveform.astype(np.float64, copy=False)
    blended = (0.7 * enhanced) + (0.3 * original)
    peak = float(np.max(np.abs(blended)))
    if peak > 0.999:
        blended *= 0.999 / peak

    return blended.astype(np.float32), {
        "algorithm": "bounded_spectral_gate",
        "maximum_attenuation_db": 10.0,
        "enhanced_ratio": 0.7,
        "original_ratio": 0.3,
    }


def _frame_rms(waveform: np.ndarray, frame_length: int, hop_length: int) -> np.ndarray:
    if waveform.size < frame_length:
        return np.asarray([], dtype=np.float32)

    values = [
        float(np.sqrt(np.mean(np.square(waveform[start : start + frame_length]))))
        for start in range(0, waveform.size - frame_length + 1, hop_length)
    ]
    return np.asarray(values, dtype=np.float32)


def _profile(
    *,
    reliable: bool,
    reason: str,
    snr_db: float | None = None,
    recommended: bool = False,
) -> dict[str, Any]:
    return {
        "noise_profile_reliable": reliable,
        "estimated_snr_db": snr_db,
        "conditional_noise_reduction_recommended": recommended,
        "noise_profile_reason": reason,
    }
