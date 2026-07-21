from __future__ import annotations

import argparse
import csv
import gc
import hashlib
import json
import os
import re
import tempfile
import time
import unicodedata
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Sequence

import httpx
import soundfile as sf
import torch
from voxcpm import VoxCPM


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_REFERENCE = REPOSITORY_ROOT / "assets/audio/voice-references/millie2.wav"
DEFAULT_OUTPUT_ROOT = REPOSITORY_ROOT / "services/asr/fixtures/content/millie2"
MODEL_PATH = REPOSITORY_ROOT / "services/tts/.cache/models/openbmb--VoxCPM2"
MANIFEST_NAME = "fixture-manifest.json"


@dataclass(frozen=True)
class SourceSpec:
    relative_path: str
    fixture_type: str
    task_type: str
    tts_field: str
    expected_field: str
    expected_count: int


SOURCE_SPECS = (
    SourceSpec(
        "content/assessments/v1/shared/task-2b-words.csv",
        "word",
        "word",
        "display_text",
        "spoken_target",
        10,
    ),
    SourceSpec(
        "content/assessments/v1/shared/task-3a-passages.csv",
        "passage",
        "passage",
        "display_text",
        "spoken_target",
        2,
    ),
    SourceSpec(
        "content/lessons/v1/lesson-2-word-items.csv",
        "word",
        "word",
        "display_text",
        "spoken_target",
        49,
    ),
    SourceSpec(
        "content/lessons/v1/lesson-3-phrases.csv",
        "phrase",
        "phrase",
        "display_text",
        "spoken_target",
        20,
    ),
    SourceSpec(
        "content/lessons/v1/lesson-4-sentences.csv",
        "sentence",
        "sentence",
        "display_text",
        "spoken_target",
        20,
    ),
    SourceSpec(
        "content/lessons/v1/lesson-5-passages.csv",
        "passage",
        "passage",
        "display_text",
        "spoken_target",
        5,
    ),
    SourceSpec(
        "content/lessons/v1/lesson-6-comprehension.csv",
        "comprehension-answer",
        "comprehension",
        "spoken_target",
        "spoken_target",
        10,
    ),
)


@dataclass(frozen=True)
class FixtureItem:
    content_id: str
    fixture_type: str
    task_type: str
    tts_text: str
    expected_text: str
    source_csv: str
    output_relative_path: str


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_active_rows(spec: SourceSpec) -> list[dict[str, str]]:
    path = REPOSITORY_ROOT / spec.relative_path
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))

    active = [
        row
        for row in rows
        if row.get("status", "active").strip().lower() == "active"
        and row.get("pronunciation_review", "approved").strip().lower() == "approved"
    ]
    if len(active) != spec.expected_count:
        raise RuntimeError(
            f"{spec.relative_path} supplied {len(active)} active approved rows; "
            f"expected {spec.expected_count}."
        )
    return active


def collect_items() -> list[FixtureItem]:
    items: list[FixtureItem] = []
    seen_ids: set[str] = set()

    for spec in SOURCE_SPECS:
        for row in read_active_rows(spec):
            content_id = row["content_id"].strip()
            if not re.fullmatch(r"[a-z0-9-]+", content_id):
                raise RuntimeError(f"Unsafe content_id: {content_id!r}")
            if content_id in seen_ids:
                raise RuntimeError(f"Duplicate fixture content_id: {content_id}")
            seen_ids.add(content_id)

            tts_text = row[spec.tts_field].strip()
            expected_text = row[spec.expected_field].strip()
            if not tts_text or not expected_text:
                raise RuntimeError(f"Empty fixture text for {content_id}")

            items.append(
                FixtureItem(
                    content_id=content_id,
                    fixture_type=spec.fixture_type,
                    task_type=spec.task_type,
                    tts_text=tts_text,
                    expected_text=expected_text,
                    source_csv=spec.relative_path,
                    output_relative_path=f"{spec.fixture_type}/{content_id}.wav",
                )
            )

    return items


