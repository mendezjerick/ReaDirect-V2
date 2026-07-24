from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
from pathlib import Path
from typing import Any

import httpx


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_FIXTURE_ROOT = REPOSITORY_ROOT / "services" / "asr" / "fixtures" / "content"
DEFAULT_AUDIT_PATH = DEFAULT_FIXTURE_ROOT / "fixture-equivalence-audit.json"
FIXTURE_SETS = ("millie2", "millie2-plus", "jz", "shai")
AUDIT_VERSION = "four-voice-item-token-v3"
LEGACY_AUDIT_VERSIONS = {
    "two-voice-item-token-v1",
    "four-voice-item-token-v2",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Submit four correct content-fixture variants to Mu and author item-scoped "
            "token equivalences for every observed substitution."
        )
    )
    parser.add_argument("--staff-user-id", type=int, required=True)
    parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    parser.add_argument("--fixture-root", type=Path, default=DEFAULT_FIXTURE_ROOT)
    parser.add_argument("--audit-path", type=Path, default=DEFAULT_AUDIT_PATH)
    parser.add_argument("--request-attempts", type=int, default=3)
    return parser.parse_args()


def normalize(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9']+", value.lower()))


def load_manifest(fixture_root: Path, fixture_set: str) -> dict[str, Any]:
    path = fixture_root / fixture_set / "fixture-manifest.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    fixtures = payload.get("fixtures")
    if not isinstance(fixtures, dict) or not fixtures:
        raise RuntimeError(f"Fixture manifest has no records: {path}")
    return payload


def load_or_create_audit(path: Path) -> dict[str, Any]:
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        existing_version = payload.get("audit_version")
        if existing_version in LEGACY_AUDIT_VERSIONS:
            payload["audit_version"] = AUDIT_VERSION
        elif existing_version != AUDIT_VERSION:
            raise RuntimeError(
                f"Existing audit uses {existing_version!r}; expected {AUDIT_VERSION!r}."
            )
        payload["fixture_sets"] = list(FIXTURE_SETS)
        return payload

    return {
        "audit_version": AUDIT_VERSION,
        "fixture_sets": list(FIXTURE_SETS),
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


def create_token_rule(
    client: httpx.Client,
    api_prefix: str,
    fixture_set: str,
    content_id: str,
    expected: str,
    recognized: str,
    attempt_id: int,
    request_attempts: int,
) -> dict[str, Any]:
    response = request_with_retries(
        client,
        "POST",
        f"{api_prefix}/equivalence-rules",
        request_attempts,
        json={
            "review_outcome": "expected_correct",
            "rule_type": "token_alias",
            "expected_text": expected,
            "recognized_text": recognized,
            "scope": "item",
            "item_key": content_id,
            "notes": (
                "Automatically observed in a known-correct two-voice Mu fixture audit. "
                f"Evidence variant: {fixture_set}."
            ),
            "sandbox_attempt_id": attempt_id,
        },
    ).json()
    rule = response["rule"]

    return {
        "rule_id": int(rule["id"]),
        "expected": expected,
        "recognized": recognized,
        "is_active": bool(rule["is_active"]),
        "requires_review": False,
        "created": bool(response.get("created")),
    }


def audit_fixture(
    client: httpx.Client,
    api_prefix: str,
    fixture_set: str,
    content_id: str,
    fixture_root: Path,
    record: dict[str, Any],
    request_attempts: int,
) -> dict[str, Any]:
    audio_path = fixture_root / fixture_set / record["output_relative_path"]
    audio = audio_path.read_bytes()
    audio_sha256 = hashlib.sha256(audio).hexdigest()
    expected_text = str(record["expected_text"])
    task_type = str(record["task_type"])

    response = request_with_retries(
        client,
        "POST",
        f"{api_prefix}/speech/mu/transcribe",
        request_attempts,
        data={
            "expected_text": expected_text,
            "task_type": task_type,
            "item_key": content_id,
            "fixture_set": fixture_set,
            "fixture_audit_version": AUDIT_VERSION,
        },
        files={"audio": (audio_path.name, audio, "audio/wav")},
    ).json()
    attempt_id = int(response["sandbox_attempt_id"])

    request_with_retries(
        client,
        "POST",
        f"{api_prefix}/speech/attempts/{attempt_id}/review",
        request_attempts,
        json={"review_outcome": "expected_correct"},
    )

    comparison = response["comparison"]
    rules = []
    structural_differences = []
    for difference in comparison["differences"]:
        status = difference["status"]
        expected = normalize(str(difference.get("expected", "")))
        recognized = normalize(str(difference.get("recognized", "")))
        if status == "substitution" and expected and recognized:
            rules.append(
                create_token_rule(
                    client,
                    api_prefix,
                    fixture_set,
                    content_id,
                    expected,
                    recognized,
                    attempt_id,
                    request_attempts,
                )
            )
        elif status in {"insertion", "omission"}:
            structural_differences.append(
                {
                    "status": status,
                    "expected": expected,
                    "recognized": recognized,
                }
            )

    return {
        "status": "completed",
        "fixture_set": fixture_set,
        "content_id": content_id,
        "fixture_type": record["fixture_type"],
        "audio_relative_path": record["output_relative_path"],
        "audio_sha256": audio_sha256,
        "sandbox_attempt_id": attempt_id,
        "expected_text": expected_text,
        "raw_transcript": response["raw_transcript"],
        "raw_exact_match": bool(comparison["exact_match"]),
        "token_rules": rules,
        "structural_differences": structural_differences,
    }


def summarize(audit: dict[str, Any], planned: int) -> dict[str, int]:
    records = list(audit["records"].values())
    completed = [record for record in records if record.get("status") == "completed"]
    rules = {
        rule["rule_id"]
        for record in completed
        for rule in record.get("token_rules", [])
    }
    return {
        "planned_attempts": planned,
        "completed_attempts": len(completed),
        "raw_exact_attempts": sum(bool(record.get("raw_exact_match")) for record in completed),
        "mismatch_attempts": sum(not bool(record.get("raw_exact_match")) for record in completed),
        "unique_token_rules": len(rules),
        "inactive_review_rules": len(
            {
                rule["rule_id"]
                for record in completed
                for rule in record.get("token_rules", [])
                if not rule.get("is_active", False)
            }
        ),
        "structural_differences": sum(
            len(record.get("structural_differences", [])) for record in completed
        ),
    }


def main() -> None:
    args = parse_args()
    fixture_root = args.fixture_root.resolve()
    audit_path = args.audit_path.resolve()
    manifests = {name: load_manifest(fixture_root, name) for name in FIXTURE_SETS}
    fixture_ids = {name: set(manifest["fixtures"]) for name, manifest in manifests.items()}
    baseline_ids = fixture_ids[FIXTURE_SETS[0]]
    if any(fixture_ids[name] != baseline_ids for name in FIXTURE_SETS[1:]):
        raise RuntimeError("The fixture variants do not contain identical content IDs.")

    audit = load_or_create_audit(audit_path)
    planned = sum(len(manifest["fixtures"]) for manifest in manifests.values())
    api_prefix = f"{args.api_url.rstrip('/')}/api/staff/system-admin/{args.staff_user_id}"

    with httpx.Client(timeout=httpx.Timeout(240.0, connect=10.0)) as client:
        completed_index = 0
        for fixture_set in FIXTURE_SETS:
            manifest = manifests[fixture_set]
            for content_id, record in manifest["fixtures"].items():
                completed_index += 1
                audit_key = f"{fixture_set}:{content_id}"
                audio_path = fixture_root / fixture_set / record["output_relative_path"]
                audio_sha256 = hashlib.sha256(audio_path.read_bytes()).hexdigest()
                existing = audit["records"].get(audit_key)
                if (
                    existing
                    and existing.get("status") == "completed"
                    and existing.get("audio_sha256") == audio_sha256
                ):
                    print(f"[{completed_index}/{planned}] SKIP {audit_key}", flush=True)
                    continue

                print(f"[{completed_index}/{planned}] MU {audit_key}", flush=True)
                try:
                    audit["records"][audit_key] = audit_fixture(
                        client,
                        api_prefix,
                        fixture_set,
                        content_id,
                        fixture_root,
                        record,
                        args.request_attempts,
                    )
                except Exception as error:
                    audit["records"][audit_key] = {
                        "status": "failed",
                        "fixture_set": fixture_set,
                        "content_id": content_id,
                        "audio_sha256": audio_sha256,
                        "error": str(error),
                    }
                    audit["summary"] = summarize(audit, planned)
                    write_json_atomic(audit_path, audit)
                    raise

                audit["summary"] = summarize(audit, planned)
                write_json_atomic(audit_path, audit)

    audit["summary"] = summarize(audit, planned)
    write_json_atomic(audit_path, audit)
    print(json.dumps(audit["summary"], indent=2), flush=True)


if __name__ == "__main__":
    main()
