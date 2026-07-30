# ReaDirect Revamp ASR Guide

Authored CSV targets, Filipino pronunciation review, fixed assessment forms,
and lesson-content selection are defined by
`READIRECT_REVAMP_CONTENT_CSV_AND_SELECTION_STANDARD.md`. This guide remains
authoritative for how Nu and Mu process those targets.

The separate
`READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md` defines how TTS
produces an isolated letter name. TTS pronunciation hints must not be treated
as Nu aliases unless they independently pass the Equivalence Book review rules.

Purpose: define the ASR and post-ASR scoring behavior for the ReaDirect revamp.

It is not an endpoint contract. Screens, routes, and request shapes are designed
separately under the approved technology stack.

## Core Design

The ASR side uses these parts:

1. Mu-backed Nu mode for isolated letter recognition.
2. Mu for word, phrase, sentence, and passage transcription.
3. Nu strict transcript-to-letter resolution for letter tasks.
4. Mu light transcript normalization for word, phrase, sentence, and passage
   tasks.
5. Mu expected-aware comparison and word alignment.
6. Equivalence Book rules for acceptable Mu transcript differences, including
   reviewed letter aliases used by Nu mode.
7. Scoring decision logic.
8. GOP pronunciation scoring as supporting evidence where available.

Nu and Mu do not use the same post-ASR flow.

Nu isolated-letter flow:

```text
raw isolated-letter audio
-> audio-quality check
-> Mu raw transcript and segment evidence
-> Unicode-aware strict letter alias resolver
-> built-in and reviewed Equivalence Book letter aliases
-> one resolved class: A-Z, SILENCE, or UNKNOWN
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

The system must preserve raw model evidence. Nu evidence is Mu's exact raw
transcript and segments plus the normalized alias, mapping source, matched
alias, and final resolved class. Mu evidence for longer tasks is the raw
transcript and segment details. Expected text is used for comparison, scoring,
and equivalence review. It must not rewrite raw model evidence or bias the
letter resolver.

## Runtime Audio Processing Standard

Original-audio processing is the system default. Conditional **Mu** noise
reduction is globally **off by default** and must be enabled deliberately from
the System Administrator Overview. The setting is stored in PostgreSQL, applies
only to new Mu submissions, and every change writes a staff audit record. Nu
must never use noise reduction, regardless of this setting.

The following safe preprocessing always remains active whether the setting is
on or off:

- Decode the submitted format into mono 16 kHz audio for analysis.
- Measure duration, level, silence, clipping, and usability.
- Preserve the submitted recording and the first-pass model evidence.
- Reject or request a retry for unusable audio rather than trying to repair it.

When conditional Mu noise reduction is enabled, it uses this mandatory
raw-first order:

1. Analyze and run Mu against the original recording.
2. Estimate whether a reliable stationary-noise profile exists.
3. Continue with the original result when the recording is clean, the profile
   is unreliable, the audio is unusable, or the first result is confident.
4. Only for a measurably noisy recording with an uncertain first result, create
   a bounded spectral-gate second pass.
5. Limit attenuation to 10 dB and mix 30% of the original waveform back into
   the enhanced candidate to protect child-speech consonants.
6. Keep the original recording and result authoritative. Store the enhanced
   result as separate evidence.
7. If the original and enhanced results disagree, return an uncertain/review or
   retry state. Never silently replace original evidence with the enhanced
   result.

The Mu response metadata must state whether noise reduction was enabled,
whether a second pass was attempted, why it ran or did not run, which audio
remained authoritative, and whether the two passes require review or retry.
This makes the option observable in True Sandbox without disguising model
behavior.

## Model Roles

### Nu

Nu is not a separately trained model. Nu is the product name for Mu's strict
isolated-letter mode.

Runtime design:

- Single checkpoint: Mu's local Whisper large-v3-turbo faster-whisper snapshot.
- Task type: Mu transcription followed by deterministic closed-set resolution.
- Output classes: A-Z, `SILENCE`, and `UNKNOWN`.
- The complete normalized transcript must exactly match one built-in or active
  reviewed `letter_alias` Equivalence Book entry. Substring matching is
  prohibited.
- The expected letter is compared only after independent alias lookup. It must
  not repair an unmapped transcript. The sole exception is an explicitly
  reviewed multi-letter alias such as `aye`, where the expected letter may
  select one of the alias's documented candidates.
- Empty low-energy speech resolves to `SILENCE`. Speech that is unmapped,
  unapproved-ambiguous, or unusable resolves to `UNKNOWN` or an unusable
  decision.
- Runtime output includes Mu's raw transcript, normalized transcript, segment
  evidence, audio-quality evidence, matched alias, mapping source, applied
  equivalence-rule IDs, resolved class, and target-aware decision.
- Nu has no head, label-map artifact, calibration file, class-probability map,
  optimizer state, or independent model checkpoint.

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

## V2 Local Runtime Artifacts

The active local-development artifact is:

- Mu: `services/asr/model_artifacts/mu`
- Mu runtime snapshot: the local faster-whisper `large-v3-turbo` snapshot below
  Mu's `cache/` directory

Nu uses that same Mu artifact and adds only tracked resolver code plus
PostgreSQL Equivalence Book records. No Nu model artifact directory is allowed.

Mu resolves the imported local snapshot before considering any remote model
source. Local development keeps model downloads disabled by default. On CUDA,
Mu uses `int8_float16`; its CPU fallback uses `int8`.

All files below `services/asr/model_artifacts/` are private local runtime files
and are Git-ignored. Model binaries must never be committed. Lightweight runtime
code, API contracts, and documentation remain tracked.

The browser does not call FastAPI directly. React sends system-administrator
sandbox requests to Laravel. Laravel verifies the system-administrator account,
forwards the audio to FastAPI, relays the response, and writes the audit record.

Every IsoLetter or True Sandbox run must also create a dedicated
`speech_sandbox_attempts` record immediately. The original upload is stored
under Laravel's private `storage/app/private/speech-sandbox/` tree, never under
`public/`. The record owns the expected value, original filename and MIME type,
SHA-256, service status, complete service response, failure evidence, review
outcome, and linked equivalence rule. Sandbox evidence is excluded from learner
analytics.

Active local service endpoints:

- `GET /models/status`
- `POST /mu/resolve-letter`
- `POST /mu/transcribe`

Mu loads lazily. The first general or Nu letter-mode request loads the same Mu
instance. `/nu/classify` is removed and must return `404`.

## Evidence And Transcript Roles

Keep these roles separate:

- `nu_raw_transcript`: exact Mu transcript returned in letter mode.
- `nu_normalized_transcript`: Unicode-aware normalized complete transcript.
- `nu_predicted_class`: exact A-Z, `SILENCE`, or `UNKNOWN` resolver result.
- `nu_mapping_source`: built-in alias, reviewed equivalence,
  expected-scoped reviewed equivalence, silence gate, ambiguous alias, unmapped
  transcript, or unusable audio.
- `nu_equivalence_rule_ids`: reviewed letter-alias rules used by the resolver.
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
  the target-aware decision (`CORRECT`, `INCORRECT`, `SILENCE`, `UNKNOWN`, or
  `UNUSABLE_AUDIO`). For Mu this is usually the scoring
  transcript.
- `displayed_transcript`: transcript shown to users; it may match the scoring
  transcript for Mu tasks, but raw transcript remains available in review/admin
  data.
- `repair_metadata`: structured explanation for any equivalence or scoring
  repair.

Raw model evidence is the truth of what Mu returned. Nu evidence is Mu
transcript plus deterministic resolution evidence. Scoring response is
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

Nu compares the expected letter to the independently resolved class and
produces `CORRECT`, `INCORRECT`, `SILENCE`, `UNKNOWN`, or `UNUSABLE_AUDIO`.
For an explicitly reviewed multi-letter alias, the raw alias first produces a
fixed candidate set; the expected letter may pass only when it belongs to that
set. Candidate letters and the supporting rule ID remain visible in evidence.

## Equivalence Book

The Equivalence Book defines accepted text differences for every Mu transcript
path, including Nu letter mode.

Its job is not to force ASR output to the expected answer. Its job is to define
which transcript differences are acceptable for scoring.

Nu uses active global `letter_alias` rules after built-in aliases. A reviewed
alias maps one complete normalized Mu transcript to one A-Z class. Conflicting
aliases resolve to `UNKNOWN`; a literal letter can never be reassigned to a
different letter.

Rule types include:

- `homophone`
- `punctuation`
- `contraction`
- `spelling_variant`
- `accepted_variant`
- `accent_safe_variant`
- `letter_alias`

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
2. Mu raw transcript and segment capture.
3. Unicode-aware complete-transcript normalization.
4. Exact built-in or reviewed `letter_alias` resolution.
5. `SILENCE`, `UNKNOWN`, and unusable-audio handling.
6. Expected-letter comparison.
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
the raw and normalized Mu transcript, resolved class, matched alias, mapping
source, applied rule IDs, segments, and audio-quality evidence.

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

1. Select an approved assessment or lesson speech target, or choose custom
   expected text for an isolated experiment.
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

The True Sandbox content selector is populated by Laravel from the authoritative
active content sources. The browser must never parse CSV files. Its selectable
catalog contains:

- Assessment Task 2B word targets.
- Assessment Task 3A passage targets.
- Lesson 2 word targets.
- Lesson 3 phrase targets.
- Lesson 4 sentence targets.
- Lesson 5 passage targets.

Assessment Task 2A rhyme yes/no choices, Assessment Task 3B comprehension
questions and choices, all Lesson 6 content, and all isolated-letter targets
are excluded. Lesson 6 is an authored choice activity and never calls Mu.
Selecting authored speech content must lock its exact expected text, ASR task
type, and stable item scope until the administrator returns to custom input.

IsoLetter Sandbox uses the same expected-correct review gate. When Mu's raw
letter transcript is wrong or unmapped but the administrator confirms the
speaker said the expected letter correctly, the complete normalized transcript
may be saved as a global `letter_alias`. The reviewed sandbox attempt and its
private audio must remain linked to the created rule.

Hard rule:

```text
Only expected-correct reviewed samples can create Equivalence Book rules.
```

### Four-Voice Content Fixture Audit

The approved `millie2`, `millie2-plus`, `jz`, and `shai` fixture sets are four
independent, known-correct variants of every Mu content target. Each set must
contain the same 116 stable content IDs, and each variant is submitted to Mu
once. A mismatch from any voice is sufficient evidence for an Equivalence Book
entry; the same mismatch is not required to occur in multiple voices.

General-content fixture rules use these constraints:

- Every submitted fixture creates a private `speech_sandbox_attempts` evidence
  record and is reviewed as `expected_correct`.
- Raw Mu text remains unchanged and visible.
- Expected and recognized text are aligned by tokens.
- A substitution creates a `token_alias` scoped to the exact `content_id`.
- A `token_alias` must contain two different normalized single-word values and
  must never be global.
- Duplicate observations across the four voices reuse one rule.
- A known-correct substitution remains active even when the recognized token
  is another standalone curriculum target. Expected-item scope prevents that
  evidence from changing an unrelated item.
- Insertions and omissions remain recorded differences. They do not
  automatically become equivalences.
- Phrases, sentences, and passages must not create unrestricted global word
  replacements or giant whole-passage aliases.

The current baseline contains 464 recorded submissions: 116 from each voice.
Mu returned 403 raw exact matches and 61 mismatching transcripts. The
mismatches produced 32 unique active item-scoped token rules. Seven insertion
or omission differences remain evidence-only.

The audit version is `four-voice-item-token-v3`. The raw confusion matrix also
accepts the original `two-voice-item-token-v1` attempt records so the first 232
observations remain part of the same evidence history rather than being
duplicated.

The resumable audit command is:

```powershell
services\asr\.venv\Scripts\python.exe services\asr\scripts\audit-content-fixture-equivalences.py --staff-user-id 1
```

Its checkpoint and evidence summary live in
`services/asr/fixtures/content/fixture-equivalence-audit.json`. Re-running the
command skips completed audio hashes rather than producing duplicate attempts.

### Philippine-English CVC Middle-Vowel Family

For authored regular CVC tokens, ReaDirect intentionally treats the short
middle vowels spelled `a`, `o`, and `u` as one inclusive scoring family when
the first and final consonants are identical:

```text
cat <-> cot <-> cut
cap <-> cop <-> cup
hat <-> hot <-> hut
```

This is a scoring policy for Philippine-English learner speech and Mu
false-negative tolerance. It does not declare the words semantically
interchangeable. The rule is reciprocal and stored as a global token alias,
while the active expected item continues to control the canonical final
transcript.

Hard boundaries:

- Only ASCII tokens matching a regular `CVC` frame qualify.
- Both outside letters must be consonants and must match exactly.
- Only the middle family `{a, o, u}` is interchangeable.
- `e` and `i` remain distinct from each other and from `{a, o, u}`.
- Irregular three-letter spellings do not qualify merely because their text has
  three characters.

`CvcVowelEquivalenceCatalog` scans every active Mu target exposed by
`SpeechContentCatalog`, including tokens inside phrases, sentences, and
passages. `CvcVowelEquivalenceSeeder` currently produces
86 deduplicated global-token aliases across the Version 1 corpus. The resolver
uses word-level Levenshtein alignment and checks each substituted token, so two
or more qualifying vowel-family substitutions can pass inside one longer
target. Re-running the seeder is idempotent, disables stale system-generated
aliases, and
reactivates known-correct fixture rules that were disabled only because their
recognized token was another curriculum target.

### Raw Confusion Matrix

The System Administrator `Confusion Matrix` workspace must keep raw and final
transcript analysis separate. The first matrix is always the raw matrix and is
built from the stored `service_response.comparison` evidence before any active
Equivalence Book rule is applied.

Raw matrix rules:

- Rows are normalized expected tokens.
- Columns are untouched normalized Mu tokens.
- Exact aligned tokens populate the diagonal.
- Substitutions populate off-diagonal cells.
- Omissions use the special recognized-token axis `∅`.
- Insertions use the special expected-token axis `∅`.
- Voice-fixture and activity-type filters operate only on the recorded fixture
  audit attempts.
- The default UI shows labels involved in a confusion so the matrix remains
  readable; an explicit control exposes all observed tokens.
- Raw token accuracy is exact aligned tokens divided by expected tokens.
- Raw counts must never be repaired or overwritten by equivalence changes.

The raw workspace also contains a binary acceptance matrix. It combines the
known-correct four-voice fixtures with two known-negative fixture pools:

- `services/asr/fixtures/distractors/fptn` contains speech that must not match
  the assigned curriculum target.
- `services/asr/fixtures/distractors/silence` contains silence or non-speech
  audio that must be rejected.

The folder name `fptn` identifies a negative evaluation pool; its files are not
automatically false positives. A negative recording becomes a false positive
only when Mu's normalized raw transcript exactly matches its assigned target.

Binary raw-matrix definitions:

- True positive (TP): known-correct fixture accepted by normalized raw exact
  match.
- False negative (FN): known-correct fixture rejected by normalized raw exact
  match.
- False positive (FP): known-negative `fptn` or silence fixture accepted by
  normalized raw exact match.
- True negative (TN): known-negative `fptn` or silence fixture rejected.

The negative audit uses these reproducibility rules:

1. Sort the 116 authored targets by stable `content_id`.
2. Sort each negative category by filename.
3. Assign each category independently and round-robin by filename index across
   the sorted targets.
4. Lock the target, audio hash, raw transcript, attempt ID, and result in the
   audit manifest.
5. Record every negative attempt as `expected_wrong` evidence.
6. Force Mu noise reduction off so the baseline is not changed by the current
   System Administrator toggle.
7. Re-running the command skips a record only when its audio hash and assigned
   content ID still match the locked manifest.

The resumable negative audit command is:

```powershell
services\asr\.venv\Scripts\python.exe services\asr\scripts\audit-content-distractors.py --staff-user-id 1
```

Its locked assignment and result manifest is
`services/asr/fixtures/distractors/distractor-evaluation-audit.json`. The raw
page displays TP, TN, FP, FN, accuracy, precision, recall, specificity, F1, and
per-negative-source counts. Voice and activity filters affect the token matrix
only; the binary matrix remains the complete fixed evaluation baseline.

Current raw binary baseline:

- Known-correct content positives: 464 total, 403 TP and 61 FN.
- `fptn` negatives: 156 total, 156 TN and 0 FP.
- Silence negatives: 126 total, 126 TN and 0 FP.
- Content combined: 746 decisions, 91.82% accuracy, 100% precision, 86.85%
  recall, 100% specificity, and 92.96% F1.
- Letter evaluation: 78 known-correct positives plus 282 negative decisions,
  producing 77 TP, 280 TN, 2 FP, and 1 FN.
- Overall content-and-letter evaluation: 1,106 decisions, 480 TP, 562 TN, 2
  FP, and 62 FN, with 94.21% accuracy and 93.75% F1.

The raw token matrix contains 542 known-correct recordings: 464 content
fixtures and 78 isolated-letter fixtures. It currently contains 450 exact
recordings, 92 mismatched recordings, and 95.73% raw token accuracy. Voice
filters expose `millie2`, `millie2-plus`, `jz`, and `shai` without changing the
fixed binary baseline.

The final-transcript confusion matrix is a separate later view. It must score
the resolved transcript and must not replace or mutate this raw baseline.

The System Administrator sidebar exposes the Equivalence Book as the management
surface for reviewed rules. It may search and filter rules and enable or disable
them. Rule creation remains gated through expected-correct review in IsoLetter
or True Sandbox; the management page must not provide an unrestricted rule
creation shortcut.

The development database seeds 79 visible `letter_alias` rules:
67 standard aliases covering literal A-Z forms and standard English letter-name
transcripts, plus 10 aliases derived from a complete confirmed-correct fixture
evaluation. Examples include `you -> U`, `why -> Y`, `queue -> Q`,
`double you -> W`, `seed -> C`, `okay -> K`, and `arr -> R`.

The fixture-derived baseline was generated by running all 520 isolated-letter
fixtures through Mu one by one. Before adding new rules, 454 resolved correctly,
47 were `UNKNOWN`, and 19 resolved to an incorrect existing letter. Ten unique
aliases account for 43 safe-to-repair false negatives:

- `seed`, `siiii` -> C
- `aiii`, `ayy`, `ayyyy` -> I
- `gay`, `okay` -> K
- `arr` -> R
- `ass` -> S
- `eww` -> U

Two additional decisions are explicitly approved:

- `aye` has the fixed candidates A and I. It passes only when the active item
  expects A or I and reports `expected_scoped_equivalence` evidence.
- `the` resolves to D. Its Z observations remain incorrect.
- `oh` remains exclusively mapped to O. Its L observations remain incorrect.

After these decisions, 501 of the 520 captured fixture transcripts resolve to
their confirmed letter. The remaining 19 false negatives are not
equivalence-safe: `b` for B/P/T, `d` for D/G, `oh` for L/O, `p` for P/T, and
the Z observations of `the`. They remain visible as resolver limitations and
must not be forced into another global alias.

This seeded baseline is the only exception to sandbox-gated rule creation.
Unbounded guesses and aliases that could resolve to more than one letter are
prohibited; additional observed Mu outputs must be added through IsoLetter
expected-correct review or another complete confirmed-correct fixture audit.

Expected-wrong samples may support review labels such as:

- Confirm learner error.
- Mark ASR error.
- Ignore sample.
- Add negative example for evaluation.

They must not create acceptable-equivalence rules.

The separate voice-keyed sets below `services/asr/fixtures/letters/`, including
`millie2/` and `jz/`, contain synthesized TTS outputs for A-Z human
pronunciation review. They are not part of the 520 learner-speech baseline and
must not create Nu aliases while their manifests are `human_review_pending`.

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
2. Run Mu once against the original audio with noise reduction disabled.
3. Preserve the raw transcript, segments, and audio-quality evidence.
4. Normalize the complete transcript with Unicode-aware letter normalization.
5. Resolve only an exact built-in or active reviewed letter alias.
6. Resolve empty low-energy audio to `SILENCE`.
7. Resolve unmapped, unapproved-ambiguous, or unusable speech to `UNKNOWN` or
   `UNUSABLE_AUDIO`.
8. Compare the resolved class with the expected letter. For an explicitly
   reviewed multi-letter alias only, allow the expected letter to select one of
   the fixed documented candidates and expose that exception in evidence.
9. Produce `CORRECT`, `INCORRECT`, `SILENCE`, `UNKNOWN`, or `UNUSABLE_AUDIO`.
10. Keep the complete Mu and resolver evidence visible in admin review data.

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
- Service startup structure, unless it is useful for local deployment.
- Model-training procedure for Nu or Mu.
- Teacher override workflows.

## Reference Docs

Detailed references:

- `READIRECT_REVAMP_AUDIO_PREPROCESSING_AND_RECORDING_STANDARD.md`
- `READIRECT_REVAMP_ASSESSMENT_GUIDE.md`
- `READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md`
- `READIRECT_REVAMP_USER_ROLES_AND_DASHBOARDS.md`
- `services/asr/training_records/README.md` (checkpoint-lineage documentation
  package; see its provenance disclosure)