def empty_manifest(reference: Path, items: list[FixtureItem], args: argparse.Namespace) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "created_at": utc_now(),
        "updated_at": utc_now(),
        "generation_completed": False,
        "validation_completed": False,
        "reference_audio": str(reference.relative_to(REPOSITORY_ROOT)).replace("\\", "/"),
        "reference_sha256": sha256(reference),
        "model": "openbmb/VoxCPM2",
        "generation_settings": {
            "cfg_value": 2.0,
            "inference_timesteps": 10,
            "normalize": True,
            "denoise": False,
            "retry_badcase": True,
            "retry_badcase_max_times": 3,
            "retry_badcase_ratio_threshold": 6.0,
            "short_duration_limit_seconds": args.short_duration_limit,
            "short_duration_attempt_limit": args.duration_attempts,
        },
        "validation_settings": {
            "asr_url": args.asr_url,
            "normalized_levenshtein_threshold": args.mismatch_threshold,
            "mismatch_regeneration_cycles": args.mismatch_cycles,
        },
        "fixtures": {
            item.content_id: {
                **asdict(item),
                "generation_status": "pending",
                "generation_attempts": 0,
                "duration_attempts_seconds": [],
                "duration_seconds": None,
                "sample_rate": None,
                "sha256": None,
                "validation_status": "pending",
                "validation_attempts": 0,
                "validation": None,
            }
            for item in items
        },
    }


def load_or_create_manifest(
    manifest_path: Path,
    reference: Path,
    items: list[FixtureItem],
    args: argparse.Namespace,
) -> dict[str, Any]:
    if not manifest_path.exists():
        return empty_manifest(reference, items, args)

    with manifest_path.open("r", encoding="utf-8") as stream:
        manifest = json.load(stream)

    if manifest.get("reference_sha256") != sha256(reference):
        raise RuntimeError(
            "The reference audio changed after this fixture run began. "
            "Use a new output directory to avoid mixing voices."
        )

    manifest_ids = set(manifest.get("fixtures", {}))
    item_ids = {item.content_id for item in items}
    if manifest_ids != item_ids:
        raise RuntimeError("The content catalog changed after this fixture run began.")
    return manifest


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.stem}-",
        suffix=".tmp",
        dir=path.parent,
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(payload, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        Path(temporary_name).replace(path)
    except Exception:
        Path(temporary_name).unlink(missing_ok=True)
        raise


def write_audio_atomic(path: Path, waveform: Any, sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.stem}-",
        suffix=".wav",
        dir=path.parent,
    )
    os.close(descriptor)
    temporary_path = Path(temporary_name)
    try:
        sf.write(temporary_path, waveform, sample_rate, subtype="PCM_16")
        temporary_path.replace(path)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise


def load_model() -> VoxCPM:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading VoxCPM2 on {device}...", flush=True)
    started = time.perf_counter()
    model = VoxCPM.from_pretrained(
        str(MODEL_PATH),
        local_files_only=True,
        load_denoiser=False,
        optimize=device == "cuda",
        device=device,
    )
    print(f"VoxCPM2 loaded in {time.perf_counter() - started:.1f}s", flush=True)
    return model


