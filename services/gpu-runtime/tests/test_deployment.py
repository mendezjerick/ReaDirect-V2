from readirect_gpu_runtime import validate_speech_deployment


def service_report(name: str, resource_key: str = "cuda-default") -> dict[str, object]:
    report: dict[str, object] = {
        "status": "ready",
        "device": "cuda",
        "inference_queue": {
            "healthy": True,
            "accepting": True,
            "concurrency": 1,
            "max_waiting": 4,
        },
        "capacity": {
            "configuration_valid": True,
            "admitted_request_limit": 5,
            "overload_responses_total": 0,
        },
        "gpu_coordination": {
            "enabled": True,
            "resource_key": resource_key,
            "process_guard": {"acquired": True},
        },
    }
    if name == "asr":
        report["mu"] = {"available": True, "device": "cuda"}
    else:
        report["runtime_ready"] = True
    return report


def test_validates_shared_single_gpu_deployment() -> None:
    result = validate_speech_deployment(
        service_report("asr"),
        service_report("tts"),
        require_cuda=True,
    )

    assert result["valid"] is True
    assert result["issues"] == []
    assert result["shared_gpu_serialization"] is True
    assert result["global_gpu_concurrency"] == 1
    assert result["combined_admitted_request_limit"] == 10


def test_rejects_mismatched_gpu_keys_and_unbounded_worker_configuration() -> None:
    asr = service_report("asr", "cuda-0")
    tts = service_report("tts", "cuda-1")
    tts["inference_queue"]["concurrency"] = 2  # type: ignore[index]
    tts["gpu_coordination"]["process_guard"] = {"acquired": False}  # type: ignore[index]

    result = validate_speech_deployment(asr, tts)

    assert result["valid"] is False
    assert result["issues"] == [
        "tts must expose exactly one local inference worker",
        "tts admitted request limit does not match its queue",
        "tts GPU process guard is not acquired",
        "ASR and TTS use different GPU resource keys",
    ]
