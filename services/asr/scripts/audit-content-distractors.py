from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path
from typing import Any

import httpx


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CONTENT_MANIFEST = (
    REPOSITORY_ROOT
    / "services"
    / "asr"
    / "fixtures"
    / "content"
    / "millie2"
    / "fixture-manifest.json"
)
DEFAULT_DISTRACTOR_ROOT = (
    REPOSITORY_ROOT / "services" / "asr" / "fixtures" / "distractors"
)
DEFAULT_AUDIT_PATH = DEFAULT_DISTRACTOR_ROOT / "distractor-evaluation-audit.json"
DISTRACTOR_TYPES = ("fptn", "silence")
AUDIT_VERSION = "content-distractor-raw-v1"
ASSIGNMENT_ALGORITHM = "sorted-category-round-robin-content-id-v1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Submit known-negative noisy-speech and silence fixtures to Mu against "
            "deterministically assigned curriculum targets."
        )
    )
    parser.add_argument("--staff-user-id", type=int, required=True)
    parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    parser.add_argument("--content-manifest", type=Path, default=DEFAULT_CONTENT_MANIFEST)
    parser.add_argument("--distractor-root", type=Path, default=DEFAULT_DISTRACTOR_ROOT)
    parser.add_argument("--audit-path", type=Path, default=DEFAULT_AUDIT_PATH)
    parser.add_argument("--request-attempts", type=int, default=3)
    return parser.parse_args()