def generate_one(
    model: VoxCPM,
    item: FixtureItem,
    reference: Path,
    output_path: Path,
    record: dict[str, Any],
    args: argparse.Namespace,
) -> None:
    duration_limited = item.fixture_type in {"word", "phrase"}
    duration_history: list[float] = list(record.get("duration_attempts_seconds") or [])
    synthesis_text = item.tts_text
    if item.fixture_type == "word":
        synthesis_text = synthesis_text[:1].upper() + synthesis_text[1:]
    if item.fixture_type in {"word", "phrase", "comprehension-answer"} and not re.search(
        r"[.!?]$", synthesis_text
    ):
        synthesis_text = f"{synthesis_text}."
    persistent_retry = int(record.get("generation_attempts", 0)) >= 10
    cfg_value = 2.5 if persistent_retry else 2.0
    inference_timesteps = 20 if persistent_retry else 10

    for local_attempt in range(1, args.duration_attempts + 1):
        started = time.perf_counter()
        waveform = model.generate(
            text=synthesis_text,
            reference_wav_path=str(reference),
            cfg_value=cfg_value,
            inference_timesteps=inference_timesteps,
            normalize=True,
            denoise=False,
            retry_badcase=True,
            retry_badcase_max_times=3,
            retry_badcase_ratio_threshold=6.0,
        )
        sample_rate = int(model.tts_model.sample_rate)
        duration = len(waveform) / sample_rate
        duration_history.append(round(duration, 6))
        record["generation_attempts"] = int(record.get("generation_attempts", 0)) + 1
        record["duration_attempts_seconds"] = duration_history

        print(
            f"  {item.content_id}: attempt {local_attempt}, "
            f"duration={duration:.2f}s, generation={time.perf_counter() - started:.1f}s",
            flush=True,
        )

        if duration_limited and duration >= args.short_duration_limit:
            print(
                f"    rejected by {args.short_duration_limit:.2f}s "
                f"{item.fixture_type} duration gate",
                flush=True,
            )
            continue

        write_audio_atomic(output_path, waveform, sample_rate)
        record.update(
            {
                "generation_status": "generated",
                "duration_seconds": round(duration, 6),
                "sample_rate": sample_rate,
                "sha256": sha256(output_path),
                "generated_at": utc_now(),
                "last_synthesis_text": synthesis_text,
                "last_generation_settings": {
                    "cfg_value": cfg_value,
                    "inference_timesteps": inference_timesteps,
                    "persistent_retry_escalation": persistent_retry,
                },
                "validation_status": "pending",
                "validation": None,
            }
        )
        return

    raise RuntimeError(
        f"{item.content_id} exceeded the short-duration gate in "
        f"{args.duration_attempts} consecutive attempts."
    )


def generate_items(
    items: list[FixtureItem],
    selected_ids: set[str],
    reference: Path,
    output_root: Path,
    manifest: dict[str, Any],
    manifest_path: Path,
    args: argparse.Namespace,
    force: bool,
) -> None:
    pending = [item for item in items if item.content_id in selected_ids]
    if not pending:
        return

    model = load_model()
    try:
        for index, item in enumerate(pending, start=1):
            record = manifest["fixtures"][item.content_id]
            output_path = output_root / item.output_relative_path
            reusable = (
                not force
                and record.get("generation_status") == "generated"
                and output_path.exists()
                and record.get("sha256") == sha256(output_path)
            )
            if reusable:
                print(f"[{index}/{len(pending)}] Reusing {item.content_id}", flush=True)
                continue

            print(
                f"[{index}/{len(pending)}] Generating {item.fixture_type}: "
                f"{item.content_id} -> {item.tts_text}",
                flush=True,
            )
            generate_one(model, item, reference, output_path, record, args)
            manifest["updated_at"] = utc_now()
            write_json_atomic(manifest_path, manifest)
    finally:
        del model
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).lower()
    normalized = normalized.replace("’", "'")
    number_words = {
        "0": "zero",
        "1": "one",
        "2": "two",
        "3": "three",
        "4": "four",
        "5": "five",
        "6": "six",
        "7": "seven",
        "8": "eight",
        "9": "nine",
        "10": "ten",
        "11": "eleven",
        "12": "twelve",
        "13": "thirteen",
        "14": "fourteen",
        "15": "fifteen",
        "16": "sixteen",
        "17": "seventeen",
        "18": "eighteen",
        "19": "nineteen",
        "20": "twenty",
    }
    normalized = re.sub(
        r"\b(?:20|1[0-9]|[0-9])\b",
        lambda match: number_words[match.group(0)],
        normalized,
    )
    normalized = re.sub(r"[^a-z0-9']+", " ", normalized)
    return " ".join(normalized.split())


