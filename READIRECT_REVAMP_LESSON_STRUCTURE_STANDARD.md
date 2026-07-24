# ReaDirect Lesson Structure Standard

This document defines the required lesson structure, content formatting, ASR routing, and comprehension flow for ReaDirect-V2.

Learner-facing mission layout, recorder review, Submit, Skip, Next, kinetic
typography, no-image rules, and responsive activity behavior are defined by
`READIRECT_REVAMP_LESSON_AND_ASSESSMENT_INTERACTION_STANDARD.md`.

Per-lesson result pages, completion animation, Clara praise, and achievement
handoff are defined by
`READIRECT_REVAMP_RESULTS_AND_COMPLETION_PRESENTATION_STANDARD.md`.

Required-lesson achievement keys, criteria, granting, and presentation are
defined by `READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md`.

Required-lesson CSV schemas, target identities, pronunciation restrictions,
content pools, selection cycles, and immutable activity snapshots are defined by
`READIRECT_REVAMP_CONTENT_CSV_AND_SELECTION_STANDARD.md`.

## Course-Level Lesson Unlock Sequence

The developer-made required lesson set is sequential.

~~~text
Complete Diagnostic Assessment
    -> unlock required lesson 1
    -> complete required lesson 1
    -> unlock required lesson 2
    -> continue one lesson at a time
    -> complete the final required lesson
    -> unlock Final Assessment
~~~

Rules:

- Required lessons remain locked before Diagnostic Assessment completion.
- Diagnostic score does not select a different lesson or starting point.
- Only the first incomplete required lesson is available as the current
  required lesson.
- Completing the current required lesson unlocks the next lesson in the
  centrally defined order.
- Learners cannot skip a locked required lesson.
- Completion and unlock state are authoritative server data.
- Optional teacher-created lessons do not change the required order and do not
  block Final Assessment.
- Restarting the application, opening the Game Lobby, or playing a game does not
  change required lesson progression.

## Lesson Save And Resume State

Every started lesson has a persistent save state owned by and tied uniquely to
the authenticated learner or verified guest. Laravel and PostgreSQL persist,
validate, and retrieve that account-owned record. Lesson progress must not exist
only in React state, browser storage, an audio service, or an individual
activity component.

The save state records enough information to resume the exact current lesson
without repeating completed lesson work. It must include:

- Learner identity through an internal authenticated key.
- Permanent lesson key and lesson-content version.
- Current lesson status: not started, in progress, or completed.
- Current activity section and item position.
- Completed section and item identifiers.
- Confirmed responses or result references required to preserve progress.
- Save-state schema version.
- Last confirmed save time.

Save behavior:

- Create the lesson save state when the learner starts a lesson.
- Save automatically after each completed item or other documented stable
  checkpoint.
- Attempt a final checkpoint before returning to the Learner Dashboard.
- Resume only from the latest checkpoint confirmed by Laravel.
- Keep one current save state per learner and lesson.
- Enforce ownership on every load and write so one account can never read,
  overwrite, or continue another account's lesson save.
- Never use a game save table for lesson progress.
- Never unlock the next required lesson from an in-progress save.
- Mark the lesson completed only after every required part succeeds.
- Preserve the completed record after the next lesson unlocks.

If the learner exits, returns to the dashboard, refreshes, signs out, or later
signs in again, the current required lesson resumes from its latest confirmed
account-owned save state. The dashboard primary action reads Continue Lesson
followed by its number or title. If the lesson has never been started, it reads
Start Lesson followed by its number or title.

If a save request fails, the interface must not claim that the newest position
was saved. It must retain the pending checkpoint long enough to retry when
practical and give the learner a clear retry or safe-return message.

## Core Lesson Sequence

Lessons must follow this progression:

```text
Letter drills
    ↓
Word drills
    ↓
Phrase drills
    ↓
Sentence drills
    ↓
Paragraph reading
    ↓
Comprehension readings
```

Paragraph reading and comprehension readings are separate activities.

## Model Assignment

ReaDirect-V2 will use two speech models:

```text
Nu
└── Isolated-letter recognition

Mu
└── Words, phrases, sentences, paragraphs, and spoken comprehension answers
```

Nu must only evaluate isolated English letter names.

Mu must handle all unrestricted word and sentence transcription.

## Display and ASR Separation

The frontend display must remain separate from the ASR target.

Every lesson item must preserve these distinct values:

```text
1. What the learner sees
2. What the learner is expected to say
3. Which model processes the answer
4. Which spoken answers are accepted
```

Frontend formatting must not alter the ASR input or expected spoken target.

## Letter Drills

Letters must be displayed using one uppercase and one lowercase form together:

```text
Aa
Bb
Cc
```

This formatting is display-only.

The learner reads the pair as one letter name.

Example:

```text
Display: Aa
Expected spoken letter: A
Model: Nu
```

