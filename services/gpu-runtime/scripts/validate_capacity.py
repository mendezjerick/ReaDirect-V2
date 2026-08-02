from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "src"
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from readirect_gpu_runtime import validate_speech_deployment  # noqa: E402


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate ReaDirect speech capacity and shared-GPU deployment.",
    )
    parser.add_argument("--asr-url", default="http://127.0.0.1:8001")
    parser.add_argument("--tts-url", default="http://127.0.0.1:8002")
    parser.add_argument("--require-cuda", action="store_true")
    parser.add_argument(
        "--exercise",
        action="store_true",
        help="Run one concurrent ASR/TTS inference sample after validation.",
    )
    parser.add_argument(
        "--asr-audio",
        type=Path,
        help="Audio fixture required with --exercise.",
    )
    parser.add_argument("--tts-reference", default="result")
    parser.add_argument("--timeout-seconds", type=float, default=240.0)
    parser.add_argument(
        "--minimum-free-memory-mib",
        type=int,
        default=1024,
        help="Required GPU memory headroom during the sample (default: 1024 MiB).",
    )
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def fetch_json(url: str, timeout_seconds: float, token: str) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected a JSON object from {url}")
    return payload


def nvidia_memory_snapshot() -> list[dict[str, object]]:
    command = [
        "nvidia-smi",
        "--query-gpu=index,name,memory.total,memory.used,memory.free,utilization.gpu",
        "--format=csv,noheader,nounits",
    ]
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True,
            timeout=10,
        )
    except (FileNotFoundError, subprocess.SubprocessError):
        return []

    devices: list[dict[str, object]] = []
    for line in result.stdout.splitlines():
        values = [value.strip() for value in line.split(",")]
        if len(values) != 6:
            continue
        devices.append(
            {
                "index": int(values[0]),
                "name": values[1],
                "memory_total_mib": int(values[2]),
                "memory_used_mib": int(values[3]),
                "memory_free_mib": int(values[4]),
                "utilization_percent": int(values[5]),
            }
        )
    return devices


def summarize_memory_samples(
    samples: list[list[dict[str, object]]],
    minimum_free_memory_mib: int,
) -> list[dict[str, object]]:
    by_device: dict[int, list[dict[str, object]]] = {}
    for sample in samples:
        for device in sample:
            by_device.setdefault(int(device["index"]), []).append(device)

    summaries: list[dict[str, object]] = []
    for index, devices in sorted(by_device.items()):
        minimum_free = min(int(device["memory_free_mib"]) for device in devices)
        summaries.append(
            {
                "index": index,
                "name": devices[0]["name"],
                "samples": len(devices),
                "peak_memory_used_mib": max(
                    int(device["memory_used_mib"]) for device in devices
                ),
                "minimum_memory_free_mib": minimum_free,
                "minimum_required_free_mib": minimum_free_memory_mib,
                "headroom_valid": minimum_free >= minimum_free_memory_mib,
                "peak_utilization_percent": max(
                    int(device["utilization_percent"]) for device in devices
                ),
            }
        )
    return summaries


def exercise_inference(
    *,
    asr_url: str,
    tts_url: str,
    audio_path: Path,
    tts_reference: str,
    timeout_seconds: float,
    asr_token: str,
    tts_token: str,
) -> list[dict[str, object]]:
    if not audio_path.is_file():
        raise FileNotFoundError(f"ASR fixture does not exist: {audio_path}")

    timestamp = int(time.time() * 1000)
    calls = {
        "asr": lambda: post_asr(asr_url, audio_path, timeout_seconds, asr_token),
        "tts": lambda: post_tts(
            tts_url,
            f"ReaDirect capacity validation {timestamp}.",
            tts_reference,
            timeout_seconds,
            tts_token,
        ),
    }
    results: list[dict[str, object]] = []
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(call): name for name, call in calls.items()}
        for future in as_completed(futures):
            name = futures[future]
            try:
                result = future.result()
            except Exception as error:
                results.append({"service": name, "ok": False, "error": str(error)})
            else:
                results.append({"service": name, "ok": True, **result})
    return sorted(results, key=lambda result: str(result["service"]))


def post_asr(
    base_url: str,
    audio_path: Path,
    timeout_seconds: float,
    token: str,
) -> dict[str, object]:
    boundary = f"readirect-{uuid.uuid4().hex}"
    body = multipart_body(
        boundary,
        fields={"expected_text": "", "task_type": "word"},
        file_field="audio",
        file_path=audio_path,
    )
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/mu/transcribe",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )
    started = time.perf_counter()
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        payload = json.loads(response.read().decode("utf-8"))
        status = response.status
    performance = payload.get("performance", {}) if isinstance(payload, dict) else {}
    return {
        "status": status,
        "elapsed_seconds": round(time.perf_counter() - started, 4),
        "queue_wait_seconds": performance.get("queue_wait_seconds"),
        "gpu_wait_seconds": performance.get("gpu_wait_seconds"),
    }


