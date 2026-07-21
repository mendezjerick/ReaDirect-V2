# ReaDirect Isolated-Letter Pronunciation Standard

This document is the source of truth for how ReaDirect asks any text-to-speech
engine to pronounce an isolated English letter from A to Z.

It is engine-neutral. It is not a Millie2, VoxCPM2, Ma'am Clara, theme, lesson,
assessment, or ASR-specific table. Every present and future TTS adapter must
resolve isolated-letter speech through this standard.

## Authority And Scope

This standard defines the intended spoken sound of a letter when an approved
runtime flow needs to say that letter by itself.

It does not:

- Grant permission to pronounce an assessment target.
- Define how Nu recognizes learner speech.
- Define ASR Equivalence Book aliases.
- Replace authored uppercase or lowercase display forms.
- Require one particular TTS engine or voice.

The authoritative value is the IPA pronunciation. `Fallback text` is the
engine-neutral plain-text hint used when a TTS adapter cannot submit phonemes or
SSML. An adapter may maintain an engine-specific internal rendering only when
needed to produce the same authoritative sound.

## Canonical A-Z Table

The default pronunciation family is the rhotic English letter-name system used
in Philippine and American English. Z uses `zee`, not `zed`.

| Letter class | IPA authority | Fallback text | Intended spoken name |
| --- | --- | --- | --- |
| A | `/eɪ/` | `ei` | A |
| B | `/biː/` | `bee` | B |
| C | `/siː/` | `see` | C |
| D | `/diː/` | `dee` | D |
| E | `/iː/` | `ee` | E |
| F | `/ɛf/` | `eff` | F |
| G | `/dʒiː/` | `gee` | G |
| H | `/eɪtʃ/` | `aitch` | H |
| I | `/aɪ/` | `eye` | I |
| J | `/dʒeɪ/` | `jay` | J |
| K | `/keɪ/` | `kei` | K |
| L | `/ɛl/` | `el` | L |
| M | `/ɛm/` | `em` | M |
| N | `/ɛn/` | `en` | N |
| O | `/oʊ/` | `oh` | O |
| P | `/piː/` | `pee` | P |
| Q | `/kjuː/` | `cue` | Q |
| R | `/ɑr/` | `ar` | R |
| S | `/ɛs/` | `ess` | S |
| T | `/tiː/` | `tee` | T |
| U | `/juː/` | `you` | U |
| V | `/viː/` | `vee` | V |
| W | `/ˈdʌbəl.juː/` | `double you` | W |
| X | `/ɛks/` | `ex` | X |
| Y | `/waɪ/` | `why` | Y |
| Z | `/ziː/` | `zee` | Z |

## Runtime Resolution Contract

The runtime lookup key is one uppercase A-Z class.

```text
authored or runtime letter class
-> normalize to one uppercase A-Z class
-> load this central pronunciation record
-> use IPA/phoneme input when the active engine supports it
-> otherwise use the fallback text
-> render with the selected voice
-> play only when the active learner flow permits target audio
```

Hard rules:

1. Never rely on a raw single-character TTS prompt for isolated-letter speech.
2. Never infer pronunciation from the displayed uppercase/lowercase pair.
3. IPA is authoritative when a plain-text engine interprets a fallback word
   incorrectly.
4. For A, the fallback is `ei`. `ay` is not the canonical ReaDirect fallback.
5. Punctuation, pauses, and silence padding are adapter concerns and are not
   part of the letter's pronunciation record.
6. The generated utterance must contain only the intended letter name. It must
   not add an example word, sentence, explanation, or leading prompt.
7. A voice-specific workaround belongs inside that voice adapter. It must not
   overwrite this general table unless the intended English letter sound itself
   changes through an approved standard revision.
8. Cache keys must include at least the letter class, voice identity, TTS model
   version, pronunciation-standard version, and synthesis settings.
9. Changing themes or Ma'am Clara's visual palette must not change letter
   pronunciation.
10. An isolated-letter TTS fixture must be at least `0.70` seconds (`700ms`). A
    shorter generation is rejected and regenerated automatically. This is a
    minimum-duration gate, not permission to add extra speech or artificial
    spoken filler.

## Assessment And Lesson Safety

This table tells the TTS system how to say a letter, not when it is allowed to
say one.

- Lessons may use the mapping only where the approved instructional flow allows
  a model, replay, correction, or spoken prompt.
- An active assessment must not pronounce its target merely because the mapping
  exists. Assessment interaction rules remain authoritative.
- Displaying a letter pair never automatically triggers TTS.
- Recording must not begin while TTS is speaking. The audio preprocessing and
  recording standard remains authoritative for playback interruption.

## Separation From ASR Equivalence

TTS pronunciation and Nu recognition solve opposite problems:

```text
TTS registry: letter class -> intended spoken sound
Nu resolver: learner/Mu transcript -> resolved letter class
```

Examples such as `aye -> A/I`, `you -> U`, or `why -> Y` are ASR recognition
aliases. They do not replace the TTS table. Likewise, the TTS fallback `ei` for
A does not automatically create a Nu Equivalence Book rule.

## Adapter Acceptance Checks

Before approving a TTS engine or voice for isolated-letter runtime playback:

- Generate all 26 classes through the adapter.
- Confirm that each output matches the IPA authority.
- Confirm that no output contains extra speech.
- Confirm that W remains one letter name even though it has multiple syllables.
- Confirm that Z is pronounced `zee`.
- Record any engine-specific override inside the adapter's own test/config data.
- Re-run the full A-Z review after changing the engine, voice, model version,
  reference voice, normalization, denoising, or synthesis settings.

## TTS Human-Review Fixtures

The development generator reads the fallback column from this table and creates
one WAV per A-Z class. Millie2 is the default reference:

```powershell
services\tts\.venv\Scripts\python.exe services\tts\scripts\generate-isolated-letter-fixtures.py
```

Another reference voice uses its own fixture-set directory. Example for JZ:

```powershell
services\tts\.venv\Scripts\python.exe services\tts\scripts\generate-isolated-letter-fixtures.py --reference assets\audio\voice-references\jz.wav --fixture-set jz
```

Outputs and review evidence belong under:

```text
services/asr/fixtures/letters/<voice-key>/
|-- A/ ... Z/
|-- fixture-manifest.json
\-- REVIEW.md
```

New outputs remain `human_review_pending`. They must not become Nu equivalence
evidence or approved runtime audio until a human confirms every generated sound
against this standard.

Every voice set remains separate. The generator applies the hard `0.70`-second
minimum and retries a shorter result automatically, up to 20 attempts by
default.

## Related Sources Of Truth

- `READIRECT_REVAMP_AUDIO_PREPROCESSING_AND_RECORDING_STANDARD.md`
- `READIRECT_REVAMP_ASR_GUIDE.md`
- `READIRECT_REVAMP_ASSESSMENT_GUIDE.md`
- `READIRECT_REVAMP_CONTENT_CSV_AND_SELECTION_STANDARD.md`
- `READIRECT_REVAMP_LESSON_AND_ASSESSMENT_INTERACTION_STANDARD.md`
- `READIRECT_REVAMP_LESSON_STRUCTURE_STANDARD.md`
- `READIRECT_REVAMP_PROJECT_STRUCTURE.md`
- `READIRECT_REVAMP_TECH_STACK.md`