The system must not send `Aa` to Nu as the expected class.

Required data example:

```json
{
  "activity_type": "isolated_letter",
  "display_text": "Aa",
  "spoken_target": "A",
  "asr_model": "nu"
}
```

Uppercase and lowercase forms must not be treated as separate spoken answers.

## Word Drills

Isolated words must be displayed in lowercase unless the word is a proper noun.

Examples:

```text
cat
plant
water
happy
Rosa
Ben
Manila
```

Word drills must use Mu.

Example:

```json
{
  "activity_type": "word",
  "display_text": "plant",
  "spoken_target": "plant",
  "asr_model": "mu"
}
```

## Phrase Drills

Phrases must:

- Remain short
- Use familiar words
- Begin with lowercase unless they start with a proper noun
- Have no ending period
- Avoid unnecessary punctuation
- Avoid being written as complete sentences

Examples:

```text
the fat cat
a red bag
in the garden
under the table
Rosa and Ben
```

Phrase drills must use Mu.

Example:

```json
{
  "activity_type": "phrase",
  "display_text": "the fat cat",
  "spoken_target": "the fat cat",
  "asr_model": "mu"
}
```

## Sentence Drills

Sentences must:

- Begin with a capital letter
- End with correct punctuation
- Express one clear idea
- Use simple sentence structures
- Use familiar vocabulary
- Avoid unnecessary clauses

Examples:

```text
Rosa waters the plant.
The cat sits on the mat.
Ben has a red bag.
```

Sentence drills must use Mu.

The displayed punctuation must remain visible, but transcript comparison may use a normalized target.

Example:

```json
{
  "activity_type": "sentence",
  "display_text": "Rosa waters the plant.",
  "spoken_target": "rosa waters the plant",
  "asr_model": "mu",
  "case_sensitive": false,
  "punctuation_sensitive": false
}
```

## Paragraph Reading

Paragraph reading is a standalone oral-reading activity.

The learner reads one complete paragraph.

Paragraph reading must not automatically lead to questions about that same paragraph.

Paragraph reading must evaluate only the transcript against the displayed paragraph.

Do not add:

- Fluency scoring
- Reading-speed scoring
- Words-per-minute scoring
- Timing-based scoring
- Prosody scoring

Example paragraph:

```text
Rosa has a small garden. She waters the plants every morning. The flowers are red and yellow.
```

Required data example:

```json
{
  "activity_type": "paragraph_reading",
  "display_text": "Rosa has a small garden. She waters the plants every morning. The flowers are red and yellow.",
  "spoken_target": "rosa has a small garden she waters the plants every morning the flowers are red and yellow",
  "asr_model": "mu",
  "case_sensitive": false,
  "punctuation_sensitive": false
}
```

Paragraph scoring may examine:

- Correct words
- Substitutions
- Omissions
- Insertions
- Completion of the paragraph

It must not use fluency or timing.

## Comprehension Readings

Comprehension readings are separate from paragraph reading.

Each comprehension item must contain:

```text
One simple sentence
        ↓
One 5W question
        ↓
One spoken answer
```

The learner reads the simple sentence visually. The sentence reading is not a
separate recording or scored interaction in this mission.

Ma'am Clara then asks one comprehension question through audio. A short
question-type token such as `WHO?` may be shown, but the complete question is
not displayed as a permanent dialogue line.

The learner answers the question aloud.

Mu transcribes the spoken answer.

The system compares the raw transcript with the hidden expected answer and accepted-answer variants.

## Required Comprehension Flow

```text
Simple sentence is displayed
        ↓
Ma'am Clara asks one comprehension question through audio
        ↓
Learner answers aloud
        ↓
Mu returns the raw answer transcript
        ↓
ReaDirect compares the transcript with hidden accepted answers
        ↓
Correct, uncertain, or incorrect
```

The hidden expected answer must not be provided to Mu before transcription.

## Question Types

Comprehension readings must use the simple 5W question types:

```text
Who
What
Where
When
Why
```

Each sentence must lead to only one question.

Do not ask several questions from one sentence during the standard comprehension flow.

## Who Example

```text
Reading sentence:
Rosa waters the plant.

Question:
Who waters the plant?

Hidden expected answer:
Rosa
```

Accepted answers may include:

```text
rosa
it is rosa
rosa does
rosa waters the plant
```

## What Example

```text
Reading sentence:
Ben carries a red bag.

Question:
What does Ben carry?

Hidden expected answer:
a red bag
```

Accepted answers may include:

```text
a red bag
red bag
the red bag
ben carries a red bag
```

## Where Example

```text
Reading sentence:
The cat sleeps on the mat.

Question:
Where does the cat sleep?

Hidden expected answer:
on the mat
```

Accepted answers may include:

```text
on the mat
the mat
it sleeps on the mat
```