def load_targets(path: Path) -> list[dict[str, str]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    fixtures = payload.get("fixtures")
    if not isinstance(fixtures, dict) or not fixtures:
        raise RuntimeError(f"Content manifest has no fixtures: {path}")

    targets = []
    for content_id, fixture in sorted(fixtures.items()):
        targets.append(
            {
                "content_id": str(content_id),
                "expected_text": str(fixture["expected_text"]),
                "task_type": str(fixture["task_type"]),
            }
        )
    return targets


def assigned_records(root: Path, targets: list[dict[str, str]]) -> list[dict[str, Any]]:
    records = []
    for distractor_type in DISTRACTOR_TYPES:
        directory = root / distractor_type
        if not directory.is_dir():
            raise RuntimeError(f"Missing distractor directory: {directory}")
        audio_paths = sorted(directory.glob("*.wav"), key=lambda path: path.name.lower())
        if not audio_paths:
            raise RuntimeError(f"Distractor directory has no WAV files: {directory}")

        for index, audio_path in enumerate(audio_paths):
            records.append(
                {
                    "audit_key": f"{distractor_type}:{audio_path.name}",
                    "distractor_type": distractor_type,
                    "audio_path": audio_path,
                    "target": targets[index % len(targets)],
                }
            )
    return records


def load_or_create_audit(path: Path) -> dict[str, Any]:
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("audit_version") != AUDIT_VERSION:
            raise RuntimeError(
                f"Existing audit uses {payload.get('audit_version')!r}; "
                f"expected {AUDIT_VERSION!r}."
            )
        if payload.get("assignment_algorithm") != ASSIGNMENT_ALGORITHM:
            raise RuntimeError("Existing audit uses a different assignment algorithm.")
        return payload

    return {
        "audit_version": AUDIT_VERSION,
        "assignment_algorithm": ASSIGNMENT_ALGORITHM,
        "ground_truth": "negative",
        "noise_reduction_enabled": False,
        "records": {},
    }


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def request_with_retries(
    client: httpx.Client,
    method: str,
    url: str,
    attempts: int,
    **kwargs: Any,
) -> httpx.Response:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            response = client.request(method, url, **kwargs)
            response.raise_for_status()
            return response
        except (httpx.HTTPError, OSError) as error:
            last_error = error
            if attempt < attempts:
                time.sleep(attempt)
    assert last_error is not None
    raise last_error


def audit_distractor(
    client: httpx.Client,
    api_prefix: str,
    assignment: dict[str, Any],
    request_attempts: int,
) -> dict[str, Any]:
    audio_path: Path = assignment["audio_path"]
    target: dict[str, str] = assignment["target"]
    audio = audio_path.read_bytes()

    response = request_with_retries(
        client,
        "POST",
        f"{api_prefix}/speech/mu/transcribe",
        request_attempts,
        data={
            "expected_text": target["expected_text"],
            "task_type": target["task_type"],
            "item_key": target["content_id"],
            "distractor_audit_version": AUDIT_VERSION,
            "ground_truth": "negative",
            "distractor_type": assignment["distractor_type"],
            "assigned_content_id": target["content_id"],
        },
        files={"audio": (audio_path.name, audio, "audio/wav")},
    ).json()
    attempt_id = int(response["sandbox_attempt_id"])

    request_with_retries(
        client,
        "POST",
        f"{api_prefix}/speech/attempts/{attempt_id}/review",
        request_attempts,
        json={"review_outcome": "expected_wrong"},
    )

    comparison = response["comparison"]
    return {
        "status": "completed",
        "distractor_type": assignment["distractor_type"],
        "audio_relative_path": (
            Path("distractors") / assignment["distractor_type"] / audio_path.name
        ).as_posix(),
        "audio_sha256": hashlib.sha256(audio).hexdigest(),
        "sandbox_attempt_id": attempt_id,
        "assigned_content_id": target["content_id"],
        "expected_text": target["expected_text"],
        "task_type": target["task_type"],
        "raw_transcript": str(response.get("raw_transcript", "")),
        "raw_accepted": bool(comparison["exact_match"]),
    }


def summarize(audit: dict[str, Any], planned: int) -> dict[str, Any]:
    completed = [
        record
        for record in audit["records"].values()
        if record.get("status") == "completed"
    ]
    by_type = {}
    for distractor_type in DISTRACTOR_TYPES:
        records = [
            record
            for record in completed
            if record.get("distractor_type") == distractor_type
        ]
        false_positives = sum(bool(record.get("raw_accepted")) for record in records)
        by_type[distractor_type] = {
            "attempts": len(records),
            "false_positives": false_positives,
            "true_negatives": len(records) - false_positives,
        }

    false_positives = sum(bool(record.get("raw_accepted")) for record in completed)
    return {
        "planned_attempts": planned,
        "completed_attempts": len(completed),
        "false_positives": false_positives,
        "true_negatives": len(completed) - false_positives,
        "by_type": by_type,
    }


def main() -> None:
    args = parse_args()
    content_manifest = args.content_manifest.resolve()
    distractor_root = args.distractor_root.resolve()
    audit_path = args.audit_path.resolve()
    targets = load_targets(content_manifest)
    assignments = assigned_records(distractor_root, targets)
    audit = load_or_create_audit(audit_path)
    api_prefix = f"{args.api_url.rstrip('/')}/api/staff/system-admin/{args.staff_user_id}"

    with httpx.Client(timeout=httpx.Timeout(240.0, connect=10.0)) as client:
        for index, assignment in enumerate(assignments, start=1):
            audit_key = assignment["audit_key"]
            audio_path: Path = assignment["audio_path"]
            target: dict[str, str] = assignment["target"]
            audio_sha256 = hashlib.sha256(audio_path.read_bytes()).hexdigest()
            existing = audit["records"].get(audit_key)
            if (
                existing
                and existing.get("status") == "completed"
                and existing.get("audio_sha256") == audio_sha256
                and existing.get("assigned_content_id") == target["content_id"]
            ):
                print(f"[{index}/{len(assignments)}] SKIP {audit_key}", flush=True)
                continue

            print(
                f"[{index}/{len(assignments)}] MU {audit_key} -> {target['content_id']}",
                flush=True,
            )
            try:
                audit["records"][audit_key] = audit_distractor(
                    client,
                    api_prefix,
                    assignment,
                    args.request_attempts,
                )
            except Exception as error:
                audit["records"][audit_key] = {
                    "status": "failed",
                    "distractor_type": assignment["distractor_type"],
                    "audio_sha256": audio_sha256,
                    "assigned_content_id": target["content_id"],
                    "error": str(error),
                }
                audit["summary"] = summarize(audit, len(assignments))
                write_json_atomic(audit_path, audit)
                raise

            audit["summary"] = summarize(audit, len(assignments))
            write_json_atomic(audit_path, audit)

    audit["summary"] = summarize(audit, len(assignments))
    write_json_atomic(audit_path, audit)
    print(json.dumps(audit["summary"], indent=2), flush=True)


if __name__ == "__main__":
    main()
