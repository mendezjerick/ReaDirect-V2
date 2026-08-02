import asyncio
import threading
from pathlib import Path
from typing import Callable

import httpx
import pytest

import main
from inference_queue import InferenceQueue, InferenceQueueFull, InferenceQueueWaitTimeout

AUTH_HEADERS = {
    "Authorization": "Bearer tts-test-token-at-least-thirty-two-characters",
}

async def wait_until(predicate: Callable[[], bool], timeout: float = 1.0) -> None:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while not predicate():
        if loop.time() >= deadline:
            raise AssertionError("Condition was not reached before the test timeout")
        await asyncio.sleep(0.005)


def test_queue_runs_fifo_and_rejects_work_beyond_waiting_capacity() -> None:
    async def scenario() -> None:
        queue = InferenceQueue(max_waiting=2, wait_timeout_seconds=1)
        release_first = threading.Event()
        first_started = threading.Event()
        execution_order: list[str] = []
        active = 0
        maximum_active = 0
        state_lock = threading.Lock()

        def work(name: str, block: bool = False) -> str:
            nonlocal active, maximum_active
            with state_lock:
                active += 1
                maximum_active = max(maximum_active, active)
                execution_order.append(name)
            if block:
                first_started.set()
                assert release_first.wait(2)
            with state_lock:
                active -= 1
            return name

        await queue.start()
        first = asyncio.create_task(
            queue.submit("first", lambda: work("first", block=True))
        )
        await wait_until(first_started.is_set)
        second = asyncio.create_task(queue.submit("second", lambda: work("second")))
        await wait_until(lambda: queue.snapshot()["waiting"] == 1)
        third = asyncio.create_task(queue.submit("third", lambda: work("third")))
        await wait_until(lambda: queue.snapshot()["waiting"] == 2)

        with pytest.raises(InferenceQueueFull):
            await queue.submit("rejected", lambda: work("rejected"))

        release_first.set()
        outcomes = await asyncio.gather(first, second, third)
        snapshot = queue.snapshot()
        await queue.close()

        assert [outcome.value for outcome in outcomes] == ["first", "second", "third"]
        assert execution_order == ["first", "second", "third"]
        assert maximum_active == 1
        assert snapshot["completed_total"] == 3
        assert snapshot["rejected_total"] == 1

    asyncio.run(scenario())


def test_timed_out_tts_job_never_runs() -> None:
    async def scenario() -> None:
        queue = InferenceQueue(max_waiting=1, wait_timeout_seconds=0.05)
        release_first = threading.Event()
        first_started = threading.Event()
        timed_out_ran = threading.Event()

        def blocking_work() -> str:
            first_started.set()
            assert release_first.wait(2)
            return "first"

        def work_that_must_not_run() -> str:
            timed_out_ran.set()
            return "late"

        await queue.start()
        first = asyncio.create_task(queue.submit("first", blocking_work))
        await wait_until(first_started.is_set)

        with pytest.raises(InferenceQueueWaitTimeout):
            await queue.submit("timeout", work_that_must_not_run)

        release_first.set()
        await first
        await wait_until(lambda: queue.snapshot()["waiting"] == 0)
        snapshot = queue.snapshot()
        await queue.close()

        assert not timed_out_ran.is_set()
        assert snapshot["timed_out_total"] == 1

    asyncio.run(scenario())


def test_failed_tts_job_does_not_stop_the_queue() -> None:
    async def scenario() -> None:
        queue = InferenceQueue(max_waiting=1, wait_timeout_seconds=1)
        await queue.start()

        with pytest.raises(RuntimeError, match="generation failed"):
            await queue.submit(
                "failing",
                lambda: (_ for _ in ()).throw(RuntimeError("generation failed")),
            )

        recovered = await queue.submit("recovered", lambda: "ok")
        snapshot = queue.snapshot()
        await queue.close()

        assert recovered.value == "ok"
        assert snapshot["failed_total"] == 1
        assert snapshot["completed_total"] == 1

    asyncio.run(scenario())


def test_synthesis_and_warmup_share_capacity_while_health_stays_responsive(
    monkeypatch,
    tmp_path: Path,
) -> None:
    class FakeRuntime:
        def __init__(self) -> None:
            self.synthesis_started = threading.Event()
            self.release_synthesis = threading.Event()
            self.warmup_calls = 0

        def state(self) -> dict[str, object]:
            return {
                "model_ready": True,
                "device": "test",
                "warming": False,
                "profiles_ready": [],
                "profiles_warming": [],
                "profiles_failed": [],
                "model_error": None,
            }

        def warmup_model(self) -> None:
            return None

        def prepare_profiles(self, _profiles) -> None:
            self.warmup_calls += 1

        def synthesize(self, _text, _reference, output_path: Path) -> None:
            self.synthesis_started.set()
            assert self.release_synthesis.wait(2)
            output_path.write_bytes(b"RIFF-test-audio")

    async def scenario() -> None:
        queue = InferenceQueue(max_waiting=1, wait_timeout_seconds=1)
        runtime = FakeRuntime()
        reference = tmp_path / "introduce.wav"
        output = tmp_path / "generated.wav"
        reference.write_bytes(b"reference")
        gpu_coordinator = main.GpuCoordinator(
            service_name="tts",
            lock_directory=tmp_path / "gpu-locks",
            resource_key="test-gpu",
            enabled=False,
        )
        gpu_process_guard = main.ServiceProcessGuard(
            service_name="tts",
            lock_directory=tmp_path / "gpu-locks",
            resource_key="test-gpu",
            enabled=False,
        )
        monkeypatch.setattr(main, "inference_queue", queue)
        monkeypatch.setattr(main, "runtime", runtime)
        monkeypatch.setattr(main, "gpu_coordinator", gpu_coordinator)
        monkeypatch.setattr(main, "gpu_process_guard", gpu_process_guard)
        monkeypatch.setattr(main, "STARTUP_WARMUP_ENABLED", False)
        monkeypatch.setitem(main.REFERENCE_FILES, "introduce", reference)
        monkeypatch.setattr(main, "cache_path_for", lambda _request, _path: output)

        async with main.lifespan(main.app):
            transport = httpx.ASGITransport(app=main.app)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://test",
                headers=AUTH_HEADERS,
            ) as client:
                synthesis = asyncio.create_task(
                    client.post(
                        "/synthesize",
                        json={"text": "Hello", "reference": "introduce"},
                    )
                )
                await wait_until(runtime.synthesis_started.is_set)
                warmup = asyncio.create_task(
                    client.post("/warmup", json={"profiles": ["result"]})
                )
                await wait_until(lambda: queue.snapshot()["waiting"] == 1)

                health = await asyncio.wait_for(client.get("/internal/status"), timeout=0.2)
                assert health.status_code == 200
                assert health.json()["inference_queue"]["active"] == 1
                assert health.json()["inference_queue"]["waiting"] == 1
                assert health.json()["capacity"]["saturated"] is True
                assert health.json()["capacity"]["queue_slots_available"] == 0

                overloaded = await client.post(
                    "/synthesize",
                    json={"text": "Another line", "reference": "introduce"},
                )
                assert overloaded.status_code == 503
                assert overloaded.json()["detail"] == "tts_queue_full"
                assert overloaded.headers["retry-after"] == "2"

                runtime.release_synthesis.set()
                synthesis_response, warmup_response = await asyncio.gather(synthesis, warmup)

        assert synthesis_response.status_code == 200
        assert synthesis_response.headers["x-readirect-tts-cache"] == "miss"
        assert warmup_response.status_code == 200
        assert runtime.warmup_calls == 1

    asyncio.run(scenario())