## When Example

```text
Reading sentence:
Rosa waters the plant every morning.

Question:
When does Rosa water the plant?

Hidden expected answer:
every morning
```

Accepted answers may include:

```text
every morning
in the morning
morning
```

## Why Example

```text
Reading sentence:
Rosa waters the plant because it is dry.

Question:
Why does Rosa water the plant?

Hidden expected answer:
because it is dry
```

Accepted answers may include:

```text
because it is dry
it is dry
the plant is dry
because the plant is dry
```

## Comprehension Sentence Rules

Comprehension sentences must:

- Be short
- Contain one clear fact
- Use direct and familiar vocabulary
- Avoid several ideas in one sentence
- Avoid ambiguous pronouns
- Avoid figurative language
- Avoid facts requiring outside knowledge
- Provide an answer that is directly stated in the sentence

Avoid:

```text
Rosa waters the green plant with a cup in the garden every morning because it is dry.
```

Prefer:

```text
Rosa waters the plant.
Who waters the plant?
```

```text
The plant is in the garden.
Where is the plant?
```

```text
Rosa waters the plant every morning.
When does Rosa water the plant?
```

## Comprehension Item Data Structure

Each comprehension item contains one displayed sentence and one spoken-answer
Mu interaction.

Example:

```json
{
  "activity_type": "comprehension_reading",
  "question_type": "who",
  "reading": {
    "display_text": "Rosa waters the plant."
  },
  "question": {
    "audio_prompt_text": "Who waters the plant?",
    "expected_answer": "rosa",
    "accepted_answers": [
      "rosa",
      "it is rosa",
      "rosa does",
      "rosa waters the plant"
    ],
    "asr_model": "mu",
    "case_sensitive": false,
    "punctuation_sensitive": false
  }
}
```

## Hidden Expected Answers

The expected answer and accepted-answer variants must remain hidden from the learner.

They may only be used after Mu returns the raw transcript.

Required order:

```text
Audio
    ↓
Mu raw transcript
    ↓
Answer normalization
    ↓
Accepted-answer comparison
```

Prohibited order:

```text
Expected answer
    ↓
Passed to Mu as a transcription hint
```

## Answer Normalization

Answer comparison may normalize:

- Letter case
- Ending punctuation
- Extra spaces
- Common harmless contractions
- Leading articles when permitted by the item

The raw Mu transcript must still be preserved separately for evaluation and debugging.

## Required Scoring Separation

Each lesson component must retain a separate result:

```text
Letter drill result
Word drill result
Phrase drill result
Sentence drill result
Paragraph-reading result
Spoken-comprehension-answer result
```

Do not combine paragraph reading and comprehension into one result.

Do not combine reading accuracy and comprehension accuracy into one score.

## Standard Mini-Lesson Example

### Letter

```text
Display: Pp
Expected speech: P
Model: Nu
```

### Word

```text
Display: plant
Expected speech: plant
Model: Mu
```

### Phrase

```text
Display: the green plant
Expected speech: the green plant
Model: Mu
```

### Sentence

```text
Display: Rosa waters the plant.
Expected speech: rosa waters the plant
Model: Mu
```

### Paragraph Reading

```text
Rosa has a green plant. She waters it every morning. The plant has two flowers.
```

This paragraph is evaluated only as paragraph reading.

### Comprehension Reading — Who

```text
Reading sentence:
Rosa waters the plant.

Question:
Who waters the plant?

Expected answer:
Rosa
```

### Comprehension Reading — Where

```text
Reading sentence:
The plant is in the garden.

Question:
Where is the plant?

Expected answer:
the garden
```

### Comprehension Reading — What

```text
Reading sentence:
Rosa waters the flowers.

Question:
What does Rosa water?

Expected answer:
the flowers
```

### Comprehension Reading — When

```text
Reading sentence:
Rosa waters the plant every morning.

Question:
When does Rosa water the plant?

Expected answer:
every morning
```

### Comprehension Reading — Why

```text
Reading sentence:
Rosa waters the plant because it is dry.

Question:
Why does Rosa water the plant?

Expected answer:
because it is dry
```

## Hard Rules

1. Letters must display uppercase and lowercase together, such as `Aa`.
2. The paired letter display must still be evaluated as one isolated letter.
3. Nu must only process isolated letters.
4. Approved isolated-letter TTS must resolve through
   `READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md` and must not be
   inferred from display text.
5. Isolated words must be lowercase unless they are proper nouns.
6. Phrases must not begin with uppercase unless required by a proper noun.
7. Phrases must not end with a period.
8. Sentences must follow normal capitalization and punctuation.
9. Paragraphs must follow normal capitalization and punctuation.
10. Paragraph reading must remain separate from comprehension readings.
11. Paragraph reading must not include fluency or timing evaluation.
12. Each comprehension sentence must lead to only one 5W question.
13. Comprehension answers must be spoken.
14. Mu must transcribe the spoken answer before expected-answer comparison.
15. Hidden expected answers must never alter Mu's raw transcription.
16. Display formatting must never automatically control ASR behavior.