def levenshtein_distance(left: Sequence[Any], right: Sequence[Any]) -> int:
    if len(left) < len(right):
        left, right = right, left
    previous = list(range(len(right) + 1))
    for left_index, left_value in enumerate(left, start=1):
        current = [left_index]
        for right_index, right_value in enumerate(right, start=1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[right_index] + 1,
                    previous[right_index - 1] + (left_value != right_value),
                )
            )
        previous = current
    return previous[-1]


def normalized_distance(left: Sequence[Any], right: Sequence[Any]) -> float:
    denominator = max(len(left), len(right), 1)
    return levenshtein_distance(left, right) / denominator


def validate_one(
    client: httpx.Client,
    item: FixtureItem,
    output_path: Path,
    record: dict[str, Any],
    args: argparse.Namespace,
) -> bool:
    with output_path.open("rb") as audio_stream:
        response = client.post(
            "/mu/transcribe",
            files={"audio": (output_path.name, audio_stream, "audio/wav")},
            data={
                "expected_text": item.expected_text,
                "task_type": item.task_type,
                "noise_reduction_enabled": "false",
            },
        )
    response.raise_for_status()
    payload = response.json()

    expected = normalize_text(item.expected_text)
    transcript = normalize_text(payload.get("raw_transcript", ""))
    expected_words = expected.split()
    transcript_words = transcript.split()
    character_distance = normalized_distance(expected, transcript)
    word_distance = normalized_distance(expected_words, transcript_words)
    high_mismatch = character_distance > args.mismatch_threshold

    segments = payload.get("segments") or []
    average_log_probability = (
        sum(float(segment.get("avg_logprob", 0.0)) for segment in segments) / len(segments)
        if segments
        else None
    )

    record["validation_attempts"] = int(record.get("validation_attempts", 0)) + 1
    record["validation_status"] = "high_mismatch" if high_mismatch else "passed"
    record["validation"] = {
        "validated_at": utc_now(),
        "expected_normalized": expected,
        "mu_raw_transcript": payload.get("raw_transcript", ""),
        "mu_normalized_transcript": transcript,
        "character_levenshtein_distance": levenshtein_distance(expected, transcript),
        "normalized_character_levenshtein_distance": round(character_distance, 6),
        "word_levenshtein_distance": levenshtein_distance(expected_words, transcript_words),
        "normalized_word_levenshtein_distance": round(word_distance, 6),
        "average_log_probability": (
            round(average_log_probability, 6) if average_log_probability is not None else None
        ),
        "high_mismatch": high_mismatch,
    }
    return high_mismatch


