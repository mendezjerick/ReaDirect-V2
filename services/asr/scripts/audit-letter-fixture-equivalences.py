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
DEFAULT_FIXTURE_ROOT = REPOSITORY_ROOT / "services" / "asr" / "fixtures" / "letters"
DEFAULT_AUDIT_PATH = DEFAULT_FIXTURE_ROOT / "fixture-equivalence-audit.json"
FIXTURE_SETS = ("millie2", "jz", "shai")
AUDIT_VERSION = "three-voice-letter-alias-v1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Submit known-correct isolated-letter fixtures to Mu and enrich global "
            "letter aliases with every safe unresolved transcript."
        )
    )
    parser.add_argument("--staff-user-id", type=int, required=True)
    parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    parser.add_argument("--fixture-root", type=Path, default=DEFAULT_FIXTURE_ROOT)
    parser.add_argument("--audit-path", type=Path, default=DEFAULT_AUDIT_PATH)
    parser.add_argument(
        "--fixture-sets",
        nargs="+",
        choices=FIXTURE_SETS,
        default=list(FIXTURE_SETS),
    )
    parser.add_argument("--request-attempts", type=int, default=3)
    return parser.parse_args()


def normalize(value: str) -> str:
    return " ".join(re.findall(r"[a-z]+", value.lower()))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_manifest(fixture_root: Path, fixture_set: str) -> dict[str, Any]:
    path = fixture_root / fixture_set / "fixture-manifest.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    fixtures = payload.get("fixtures")
    if not isinstance(fixtures, dict) or set(fixtures) != set("ABCDEFGHIJKLMNOPQRSTUVWXYZ"):
        raise RuntimeError(f"Fixture manifest must contain exactly A-Z: {path}")
    return payload


