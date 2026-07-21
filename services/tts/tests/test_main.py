from pathlib import Path

import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient

import main


def test_health_reports_runtime_state(monkeypatch) -> None:
    monkeypatch.setattr(main.runtime, "_model", object())
    monkeypatch.setattr(main.runtime, "_device", "cpu")

    with TestClient(main.app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "service": "tts",
        "status": "ready",
        "runtime_ready": True,
        "device": "cpu",
    }


def test_synthesis_uses_the_semantic_reference_and_returns_wav(
    monkeypatch,
    tmp_path: Path,
) -> None:
    reference = tmp_path / "introduce.wav"
    reference.write_bytes(b"reference")
    output = tmp_path / "speech.wav"
    calls: list[tuple[str, Path, Path]] = []

    def synthesize(text: str, reference_path: Path, output_path: Path) -> None:
        calls.append((text, reference_path, output_path))
        output_path.write_bytes(b"RIFF-test-wave")

    monkeypatch.setitem(main.REFERENCE_FILES, "introduce", reference)
    monkeypatch.setattr(main, "cache_path_for", lambda request, path: output)
    monkeypatch.setattr(main, "condition_reference", lambda path: path)
    monkeypatch.setattr(main.runtime, "warmup", lambda: None)
    monkeypatch.setattr(main.runtime, "synthesize", synthesize)

    with TestClient(main.app) as client:
        response = client.post(
            "/synthesize",
            json={"text": "Hello, reader!", "reference": "introduce"},
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert response.headers["x-readirect-tts-cache"] == "miss"
    assert response.content == b"RIFF-test-wave"
    assert calls == [("Hello, reader!", reference, output)]


def test_reference_conditioning_downmixes_and_only_attenuates(
    monkeypatch,
    tmp_path: Path,
) -> None:
    reference = tmp_path / "stereo.wav"
    cache = tmp_path / "reference-cache"
    stereo = np.array(
        [
            [1.0, 0.8],
            [0.5, 0.3],
            [-1.0, -0.8],
            [-0.5, -0.3],
        ],
        dtype=np.float32,
    )
    sf.write(reference, stereo, 48_000, subtype="FLOAT")
    monkeypatch.setattr(main, "REFERENCE_CACHE_PATH", cache)

    conditioned = main.condition_reference(reference)
    audio, sample_rate = sf.read(conditioned, always_2d=True)

    assert sample_rate == 48_000
    assert audio.shape == (4, 1)
    assert float(np.max(np.abs(audio))) <= main.REFERENCE_TARGET_PEAK + 0.0001


def test_reference_conditioning_does_not_boost_a_quiet_mono_file(
    monkeypatch,
    tmp_path: Path,
) -> None:
    reference = tmp_path / "quiet.wav"
    cache = tmp_path / "reference-cache"
    quiet = np.array([0.1, -0.1, 0.05, -0.05], dtype=np.float32)
    sf.write(reference, quiet, 48_000, subtype="FLOAT")
    monkeypatch.setattr(main, "REFERENCE_CACHE_PATH", cache)

    conditioned = main.condition_reference(reference)
    audio, _ = sf.read(conditioned)

    assert float(np.max(np.abs(audio))) <= 0.1001
    assert float(np.max(np.abs(audio))) >= 0.0999


def test_synthesis_rejects_an_unknown_reference() -> None:
    with TestClient(main.app) as client:
        response = client.post(
            "/synthesize",
            json={"text": "Hello", "reference": "arbitrary-file"},
        )

    assert response.status_code == 422
