from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Event

import numpy as np
import pytest
import soundfile as sf
from starlette.testclient import TestClient

import main


class FakeTextNormalizer:
    def normalize(self, text: str) -> str:
        return text


class FakeTtsModel:
    sample_rate = 24_000

    def __init__(self) -> None:
        self.build_count = 0
        self.generate_count = 0
        self.generated_texts: list[str] = []

    def build_prompt_cache(self, *, reference_wav_path: str) -> dict[str, str]:
        self.build_count += 1
        return {"reference": reference_wav_path, "mode": "reference"}

    def generate_with_prompt_cache(
        self,
        *,
        target_text: str,
        prompt_cache: dict[str, str],
        **_options,
    ) -> tuple[np.ndarray, None, None]:
        self.generate_count += 1
        self.generated_texts.append(target_text)
        assert prompt_cache["mode"] == "reference"

        return np.array([[0.0, 0.1, -0.1, 0.0]], dtype=np.float32), None, None


class FakeVoxModel:
    def __init__(self) -> None:
        self.tts_model = FakeTtsModel()
        self.text_normalizer = FakeTextNormalizer()


@pytest.fixture(autouse=True)
def isolated_runtime(monkeypatch) -> main.VoxRuntime:
    runtime = main.VoxRuntime()
    monkeypatch.setattr(main, "runtime", runtime)
    monkeypatch.setattr(main, "STARTUP_WARMUP_ENABLED", False)

    return runtime


def install_fake_model(
    monkeypatch,
    tmp_path: Path,
    profile: str = "result",
) -> FakeVoxModel:
    model = FakeVoxModel()
    reference = tmp_path / f"{profile}.wav"
    reference.write_bytes(b"reference")
    monkeypatch.setitem(main.REFERENCE_FILES, profile, reference)
    monkeypatch.setattr(main, "condition_reference", lambda path: path)
    monkeypatch.setattr(main.runtime, "_load_model", lambda: (model, "cpu"))

    return model


def test_health_reports_model_and_profile_runtime_state(monkeypatch, tmp_path: Path) -> None:
    install_fake_model(monkeypatch, tmp_path)
    main.runtime.prepare_profiles(["result"])

    with TestClient(main.app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "service": "tts",
        "status": "ready",
        "runtime_ready": True,
        "model_ready": True,
        "device": "cpu",
        "warming": False,
        "profiles_ready": ["result"],
        "profiles_warming": [],
        "profiles_failed": [],
        "model_error": None,
    }


def test_service_start_begins_model_only_warmup(monkeypatch, tmp_path: Path) -> None:
    model = install_fake_model(monkeypatch, tmp_path)
    loaded = Event()

    def load_model() -> tuple[FakeVoxModel, str]:
        loaded.set()
        return model, "cpu"

    monkeypatch.setattr(main.runtime, "_load_model", load_model)
    monkeypatch.setattr(main, "STARTUP_WARMUP_ENABLED", True)

    with TestClient(main.app) as client:
        assert loaded.wait(timeout=2)
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["model_ready"] is True
    assert response.json()["profiles_ready"] == []


def test_warmup_prepares_only_requested_profiles_and_reuses_the_prompt_cache(
    monkeypatch,
    tmp_path: Path,
) -> None:
    model = install_fake_model(monkeypatch, tmp_path)

    with TestClient(main.app) as client:
        first = client.post("/warmup", json={"profiles": ["result"]})
        second = client.post("/warmup", json={"profiles": ["result"]})

    assert first.status_code == 200
    assert first.json() == {
        "ready": True,
        "device": "cpu",
        "profiles_ready": ["result"],
    }
    assert second.status_code == 200
    assert model.tts_model.build_count == 1
    assert model.tts_model.generate_count == 1
    assert model.tts_model.generated_texts == [main.PROFILE_PROBE_TEXT]


def test_concurrent_profile_warmups_share_one_preparation(
    monkeypatch,
    tmp_path: Path,
) -> None:
    model = install_fake_model(monkeypatch, tmp_path)
    conditioning_calls = 0
    conditioning_started = Event()
    release_conditioning = Event()

    def slow_conditioning(path: Path) -> Path:
        nonlocal conditioning_calls
        conditioning_calls += 1
        conditioning_started.set()
        assert release_conditioning.wait(timeout=2)

        return path

    monkeypatch.setattr(main, "condition_reference", slow_conditioning)

    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(main.runtime.prepare_profiles, ["result"])
        assert conditioning_started.wait(timeout=2)
        second = pool.submit(main.runtime.prepare_profiles, ["result"])
        assert main.runtime.state()["profiles_warming"] == ["result"]
        release_conditioning.set()

        first.result(timeout=2)
        second.result(timeout=2)

    assert conditioning_calls == 1
    assert model.tts_model.build_count == 1
    assert model.tts_model.generate_count == 1


def test_synthesis_uses_the_prepared_semantic_profile_and_returns_wav(
    monkeypatch,
    tmp_path: Path,
) -> None:
    model = install_fake_model(monkeypatch, tmp_path, "introduce")
    reference = main.REFERENCE_FILES["introduce"]
    output = tmp_path / "speech.wav"

    monkeypatch.setattr(main, "cache_path_for", lambda request, path: output)

    with TestClient(main.app) as client:
        response = client.post(
            "/synthesize",
            json={"text": "Hello, reader!", "reference": "introduce"},
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert response.headers["x-readirect-tts-cache"] == "miss"
    assert response.content.startswith(b"RIFF")
    assert model.tts_model.build_count == 1
    assert model.tts_model.generate_count == 2
    assert model.tts_model.generated_texts == [
        main.PROFILE_PROBE_TEXT,
        "Hello, reader!",
    ]
    assert reference.name == "introduce.wav"


def test_failed_profile_preparation_is_reported_without_marking_it_ready(
    monkeypatch,
    tmp_path: Path,
) -> None:
    model = install_fake_model(monkeypatch, tmp_path)

    def fail_prompt_cache(*, reference_wav_path: str) -> dict[str, str]:
        raise RuntimeError(f"cannot encode {reference_wav_path}")

    monkeypatch.setattr(model.tts_model, "build_prompt_cache", fail_prompt_cache)

    with TestClient(main.app) as client:
        warmup_response = client.post("/warmup", json={"profiles": ["result"]})
        health_response = client.get("/health")

    assert warmup_response.status_code == 503
    assert health_response.status_code == 200
    assert health_response.json()["profiles_ready"] == []
    assert health_response.json()["profiles_failed"] == ["result"]


def test_warmup_rejects_unknown_or_duplicate_profiles() -> None:
    with TestClient(main.app) as client:
        unknown = client.post("/warmup", json={"profiles": ["narrator"]})
        duplicate = client.post("/warmup", json={"profiles": ["result", "result"]})

    assert unknown.status_code == 422
    assert duplicate.status_code == 422


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
