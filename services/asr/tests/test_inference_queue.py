import asyncio
import threading
from pathlib import Path
from typing import Callable

import httpx
import pytest

import main
from app.inference_queue import InferenceQueue, InferenceQueueFull, InferenceQueueWaitTimeout


async def wait_until(predicate: Callable[[], bool], timeout: float = 1.0) -> None:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while not predicate():
        if loop.time() >= deadline:
            raise AssertionError("Condition was not reached before the test timeout")
        await asyncio.sleep(0.005)


def test_queue_runs_jobs_fifo_with_bounded_concurrency() -> None:
    async def scenario() -> None:
        queue = InferenceQueue(concurrency=1, max_waiting=4, wait_timeout_seconds=1)
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
                assert release_first.wait(1)
            with state_lock:
                active -= 1
            return name

        await queue.start()
        first = asyncio.create_task(
            queue.submit("first", lambda: work("first", block=True), lambda: None)
        )
        await wait_until(first_started.is_set)
        second = asyncio.create_task(queue.submit("second", lambda: work("second"), lambda: None))
        await wait_until(lambda: queue.snapshot()["waiting"] == 1)
        third = asyncio.create_task(queue.submit("third", lambda: work("third"), lambda: None))
        await wait_until(lambda: queue.snapshot()["waiting"] == 2)

        release_first.set()
        outcomes = await asyncio.gather(first, second, third)
        snapshot = queue.snapshot()
        await queue.close()

        assert [outcome.value for outcome in outcomes] == ["first", "second", "third"]
        assert execution_order == ["first", "second", "third"]
        assert maximum_active == 1
        assert snapshot["completed_total"] == 3

    asyncio.run(scenario())


def test_queue_rejects_work_when_waiting_capacity_is_full() -> None:
    async def scenario() -> None:
        queue = InferenceQueue(concurrency=1, max_waiting=1, wait_timeout_seconds=1)
        release_first = threading.Event()
        first_started = threading.Event()
        rejected_cleanup = threading.Event()

        def blocking_work() -> str:
            first_started.set()
            assert release_first.wait(1)
            return "first"

        await queue.start()
        first = asyncio.create_task(queue.submit("first", blocking_work, lambda: None))
        await wait_until(first_started.is_set)
        second = asyncio.create_task(queue.submit("second", lambda: "second", lambda: None))
        await wait_until(lambda: queue.snapshot()["waiting"] == 1)

        with pytest.raises(InferenceQueueFull):
            await queue.submit("rejected", lambda: "rejected", rejected_cleanup.set)

        assert rejected_cleanup.is_set()
        assert queue.snapshot()["rejected_total"] == 1
        release_first.set()
        await asyncio.gather(first, second)
        await queue.close()

    asyncio.run(scenario())


def test_timed_out_job_is_cleaned_up_without_running() -> None:
    async def scenario() -> None:
        queue = InferenceQueue(
            concurrency=1,
            max_waiting=2,
            wait_timeout_seconds=0.05,
        )
        release_first = threading.Event()
        first_started = threading.Event()
        timed_out_ran = threading.Event()
        timed_out_cleanup = threading.Event()

        def blocking_work() -> str:
            first_started.set()
            assert release_first.wait(1)
            return "first"

        def work_that_must_not_run() -> str:
            timed_out_ran.set()
            return "late"

        await queue.start()
        first = asyncio.create_task(queue.submit("first", blocking_work, lambda: None))
        await wait_until(first_started.is_set)

        with pytest.raises(InferenceQueueWaitTimeout):
            await queue.submit("timeout", work_that_must_not_run, timed_out_cleanup.set)

        release_first.set()
        await first
        await wait_until(timed_out_cleanup.is_set)
        snapshot = queue.snapshot()
        await queue.close()

        assert not timed_out_ran.is_set()
        assert snapshot["timed_out_total"] == 1

    asyncio.run(scenario())


def test_failed_inference_does_not_stop_the_queue() -> None:
    async def scenario() -> None:
        queue = InferenceQueue(concurrency=1, max_waiting=1, wait_timeout_seconds=1)
        failed_cleanup = threading.Event()
        await queue.start()

        with pytest.raises(RuntimeError, match="inference failed"):
            await queue.submit(
                "failing",
                lambda: (_ for _ in ()).throw(RuntimeError("inference failed")),
                failed_cleanup.set,
            )

        recovered = await queue.submit("recovered", lambda: "ok", lambda: None)
        snapshot = queue.snapshot()
        await queue.close()

        assert failed_cleanup.is_set()
        assert recovered.value == "ok"
        assert snapshot["failed_total"] == 1
        assert snapshot["completed_total"] == 1

    asyncio.run(scenario())