def load_or_create_audit(path: Path, fixture_sets: list[str]) -> dict[str, Any]:
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("audit_version") != AUDIT_VERSION:
            raise RuntimeError(
                f"Existing audit uses {payload.get('audit_version')!r}; expected {AUDIT_VERSION!r}."
            )
        payload["fixture_sets"] = sorted(set(payload.get("fixture_sets", [])) | set(fixture_sets))
        return payload

    return {
        "audit_version": AUDIT_VERSION,
        "fixture_sets": fixture_sets,
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


def review_attempt(
    client: httpx.Client,
    api_prefix: str,
    attempt_id: int,
    request_attempts: int,
) -> None:
    request_with_retries(
        client,
        "POST",
        f"{api_prefix}/speech/attempts/{attempt_id}/review",
        request_attempts,
        json={"review_outcome": "expected_correct"},
    )


def create_alias(
    client: httpx.Client,
    api_prefix: str,
    fixture_set: str,
    expected_letter: str,
    recognized_text: str,
    attempt_id: int,
) -> dict[str, Any]:
    response = client.post(
        f"{api_prefix}/equivalence-rules",
        headers={"Accept": "application/json"},
        json={
            "review_outcome": "expected_correct",
            "rule_type": "letter_alias",
            "expected_text": expected_letter,
            "recognized_text": recognized_text,
            "scope": "global",
            "notes": (
                "Automatically observed in a known-correct isolated-letter Mu fixture audit. "
                f"Evidence voice: {fixture_set}."
            ),
            "sandbox_attempt_id": attempt_id,
        },
    )
    if response.is_success:
        payload = response.json()
        rule = payload["rule"]
        return {
            "status": "created" if payload.get("created") else "existing",
            "rule_id": int(rule["id"]),
            "is_active": bool(rule["is_active"]),
        }

    detail = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
    return {
        "status": "rejected",
        "http_status": response.status_code,
        "reason": detail.get("message", "Letter alias was rejected."),
        "errors": detail.get("errors", {}),
    }


def audit_fixture(
    client: httpx.Client,
    api_prefix: str,
    fixture_root: Path,
    fixture_set: str,
    expected_letter: str,
    record: dict[str, Any],
    request_attempts: int,
) -> dict[str, Any]:
    audio_path = fixture_root / fixture_set / str(record["output_relative_path"])
    audio_hash = sha256(audio_path)
    response = request_with_retries(
        client,
        "POST",
        f"{api_prefix}/speech/letter/resolve",
        request_attempts,
        data={
            "expected_letter": expected_letter,
            "fixture_set": fixture_set,
            "fixture_audit_version": AUDIT_VERSION,
        },
        files={"audio": (audio_path.name, audio_path.read_bytes(), "audio/wav")},
    ).json()
    attempt_id = int(response["sandbox_attempt_id"])
    review_attempt(client, api_prefix, attempt_id, request_attempts)

    normalized = normalize(str(response.get("normalized_transcript") or response.get("raw_transcript") or ""))
    alias: dict[str, Any] | None = None
    if response.get("decision") != "CORRECT" and normalized:
        alias = create_alias(
            client,
            api_prefix,
            fixture_set,
            expected_letter,
            normalized,
            attempt_id,
        )

    return {
        "status": "completed",
        "fixture_set": fixture_set,
        "expected_letter": expected_letter,
        "audio_relative_path": str(record["output_relative_path"]),
        "audio_sha256": audio_hash,
        "sandbox_attempt_id": attempt_id,
        "raw_transcript": response.get("raw_transcript", ""),
        "normalized_transcript": normalized,
        "predicted_class": response.get("predicted_class", "UNKNOWN"),
        "decision_before_enrichment": response.get("decision", "UNKNOWN"),
        "mapping_source_before_enrichment": response.get("mapping", {}).get("mapping_source"),
        "alias": alias,
    }


def summarize(audit: dict[str, Any], planned: int) -> dict[str, int]:
    completed = [
        record
        for record in audit["records"].values()
        if record.get("status") == "completed"
    ]
    aliases = [record.get("alias") for record in completed if record.get("alias")]
    return {
        "planned_attempts": planned,
        "completed_attempts": len(completed),
        "accepted_before_enrichment": sum(
            record.get("decision_before_enrichment") == "CORRECT" for record in completed
        ),
        "mismatched_before_enrichment": sum(
            record.get("decision_before_enrichment") != "CORRECT" for record in completed
        ),
        "aliases_created": sum(alias.get("status") == "created" for alias in aliases),
        "aliases_existing": sum(alias.get("status") == "existing" for alias in aliases),
        "aliases_rejected": sum(alias.get("status") == "rejected" for alias in aliases),
        "empty_transcripts": sum(not record.get("normalized_transcript") for record in completed),
    }


def main() -> None:
    args = parse_args()
    fixture_root = args.fixture_root.resolve()
    audit_path = args.audit_path.resolve()
    fixture_sets = list(dict.fromkeys(args.fixture_sets))
    manifests = {
        fixture_set: load_manifest(fixture_root, fixture_set)
        for fixture_set in fixture_sets
    }
    audit = load_or_create_audit(audit_path, fixture_sets)
    planned = len(fixture_sets) * 26
    api_prefix = f"{args.api_url.rstrip('/')}/api/staff/system-admin/{args.staff_user_id}"

    with httpx.Client(timeout=httpx.Timeout(240.0, connect=10.0)) as client:
        index = 0
        for fixture_set in fixture_sets:
            manifest = manifests[fixture_set]
            for expected_letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
                index += 1
                record = manifest["fixtures"][expected_letter]
                audio_path = fixture_root / fixture_set / record["output_relative_path"]
                audio_hash = sha256(audio_path)
                audit_key = f"{fixture_set}:{expected_letter}"
                existing = audit["records"].get(audit_key)
                if (
                    existing
                    and existing.get("status") == "completed"
                    and existing.get("audio_sha256") == audio_hash
                ):
                    print(f"[{index}/{planned}] SKIP {audit_key}", flush=True)
                    continue

                print(f"[{index}/{planned}] MU {audit_key}", flush=True)
                try:
                    audit["records"][audit_key] = audit_fixture(
                        client,
                        api_prefix,
                        fixture_root,
                        fixture_set,
                        expected_letter,
                        record,
                        args.request_attempts,
                    )
                except Exception as error:
                    audit["records"][audit_key] = {
                        "status": "failed",
                        "fixture_set": fixture_set,
                        "expected_letter": expected_letter,
                        "audio_sha256": audio_hash,
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
