from __future__ import annotations

import argparse
import hashlib
import json
import re
import tempfile
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import soundfile as sf
import torch
from voxcpm import VoxCPM


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_STANDARD = (
    REPOSITORY_ROOT / "READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md"
)
DEFAULT_REFERENCE = REPOSITORY_ROOT / "assets/audio/voice-references/millie2.wav"
DEFAULT_OUTPUT_PARENT = REPOSITORY_ROOT / "services/asr/fixtures/letters"
MODEL_PATH = REPOSITORY_ROOT / "services/tts/.cache/models/openbmb--VoxCPM2"
MANIFEST_NAME = "fixture-manifest.json"
REVIEW_NAME = "REVIEW.md"
GENERATOR_VERSION = "isolated-letter-runtime-table-v1"
DEFAULT_MINIMUM_DURATION_SECONDS = 0.70
DEFAULT_DURATION_ATTEMPTS = 20
LETTER_ROW = re.compile(
    r"^\|\s*([A-Z])\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|",
    re.MULTILINE,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Generate one human-review voice fixture for every isolated A-Z "
            "pronunciation in the root runtime standard."
        )
    )
    parser.add_argument("--standard", type=Path, default=DEFAULT_STANDARD)
    parser.add_argument("--reference", type=Path, default=DEFAULT_REFERENCE)
    parser.add_argument("--fixture-set")
    parser.add_argument("--output-root", type=Path)
    parser.add_argument("--force", action="store_true")
    parser.add_argument(
        "--letters",
        nargs="+",
        help="Regenerate only these A-Z classes, for example: --letters D G K",
    )
    parser.add_argument(
        "--minimum-duration-seconds",
        type=float,
        default=DEFAULT_MINIMUM_DURATION_SECONDS,
    )
    parser.add_argument(
        "--duration-attempts",
        type=int,
        default=DEFAULT_DURATION_ATTEMPTS,
    )
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fixture_set_slug(value: str) -> str:
    normalized = value.strip().lower().replace("+", "-plus")
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    if not normalized:
        raise ValueError("The fixture-set name must contain a letter or number.")
    return normalized


def fixture_set_display_name(value: str) -> str:
    return value.upper() if len(value) <= 3 else value.replace("-", " ").title()


def load_pronunciations(path: Path) -> dict[str, dict[str, str]]:
    text = path.read_text(encoding="utf-8")
    records = {
        letter: {"ipa": ipa, "fallback_text": fallback_text}
        for letter, ipa, fallback_text in LETTER_ROW.findall(text)
    }
    expected = [chr(code) for code in range(ord("A"), ord("Z") + 1)]
    if list(sorted(records)) != expected:
        raise RuntimeError(
            "The isolated-letter standard must contain exactly one table row for A-Z."
        )
    return records


def write_audio_atomic(path: Path, waveform: Any, sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        suffix=".wav",
        dir=path.parent,
        delete=False,
    ) as temporary:
        temporary_path = Path(temporary.name)
    try:
        sf.write(temporary_path, waveform, sample_rate, subtype="PCM_16")
        temporary_path.replace(path)
    finally:
        temporary_path.unlink(missing_ok=True)


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def write_review_index(path: Path, manifest: dict[str, Any]) -> None:
    voice_name = manifest["voice_display_name"]
    lines = [
        f"# {voice_name} Isolated-Letter Fixture Review",
        "",
        "These 26 files are pending human listening review. The root isolated-letter",
        "pronunciation standard remains authoritative; this page is only a convenient",
        f"audio index for the generated {voice_name} fixture set.",
        "",
        "| Letter | Synthesis input | Duration | Audio | Status |",
        "| --- | --- | ---: | --- | --- |",
    ]
    for letter, record in sorted(manifest["fixtures"].items()):
        audio_path = record["output_relative_path"]
        lines.append(
            f"| {letter} | `{record['synthesis_text']}` | "
            f"{record['duration_seconds']:.2f}s | "
            f"[Listen]({audio_path}) | {record['review_status']} |"
        )
    lines.extend(
        [
            "",
            "Record accepted/rejected decisions and notes in `fixture-manifest.json`.",
        ]
    )
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text("\n".join(lines) + "\n", encoding="utf-8")
    temporary.replace(path)


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


