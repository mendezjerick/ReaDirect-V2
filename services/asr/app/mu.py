from __future__ import annotations

import os
import re
import threading
import time
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from app.audio import prepare_audio
from app.noise_reduction import reduce_stationary_noise

TASK_TYPES = {"word", "phrase", "sentence", "passage", "comprehension", "free_speech"}
LETTER_CLASSES = tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
LETTER_ALIASES = {
    "A": ("a", "ay", "aye", "hey", "ei"),
    "B": ("b", "be", "bee"),
    "C": ("c", "see", "sea", "si"),
    "D": ("d", "dee"),
    "E": ("e",),
    "F": ("f", "ef", "eff"),
    "G": ("g", "gee"),
    "H": ("h", "aitch", "eitch"),
    "I": ("i", "eye"),
    "J": ("j", "jay"),
    "K": ("k", "kay"),
    "L": ("l", "el", "ell"),
    "M": ("m", "em"),
    "N": ("n", "en"),
    "O": ("o", "oh"),
    "P": ("p", "pea", "pee"),
    "Q": ("q", "cue", "queue"),
    "R": ("r", "are", "ar"),
    "S": ("s", "ess"),
    "T": ("t", "tea", "tee"),
    "U": ("u", "you", "yew"),
    "V": ("v", "vee"),
    "W": ("w", "double u", "double you"),
    "X": ("x", "ex"),
    "Y": ("y", "why"),
    "Z": ("z", "zee", "zed"),
}