def post_tts(
    base_url: str,
    text: str,
    reference: str,
    timeout_seconds: float,
    token: str,
) -> dict[str, object]:
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/synthesize",
        data=json.dumps({"text": text, "reference": reference}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    started = time.perf_counter()
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        response.read()
        status = response.status
        queue_wait = response.headers.get("X-ReaDirect-TTS-Queue-Wait")
        gpu_wait = response.headers.get("X-ReaDirect-TTS-GPU-Wait")
    return {
        "status": status,
        "elapsed_seconds": round(time.perf_counter() - started, 4),
        "queue_wait_seconds": _optional_float(queue_wait),
        "gpu_wait_seconds": _optional_float(gpu_wait),
    }


def multipart_body(
    boundary: str,
    *,
    fields: dict[str, str],
    file_field: str,
    file_path: Path,
) -> bytes:
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                value.encode(),
                b"\r\n",
            ]
        )
    chunks.extend(
        [
            f"--{boundary}\r\n".encode(),
            (
                f'Content-Disposition: form-data; name="{file_field}"; '
                f'filename="{file_path.name}"\r\n'
            ).encode(),
            b"Content-Type: audio/wav\r\n\r\n",
            file_path.read_bytes(),
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    return b"".join(chunks)


def _optional_float(value: str | None) -> float | None:
    return float(value) if value is not None else None


def main() -> int:
    arguments = parse_arguments()
    asr_token = os.getenv("ASR_SERVICE_TOKEN", "").strip()
    tts_token = os.getenv("TTS_SERVICE_TOKEN", "").strip()
    if len(asr_token) < 32 or len(tts_token) < 32:
        raise ValueError("ASR_SERVICE_TOKEN and TTS_SERVICE_TOKEN must each contain at least 32 characters")
    if arguments.timeout_seconds <= 0:
        raise ValueError("--timeout-seconds must be greater than 0")
    if arguments.minimum_free_memory_mib < 0:
        raise ValueError("--minimum-free-memory-mib cannot be negative")
    if arguments.exercise and arguments.asr_audio is None:
        raise ValueError("--asr-audio is required with --exercise")

    asr = fetch_json(
        f"{arguments.asr_url.rstrip('/')}/internal/status",
        arguments.timeout_seconds,
        asr_token,
    )
    tts = fetch_json(
        f"{arguments.tts_url.rstrip('/')}/internal/status",
        arguments.timeout_seconds,
        tts_token,
    )
    validation = validate_speech_deployment(
        asr,
        tts,
        require_cuda=arguments.require_cuda,
    )
    gpu_samples = [nvidia_memory_snapshot()]
    report: dict[str, object] = {
        "validation": validation,
        "gpu_before": gpu_samples[0],
        "services": {"asr": asr, "tts": tts},
    }

    if arguments.exercise:
        stop_sampling = threading.Event()

        def sample_gpu() -> None:
            while not stop_sampling.wait(0.5):
                gpu_samples.append(nvidia_memory_snapshot())

        sampler = threading.Thread(target=sample_gpu, name="gpu-memory-sampler")
        sampler.start()
        try:
            exercise = exercise_inference(
                asr_url=arguments.asr_url,
                tts_url=arguments.tts_url,
                audio_path=arguments.asr_audio,
                tts_reference=arguments.tts_reference,
                timeout_seconds=arguments.timeout_seconds,
                asr_token=asr_token,
                tts_token=tts_token,
            )
        finally:
            stop_sampling.set()
            sampler.join(timeout=2)
        report["exercise"] = exercise
        gpu_samples.append(nvidia_memory_snapshot())
        report["gpu_after"] = gpu_samples[-1]
        if any(result.get("ok") is not True for result in exercise):
            validation["valid"] = False
            validation["issues"].append("concurrent inference exercise failed")

    memory_summary = summarize_memory_samples(
        gpu_samples,
        arguments.minimum_free_memory_mib,
    )
    report["gpu_capacity"] = memory_summary
    if arguments.require_cuda and not memory_summary:
        validation["valid"] = False
        validation["issues"].append("nvidia-smi did not report a CUDA device")
    if any(summary["headroom_valid"] is not True for summary in memory_summary):
        validation["valid"] = False
        validation["issues"].append("GPU memory headroom fell below the required minimum")

    rendered = json.dumps(report, indent=2)
    if arguments.output is not None:
        arguments.output.parent.mkdir(parents=True, exist_ok=True)
        arguments.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return 0 if validation["valid"] is True else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, urllib.error.URLError) as error:
        print(json.dumps({"valid": False, "error": str(error)}, indent=2), file=sys.stderr)
        raise SystemExit(1) from error
