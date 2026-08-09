# ReaDirect Filipino TTS Localization Standard

## Status

This document defines the Slice 1 source contract for Filipino speech in
ReaDirect. Slice 1 is documentation and translation only. It does not change
learner preferences, database selection, activity manifests, TTS routing,
runtime reference selection, or published audio.

The review artifacts owned by this slice are:

- `content/tts/v1/fil-PH/published-lines.csv`
- `content/tts/v1/fil-PH/runtime-templates.csv`
- `assets/audio/voice-references/sh-fil/REFERENCE.md`

## Language identity

The learner-facing name is **Filipino**. ReaDirect uses `fil-PH` as its
application locale. VoxCPM2 describes the supported model language as Tagalog
and uses `tl` in its published evaluation material. These identifiers refer to
the same model capability for this implementation, but ReaDirect must not show
`tl` or "Tagalog" in the learner switch.

English remains the default until a learner explicitly selects Filipino. The
selection changes Clara's spoken guidance. It does not translate visible
curriculum content, learner answers, scoring targets, evidence, or progression.

## Catalog boundary

The existing Version 1 catalog contains exactly 300 published speech keys. The
Filipino catalog must contain the same 300 stable keys. A language must never be
encoded by changing a speech key.

The localization inventory is:

| Surface | Count |
| --- | ---: |
| Fixed published speech lines | 300 |
| Live runtime template formats | 23 |
| Total localized definitions | 323 |

The fixed catalog is divided as follows:

| Area | Count |
| --- | ---: |
| Lesson Intro | 1 |
| Lesson 1 | 52 |
| Lesson 2 | 69 |
| Lesson 3 | 34 |
| Lesson 4 | 34 |
| Lesson 5 | 9 |
| Lesson 6 | 47 |
| Assessments | 47 |
| Learn with Clara | 7 |

The authored delivery-role split is one `introduce`, 212 `instruction`, 36
`question`, and 51 `result` lines.

## Translation policies

Every fixed line has one translation policy.

### `translate`

Translate the entire spoken line into natural, child-directed Filipino. Prefer
short sentences, familiar words, and direct instructions. Do not add praise,
hints, or information that is absent from the English source.

### `code_switch_target`

Translate Clara's instructional wrapper while preserving the English literacy
target. English targets include:

- isolated letters and their approved spoken forms;
- target words, phrases, sentences, and passages;
- learner transcripts and ASR-derived correction words;
- character names and story titles;
- English achievement titles that remain visible in the learner interface.

Example:

```text
English:  The word is cat. Listen: cat. Now you try.
Filipino: Ang salita ay cat. Makinig: cat. Ngayon, ikaw naman.
```

The English target must not be respelled to force Filipino pronunciation. Any
VoxCPM2 code-switching problem is an audio-review failure, not permission to
change curriculum text.

### `preserve_english`

Keep the full utterance in English. Slice 1 currently assigns no fixed catalog
line to this policy, but the value is reserved for a reviewed exception.

### `academic_review`

Provide a Filipino draft but prevent generation and publication until an
instructional owner approves it. The ten assessment comprehension questions
use this policy because translating a scored English-comprehension question can
change the construct and make scores collected in different speech modes less
comparable.

## Filipino writing conventions

- Use standard Filipino suitable for an early elementary learner.
- Prefer `letra`, `salita`, `parirala`, `pangungusap`, and `kuwento` for the
  corresponding literacy units.
- Use `naka-highlight` where the interface visually highlights a target.
- Use `ikaw naman` for a short turn-taking invitation.
- Preserve proper names exactly.
- Preserve source punctuation stability. Published text must not contain an
  exclamation mark because the current catalog rejects it.
- Do not insert pronunciation guides, phonetic respellings, SSML, or language
  tags into localized text.
- Do not translate runtime placeholders or change their braces.

## Runtime-template contract

The runtime inventory contains 22 feedback formats and one Lesson 2 word
demonstration format. Runtime renderings are not a finite audio inventory: a
template can contain a learner transcript or an expected or actual English
word.

The following placeholders are controlled:

| Placeholder | Source | Localization rule |
| --- | --- | --- |
| `{spoken}` | Approved isolated-letter spoken form | Preserve as English target |
| `{final}` | Committed learner transcript | Preserve exactly after safety normalization |
| `{expected}` | Expected curriculum word | Preserve as English target |
| `{actual}` | Committed learner word | Preserve exactly after safety normalization |
| `{first}` / `{second}` | Expected curriculum words | Preserve as English targets |
| `{word}` | Lesson 2 target word | Preserve as English target |
| `{unit}` | Controlled phrase/sentence label | Resolve to `parirala` or `pangungusap` in Filipino |

Every translated template must contain exactly the required placeholders listed
in `runtime-templates.csv`. No browser request may provide arbitrary template
text or choose a private reference path.

## Assessment safeguard

General assessment directions, microphone instructions, ordinal cues, and
completion messages have approved Filipino translations. On 2026-08-08, the
product owner approved the ten `assessment-comprehension-*` rows as part of the
general learner language choice. They no longer require a separate academic
review before candidate generation.

## Reference recording

The candidate Filipino recording is documented in
`assets/audio/voice-references/sh-fil/REFERENCE.md`. Its transcript is:

```text
Makinig nang mabuti, sundan ang bawat salita, at huwag magmadali.
```

On 2026-08-08, the product owner explicitly approved the normalized authored
WAV as the shared general reference for `introduce`, `instruction`, `question`,
and `result`. This is an intentional role-mapping decision rather than an
automatic fallback.

## Review and publication states

Slice 1 uses these review values:

- `draft`: translated and awaiting Filipino-language review;
- `academic_review_required`: translated but blocked on instructional policy;
- `approved`: language and instructional review completed;
- `rejected`: must be revised before generation.

No Slice 1 row is automatically approved. A later audio-generation slice may
accept only `approved` rows.

## Slice 1 acceptance contract

Slice 1 is complete only when:

- the fixed CSV has exactly 300 unique keys matching the English catalog;
- the runtime CSV has exactly 23 unique template keys;
- all fixed rows have a Filipino draft and valid policy;
- all live templates preserve their required placeholders;
- English literacy targets remain unchanged inside code-switched lines;
- the ten assessment comprehension questions remain publication-blocked;
- the Filipino reference and transcript are documented; and
- no production configuration, schema, API, frontend, or TTS runtime behavior
  changes.