class MuTranscriber:
    def __init__(self) -> None:
        self.artifact_path = Path(os.getenv("MU_MODEL_PATH", "model_artifacts/mu"))
        self.requested_device = os.getenv("MU_DEVICE", "auto")
        self.configured_compute_type = os.getenv("MU_COMPUTE_TYPE", "int8_float16")
        self.language = os.getenv("MU_LANGUAGE", "en")
        self.allow_download = os.getenv("MU_ALLOW_DOWNLOAD", "false").lower() == "true"
        self._model: Any | None = None
        self._load_lock = threading.Lock()
        self._load_error: str | None = None

    def status(self) -> dict[str, object]:
        source = self._local_source()
        return {
            "available": source is not None,
            "model": "mu",
            "task": "general_english_transcription",
            "checkpoint": "openai/whisper-large-v3-turbo",
            "runtime": "faster-whisper",
            "device": self._device(),
            "compute_type": self._compute_type(),
            "model_loaded": self._model is not None,
            "load_error": self._load_error,
        }

    def encode_audio(self, waveform: np.ndarray) -> np.ndarray:
        """Return frozen Mu encoder states for the shared Nu classification head."""
        self._load()
        assert self._model is not None

        import ctranslate2

        audio = np.asarray(waveform, dtype=np.float32)
        if audio.ndim != 1 or audio.size == 0 or not np.isfinite(audio).all():
            raise ValueError("mu_encoder_invalid_audio")

        features = self._model.feature_extractor(audio)
        encoded = self._model.encode(features)
        cpu = encoded.to_device(ctranslate2.Device.cpu)
        values = np.array(cpu, dtype=np.float32)
        if values.ndim != 3 or values.shape[0] != 1 or not np.isfinite(values).all():
            raise RuntimeError("mu_encoder_invalid_output")
        return values

    def transcribe(
        self,
        path: Path,
        expected_text: str,
        task_type: str,
        noise_reduction_enabled: bool = False,
    ) -> dict[str, object]:
        selected_task = task_type.strip().lower()
        if selected_task not in TASK_TYPES:
            raise ValueError("unsupported_mu_task_type")

        started = time.perf_counter()
        waveform, quality = prepare_audio(path, maximum_seconds=120.0)
        preprocessing_seconds = round(time.perf_counter() - started, 4)
        self._load()

        inference_started = time.perf_counter()
        segments, language = self._transcribe_source(str(path))
        raw_transcript = _join_transcript(segments)
        noise_reduction = self._conditional_noise_reduction(
            waveform,
            raw_transcript,
            segments,
            quality,
            noise_reduction_enabled,
        )
        inference_seconds = round(time.perf_counter() - inference_started, 4)
        normalized = normalize_text(raw_transcript)
        expected_normalized = normalize_text(expected_text)

        return {
            "ok": True,
            "model": "mu",
            "checkpoint": "openai/whisper-large-v3-turbo",
            "runtime": "faster-whisper",
            "raw_transcript": raw_transcript,
            "basic_normalized_transcript": normalized,
            "expected_text": expected_text,
            "expected_normalized_text": expected_normalized,
            "comparison": compare_tokens(expected_normalized, normalized),
            "language": language,
            "task_type": selected_task,
            "segments": segments,
            "audio_quality": quality,
            "noise_reduction": noise_reduction,
            "performance": {
                "preprocessing_seconds": preprocessing_seconds,
                "inference_seconds": inference_seconds,
                "total_request_seconds": round(time.perf_counter() - started, 4),
                "real_time_factor": round(inference_seconds / float(quality["duration_seconds"]), 4)
                if float(quality["duration_seconds"] or 0) > 0
                else None,
            },
            "device": self._device(),
            "compute_type": self._compute_type(),
        }

    def resolve_letter(
        self,
        path: Path,
        expected_letter: str,
        reviewed_equivalences: list[dict[str, Any]] | None = None,
    ) -> dict[str, object]:
        expected = expected_letter.strip().upper()
        if expected not in LETTER_CLASSES:
            raise ValueError("expected_letter_must_be_a_to_z")

        started = time.perf_counter()
        waveform, quality = prepare_audio(path, maximum_seconds=5.0)
        preprocessing_seconds = round(time.perf_counter() - started, 4)
        self._load()

        inference_started = time.perf_counter()
        segments, language = self._transcribe_source(str(path))
        raw_transcript = _join_transcript(segments)
        inference_seconds = round(time.perf_counter() - inference_started, 4)
        normalized = normalize_letter_transcript(raw_transcript)
        resolution = resolve_letter_transcript(
            normalized,
            reviewed_equivalences or [],
            expected,
        )

        blocking_warnings = {
            "audio_too_short",
            "audio_too_long",
        }.intersection(quality["warnings"])
        silence_warnings = {
            "audio_too_quiet",
            "mostly_silent",
        }.intersection(quality["warnings"])

        if not normalized and silence_warnings:
            predicted_class = "SILENCE"
            mapping_source = "silence_gate"
        elif blocking_warnings:
            predicted_class = "UNKNOWN"
            mapping_source = "unusable_audio"
        else:
            predicted_class = str(resolution["predicted_class"])
            mapping_source = str(resolution["mapping_source"])

        if predicted_class == "SILENCE":
            decision = "SILENCE"
        elif predicted_class == "UNKNOWN":
            decision = "UNUSABLE_AUDIO" if blocking_warnings else "UNKNOWN"
        elif predicted_class == expected:
            decision = "CORRECT"
        else:
            decision = "INCORRECT"

        return {
            "ok": True,
            "model": "nu",
            "engine": "mu",
            "resolver": "strict_letter_alias_v2",
            "checkpoint": "openai/whisper-large-v3-turbo",
            "expected_letter": expected,
            "predicted_class": predicted_class,
            "decision": decision,
            "raw_transcript": raw_transcript,
            "normalized_transcript": normalized,
            "mapping": {
                **resolution,
                "predicted_class": predicted_class,
                "mapping_source": mapping_source,
            },
            "language": language,
            "segments": segments,
            "audio_quality": quality,
            "performance": {
                "preprocessing_seconds": preprocessing_seconds,
                "inference_seconds": inference_seconds,
                "total_request_seconds": round(time.perf_counter() - started, 4),
                "real_time_factor": round(inference_seconds / float(quality["duration_seconds"]), 4)
                if float(quality["duration_seconds"] or 0) > 0
                else None,
            },
            "device": self._device(),
            "compute_type": self._compute_type(),
        }

    def _transcribe_source(self, source: str | np.ndarray) -> tuple[list[dict[str, object]], str]:
        iterator, info = self._model.transcribe(
            source,
            language=self.language,
            task="transcribe",
            beam_size=5,
            vad_filter=False,
            temperature=0.0,
            condition_on_previous_text=False,
        )
        segments = [
            {
                "start": round(float(segment.start), 3),
                "end": round(float(segment.end), 3),
                "text": segment.text,
                "avg_logprob": _optional_float(segment.avg_logprob),
                "no_speech_prob": _optional_float(segment.no_speech_prob),
            }
            for segment in iterator
        ]
        return segments, str(getattr(info, "language", self.language) or self.language)

    def _conditional_noise_reduction(
        self,
        waveform: np.ndarray,
        original_transcript: str,
        original_segments: list[dict[str, object]],
        quality: dict[str, Any],
        enabled: bool,
    ) -> dict[str, object]:
        result: dict[str, object] = {
            "enabled": enabled,
            "attempted": False,
            "selected_audio": "original",
            "reason": "disabled_by_system_administrator" if not enabled else "not_needed",
            "requires_retry": False,
            "original": {"raw_transcript": original_transcript},
            "enhanced": None,
            "processing": None,
        }
        should_attempt = (
            enabled
            and bool(quality["usable"])
            and bool(quality["conditional_noise_reduction_recommended"])
            and _mu_result_is_uncertain(original_segments)
        )
        if not should_attempt:
            if enabled and not quality["usable"]:
                result["reason"] = "audio_quality_unusable"
            elif enabled and not quality["conditional_noise_reduction_recommended"]:
                result["reason"] = "noise_reduction_not_recommended"
            elif enabled:
                result["reason"] = "original_result_not_uncertain"
            return result

        enhanced_waveform, processing = reduce_stationary_noise(waveform)
        enhanced_segments, _ = self._transcribe_source(enhanced_waveform)
        enhanced_transcript = _join_transcript(enhanced_segments)
        disagrees = normalize_text(original_transcript) != normalize_text(enhanced_transcript)
        result.update(
            {
                "attempted": True,
                "reason": "second_pass_disagrees" if disagrees else "second_pass_consistent",
                "requires_retry": disagrees,
                "enhanced": {
                    "raw_transcript": enhanced_transcript,
                    "segments": enhanced_segments,
                },
                "processing": processing,
            }
        )
        return result

    def _load(self) -> None:
        if self._model is not None:
            return

        with self._load_lock:
            if self._model is not None:
                return

            source = self._local_source()
            if source is None and not self.allow_download:
                raise RuntimeError("mu_checkpoint_missing")

            try:
                from faster_whisper import WhisperModel

                self._model = WhisperModel(
                    str(source or "large-v3-turbo"),
                    device=self._device(),
                    compute_type=self._compute_type(),
                    download_root=str(self.artifact_path / "cache"),
                    local_files_only=not self.allow_download,
                )
                self._load_error = None
            except Exception as error:
                self._load_error = str(error)
                raise

    def _local_source(self) -> Path | None:
        direct = self.artifact_path / "model"
        if (direct / "config.json").exists() and (direct / "model.bin").exists():
            return direct
        snapshots = (
            self.artifact_path
            / "cache"
            / "models--mobiuslabsgmbh--faster-whisper-large-v3-turbo"
            / "snapshots"
        )
        if snapshots.exists():
            for snapshot in snapshots.iterdir():
                if (snapshot / "config.json").exists() and (snapshot / "model.bin").exists():
                    return snapshot
        return None

    def _device(self) -> str:
        if self.requested_device != "auto":
            return self.requested_device
        try:
            import torch

            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"

    def _compute_type(self) -> str:
        if self._device() == "cuda":
            return self.configured_compute_type
        return "int8"


