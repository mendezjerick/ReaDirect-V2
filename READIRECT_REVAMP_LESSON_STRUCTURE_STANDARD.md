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

### Session Freshness And Next-Activity Routing

The authenticated learner-session endpoint is the only client-readable source
of truth for Dashboard progression, earned achievements, and next-activity
routing. Browser session storage and in-memory query data are bootstrap caches,
not progression authority.

- After a diagnostic, lesson, or final-assessment completion transaction, the
  Dashboard must reconcile the learner session when it opens.
- Lesson Intro must reconcile the same session before enabling Continue or
  deriving the next route.
- The confirmed response updates both the shared query cache and the browser
  session mirror.
- Never send a learner to a lesson, assessment, or achievement state using a
  stale cached `current_required_lesson_order` or achievement list.
- A successful completion must be usable immediately: returning to Dashboard
  and selecting its primary action opens the newly unlocked next activity
  without requiring refresh, reopening the page, or signing out.

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
- Never begin with the standalone article `a`; begin with a stable lexical word
  so Mu does not merge a weak opening article into the following word
- Begin with lowercase unless they start with a proper noun
- Have no ending period
- Avoid unnecessary punctuation
- Avoid being written as complete sentences

Examples:

```text
fat cat
red bag
in the garden
under the table
Rosa and Ben
```

Phrase drills must use Mu.

Example:

```json
{
  "activity_type": "phrase",
  "display_text": "fat cat",
  "spoken_target": "fat cat",
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
Four authored choices
```

The learner reads the simple sentence visually. The sentence reading is not a
separate recording or scored interaction in this mission.

Ma'am Clara then asks one comprehension question through audio. A short
question-type token such as `WHO?` may be shown, but the complete question is
not displayed as a permanent dialogue line.

The learner selects one choice and explicitly submits it. Laravel compares only
the selected key with the hidden authored correct key. Lesson 6 does not record
audio, call Mu, normalize transcripts, or use the Equivalence Book.

## Required Comprehension Flow

```text
Simple sentence is displayed
        ↓
Ma'am Clara asks one comprehension question through audio
        ↓
Four authored choices are displayed
        ↓
Learner selects and submits one choice
        ↓
Laravel compares the selected key
        ↓
Correct feedback and Next, or authored Clara support
```

The hidden correct choice, evidence span, and support text are never sent by
the browser as authority.

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

Choices:
A. Rosa
B. Lena
C. Mia
D. Ben

Correct choice:
A
```

## What Example

```text
Reading sentence:
Ben carries a red bag.

Question:
What does Ben carry?

Choices:
A. A red pen
B. A red bag
C. A pet cat
D. A book

Correct choice:
B
```

## Where Example

```text
Reading sentence:
The cat sleeps on the mat.

Question:
Where does the cat sleep?

Choices:
A. In a hut
B. On a bed
C. On the mat
D. In a box

Correct choice:
C
```

## When Example

```text
Reading sentence:
Rosa waters the plant every morning.

Question:
When does Rosa water the plant?

Choices:
A. At noon
B. Every morning
C. On Monday
D. At ten

Correct choice:
B
```

## Why Example

```text
Reading sentence:
Rosa waters the plant because it is dry.

Question:
Why does Rosa water the plant?

Choices:
A. It is wet
B. It is red
C. It is dry
D. It is new

Correct choice:
C
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

Each comprehension item contains one displayed sentence, one published Clara
question, four authored choices, one hidden correct key, and deterministic
teaching metadata.

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
    "choices": {
      "a": "Rosa",
      "b": "Lena",
      "c": "Mia",
      "d": "Ben"
    },
    "correct_choice_key": "a",
    "correct_answer_text": "Rosa",
    "expected_answer_role": "person",
    "answer_evidence_span": "Rosa",
    "targeted_clue": "Who asks for a person. Read the sentence again.",
    "guided_clue": "Look at the highlighted name.",
    "demonstration_text": "The sentence says Rosa. Choose Rosa."
  }
}
```

## Hidden Choice Authority

The correct choice key, evidence span, and teaching escalation remain
server-owned. The browser sends only the current item key and selected choice.

Required order:

```text
Selected item and choice key
    ↓
