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

## Required Lesson Version 1

`lessons/v1/` contains the initial required-lesson pools:

- 26 letter rows shared across the three Lesson 1 presentation types.
- 50 alphabetically ordered word rows grouped by close onset phonemes.
- 20 phrases.
- 20 sentences.
- 5 passages.
- 10 spoken-comprehension items, with two rows for every 5W type.