def normalize_text(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9']+", value.lower()))


def normalize_letter_transcript(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.lower())
    without_marks = "".join(character for character in decomposed if not unicodedata.combining(character))
    return " ".join(re.findall(r"[a-z]+", without_marks))


def resolve_letter_transcript(
    normalized_transcript: str,
    reviewed_equivalences: list[dict[str, Any]] | None = None,
    expected_letter: str | None = None,
) -> dict[str, object]:
    alias_map: dict[str, list[dict[str, object]]] = {}
    for letter, aliases in LETTER_ALIASES.items():
        for alias in aliases:
            alias_map.setdefault(alias, []).append(
                {"letter": letter, "source": "builtin", "rule_id": None}
            )

    for rule in reviewed_equivalences or []:
        letter = str(rule.get("expected_letter", "")).strip().upper()
        alias = normalize_letter_transcript(str(rule.get("recognized_text", "")))
        if letter not in LETTER_CLASSES or not alias:
            continue
        alias_map.setdefault(alias, []).append(
            {
                "letter": letter,
                "source": "equivalence",
                "rule_id": rule.get("id"),
            }
        )

    matches = alias_map.get(normalized_transcript, [])
    letters = sorted({str(match["letter"]) for match in matches})
    expected = str(expected_letter or "").strip().upper()
    if len(letters) != 1:
        expected_matches = [
            match
            for match in matches
            if match["source"] == "equivalence" and match["letter"] == expected
        ]
        if len(letters) > 1 and expected in letters and expected_matches:
            return {
                "predicted_class": expected,
                "candidate_letters": letters,
                "matched_alias": normalized_transcript,
                "mapping_source": "expected_scoped_equivalence",
                "equivalence_rule_ids": sorted(
                    int(match["rule_id"])
                    for match in expected_matches
                    if match.get("rule_id") is not None
                ),
            }
        return {
            "predicted_class": "UNKNOWN",
            "candidate_letters": letters,
            "matched_alias": normalized_transcript or None,
            "mapping_source": "ambiguous" if len(letters) > 1 else "unmapped",
            "equivalence_rule_ids": sorted(
                int(match["rule_id"])
                for match in matches
                if match.get("rule_id") is not None
            ),
        }

    sources = {str(match["source"]) for match in matches}
    return {
        "predicted_class": letters[0],
        "candidate_letters": letters,
        "matched_alias": normalized_transcript,
        "mapping_source": "equivalence" if sources == {"equivalence"} else "builtin",
        "equivalence_rule_ids": sorted(
            int(match["rule_id"])
            for match in matches
            if match.get("rule_id") is not None
        ),
    }


def compare_tokens(expected: str, recognized: str) -> dict[str, object]:
    expected_tokens = expected.split()
    recognized_tokens = recognized.split()
    rows = _align(expected_tokens, recognized_tokens)
    matches = sum(1 for row in rows if row["status"] == "match")
    return {
        "exact_match": expected == recognized and bool(expected),
        "expected_word_count": len(expected_tokens),
        "recognized_word_count": len(recognized_tokens),
        "matched_word_count": matches,
        "differences": rows,
    }


def _align(expected: list[str], recognized: list[str]) -> list[dict[str, str]]:
    height = len(expected) + 1
    width = len(recognized) + 1
    table = [[0] * width for _ in range(height)]
    for left in range(1, height):
        for right in range(1, width):
            table[left][right] = (
                table[left - 1][right - 1] + 1
                if expected[left - 1] == recognized[right - 1]
                else max(table[left - 1][right], table[left][right - 1])
            )

    rows: list[dict[str, str]] = []
    left, right = len(expected), len(recognized)
    while left or right:
        if left and right and expected[left - 1] == recognized[right - 1]:
            rows.append(
                {
                    "status": "match",
                    "expected": expected[left - 1],
                    "recognized": recognized[right - 1],
                }
            )
            left -= 1
            right -= 1
        elif right and (not left or table[left][right - 1] >= table[left - 1][right]):
            rows.append(
                {"status": "insertion", "expected": "", "recognized": recognized[right - 1]}
            )
            right -= 1
        else:
            rows.append({"status": "omission", "expected": expected[left - 1], "recognized": ""})
            left -= 1
    rows.reverse()
    return _merge_substitutions(rows)


def _merge_substitutions(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    merged: list[dict[str, str]] = []
    index = 0
    while index < len(rows):
        current = rows[index]
        following = rows[index + 1] if index + 1 < len(rows) else None
        if following and {current["status"], following["status"]} == {
            "insertion",
            "omission",
        }:
            omission = current if current["status"] == "omission" else following
            insertion = current if current["status"] == "insertion" else following
            merged.append(
                {
                    "status": "substitution",
                    "expected": omission["expected"],
                    "recognized": insertion["recognized"],
                }
            )
            index += 2
            continue
        merged.append(current)
        index += 1
    return merged


def _optional_float(value: Any) -> float | None:
    return round(float(value), 6) if value is not None else None


def _join_transcript(segments: list[dict[str, object]]) -> str:
    return " ".join(str(segment["text"]).strip() for segment in segments).strip()


def _mu_result_is_uncertain(segments: list[dict[str, object]]) -> bool:
    if not segments:
        return True

    log_probabilities = [
        float(segment["avg_logprob"]) for segment in segments if segment["avg_logprob"] is not None
    ]
    no_speech_probabilities = [
        float(segment["no_speech_prob"])
        for segment in segments
        if segment["no_speech_prob"] is not None
    ]
    average_log_probability = (
        sum(log_probabilities) / len(log_probabilities) if log_probabilities else 0.0
    )
    average_no_speech = (
        sum(no_speech_probabilities) / len(no_speech_probabilities)
        if no_speech_probabilities
        else 0.0
    )
    return average_log_probability <= -0.8 or average_no_speech >= 0.5


@lru_cache(maxsize=1)
def get_mu_transcriber() -> MuTranscriber:
    return MuTranscriber()
