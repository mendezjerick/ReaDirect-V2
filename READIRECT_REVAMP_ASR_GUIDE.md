# ReaDirect Revamp ASR Guide

Purpose: define the ASR and post-ASR scoring behavior for the ReaDirect revamp.

It is not an endpoint contract. Preprocessing, screens, routes, and request
shapes are designed separately under the approved technology stack.

## Core Design

The ASR side uses these parts:

1. Nu for isolated letter recognition.
2. Mu for word, phrase, sentence, and passage transcription.
3. Nu target-aware classification decisions for letter tasks.
4. Mu light transcript normalization for word, phrase, sentence, and passage
   tasks.
5. Mu expected-aware comparison and word alignment.
6. Equivalence Book rules for acceptable Mu transcript differences.
7. Scoring decision logic.
8. GOP pronunciation scoring as supporting evidence where available.

Nu and Mu do not use the same post-ASR flow.

Nu isolated-letter flow:

```text
raw isolated-letter audio
-> audio-quality check
-> Nu audio classifier
-> class probabilities for A-Z, SILENCE, and UNKNOWN
-> target-aware letter decision
-> scoring response
-> score
```

Mu word, phrase, sentence, and passage flow:

```text
raw audio
-> Mu raw transcript
-> light normalization
-> expected-aware comparison
-> Equivalence Book repair
-> scoring transcript
-> score
```

The system must preserve raw model evidence. For Nu, raw evidence is the
predicted class, confidence, top predictions, and full probability map. For Mu,
raw evidence is the raw transcript and segment details. Expected text is used
for comparison, scoring, and equivalence decisions. It must not be used to
rewrite raw model evidence.

## Model Roles

### Nu

Nu is the isolated-letter recognition model.

Model provenance:

- Base checkpoint: Whisper base.
- Fine-tuning data: ReaDirect's built isolated-letter corpus dataset.
- Fine-tuning purpose: restricted A-Z isolated-letter recognition.

Training and output design:

- Task type: audio classification, not text generation.
- Output classes: A-Z, `SILENCE`, and `UNKNOWN`.
- Training-only augmentation is used to improve robustness to classroom noise,
  microphone gain variation, mild reverberation, leading or trailing silence,
  small speed variation, recording-distance variation, and mild clipping.
- Validation and test splits must remain unaugmented.
- Runtime output includes predicted class, confidence, top predictions,
  letter-only ranking, expected-letter probability, full class probabilities,
  audio-quality result, and target-aware decision.
- Calibration uses validation data and confusion groups such as `B/D/E/G/P/T/V`,
  `A/H/J/K`, `M/N`, `C/Z`, and `I/Y`.

Scope:

- A-Z letter names.
- Silence detection.
- Unknown or unusable isolated-letter audio.

Nu must not be used for unrestricted word, phrase, sentence, or passage
transcription.

### Mu

Mu is the general English transcription model.

Model provenance:

- Base checkpoint: Whisper large-v3-turbo.
- Fine-tuning data: SpeechOcean 50% child-speech split.
- Fine-tuning amount: very minimal.
- Fine-tuning purpose: child-speech prosody adaptation only.
- Constraint: preserve the base model's general transcription behavior and avoid
  destructive overfitting.
- Runtime: faster-whisper.
- Compute type: `int8_float16`.

Scope:

- Isolated words.
- Short phrases.
- Sentences.
- Passage reading and longer spoken samples.

Mu is the primary raw ASR source for non-letter speech tasks. Mu uses Whisper
through the approved runtime for the deployment target, but the ReaDirect-facing
model name is `mu`.

## Evidence And Transcript Roles

Keep these roles separate:

- `nu_predicted_class`: exact class label returned by Nu.
- `nu_probabilities`: Nu probability map across A-Z, `SILENCE`, and `UNKNOWN`.
- `nu_top_predictions`: Nu top-k class ranking for review and calibration.
- `nu_decision`: target-aware classification decision for the active expected
  letter.
- `raw_transcript`: exact Mu transcript output for evidence, review, debugging,
  and ASR quality analysis.
- `normalized_transcript`: lightly normalized Mu transcript for technical
  comparison.
- `aligned_transcript`: expected text and Mu transcript aligned at the word or
  token level.
- `scoring_transcript`: expected-aware Mu interpretation used for scoring.
- `scoring_response`: final scoring value for the active item. For Nu this is
  the target-aware decision (`CORRECT`, `UNCERTAIN`, `INCORRECT`, `SILENCE`,
  `UNKNOWN`, or `UNUSABLE_AUDIO`). For Mu this is usually the scoring
  transcript.
