import numpy as np

from app.mu import (
    _mu_result_is_uncertain,
    compare_tokens,
    normalize_letter_transcript,
    normalize_text,
    resolve_letter_transcript,
)
from app.noise_reduction import analyze_noise_profile, reduce_stationary_noise
from main import app


def test_trained_nu_route_is_removed_in_favor_of_mu_letter_mode() -> None:
    paths = {route.path for route in app.routes}

    assert "/nu/classify" not in paths
    assert "/mu/resolve-letter" in paths


def test_mu_letter_resolver_handles_literal_and_spoken_a_aliases() -> None:
    for transcript in ("a", "hey", "ei"):
        result = resolve_letter_transcript(transcript)

        assert result["predicted_class"] == "A"
        assert result["mapping_source"] == "builtin"


def test_mu_letter_normalization_preserves_unicode_word_identity() -> None:
    assert normalize_letter_transcript("Sí.") == "si"
    assert resolve_letter_transcript("si")["predicted_class"] == "C"


def test_reviewed_equivalence_can_resolve_an_unmapped_letter_transcript() -> None:
    result = resolve_letter_transcript(
        "rii",
        [{"id": 17, "expected_letter": "Z", "recognized_text": "Rii"}],
    )

    assert result["predicted_class"] == "Z"
    assert result["mapping_source"] == "equivalence"
    assert result["equivalence_rule_ids"] == [17]


def test_conflicting_letter_equivalences_resolve_to_unknown() -> None:
    result = resolve_letter_transcript(
        "custom sound",
        [
            {"id": 4, "expected_letter": "A", "recognized_text": "custom sound"},
            {"id": 5, "expected_letter": "E", "recognized_text": "custom sound"},
        ],
    )

    assert result["predicted_class"] == "UNKNOWN"
    assert result["mapping_source"] == "ambiguous"


def test_reviewed_ambiguous_alias_can_resolve_to_either_expected_candidate() -> None:
    equivalences = [
        {"id": 21, "expected_letter": "A", "recognized_text": "aye"},
        {"id": 22, "expected_letter": "I", "recognized_text": "aye"},
    ]

    for expected, rule_id in (("A", 21), ("I", 22)):
        result = resolve_letter_transcript("aye", equivalences, expected)

        assert result["predicted_class"] == expected
        assert result["candidate_letters"] == ["A", "I"]
        assert result["mapping_source"] == "expected_scoped_equivalence"
        assert result["equivalence_rule_ids"] == [rule_id]


def test_ambiguous_alias_stays_unknown_outside_its_reviewed_candidates() -> None:
    result = resolve_letter_transcript(
        "aye",
        [{"id": 22, "expected_letter": "I", "recognized_text": "aye"}],
        "E",
    )

    assert result["predicted_class"] == "UNKNOWN"
    assert result["candidate_letters"] == ["A", "I"]
    assert result["mapping_source"] == "ambiguous"


def test_mu_normalization_and_alignment_preserve_differences() -> None:
    assert normalize_text("Lena's red bag.") == "lena's red bag"
    comparison = compare_tokens("lena has a bag", "lena has bag")
    assert comparison["exact_match"] is False
    assert comparison["matched_word_count"] == 3
    assert {row["status"] for row in comparison["differences"]} == {"match", "omission"}


def test_mu_alignment_labels_word_substitutions() -> None:
    comparison = compare_tokens("cat", "cap")
    assert comparison["differences"] == [
        {"status": "substitution", "expected": "cat", "recognized": "cap"}
    ]


def test_noise_reduction_is_recommended_only_when_profile_is_reliable() -> None:
    sample_rate = 16_000
    rng = np.random.default_rng(7)
    timeline = np.arange(sample_rate, dtype=np.float32) / sample_rate
    noisy_speech = (
        rng.normal(0.0, 0.02, sample_rate)
        + (0.04 * np.sin(2 * np.pi * 220 * timeline) * (timeline > 0.25))
    ).astype(np.float32)

    profile = analyze_noise_profile(noisy_speech)

    assert profile["noise_profile_reliable"] is True
    assert profile["conditional_noise_reduction_recommended"] is True
    assert profile["estimated_snr_db"] is not None


def test_bounded_noise_reduction_preserves_length_and_finite_samples() -> None:
    rng = np.random.default_rng(11)
    waveform = rng.normal(0.0, 0.04, 20_031).astype(np.float32)

    enhanced, metadata = reduce_stationary_noise(waveform)

    assert enhanced.shape == waveform.shape
    assert np.isfinite(enhanced).all()
    assert float(np.max(np.abs(enhanced))) <= 0.999
    assert metadata["original_ratio"] == 0.3
    assert metadata["maximum_attenuation_db"] == 10.0


def test_mu_second_pass_gate_requires_uncertain_raw_evidence() -> None:
    certain = [{"avg_logprob": -0.2, "no_speech_prob": 0.05}]
    uncertain = [{"avg_logprob": -1.0, "no_speech_prob": 0.05}]

    assert _mu_result_is_uncertain(certain) is False
    assert _mu_result_is_uncertain(uncertain) is True
