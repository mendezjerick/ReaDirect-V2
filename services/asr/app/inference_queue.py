from __future__ import annotations

import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from itertools import count
from typing import Callable, Generic, TypeVar

logger = logging.getLogger(__name__)

Result = TypeVar("Result")


class InferenceQueueError(RuntimeError):
    code = "asr_inference_queue_error"


class InferenceQueueFull(InferenceQueueError):
    code = "asr_queue_full"


class InferenceQueueWaitTimeout(InferenceQueueError):
    code = "asr_queue_wait_timeout"


class InferenceQueueUnavailable(InferenceQueueError):
    code = "asr_queue_unavailable"


@dataclass(frozen=True)
class InferenceOutcome(Generic[Result]):
    value: Result
    job_id: int
    queue_wait_seconds: float


@dataclass
class _InferenceJob(Generic[Result]):
    job_id: int
    operation: str
    work: Callable[[], Result]
    cleanup: Callable[[], None]
    enqueued_at: float
    started: asyncio.Event
    result: asyncio.Future[InferenceOutcome[Result]]
    cancelled: bool = False


class InferenceQueue:
    """Run bounded ASR work without blocking FastAPI's event loop."""

    def __init__(
        self,
        *,
        concurrency: int = 1,
        max_waiting: int = 8,
        wait_timeout_seconds: float = 90.0,
        retry_after_seconds: int = 2,
    ) -> None:
        if concurrency < 1:
            raise ValueError("ASR_INFERENCE_CONCURRENCY must be at least 1")
        if max_waiting < 1:
            raise ValueError("ASR_QUEUE_MAX_WAITING must be at least 1")
        if wait_timeout_seconds <= 0:
            raise ValueError("ASR_QUEUE_WAIT_TIMEOUT_SECONDS must be greater than 0")
        if retry_after_seconds < 1:
            raise ValueError("ASR_QUEUE_RETRY_AFTER_SECONDS must be at least 1")

        self.concurrency = concurrency
        self.max_waiting = max_waiting
        self.wait_timeout_seconds = wait_timeout_seconds
        self.retry_after_seconds = retry_after_seconds

        self._queue: asyncio.Queue[_InferenceJob[object] | None] = asyncio.Queue(
            maxsize=max_waiting
        )
        self._executor: ThreadPoolExecutor | None = None
        self._workers: list[asyncio.Task[None]] = []
        self._job_ids = count(1)
        self._accepting = False
        self._active = 0
        self._accepted_total = 0
        self._completed_total = 0
        self._failed_total = 0
        self._rejected_total = 0
        self._timed_out_total = 0
        self._cancelled_total = 0

    async def start(self) -> None:
        if self._workers:
            return

        self._executor = ThreadPoolExecutor(
            max_workers=self.concurrency,
            thread_name_prefix="readirect-asr-inference",
        )
        self._accepting = True
        self._workers = [
            asyncio.create_task(self._run_worker(index), name=f"asr-inference-{index}")
            for index in range(self.concurrency)
        ]

    async def close(self) -> None:
        self._accepting = False
        if not self._workers:
            return

        while True:
            try:
                job = self._queue.get_nowait()
            except asyncio.QueueEmpty:
                break

            if job is not None:
                job.cancelled = True
                self._finish_without_running(job, InferenceQueueUnavailable())
            self._queue.task_done()

        for _ in self._workers:
            await self._queue.put(None)
        await asyncio.gather(*self._workers)
        self._workers.clear()

        assert self._executor is not None
        self._executor.shutdown(wait=True, cancel_futures=True)
        self._executor = None

    async def submit(
        self,
        operation: str,
        work: Callable[[], Result],
        cleanup: Callable[[], None],
    ) -> InferenceOutcome[Result]:
        if not self._accepting or not self._workers_healthy():
            self._safe_cleanup(cleanup, operation)
            raise InferenceQueueUnavailable()

        loop = asyncio.get_running_loop()
        result: asyncio.Future[InferenceOutcome[Result]] = loop.create_future()
        result.add_done_callback(self._consume_unobserved_exception)
        job = _InferenceJob(
            job_id=next(self._job_ids),
            operation=operation,
            work=work,
            cleanup=cleanup,
            enqueued_at=time.perf_counter(),
            started=asyncio.Event(),
            result=result,
        )

        try:
            self._queue.put_nowait(job)  # type: ignore[arg-type]
        except asyncio.QueueFull as error:
            self._rejected_total += 1
            self._safe_cleanup(cleanup, operation)
            raise InferenceQueueFull() from error

        self._accepted_total += 1
        logger.info(
            "Accepted ASR job %s (%s); waiting=%s active=%s",
            job.job_id,
            operation,
            self._queue.qsize(),
            self._active,
        )

        try:
            try:
                await asyncio.wait_for(
                    job.started.wait(),
                    timeout=self.wait_timeout_seconds,
                )
            except TimeoutError as error:
                if not job.started.is_set():
                    job.cancelled = True
                    self._timed_out_total += 1
                    raise InferenceQueueWaitTimeout() from error

            current_task = asyncio.current_task()
            if current_task is not None and current_task.cancelling():
                raise asyncio.CancelledError
            return await asyncio.shield(result)
        except asyncio.CancelledError:
            self._cancelled_total += 1
            if not job.started.is_set():
                job.cancelled = True
            raise

    def snapshot(self) -> dict[str, object]:
        worker_healthy = self._workers_healthy()
        return {
            "healthy": worker_healthy,
            "accepting": self._accepting and worker_healthy,
            "concurrency": self.concurrency,
            "active": self._active,
            "waiting": self._queue.qsize(),
            "max_waiting": self.max_waiting,
            "wait_timeout_seconds": self.wait_timeout_seconds,
            "accepted_total": self._accepted_total,
            "completed_total": self._completed_total,
            "failed_total": self._failed_total,
            "rejected_total": self._rejected_total,
            "timed_out_total": self._timed_out_total,
            "cancelled_total": self._cancelled_total,
        }

    def _workers_healthy(self) -> bool:
        return bool(self._workers) and all(not worker.done() for worker in self._workers)

    async def _run_worker(self, worker_index: int) -> None:
        while True:
            job = await self._queue.get()
            if job is None:
                self._queue.task_done()
                return

            if job.cancelled:
                self._finish_without_running(job, InferenceQueueWaitTimeout())
                self._queue.task_done()
                continue

            self._active += 1
            started_at = time.perf_counter()
            job.started.set()
            logger.info(
                "Starting ASR job %s (%s) on worker %s after %.4fs",
                job.job_id,
                job.operation,
                worker_index,
                started_at - job.enqueued_at,
            )

            try:
                loop = asyncio.get_running_loop()
                assert self._executor is not None
                value = await loop.run_in_executor(self._executor, job.work)
            except Exception as error:
                self._failed_total += 1
                if not job.result.done():
                    job.result.set_exception(error)
                logger.exception("ASR job %s (%s) failed", job.job_id, job.operation)
            else:
                self._completed_total += 1
                if not job.result.done():
                    job.result.set_result(
                        InferenceOutcome(
                            value=value,
                            job_id=job.job_id,
                            queue_wait_seconds=started_at - job.enqueued_at,
                        )
                    )
            finally:
                self._safe_cleanup(job.cleanup, job.operation)
                self._active -= 1
                self._queue.task_done()

    def _finish_without_running(
        self,
        job: _InferenceJob[object],
        error: InferenceQueueError,
    ) -> None:
        job.started.set()
        if not job.result.done():
            job.result.set_exception(error)
        self._safe_cleanup(job.cleanup, job.operation)

    @staticmethod
    def _safe_cleanup(cleanup: Callable[[], None], operation: str) -> None:
        try:
            cleanup()
        except OSError:
            logger.exception("Could not clean up temporary audio for %s", operation)

    @staticmethod
    def _consume_unobserved_exception(future: asyncio.Future[object]) -> None:
        if not future.cancelled():
            future.exception()