def validate_items(
    items: list[FixtureItem],
    selected_ids: set[str],
    output_root: Path,
    manifest: dict[str, Any],
    manifest_path: Path,
    args: argparse.Namespace,
) -> set[str]:
    selected = [item for item in items if item.content_id in selected_ids]
    failures: set[str] = set()
    with httpx.Client(base_url=args.asr_url, timeout=120.0) as client:
        readiness = client.get("/ready")
        readiness.raise_for_status()
        if readiness.json().get("status") != "ready":
            raise RuntimeError(f"Mu is not ready: {readiness.text}")

        for index, item in enumerate(selected, start=1):
            output_path = output_root / item.output_relative_path
            if not output_path.exists():
                raise RuntimeError(f"Missing generated fixture: {output_path}")
            record = manifest["fixtures"][item.content_id]
            high_mismatch = validate_one(client, item, output_path, record, args)
            validation = record["validation"]
            marker = "FAIL" if high_mismatch else "PASS"
            print(
                f"[{index}/{len(selected)}] {marker} {item.content_id}: "
                f"distance={validation['normalized_character_levenshtein_distance']:.3f}, "
                f"Mu={validation['mu_raw_transcript']!r}",
                flush=True,
            )
            if high_mismatch:
                failures.add(item.content_id)
            manifest["updated_at"] = utc_now()
            write_json_atomic(manifest_path, manifest)
    return failures


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate and Mu-validate ReaDirect content audio fixtures."
    )
    parser.add_argument(
        "--phase",
        choices=("list", "generate", "validate", "all"),
        default="all",
    )
    parser.add_argument("--reference", type=Path, default=DEFAULT_REFERENCE)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--asr-url", default="http://127.0.0.1:8001")
    parser.add_argument("--short-duration-limit", type=float, default=2.0)
    parser.add_argument("--duration-attempts", type=int, default=20)
    parser.add_argument("--mismatch-threshold", type=float, default=0.25)
    parser.add_argument("--mismatch-cycles", type=int, default=3)
    parser.add_argument(
        "--only-remaining-mismatches",
        action="store_true",
        help="Validate and retry only IDs left in the existing manifest's failure list.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    reference = args.reference.resolve()
    output_root = args.output_root.resolve()
    if not reference.is_file():
        raise FileNotFoundError(f"Reference audio does not exist: {reference}")
    if not MODEL_PATH.is_dir():
        raise FileNotFoundError(f"VoxCPM2 model does not exist: {MODEL_PATH}")

    items = collect_items()
    counts: dict[str, int] = {}
    for item in items:
        counts[item.fixture_type] = counts.get(item.fixture_type, 0) + 1
    print(f"Resolved {len(items)} fixtures: {json.dumps(counts, sort_keys=True)}", flush=True)
    if len(items) != 116:
        raise RuntimeError(f"Expected 116 fixtures, resolved {len(items)}.")
    if args.phase == "list":
        for item in items:
            print(f"{item.fixture_type}\t{item.content_id}\t{item.tts_text}")
        return

    output_root.mkdir(parents=True, exist_ok=True)
    manifest_path = output_root / MANIFEST_NAME
    manifest = load_or_create_manifest(manifest_path, reference, items, args)
    manifest["validation_settings"].update(
        {
            "asr_url": args.asr_url,
            "normalized_levenshtein_threshold": args.mismatch_threshold,
            "mismatch_regeneration_cycles": args.mismatch_cycles,
        }
    )
    for record in manifest["fixtures"].values():
        record.setdefault("last_synthesis_text", record["tts_text"])
    all_ids = {item.content_id for item in items}

    if args.phase in {"generate", "all"}:
        generate_items(
            items,
            all_ids,
            reference,
            output_root,
            manifest,
            manifest_path,
            args,
            force=False,
        )
        manifest["generation_completed"] = True
        manifest["generation_completed_at"] = utc_now()
        manifest["updated_at"] = utc_now()
        write_json_atomic(manifest_path, manifest)
        print("Initial fixture generation is complete. Mu validation may now begin.", flush=True)

    if args.phase in {"validate", "all"}:
        if not manifest.get("generation_completed"):
            raise RuntimeError("Mu validation is blocked until initial generation completes.")

        validation_ids = all_ids
        if args.only_remaining_mismatches:
            validation_ids = set(manifest.get("remaining_high_mismatch_ids") or [])
            print(
                f"Restricting validation to {len(validation_ids)} remaining mismatches.",
                flush=True,
            )

        failures = validate_items(
            items,
            validation_ids,
            output_root,
            manifest,
            manifest_path,
            args,
        )
        for cycle in range(1, args.mismatch_cycles + 1):
            if not failures:
                break
            print(
                f"Mismatch regeneration cycle {cycle}: regenerating {len(failures)} fixtures.",
                flush=True,
            )
            generate_items(
                items,
                failures,
                reference,
                output_root,
                manifest,
                manifest_path,
                args,
                force=True,
            )
            failures = validate_items(
                items,
                failures,
                output_root,
                manifest,
                manifest_path,
                args,
            )

        manifest["validation_completed"] = True
        manifest["validation_completed_at"] = utc_now()
        manifest["remaining_high_mismatch_ids"] = sorted(failures)
        manifest["updated_at"] = utc_now()
        write_json_atomic(manifest_path, manifest)
        print(
            f"Validation complete. Remaining high mismatches: {len(failures)}",
            flush=True,
        )


if __name__ == "__main__":
    main()