def new_manifest(
    standard: Path,
    reference: Path,
    fixture_set: str,
    pronunciations: dict[str, dict[str, str]],
    minimum_duration_seconds: float,
    duration_attempts: int,
) -> dict[str, Any]:
    return {
        "generator_version": GENERATOR_VERSION,
        "fixture_set": f"{fixture_set}-isolated-letters",
        "voice_key": fixture_set,
        "voice_display_name": fixture_set_display_name(fixture_set),
        "purpose": "human_pronunciation_review",
        "review_status": "human_review_pending",
        "pronunciation_standard": standard.relative_to(REPOSITORY_ROOT).as_posix(),
        "pronunciation_standard_sha256": sha256(standard),
        "reference_audio": reference.relative_to(REPOSITORY_ROOT).as_posix(),
        "reference_sha256": sha256(reference),
        "model": "openbmb/VoxCPM2",
        "synthesis_settings": {
            "cfg_value": 2.0,
            "inference_timesteps": 10,
            "normalize": True,
            "denoise": False,
            "retry_badcase": True,
            "retry_badcase_max_times": 3,
            "retry_badcase_ratio_threshold": 6.0,
            "minimum_duration_seconds": minimum_duration_seconds,
            "duration_attempts": duration_attempts,
        },
        "fixtures": {
            letter: {
                "letter_class": letter,
                "ipa": record["ipa"],
                "fallback_text": record["fallback_text"],
                "synthesis_text": f"{record['fallback_text']}.",
                "output_relative_path": f"{letter}/{fixture_set}_{letter}_001.wav",
                "generation_status": "pending",
                "review_status": "pending",
                "review_notes": None,
            }
            for letter, record in pronunciations.items()
        },
    }