- `displayed_transcript`: transcript shown to users; it may match the scoring
  transcript for Mu tasks, but raw transcript remains available in review/admin
  data.
- `repair_metadata`: structured explanation for any equivalence or scoring
  repair.

Raw model evidence is the truth of what the model returned. Nu evidence is
classification evidence. Mu evidence is transcript evidence. Scoring response is
the educational interpretation after controlled comparison, thresholds, and
equivalence rules.

## Light Normalization

Light normalization applies to the Mu transcript path only. It prepares text for
comparison. It may:

- Lowercase text for matching.
- Normalize spacing.
- Normalize common apostrophe forms.
- Separate or normalize punctuation tokens.
- Preserve the raw transcript separately.

Light normalization must not:

- Replace a recognized word with the expected word.
- Apply dictionary correction.
- Apply homophone correction by itself.
- Rewrite sentence content.
- Hide missing, inserted, or substituted content words.

## Expected-Aware Comparison

Expected-aware comparison applies to the Mu transcript path. It compares the
normalized Mu output to the expected item text.

It produces:

- Exact-match result.
- WER and CER.
- Word substitutions.
- Word deletions.
- Word insertions.
- Punctuation differences.
- Alignment metadata for scoring and review.

Expected-aware comparison is not automatic correction. It is the evidence layer
that decides what differences exist before scoring rules are applied.

Nu uses expected-letter comparison instead of expected-aware transcript
alignment. It compares the expected letter to the classifier probability map and
uses calibrated thresholds to produce `CORRECT`, `UNCERTAIN`, `INCORRECT`,
`SILENCE`, `UNKNOWN`, or `UNUSABLE_AUDIO`.

## Equivalence Book

The Equivalence Book defines accepted text differences for the Mu transcript
path.

Its job is not to force ASR output to the expected answer. Its job is to define
which transcript differences are acceptable for scoring.

Nu does not use the Equivalence Book for its core A-Z classification decisions.
Nu calibration belongs in the classifier thresholds, confusion-group handling,
and training/evaluation process.

Rule types include:

- `homophone`
- `punctuation`
- `contraction`
- `spelling_variant`
- `accepted_variant`
- `accent_safe_variant`

Example rules:

| Expected | Recognized | Rule type | Meaning |
|---|---|---|---|
| `sun` | `son` | `homophone` | Same spoken word for scoring. |
| `son` | `sun` | `homophone` | Same spoken word for scoring. |
| `which` | `witch` | `homophone` | Same pronunciation in normal scoring context. |
| `jeans` | `genes` | `homophone` | Same pronunciation despite different spelling. |
| `do not` | `don't` | `contraction` | Equivalent wording. |
| comma pause | period pause | `punctuation` | Punctuation difference does not change scoring. |

Equivalence rules may be scoped:

- `global`: applies everywhere.
- `prompt_type`: applies only to word, phrase, sentence, or passage tasks.
- `module`: applies only to a module or lesson group.
- `item`: applies only to one assessment or lesson item.

Use the narrowest safe scope. Homophones like `sun/son` can often be global.
Context-sensitive accepted variants should be item-scoped.

## Homophone Detection

Do not rely on character edit distance to detect homophones. CER can catch easy
cases such as `sun/son`, but it can miss words like `jeans/genes`.

Use this order:

1. Exact match.
2. Curated Equivalence Book homophone group.
3. Pronunciation dictionary match, such as CMUdict, when available.
4. Conservative phoneme similarity fallback.
5. Mismatch.

Phoneme similarity fallback must use a high threshold and should be treated as a
candidate for review, not a broad automatic acceptance gate.

## Punctuation Equivalence

Mu may output commas, periods, or sentence breaks differently from the expected
item. Punctuation differences should not penalize the learner when the word
sequence is otherwise correct and the punctuation difference represents a minor
pause difference.

Example:

Expected:

```text
Rosa plants a seed, Lena then waters it.
```

Raw Mu transcript:

```text
Rosa plants a seed. Lena then waters it.
```

Scoring transcript may use the expected punctuation form, with repair metadata
showing `punctuation_equivalent`.

Punctuation equivalence must not hide missing words, inserted content words, or
changed meaning.

## Scoring Transcript Authority

Speech-task scores use the final scoring response, not raw model evidence
directly.

For Nu letter tasks, the scoring response is the target-aware decision produced
after:

1. Audio-quality validation.
2. Nu class-probability inference.
3. Special-class checks for `SILENCE` and `UNKNOWN`.
4. Expected-letter probability check.
5. Confusion-group uncertainty handling.
6. Calibrated prompt-specific thresholds.
7. Final target-aware decision.

