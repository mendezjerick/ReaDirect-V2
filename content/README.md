# ReaDirect Authored Content

This directory contains reviewed, versioned CSV authoring sources for ReaDirect.
The authoritative schemas, validation rules, publication states, and runtime
selection behavior are defined by
`../READIRECT_REVAMP_CONTENT_CSV_AND_SELECTION_STANDARD.md`.

## Assessment Version 1

`assessments/v1/shared/` is one fixed content form used without shuffling by
both Diagnostic and Final Assessment runs.

- Task 1A contains ten fixed letter items.
- Task 2A contains ten fixed rhyme decisions in the required
  `correct, correct, incorrect, correct, incorrect, incorrect, correct, correct,
  incorrect, correct` order.
- Task 2B contains ten fixed word-pronunciation items.
- Task 3A contains two fixed story choices. One confirmed story is administered
  per eligible assessment run.
- Task 3B contains ten authored questions: five linked to each story. Only the
  selected story's Who, What, Where, When, and Why questions are administered.

The CSV files are authoring inputs. Laravel will validate and import a published
version into PostgreSQL; the browser must not read these files directly.

Every authored row declares its routing explicitly through `asr_model`:

- Task 1A and Lesson 1 isolated letters use `nu`, the strict letter-resolution
  mode powered by Mu rather than a separate trained model.
- Task 2B, Task 3A, Lesson 2 through Lesson 6 spoken responses use `mu`.
- Task 2A and Task 3B choice-only responses use `none`.

Display text is never inferred as the speech target. Nu receives one uppercase
A-Z `spoken_target`; Mu receives the complete normalized word, phrase, sentence,
passage, or comprehension answer.

When an approved runtime flow needs TTS to say an isolated letter, that
uppercase A-Z class resolves through
`../READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md`. CSV rows must
not embed voice-specific or engine-specific letter spellings.

## Required Lesson Version 1

`lessons/v1/` contains the initial required-lesson pools:

- 26 letter rows shared across the three Lesson 1 presentation types.
- 50 alphabetically ordered word rows grouped by close onset phonemes.
- 20 phrases.
- 20 sentences.
- 5 passages.
- 10 spoken-comprehension items, with two rows for every 5W type.