Laravel locks the active lesson run
    ↓
Laravel resolves the authored snapshot row
    ↓
Correct-key comparison and persisted attempt
```

Prohibited order:

```text
Browser-supplied answer authority
    ↓
Trusted lesson decision
```

## Choice Support Persistence

Every wrong selection persists the selected choice, attempt number, assistance
level, disabled choices, and whether evidence or the correct choice has been
revealed. Refresh and resume must restore the exact support state.

## Required Scoring Separation

Each lesson component must retain a separate result:

```text
Letter drill result
Word drill result
Phrase drill result
Sentence drill result
Paragraph-reading result
Choice-comprehension result
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

The learner UI must render through the same shared activity shell and exact
four-panel composition as the assessments: mission header, large item,
separate recorder, and Clara/action dock. Lessons must not create parallel
page grids, panel measurements, dock measurements, or responsive breakpoints.
Only the displayed lesson item and its mission-specific entrance animation may
differ from the assessment composition. Submit receives 80 percent of the
action height and Skip 20 percent; after submission, the action shows Clara's
unavailable feedback/listening state. Next appears at full size only after
Clara finishes speaking the feedback.

## Global Lesson Practice-Try Journal

Every implemented lesson must expose the same server-owned practice-try
summary for its current persisted run.

- A practice try is a `CLEAR_INCORRECT` independent or guided academic attempt.
- Silence, uncertain recognition, unusable audio, technical retries, Skip, and
  echo attempts are excluded.
- The count accumulates for the current lesson run and survives item changes,
  refreshes, and reopening the run.
- Each learner-visible history entry contains only mission number, item order,
  academic attempt number, and the committed `final_transcript`.
- Raw Mu text, hidden expected targets, private audio paths, and internal
  evidence must not appear in this journal.
- The journal never changes scoring, mastery, progression, or achievements.

The shared toggle is a small rounded vector button in the upper-right of the
item panel. Its count badge appears only after the first practice try. The
button must remain secondary to the item and recorder, use the standard tactile
commit delay, and remain unavailable while Clara is speaking, TTS is preparing,
or the learner is recording or playing audio.

On mobile, the journal opens as a contained bottom sheet. On wider viewports,
it opens as a right-side dialog. The lesson page remains non-scrollable; only
the history list may scroll internally. Closing the journal restores the exact
activity state.

## Implemented Lesson 2 Runtime and Teaching Engine

Slice 1 establishes Lesson 2's server-owned start and resume boundary:

- `POST /api/learners/lessons/lesson-2/start` creates or resumes the learner's
  single active `required-lesson-2` run.
- `GET /api/learners/lessons/lesson-2/{lessonRun}` reloads the exact saved run
  for its authenticated owner.
- Start is allowed only while Lesson 2 is the learner's current required
  lesson.
- A run locks ten unique active word targets from the Version 1 CSV: five for
  Display Word and five different targets for Highlighted Sentence Word.
- The immutable snapshot and current position reuse `lesson_runs`.
- Selection history reuses `lesson_target_exposures` under
  `required.lesson-2.word-targets`.
- A new selection cycle begins only when fewer than ten eligible unused words
  remain.
- The learner payload exposes presentation fields but never exposes the hidden
  `spoken_target`.

Slice 2 extends that same run with the authoritative response and teaching
engine:

- `POST /api/learners/lessons/lesson-2/{lessonRun}/submit` sends isolated word
  audio to Mu with `task_type=word`.
- Raw Mu text remains immutable evidence. The existing speech equivalence
  resolver commits the final resolved transcript used for the lesson decision.
  An accepted exact or equivalent match commits the canonical target word;
  other usable speech commits the normalized recognized text.
- Audio-quality failures, silence, and a conflicting conditional-noise pass
  are technical evidence. They never consume an academic attempt.
- The shared bounded teaching state machine controls independent attempt,
  targeted clue, guided retry, demonstration, echo retry, and terminal review.