def test_running_job_keeps_its_audio_until_work_finishes_after_cancellation() -> None:
    async def scenario() -> None:
        queue = InferenceQueue(concurrency=1, max_waiting=1, wait_timeout_seconds=1)
        work_started = threading.Event()
        release_work = threading.Event()
        cleanup_finished = threading.Event()

        def work() -> str:
            work_started.set()
            assert release_work.wait(5)
            return "unused"

        await queue.start()
        submission = asyncio.create_task(queue.submit("cancelled", work, cleanup_finished.set))
        await wait_until(work_started.is_set)
        assert submission.cancel()
        with pytest.raises(asyncio.CancelledError):
            await submission

        assert not cleanup_finished.is_set()
        release_work.set()
        await wait_until(cleanup_finished.is_set)
        await wait_until(lambda: queue.snapshot()["active"] == 0)
        snapshot = queue.snapshot()
        await queue.close()

        assert snapshot["cancelled_total"] == 1
        assert snapshot["completed_total"] == 1

    asyncio.run(scenario())


def test_both_mu_routes_share_queue_and_health_remains_responsive(monkeypatch) -> None:
    class FakeMuTranscriber:
        def __init__(self) -> None:
            self.first_started = threading.Event()
            self.release_first = threading.Event()
            self.paths: list[Path] = []

        def status(self) -> dict[str, object]:
            return {"available": True, "model_loaded": True, "device": "test"}

        def transcribe(self, path: Path, *_args, **_kwargs) -> dict[str, object]:
            self.paths.append(path)
            self.first_started.set()
            assert self.release_first.wait(1)
            return {"ok": True, "raw_transcript": "cat", "performance": {}}

        def resolve_letter(self, path: Path, *_args, **_kwargs) -> dict[str, object]:
            self.paths.append(path)
            return {"ok": True, "predicted_class": "A", "performance": {}}

    async def scenario() -> None:
        queue = InferenceQueue(concurrency=1, max_waiting=1, wait_timeout_seconds=1)
        transcriber = FakeMuTranscriber()
        gpu_coordinator = main.GpuCoordinator(
            service_name="asr",
            lock_directory=main.REPOSITORY_ROOT / ".runtime" / "test-gpu-locks",
            resource_key="test-gpu",
            enabled=False,
        )
        gpu_process_guard = main.ServiceProcessGuard(
            service_name="asr",
            lock_directory=main.REPOSITORY_ROOT / ".runtime" / "test-gpu-locks",
            resource_key="test-gpu",
            enabled=False,
        )
        monkeypatch.setattr(main, "inference_queue", queue)
        monkeypatch.setattr(main, "get_mu_transcriber", lambda: transcriber)
        monkeypatch.setattr(main, "gpu_coordinator", gpu_coordinator)
        monkeypatch.setattr(main, "gpu_process_guard", gpu_process_guard)

        async with main.lifespan(main.app):
            transport = httpx.ASGITransport(app=main.app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                transcription = asyncio.create_task(
                    client.post(
                        "/mu/transcribe",
                        files={"audio": ("word.wav", b"test-audio", "audio/wav")},
                        data={"expected_text": "cat", "task_type": "word"},
                    )
                )
                await wait_until(transcriber.first_started.is_set)
                letter = asyncio.create_task(
                    client.post(
                        "/mu/resolve-letter",
                        files={"audio": ("letter.wav", b"test-audio", "audio/wav")},
                        data={"expected_letter": "A", "equivalences": "[]"},
                    )
                )
                await wait_until(lambda: queue.snapshot()["waiting"] == 1)

                health = await asyncio.wait_for(client.get("/ready"), timeout=0.2)
                assert health.status_code == 200
                assert health.json()["inference_queue"]["active"] == 1
                assert health.json()["inference_queue"]["waiting"] == 1
                assert health.json()["capacity"]["saturated"] is True
                assert health.json()["capacity"]["queue_slots_available"] == 0

                overloaded = await client.post(
                    "/mu/transcribe",
                    files={"audio": ("overload.wav", b"test-audio", "audio/wav")},
                    data={"expected_text": "dog", "task_type": "word"},
                )
                assert overloaded.status_code == 503
                assert overloaded.json()["detail"] == "asr_queue_full"
                assert overloaded.headers["retry-after"] == "2"

                transcriber.release_first.set()
                transcription_response, letter_response = await asyncio.gather(
                    transcription,
                    letter,
                )

        assert transcription_response.status_code == 200
        assert letter_response.status_code == 200
        assert "queue_wait_seconds" in transcription_response.json()["performance"]
        assert transcription_response.json()["performance"]["gpu_wait_seconds"] == 0
        assert letter_response.json()["performance"]["queue_wait_seconds"] >= 0
        assert len(transcriber.paths) == 2
        assert all(not path.exists() for path in transcriber.paths)

    asyncio.run(scenario())