## Implemented Lesson 1 Runtime Contract

Lesson 1 is one resumable route with three missions and five locked items per
mission. A run snapshots fifteen unique targets from the versioned CSV. Missions
2 and 3 use context-eligible targets, while `Q` and `X` remain Mission-1-only.

The persistence boundary is:

- `lesson_runs` owns the immutable snapshot, current mission, current item, and
  completion state.
- `lesson_responses` owns the current teaching state and final item-level
  outcome. It stores academic-attempt count, technical-retry count, highest
  scaffold, mastery status, diagnosis, review recommendation, and the latest
  committed evidence.
- `lesson_item_attempts` is the immutable attempt ledger. Each row identifies
  an independent, guided, technical, echo, or skip attempt and preserves its
  classification, optional academic-attempt number, scaffold level,
  transcripts, audio reference, checksum, and service evidence.
- `lesson_target_exposures` owns the learner, shared target scope, content
  version, selection cycle, and consumed target key. A new cycle begins only
  when the remaining unused pool cannot supply the required unique mission set.
- Submit records evidence through the bounded teaching-state machine.
  `UNCERTAIN`, `UNUSABLE_AUDIO`, and `SILENCE` create technical attempts and
  never increase `academic_attempt_count`.
- One clear incorrect independent attempt enters `GIVING_CLUE`. Confirming the
  clue enters `GUIDED_RETRY`. A second clear incorrect academic attempt enters
  `DEMONSTRATING`; confirming the demonstration enters `ECHO_RETRY`.
- The post-demonstration echo is stored separately and never becomes
  independent mastery.
- Next advances only after the response owns a terminal approved outcome.
- Skip stores `SKIPPED` and advances immediately; it is not a numeric zero.
- Completion, Lesson 2 unlock, and `reading.letter_leader` award occur in one
  database transaction.

The current terminal outcome values are:

```text
INDEPENDENT_CORRECT
SUPPORTED_CORRECT
DEMONSTRATED
NOT_YET_CORRECT
UNSCORABLE_AUDIO
SKIPPED
```

The server returns a `teaching` object on every active Lesson 1 state response.
It includes the persisted state, counters, scaffold, diagnosis, outcome, and
server-derived `can_record`, `can_continue_support`, and `can_advance`
capabilities. Refresh and direct resume must use this object instead of
reconstructing support state from browser timers.

`POST /api/learners/lessons/lesson-1/{lessonRun}/continue-support` is the
guarded transition from `GIVING_CLUE` to `GUIDED_RETRY` or from
`DEMONSTRATING` to `ECHO_RETRY`. It cannot skip stages or reopen a terminal
item.

The bounded support contract is implemented end to end. Every response includes
a server-authored `support` object with:

```text
sequence_key
speech[]
display_mode
after_speech
requires_speech_completion
```

`speech[]` preserves playback order and distinguishes published catalog lines
from response-owned runtime feedback. `after_speech` may request recording,
the guarded support continuation, advancement availability, or no action. The
browser may execute that declared action only after the complete sequence.
Browser code must never invent support transitions locally.

Lesson 1 publishes three mission clues, one technical-retry line, twenty-six
letter demonstrations, and five terminal outcome lines. Demonstration text
uses the shared isolated-letter pronunciation map. The learner's committed
final transcript remains the only dynamic token in the support sequence.

The first item of each mission plays the complete mission instruction. Items
two through five play mission-specific ordinal cues instead of repeating that
instruction. The cue must identify the second, third, fourth, or fifth item and
must remain published catalog speech.

## Optional Learn with Ma'am Clara Boundary

`Learn with Ma'am Clara` is an always-available listening companion class, not
a required lesson or assessment. Any authenticated learner may open it before
or after the Diagnostic Assessment.

Its checkpoints, story choices, visit count, and completion state are stored
separately from required lesson runs. They must never change lesson unlocks,
assessment scores, mastery evidence, achievements, or teacher analytics.
Chapter 1 uses five short big-and-small-letter moments and authored published
speech only. It has no recorder, ASR submission, academic attempt, or runtime
TTS fallback.

The learner UI must render through the same shared activity shell and exact
four-panel composition as the assessments: mission header, large item,
separate recorder, and Clara/action dock. Lessons must not create parallel
page grids, panel measurements, dock measurements, or responsive breakpoints.
Only the displayed lesson item and its mission-specific entrance animation may
differ from the assessment composition. Submit receives 80 percent of the
action height and Skip 20 percent; after submission, the action shows Clara's
unavailable feedback/listening state. Next appears at full size only after
Clara finishes speaking the feedback.
