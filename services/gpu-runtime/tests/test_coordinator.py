import multiprocessing
import threading
from pathlib import Path

import pytest

from readirect_gpu_runtime import (
    DuplicateServiceProcess,
    GpuCoordinator,
    GpuPermitTimeout,
    ServiceProcessGuard,
)


def hold_gpu_in_child(lock_directory: str, acquired, release) -> None:
    coordinator = GpuCoordinator(
        service_name="child",
        lock_directory=Path(lock_directory),
        resource_key="test-gpu",
        acquire_timeout_seconds=2,
        poll_interval_seconds=0.01,
    )

    def work() -> None:
        acquired.set()
        if not release.wait(2):
            raise RuntimeError("test release was not received")

    coordinator.run("child_work", work)


def hold_process_guard_in_child(lock_directory: str, acquired, release) -> None:
    guard = ServiceProcessGuard(
        service_name="asr",
        lock_directory=Path(lock_directory),
        resource_key="test-gpu",
    )
    guard.acquire()
    acquired.set()
    if not release.wait(2):
        raise RuntimeError("test release was not received")
    guard.release()


def test_gpu_permit_serializes_work_across_processes(tmp_path: Path) -> None:
    context = multiprocessing.get_context("spawn")
    child_acquired = context.Event()
    release_child = context.Event()
    child = context.Process(
        target=hold_gpu_in_child,
        args=(str(tmp_path), child_acquired, release_child),
    )
    child.start()
    assert child_acquired.wait(2)

    coordinator = GpuCoordinator(
        service_name="parent",
        lock_directory=tmp_path,
        resource_key="test-gpu",
        acquire_timeout_seconds=2,
        poll_interval_seconds=0.01,
    )
    parent_entered = threading.Event()
    outcome: list[str] = []

    def run_parent() -> None:
        result = coordinator.run("parent_work", lambda: parent_entered.set() or "done")
        outcome.append(result.value)

    parent = threading.Thread(target=run_parent)
    parent.start()
    assert not parent_entered.wait(0.1)
    assert coordinator.snapshot()["waiting"] == 1

    release_child.set()
    assert parent_entered.wait(2)
    parent.join(timeout=2)
    child.join(timeout=2)

    assert not parent.is_alive()
    assert child.exitcode == 0
    assert outcome == ["done"]
    assert coordinator.snapshot()["acquisitions_total"] == 1
    assert float(coordinator.snapshot()["last_wait_seconds"]) > 0


def test_gpu_permit_wait_is_bounded(tmp_path: Path) -> None:
    context = multiprocessing.get_context("spawn")
    child_acquired = context.Event()
    release_child = context.Event()
    child = context.Process(
        target=hold_gpu_in_child,
        args=(str(tmp_path), child_acquired, release_child),
    )
    child.start()
    assert child_acquired.wait(2)

    coordinator = GpuCoordinator(
        service_name="parent",
        lock_directory=tmp_path,
        resource_key="test-gpu",
        acquire_timeout_seconds=0.05,
        poll_interval_seconds=0.01,
    )
    try:
        with pytest.raises(GpuPermitTimeout, match="gpu_permit_timeout"):
            coordinator.run("timed_out", lambda: None)
    finally:
        release_child.set()
        child.join(timeout=2)

    assert child.exitcode == 0
    assert coordinator.snapshot()["timeouts_total"] == 1
    assert coordinator.snapshot()["waiting"] == 0


def test_process_guard_rejects_duplicate_service_for_same_gpu(tmp_path: Path) -> None:
    context = multiprocessing.get_context("spawn")
    child_acquired = context.Event()
    release_child = context.Event()
    child = context.Process(
        target=hold_process_guard_in_child,
        args=(str(tmp_path), child_acquired, release_child),
    )
    child.start()
    assert child_acquired.wait(2)

    guard = ServiceProcessGuard(
        service_name="asr",
        lock_directory=tmp_path,
        resource_key="test-gpu",
    )
    with pytest.raises(DuplicateServiceProcess, match="duplicate_gpu_service_process"):
        guard.acquire()

    release_child.set()
    child.join(timeout=2)
    assert child.exitcode == 0

    guard.acquire()
    assert guard.snapshot()["acquired"] is True
    guard.release()


def test_failed_gpu_work_releases_permit_for_next_request(tmp_path: Path) -> None:
    coordinator = GpuCoordinator(
        service_name="asr",
        lock_directory=tmp_path,
        resource_key="failure-recovery",
        acquire_timeout_seconds=1,
        poll_interval_seconds=0.01,
    )

    with pytest.raises(RuntimeError, match="inference failed"):
        coordinator.run(
            "failing",
            lambda: (_ for _ in ()).throw(RuntimeError("inference failed")),
        )

    recovered = coordinator.run("recovered", lambda: "ok")

    assert recovered.value == "ok"
    assert coordinator.snapshot()["holding"] is False
    assert coordinator.snapshot()["acquisitions_total"] == 2