- Every recording creates an immutable `lesson_item_attempts` row while
  `lesson_responses` stores the latest authoritative item state.
- `POST .../continue-support` moves only a pending clue or demonstration to
  its corresponding retry state.
- `POST .../skip` records `SKIPPED`, never numeric zero, and immediately moves
  to the next item.
- `POST .../advance` is accepted only after the current teaching state is
  terminal.
- Completing Mission 1 moves to Mission 2 without replacing the locked
  content snapshot.
- Completing Mission 2 atomically completes the run, advances
  `current_required_lesson_order` to 3, and grants
  `reading.word_wizard` (`Word Wizard`).
- The completion payload reports real independent-mastery totals for both
  missions and the shared results composition.
- Shared results center a bounded two-card segment row when an activity has
  exactly two missions. Three-segment activities retain the standard
  three-column grid.

Lesson 2 now consumes the shared assessment-style activity shell at
`/learner/lessons/2`. It reuses the mission header, item panel, recorder panel,
Clara/action dock, vertical Submit/Next button, Skip button, loaders, and shared
results composition. Only its word presentations differ:

- Mission 1 animates the letters of one large lowercase word into a vector
  container.
- Mission 2 displays one readable sentence and raises the selected word in a
  primary-color vector highlight.

The server-owned support presentation sequences 19 fixed published lines,
runtime `You said {final_transcript}.` feedback, and runtime target-word
demonstration. Fixed speech includes two mission instructions, eight ordinal
cues, two clues, one technical retry, five terminal outcomes, and completion.
Lesson Intro validates this catalog and warms `result` plus `instruction`;
Continue remains unavailable until both profiles are ready. TTS playback still
waits for Clara's model-ready signal. After Lesson 3 is unlocked, reopening the
Lesson 2 route returns the learner's completed run and shared result rather
than creating a duplicate. Its fixed completion line may replay after Clara is
ready without warming the next lesson's dynamic profiles.

### Lesson 2 Page Portal Checkpoints

System Administrator Page Portals expose three Lesson 2 inspection targets:

- `lesson-2-mission-1` opens the first Display Word item.
- `lesson-2-mission-2` persists all five Mission 1 responses, then opens the
  first Highlighted Sentence Word item.
- `lesson-2-complete` persists all ten Lesson 2 responses and opens the shared
  Word Wizard result.

Every launch uses the dedicated analytics-excluded learner `KW000`, resets her
existing progress first, and creates a completed Diagnostic prerequisite plus
Ready Reader. It then creates a completed Lesson 1 prerequisite run and Letter
Leader before the selected Lesson 2 run. The active portal route includes the
real Lesson 2 run ID, so refresh calls the normal authenticated show endpoint
and cannot select a new snapshot. Completed portal state advances the required
lesson order to 3 and persists Word Wizard. Portal prerequisites are
identifiable in response evidence and never invent audio or ASR attempt rows.

## Implemented Lesson 3 Runtime and Teaching Engine

Lesson 3 is one five-item Simple Phrase mission backed by the 20 approved rows
in `content/lessons/v1/lesson-3-phrases.csv`.

- `POST /api/learners/lessons/lesson-3/start` creates or resumes one active
  `required-lesson-3` run; `GET /api/learners/lessons/lesson-3/{lessonRun}`
  restores that exact owned snapshot.
- Start is permitted only when the learner's current required lesson order is
  3. A completed run remains reopenable after progression advances.
- Five unique unused phrase targets are selected and locked under
  `required.lesson-3.phrase-targets`. A new selection cycle begins only when
  fewer than five unused phrases remain.
- The browser receives `display_phrase` and the display text, never the hidden
  scoring target.
- Submission sends audio to Mu with `task_type=phrase`, preserves raw evidence,
  and commits the final transcript after the shared equivalence
  resolver.
- Clear phrase evidence is compared with the locked target through reusable
  word-level Levenshtein alignment. The persisted evidence identifies a
  missing, extra, replaced, reordered, or first actionable multiple
  difference. Repeated words remain position-aware.
- Clara speaks one short targeted correction before the existing clue. For
  example, `cat on a mat` compared with `on a mat` persists
  `missing_word` for `cat` and produces `You missed the word cat.`
