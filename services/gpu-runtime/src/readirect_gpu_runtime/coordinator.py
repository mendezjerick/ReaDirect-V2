from __future__ import annotations

import errno
import logging
import re
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Callable, Generic, TypeVar

logger = logging.getLogger(__name__)

Result = TypeVar("Result")
RESOURCE_KEY_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$")


class GpuPermitTimeout(RuntimeError):
    code = "gpu_permit_timeout"


class DuplicateServiceProcess(RuntimeError):
    code = "duplicate_gpu_service_process"


@dataclass(frozen=True)
class GpuOutcome(Generic[Result]):
    value: Result
    wait_seconds: float


class GpuCoordinator:
    """Coordinate CUDA work across local ReaDirect service processes."""

    def __init__(
        self,
        *,
        service_name: str,
        lock_directory: Path,
        resource_key: str = "cuda-default",
        enabled: bool = True,
        acquire_timeout_seconds: float = 150.0,
        poll_interval_seconds: float = 0.05,
    ) -> None:
        if not service_name.strip():
            raise ValueError("GPU coordinator service name cannot be empty")
        if not RESOURCE_KEY_PATTERN.fullmatch(resource_key):
            raise ValueError("READIRECT_GPU_RESOURCE_KEY contains unsupported characters")
        if acquire_timeout_seconds <= 0:
            raise ValueError("READIRECT_GPU_PERMIT_TIMEOUT_SECONDS must be greater than 0")
        if poll_interval_seconds <= 0:
            raise ValueError("GPU coordinator poll interval must be greater than 0")

        self.service_name = service_name.strip()
        self.resource_key = resource_key
        self.enabled = enabled
        self.acquire_timeout_seconds = acquire_timeout_seconds
        self.poll_interval_seconds = poll_interval_seconds
        self._lock_path = lock_directory.resolve() / f"{resource_key}.lock"
        self._state_lock = threading.Lock()
        self._waiting = 0
        self._holding = False
        self._operation: str | None = None
        self._acquisitions_total = 0
        self._timeouts_total = 0
        self._last_wait_seconds = 0.0
        self._total_wait_seconds = 0.0

    def run(self, operation: str, work: Callable[[], Result]) -> GpuOutcome[Result]:
        if not self.enabled:
            return GpuOutcome(value=work(), wait_seconds=0.0)

        waiting_started = time.perf_counter()
        deadline = waiting_started + self.acquire_timeout_seconds
        stream = self._open_lock_file()

        with self._state_lock:
            self._waiting += 1

        acquired = False
        waiting_registered = True
        try:
            while not acquired:
                acquired = _try_lock(stream)
                if acquired:
                    break
                if time.perf_counter() >= deadline:
                    wait_seconds = time.perf_counter() - waiting_started
                    with self._state_lock:
                        self._waiting -= 1
                        waiting_registered = False
                        self._timeouts_total += 1
                        self._last_wait_seconds = wait_seconds
                        self._total_wait_seconds += wait_seconds
                    raise GpuPermitTimeout(GpuPermitTimeout.code)
                time.sleep(self.poll_interval_seconds)

            acquired_at = time.perf_counter()
            wait_seconds = acquired_at - waiting_started
            with self._state_lock:
                self._waiting -= 1
                waiting_registered = False
                self._holding = True
                self._operation = operation
                self._acquisitions_total += 1
                self._last_wait_seconds = wait_seconds
                self._total_wait_seconds += wait_seconds

            logger.info(
                "%s acquired GPU %s for %s after %.4fs",
                self.service_name,
                self.resource_key,
                operation,
                wait_seconds,
            )
            return GpuOutcome(value=work(), wait_seconds=wait_seconds)
        finally:
            if waiting_registered:
                with self._state_lock:
                    self._waiting -= 1
            if acquired:
                _unlock(stream)
                with self._state_lock:
                    self._holding = False
                    self._operation = None
                # Give an already-waiting peer process a chance to take the permit
                # before this service begins its next locally queued job.
                time.sleep(self.poll_interval_seconds)
            stream.close()

    def snapshot(self) -> dict[str, object]:
        with self._state_lock:
            return {
                "enabled": self.enabled,
                "service": self.service_name,
                "resource_key": self.resource_key,
                "acquire_timeout_seconds": self.acquire_timeout_seconds,
                "waiting": self._waiting,
                "holding": self._holding,
                "operation": self._operation,
                "acquisitions_total": self._acquisitions_total,
                "timeouts_total": self._timeouts_total,
                "last_wait_seconds": round(self._last_wait_seconds, 4),
                "total_wait_seconds": round(self._total_wait_seconds, 4),
            }

    def _open_lock_file(self) -> BinaryIO:
        self._lock_path.parent.mkdir(parents=True, exist_ok=True)
        stream = self._lock_path.open("a+b", buffering=0)
        if self._lock_path.stat().st_size == 0:
            stream.write(b"\0")
        stream.seek(0)
        return stream


class ServiceProcessGuard:
    """Prevent duplicate model-serving processes for one service and GPU key."""

    def __init__(
        self,
        *,
        service_name: str,
        lock_directory: Path,
        resource_key: str = "cuda-default",
        enabled: bool = True,
    ) -> None:
        if not service_name.strip():
            raise ValueError("GPU process guard service name cannot be empty")
        if not RESOURCE_KEY_PATTERN.fullmatch(resource_key):
            raise ValueError("READIRECT_GPU_RESOURCE_KEY contains unsupported characters")

        self.service_name = service_name.strip()
        self.resource_key = resource_key
        self.enabled = enabled
        self._lock_path = (
            lock_directory.resolve() / f"{resource_key}.{self.service_name}.process.lock"
        )
        self._stream: BinaryIO | None = None

    def acquire(self) -> None:
        if not self.enabled or self._stream is not None:
            return

        self._lock_path.parent.mkdir(parents=True, exist_ok=True)
        stream = self._lock_path.open("a+b", buffering=0)
        if self._lock_path.stat().st_size == 0:
            stream.write(b"\0")
        stream.seek(0)
        if not _try_lock(stream):
            stream.close()
            raise DuplicateServiceProcess(DuplicateServiceProcess.code)
        self._stream = stream

    def release(self) -> None:
        if self._stream is None:
            return
        _unlock(self._stream)
        self._stream.close()
        self._stream = None

    def snapshot(self) -> dict[str, object]:
        return {
            "enabled": self.enabled,
            "acquired": self._stream is not None if self.enabled else False,
            "service": self.service_name,
            "resource_key": self.resource_key,
        }


if sys.platform == "win32":
    import msvcrt

    def _try_lock(stream: BinaryIO) -> bool:
        stream.seek(0)
        try:
            msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError as error:
            if error.errno in {errno.EACCES, errno.EAGAIN, errno.EDEADLK}:
                return False
            raise
        return True

    def _unlock(stream: BinaryIO) -> None:
        stream.seek(0)
        msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)

else:
    import fcntl

    def _try_lock(stream: BinaryIO) -> bool:
        try:
            fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return False
        return True

    def _unlock(stream: BinaryIO) -> None:
        fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
