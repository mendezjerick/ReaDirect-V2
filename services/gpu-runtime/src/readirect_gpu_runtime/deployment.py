from __future__ import annotations

from typing import Any, Mapping


def validate_speech_deployment(
    asr: Mapping[str, Any],
    tts: Mapping[str, Any],
    *,
    require_cuda: bool = False,
) -> dict[str, object]:
    """Validate the runtime contract shared by the ASR and TTS services."""

    issues: list[str] = []
    services = {"asr": asr, "tts": tts}

    for name, report in services.items():
        if report.get("status") != "ready":
            issues.append(f"{name} is not ready")

        queue = _mapping(report.get("inference_queue"))
        if queue.get("healthy") is not True or queue.get("accepting") is not True:
            issues.append(f"{name} inference queue is not accepting work")
        if queue.get("concurrency") != 1:
            issues.append(f"{name} must expose exactly one local inference worker")
        if not _positive_int(queue.get("max_waiting")):
            issues.append(f"{name} inference queue is not bounded")

        capacity = _mapping(report.get("capacity"))
        if capacity.get("configuration_valid") is not True:
            issues.append(f"{name} capacity configuration is not valid")
        if not _positive_int(capacity.get("admitted_request_limit")):
            issues.append(f"{name} admitted request limit is missing")
        expected_admitted_limit = _non_negative_int(queue.get("concurrency")) + (
            _non_negative_int(queue.get("max_waiting"))
        )
        if capacity.get("admitted_request_limit") != expected_admitted_limit:
            issues.append(f"{name} admitted request limit does not match its queue")

        gpu = _mapping(report.get("gpu_coordination"))
        device = _device(name, report)
        using_cuda = device == "cuda"
        if name == "asr" and _mapping(report.get("mu")).get("available") is not True:
            issues.append("asr model is unavailable")
        if name == "tts" and report.get("runtime_ready") is not True:
            issues.append("tts model is not resident")
        if require_cuda and not using_cuda:
            issues.append(f"{name} is not using CUDA")
        if using_cuda and gpu.get("enabled") is not True:
            issues.append(f"{name} is using CUDA without shared GPU coordination")
        if gpu.get("enabled") is True:
            guard = _mapping(gpu.get("process_guard"))
            if guard.get("acquired") is not True:
                issues.append(f"{name} GPU process guard is not acquired")

    asr_gpu = _mapping(asr.get("gpu_coordination"))
    tts_gpu = _mapping(tts.get("gpu_coordination"))
    both_coordinated = asr_gpu.get("enabled") is True and tts_gpu.get("enabled") is True
    resource_key = asr_gpu.get("resource_key")
    if both_coordinated and resource_key != tts_gpu.get("resource_key"):
        issues.append("ASR and TTS use different GPU resource keys")

    admitted_limit = sum(
        _non_negative_int(_mapping(report.get("capacity")).get("admitted_request_limit"))
        for report in services.values()
    )
    overload_responses = sum(
        _non_negative_int(_mapping(report.get("capacity")).get("overload_responses_total"))
        for report in services.values()
    )

    return {
        "valid": not issues,
        "issues": issues,
        "shared_gpu_serialization": both_coordinated,
        "gpu_resource_key": resource_key if both_coordinated else None,
        "global_gpu_concurrency": 1 if both_coordinated else None,
        "combined_admitted_request_limit": admitted_limit,
        "overload_responses_total": overload_responses,
    }


def _device(name: str, report: Mapping[str, Any]) -> object:
    if name == "asr":
        return _mapping(report.get("mu")).get("device")
    return report.get("device")


def _mapping(value: object) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _positive_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def _non_negative_int(value: object) -> int:
    if isinstance(value, int) and not isinstance(value, bool):
        return max(value, 0)
    return 0