- Technical, silent, unusable, and uncertain evidence bypasses academic text
  alignment and retains the neutral retry path.
- Lesson 3 reuses the same bounded two-academic-attempt state machine,
  technical-retry handling, clue, guided retry, demonstration, echo, skip, and
  terminal evidence as Lessons 1 and 2.
- Each phrase enters word by word from left to right, then remains still. The
  page otherwise uses the exact shared assessment/lesson activity shell,
  recorder, Clara dock, vertical actions, loaders, and responsive composition.
- Completing all five items atomically advances required lesson order to 4 and
  grants `reading.phrase_pro` (`Phrase Pro`).
- The shared result displays one centered Phrases mission tile, the real
  independent-mastery total, and the Phrase Pro achievement.

Lesson 3 owns 33 fixed published Clara lines: one instruction, one completion,
four ordinal cues, seven support lines, and demonstrations for all 20 possible
phrases. The locked item content ID selects its demonstration key. Only
response-owned final-transcript and targeted alignment feedback is
runtime-generated, so the Lesson 3 activity manifest warms only the `result`
profile. As everywhere in learner flow, playback waits for Clara's model-ready
signal.

### Lesson 3 Page Portal Checkpoints

System Administrator Page Portals expose:

- `lesson-3-mission-1`, opening the first locked Simple Phrase item.
- `lesson-3-complete`, persisting five portal-prerequisite phrase responses and
  opening the centered Phrase Pro result.

Both destinations reset `KW000`, then persist completed Diagnostic, Lesson 1,
and Lesson 2 prerequisites with Ready Reader, Letter Leader, and Word Wizard.
The active route contains the real Lesson 3 run ID. The completed destination
advances required lesson order to 4 and grants Phrase Pro without fabricating
audio or ASR attempts.

## Implemented Lesson 4 Runtime and Teaching Engine

Lesson 4 is one five-item Simple Sentence mission backed by the 20 approved
rows in `content/lessons/v1/lesson-4-sentences.csv`.

- `POST /api/learners/lessons/lesson-4/start` creates or resumes one active
  `required-lesson-4` run; `GET /api/learners/lessons/lesson-4/{lessonRun}`
  restores that exact owned snapshot.
- Start is permitted only at required lesson order 4. Five unique unused
  sentence targets are selected and locked under
  `required.lesson-4.sentence-targets`; a cycle restarts only when fewer than
  five unused targets remain.
- The browser receives `display_sentence` and display text, never the hidden
  spoken scoring target.
- Submission uses Mu `task_type=phrase`, the shared token-equivalence resolver,
  and word-level Levenshtein alignment. A clear mismatch persists the missing,
  extra, replaced, reordered, or first actionable multiple difference so
  Clara can speak specific sentence feedback.
- Lesson 4 shares `LearnerSpokenTextLessonController`,
  `SpokenTextLessonSupportPresentation`, and `SpokenTextLessonPage` with
  Lesson 3. The bounded support state machine, technical retries, clue,
  demonstration, echo, skip, practice-tries journal, recorder, Clara dock,
  vertical actions, and result composition are therefore one implementation.
- Sentence words enter from left to right, then remain still while the learner
  records. The complete sentence sits in one large responsive vector panel so
  short and long approved rows remain readable without page scrolling.
- Completing all five items advances required lesson order to 5, grants
  `reading.sentence_star` (`Sentence Star`), and opens the shared one-segment
  lesson result.

Lesson 4 owns 33 fixed published Clara lines: one instruction, one completion,
four ordinal cues, seven support lines, and one demonstration for every active
Version 1 sentence. Only response-owned final-transcript and targeted
alignment feedback is runtime-generated, so the Lesson 4 activity manifest
warms only `result`.

### Lesson 4 Page Portal Checkpoints

- `lesson-4-mission-1` opens the first locked Simple Sentence item.
- `lesson-4-complete` persists five portal-prerequisite sentence responses and
  opens the Sentence Star result.

