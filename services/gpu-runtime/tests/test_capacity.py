import pytest

from readirect_gpu_runtime import InferenceCapacity


def test_capacity_snapshot_reports_bounded_admission_and_overload() -> None:
    capacity = InferenceCapacity(
        service_name="asr",
        concurrency=1,
        max_waiting=3,
        queue_wait_timeout_seconds=20,
        gpu_coordination_enabled=True,
        gpu_permit_timeout_seconds=30,
    )

    snapshot = capacity.snapshot(
        {
            "active": 1,
            "waiting": 3,
            "rejected_total": 2,
            "timed_out_total": 1,
        },
        {"resource_key": "cuda-default", "timeouts_total": 1},
    )

    assert snapshot == {
        "service": "asr",
        "configuration_valid": True,
        "local_concurrency": 1,
        "waiting_limit": 3,
        "admitted_request_limit": 4,
        "admitted_requests": 4,
        "queue_slots_available": 0,
        "utilization_percent": 100.0,
        "saturated": True,
        "maximum_pre_execution_wait_seconds": 50,
        "gpu_serialized": True,
        "gpu_resource_key": "cuda-default",
        "overload_responses_total": 4,
    }


def test_gpu_deployment_rejects_multiple_local_inference_workers() -> None:
    with pytest.raises(ValueError, match="exactly one local inference worker"):
        InferenceCapacity(
            service_name="asr",
            concurrency=2,
            max_waiting=3,
            queue_wait_timeout_seconds=20,
            gpu_coordination_enabled=True,
            gpu_permit_timeout_seconds=30,
        )