def main() -> None:
    args = parse_args()
    standard = args.standard.resolve()
    reference = args.reference.resolve()
    fixture_set = fixture_set_slug(args.fixture_set or reference.stem)
    output_root = (
        args.output_root.resolve()
        if args.output_root is not None
        else (DEFAULT_OUTPUT_PARENT / fixture_set).resolve()
    )
    if not standard.is_file():
        raise FileNotFoundError(f"Pronunciation standard does not exist: {standard}")
    if not reference.is_file():
        raise FileNotFoundError(f"Reference audio does not exist: {reference}")
    if not MODEL_PATH.is_dir():
        raise FileNotFoundError(f"VoxCPM2 model does not exist: {MODEL_PATH}")
    if args.minimum_duration_seconds <= 0:
        raise ValueError("--minimum-duration-seconds must be greater than zero.")
    if args.duration_attempts < 1:
        raise ValueError("--duration-attempts must be at least one.")

    pronunciations = load_pronunciations(standard)
    selected_letters = None
    if args.letters:
        selected_letters = {value.strip().upper() for value in args.letters}
        invalid_letters = selected_letters.difference(pronunciations)
        if invalid_letters:
            raise ValueError(
                "Unknown letter classes: " + ", ".join(sorted(invalid_letters))
            )
    manifest_path = output_root / MANIFEST_NAME
    manifest = new_manifest(
        standard,
        reference,
        fixture_set,
        pronunciations,
        args.minimum_duration_seconds,
        args.duration_attempts,
    )
    existing_manifest = None
    if manifest_path.exists():
        existing_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        reference_changed = (
            existing_manifest.get("reference_sha256") != manifest["reference_sha256"]
        )
        changed_pronunciation_letters = {
            letter
            for letter, record in manifest["fixtures"].items()
            if any(
                existing_manifest.get("fixtures", {})
                .get(letter, {})
                .get(key)
                != record[key]
                for key in ("ipa", "fallback_text", "synthesis_text")
            )
        }
        allowed_changed_letters = selected_letters or (set(pronunciations) if args.force else set())
        unselected_changes = changed_pronunciation_letters.difference(allowed_changed_letters)
        if not args.force and (reference_changed or unselected_changes):
            raise RuntimeError(
                "The reference or an unselected pronunciation changed. Use --force or "
                "include every changed class in --letters."
            )
        if not args.force:
            manifest["review_status"] = existing_manifest.get(
                "review_status",
                manifest["review_status"],
            )

    model: VoxCPM | None = None
    generated = 0
    skipped = 0
    for index, letter in enumerate(sorted(pronunciations), start=1):
        record = manifest["fixtures"][letter]
        output_path = output_root / record["output_relative_path"]
        old_record = (existing_manifest or {}).get("fixtures", {}).get(letter, {})
        regenerate_this_letter = (
            (selected_letters is not None and letter in selected_letters)
            or (args.force and selected_letters is None)
        )
        if (
            not regenerate_this_letter
            and output_path.is_file()
            and old_record.get("sha256") == sha256(output_path)
            and old_record.get("synthesis_text") == record["synthesis_text"]
            and float(old_record.get("duration_seconds", 0))
            >= args.minimum_duration_seconds
        ):
            manifest["fixtures"][letter] = old_record
            skipped += 1
            print(f"[{index}/26] SKIP {letter}", flush=True)
            continue

        print(
            f"[{index}/26] GENERATE {letter} <- {record['synthesis_text']!r}",
            flush=True,
        )
        if model is None:
            model = load_model()
        duration_history = []
        for duration_attempt in range(1, args.duration_attempts + 1):
            started = time.perf_counter()
            waveform = model.generate(
                text=record["synthesis_text"],
                reference_wav_path=str(reference),
                cfg_value=2.0,
                inference_timesteps=10,
                normalize=True,
                denoise=False,
                retry_badcase=True,
                retry_badcase_max_times=3,
                retry_badcase_ratio_threshold=6.0,
            )
            sample_rate = int(model.tts_model.sample_rate)
            duration = len(waveform) / sample_rate
            duration_history.append(round(duration, 6))
            record.update(
                {
                    "generation_attempts": duration_attempt,
                    "duration_attempts_seconds": duration_history,
                }
            )
            if duration < args.minimum_duration_seconds:
                record["generation_status"] = "rejected_too_short"
                print(
                    f"  {letter}: rejected {duration:.2f}s attempt "
                    f"{duration_attempt}/{args.duration_attempts}; minimum is "
                    f"{args.minimum_duration_seconds:.2f}s",
                    flush=True,
                )
                write_json_atomic(manifest_path, manifest)
                continue

            write_audio_atomic(output_path, waveform, sample_rate)
            record.update(
                {
                    "generation_status": "generated",
                    "generated_at": utc_now(),
                    "generation_seconds": round(time.perf_counter() - started, 3),
                    "duration_seconds": round(duration, 6),
                    "minimum_duration_seconds": args.minimum_duration_seconds,
                    "sample_rate": sample_rate,
                    "channels": 1,
                    "subtype": "PCM_16",
                    "sha256": sha256(output_path),
                }
            )
            break
        else:
            raise RuntimeError(
                f"{letter} stayed below {args.minimum_duration_seconds:.2f}s for "
                f"{args.duration_attempts} consecutive attempts."
            )
        generated += 1
        write_json_atomic(manifest_path, manifest)

    manifest["generated_at"] = utc_now()
    manifest["summary"] = {
        "letters": len(manifest["fixtures"]),
        "generated_this_run": generated,
        "skipped_this_run": skipped,
        "selected_letters": sorted(selected_letters or pronunciations),
        "pending_human_review": sum(
            record.get("review_status") == "pending"
            for record in manifest["fixtures"].values()
        ),
    }
    write_json_atomic(manifest_path, manifest)
    write_review_index(output_root / REVIEW_NAME, manifest)
    print(json.dumps(manifest["summary"], indent=2), flush=True)


if __name__ == "__main__":
    main()