Both destinations reset `KW000`, persist completed Diagnostic and Lessons 1
through 3 prerequisites with their achievements, and navigate using the real
Lesson 4 run ID. Completion advances the portal learner to required lesson
order 5 without fabricating audio or ASR attempt rows.

## Implemented Lesson 5 Runtime

Lesson 5 is one single-item Short Passage mission backed by the five approved
50-word rows in `content/lessons/v1/lesson-5-passages.csv`.

- `POST /api/learners/lessons/lesson-5/start` creates or resumes one active
  `required-lesson-5` run; `GET /api/learners/lessons/lesson-5/{lessonRun}`
  restores that exact owned snapshot.
- Start is permitted only at required lesson order 5. One unused passage is
  selected and locked under `required.lesson-5.passage-targets`. Refresh and
  resume never replace it.
- The passage is one academic item and Version 1 renders its complete 50-word
  text as one continuous page. `authored_pages[0]` is the only displayed page;
  the learner must not paginate or scroll while recording.
- On mobile, the passage panel takes the flexible grid row and measures its
  available text area. Lexend may fit between `16px` and `23px`; the recorder
  owns a protected minimum row so its circle and fake shadow cannot be
  compressed by passage length.
- Recording is capped at 60 seconds and submitted to Mu with
  `task_type=passage`. Laravel owns normalization, equivalence resolution,
  word alignment, score evidence, and reading-speed calculation.
- One clear submitted recording is the final academic attempt. Lesson 5 does
  not enter the clue, demonstration, echo, or academic retry loop used by
  shorter reading units. Playback and Retry remain available before Submit.
- A genuinely silent, unusable, or uncertain recording may receive the shared
  technical-audio recovery. This is not an academic passage retry.
- A clear submission enters the persisted `review` state immediately. There is
  no separate feedback step or learner-operated Next action between recording
  and review.
- The dedicated passage result displays the full story, authoritative
  correct/missed/replaced words, accuracy, and speed. Clara speaks one fixed
  response selected from the server-owned accuracy band while this result is
  visible.
- `Next` calls the explicit `continue-review` endpoint. Only then does Laravel
  complete the run, advance required lesson order to 6, grant
  `reading.passage_explorer`, and return the shared Lesson Complete result.
- A skipped passage produces a neutral passage result with no fabricated word
  alignment or reading speed.

Lesson 5 owns nine fixed published Clara lines: one instruction, one completion,
one technical-retry line, and six passage-review responses (`excellent`,
`strong`, `growing`, `beginning`, `skipped`, and `unavailable`). It has no
runtime Vox profile, passage demonstration, or final-transcript speech. `Next`
on the review remains unavailable until its selected Clara line finishes.

### Lesson 5 Page Portal Checkpoints

- `lesson-5-mission-1` opens the locked passage-reading item.
- `lesson-5-review` opens the dedicated passage result.
- `lesson-5-complete` opens the Passage Explorer completion result.

All destinations reset `KW000`, persist the Diagnostic and Lessons 1 through 4
prerequisites with their achievements, and use the real Lesson 5 run ID.

## Optional Learn with Ma'am Clara Boundary

`Learn with Ma'am Clara` is an always-available listening companion class, not
a required lesson or assessment. Any authenticated learner may open it before
or after the Diagnostic Assessment.

Its checkpoint, visit count, and completion state are stored separately from
required lesson runs. They must never change lesson unlocks, assessment
scores, mastery evidence, achievements, or teacher analytics.

The menu offers Letters, Words, Phrases, Sentences, and Comprehension, with no
passage choice. Only Letters currently opens a complete session. That class is
one authored `Little-Letter Parade` story in which learners find the
lowercase partner for uppercase A-E, watch each pair join an accumulating
animated parade, listen to Clara model the shared letter name, and receive an
explicit learner-controlled echo pause before `Next Stop`. Incorrect visual
choices receive a gentle retry without scoring. Searches and echo pauses do
not auto-advance. The class has no recorder, ASR submission, academic attempt,
or runtime TTS fallback. The complete contract lives in
`READIRECT_REVAMP_LEARN_WITH_CLARA_STANDARD.md`.