For Mu transcription tasks, the scoring transcript is produced after:

1. Mu raw transcript.
2. Light normalization.
3. Expected-aware alignment.
4. Equivalence Book checks.
5. Prompt-specific scoring thresholds.
6. Optional GOP support where available.

If the response is accepted, the scoring transcript may use the expected form
for equivalent words or punctuation. If the response is rejected, the scoring
transcript should preserve the recognized response or the aligned rejected form.

Repair metadata must explain accepted Mu equivalences. Nu decisions must expose
classification metadata such as predicted class, expected probability,
confidence, thresholds, and top alternatives.

Example metadata:

```json
{
  "expected": "jeans",
  "recognized": "genes",
  "decision": "equivalent",
  "reason": "homophone",
  "source": "equivalence_book",
  "scope": "global"
}
```

## True Sandbox Equivalence Authoring

The V2 True Sandbox is the admin review surface for Mu testing and Equivalence
Book authoring.

Workflow:

1. Select an item or type expected text.
2. Record or upload audio.
3. Run Mu.
4. Show raw Mu transcript evidence and segment details.
5. Admin marks the sample as `Expected correct` or `Expected wrong`.
6. Show highlighted differences between expected text and raw transcript.
7. If a Mu sample is `Expected correct`, allow accepted differences to become
   Equivalence Book rules.
8. If the sample is `Expected wrong`, hide or disable equivalence authoring.

True Sandbox must not run Nu or evaluate isolated-letter items. Nu review
belongs in IsoLetter Sandbox.

Hard rule:

```text
Only expected-correct reviewed samples can create Equivalence Book rules.
```

Expected-wrong samples may support review labels such as:

- Confirm learner error.
- Mark ASR error.
- Ignore sample.
- Add negative example for evaluation.

They must not create acceptable-equivalence rules.

## GOP Pronunciation Scoring

GOP means Goodness of Pronunciation. In ReaDirect, it is supporting evidence,
not a replacement for ASR or teacher judgment.

What it does:

- Looks at learner audio against expected phonemes.
- Produces phoneme-level and overall pronunciation evidence.
- Helps identify weak vowels, consonant substitutions, omitted sounds, and
  similar pronunciation issues.
- Supports expected-aware scoring when transcript evidence is ambiguous.
- Falls back safely when the phoneme model, alignment, or audio quality is not
  usable.

GOP may support a scoring decision, but it must not rewrite raw model evidence.

## Decision Order

Use separate scoring decision orders for Nu and Mu.

Nu isolated-letter decision order:

1. Reject or retry unusable audio before scoring.
2. Run Nu audio classification.
3. Store predicted class, confidence, top predictions, and full probability map.
4. Check `SILENCE` and `UNKNOWN` thresholds.
5. If expected letter is missing, return classifier output without correctness
   scoring.
6. Check expected-letter probability against the calibrated acceptance
   threshold.
7. Check uncertain threshold and confusion-group gap rules.
8. Produce `CORRECT`, `UNCERTAIN`, `INCORRECT`, `SILENCE`, `UNKNOWN`, or
   `UNUSABLE_AUDIO`.
9. Keep Nu probability evidence visible in debug/admin data.

Mu transcription decision order:

1. Reject or retry unusable audio before scoring.
2. Run Mu for words, phrases, sentences, or passages.
3. Store raw transcript and segment details.
4. Lightly normalize transcript text for comparison.
5. If expected text is missing, return raw and normalized transcript without
   expected-aware scoring.
6. Align expected text and recognized text.
7. Check exact match.
8. Check Equivalence Book rules.
9. Check strict punctuation equivalence.
10. Check pronunciation dictionary or conservative phoneme equivalence.
11. Use GOP as supporting evidence when available.
12. Produce scoring transcript and repair metadata.
13. Keep raw transcript visible in debug/admin data.

## Out Of Scope

This guide does not define these areas:

- Specific endpoint names and request/response flow.
- Frontend screens and page-level implementation details.
- Preprocessing implementation details.
- Service startup structure, unless it is useful for local deployment.
- Model-training procedure for Nu or Mu.
- Teacher override workflows.

## Reference Docs

Detailed references:

- `READIRECT_REVAMP_AUDIO_PREPROCESSING_AND_RECORDING_STANDARD.md`
- `READIRECT_REVAMP_ASSESSMENT_GUIDE.md`
- `READIRECT_REVAMP_USER_ROLES_AND_DASHBOARDS.md`
