from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


@dataclass(frozen=True)
class InferenceCapacity:
    """Validated deployment limits for one inference service."""

    service_name: str
    concurrency: int
    max_waiting: int
    queue_wait_timeout_seconds: float
    gpu_coordination_enabled: bool
    gpu_permit_timeout_seconds: float

    def __post_init__(self) -> None:
        if not self.service_name.strip():
            raise ValueError("Inference capacity service name cannot be empty")
        if self.concurrency < 1:
            raise ValueError("Inference concurrency must be at least 1")
        if self.max_waiting < 1:
            raise ValueError("Inference queue capacity must be at least 1")
        if self.queue_wait_timeout_seconds <= 0:
            raise ValueError("Inference queue wait timeout must be greater than 0")
        if self.gpu_permit_timeout_seconds <= 0:
            raise ValueError("GPU permit timeout must be greater than 0")
        if self.gpu_coordination_enabled and self.concurrency != 1:
            raise ValueError(
                f"{self.service_name} must use exactly one local inference worker "
                "when shared GPU coordination is enabled"
            )

    def snapshot(
        self,
        queue: Mapping[str, object],
        gpu: Mapping[str, object],
    ) -> dict[str, object]:
        active = _non_negative_int(queue.get("active"))
        waiting = _non_negative_int(queue.get("waiting"))
        admitted_limit = self.concurrency + self.max_waiting
        admitted = min(active + waiting, admitted_limit)
        queue_slots_available = max(self.max_waiting - waiting, 0)
        pre_execution_wait_ceiling = self.queue_wait_timeout_seconds
        if self.gpu_coordination_enabled:
            pre_execution_wait_ceiling += self.gpu_permit_timeout_seconds

        return {
            "service": self.service_name,
            "configuration_valid": True,
            "local_concurrency": self.concurrency,
            "waiting_limit": self.max_waiting,
            "admitted_request_limit": admitted_limit,
            "admitted_requests": admitted,
            "queue_slots_available": queue_slots_available,
            "utilization_percent": round((admitted / admitted_limit) * 100, 2),
            "saturated": waiting >= self.max_waiting,
            "maximum_pre_execution_wait_seconds": pre_execution_wait_ceiling,
            "gpu_serialized": self.gpu_coordination_enabled,
            "gpu_resource_key": gpu.get("resource_key"),
            "overload_responses_total": _non_negative_int(queue.get("rejected_total"))
            + _non_negative_int(queue.get("timed_out_total"))
            + _non_negative_int(gpu.get("timeouts_total")),
        }


def _non_negative_int(value: object) -> int:
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return max(value, 0)
    return 0
