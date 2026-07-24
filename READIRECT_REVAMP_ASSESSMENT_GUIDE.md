# ReaDirect Revamp Assessment Guide

Purpose: define the ReaDirect Assessment task rules for the revamp.

Learner-facing assessment layout, recorder review, Retry, Submit, Skip
behavior, neutral item feedback, and responsive interaction are defined by
`READIRECT_REVAMP_LESSON_AND_ASSESSMENT_INTERACTION_STANDARD.md`.

Part 1 Results, Part 2 Results, assessment completion, and the final Reading
Journey congratulatory presentation are defined by
`READIRECT_REVAMP_RESULTS_AND_COMPLETION_PRESENTATION_STANDARD.md`. This guide
remains authoritative for the values, labels, branches, and timing those pages
are allowed to present.

Diagnostic and Final Assessment achievement keys, completion criteria,
granting, and presentation are defined by
`READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md`.

Fixed Diagnostic and Final content forms, CSV schemas, content review, and
assessment-content isolation are defined by
`READIRECT_REVAMP_CONTENT_CSV_AND_SELECTION_STANDARD.md`.

This guide uses the name ReaDirect Assessment for the assessment tool. It
defines Task 1A, Task 2A, Task 2B, Task 3A, and Task 3B.

ReaDirect Assessment has two run types:

- Diagnostic Assessment: the pre-test assessment run.
- Final Assessment: the post-test assessment run.

Both run types use the same task and scoring rules unless a later guide defines
an explicit difference.

## Scope

Included:

1. Task 1A: Letter Pronunciation.
2. Task 2A: Rhyme Check.
3. Task 2B: Word Pronunciation.
4. Task 3A: Passage Reading.
5. Task 3B: Comprehension Check.

Excluded:

- Score-based lesson placement or recommendation.
- Score-based lesson routing or mastery.
- Required-lesson content and internal lesson progression.

## Assessment Placement In The Learner Flow

The Diagnostic Assessment is the first required learner-dashboard action.
Required lessons remain locked until the Diagnostic Assessment run is complete.
Completion unlocks the first required lesson, regardless of the resulting score
or reading profile.

The Final Assessment remains locked until every required sequential lesson is
complete. Diagnostic and Final Assessment scores remain assessment evidence;
they do not choose, reorder, skip, or replace lessons.

The learner dashboard owns which current action is displayed. The lesson
standard owns sequential lesson unlocking.

## Assessment Shape

The first assessment result is the Part 1 Score. It is a 30-point score from
the first three tasks:

```text
Part 1 Score = Task 1A score + Task 2A score + Task 2B score
```

Each Part 1 task score is 0 to 10.

Task 3A passage reading and Task 3B comprehension are not added to the Part 1
Score. They produce the final reading score and final reading profile.

The Part 1 Score results page appears:

- After Task 2A for learners on the low Task 1A branch.
- After Task 2B for learners on the high Task 1A branch.

## Scoring Source

The final scoring response is the sole scoring source for each scored item.

For speech tasks, the final scoring response comes from the ASR guide flow.

Letter-pronunciation path:

```text
raw isolated-letter audio -> Mu raw transcript -> Nu strict letter resolver -> Equivalence Book letter aliases -> target-aware decision -> score
```

Word, phrase, sentence, and passage path:

```text
raw audio -> Mu raw transcript -> light normalization -> expected-aware comparison -> Equivalence Book -> scoring transcript -> score
```

Scores do not use raw model evidence directly. Nu raw transcript and resolver
evidence, Mu raw transcript, alignment, phoneme evidence, GOP, and Equivalence Book rules are
evidence used to produce the final scoring response.

For choice-only tasks, including Task 2A and Task 3B, the selected choice is the
final scoring response.

## Task 1A: Letter Pronunciation

Task 1A checks isolated letter pronunciation.

Rules:

- The learner receives 10 letter items.
- Each item is worth 1 point.
- Displaying the letter does not automatically pronounce it. If an assessment
  protocol explicitly authorizes isolated-letter playback, the TTS adapter must
  resolve it through
  `READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md`.
- Nu is Mu's isolated-letter mode, not a separate trained model.
- Nu returns Mu's raw transcript, strict letter-resolution evidence, and a
  target-aware decision.
- Resolver evidence includes the normalized complete transcript, predicted
  A-Z/`SILENCE`/`UNKNOWN` class, matched alias, candidate letters for an
  approved ambiguity, mapping source, applied Equivalence Book rule IDs,
  segments, and audio-quality data.
- An explicitly reviewed ambiguous alias may pass only when the expected letter
  is one of its fixed candidates. The initial approved case is `aye` for A/I.
- The target-aware decision is the final scoring response.
- A `CORRECT` decision scores 1.
- `INCORRECT`, `SILENCE`, `UNKNOWN`, or `UNUSABLE_AUDIO` scores 0
  unless a later teacher-review rule explicitly changes the score.
- The score range is 0 to 10.
- ASR evidence uses the ASR guide rules to produce the scoring response.

Task 1A controls branching:

| Task 1A score | Task 2A | Task 2B | Task 3A | Task 3B |
|---:|---|---|---|---|
| 0-6 | Administered | Not administered | Not administered | Not administered |
| 7-10 | Auto-scored as 10 | Administered | Administered after Part 1 Score | Administered after Task 3A |

## Task 2A: Rhyme Check

Task 2A checks whether the learner can identify rhyming word pairs.

Rules:

- Task 2A is administered only when Task 1A is 0 to 6.
- The learner receives 10 rhyme-decision items.
- The item set contains 6 rhyming pairs and 4 non-rhyming pairs.
- The learner chooses Yes or No.
- Each correct answer scores 1.
- Each incorrect answer scores 0.
- The score range is 0 to 10.
- ASR is not used.
- Audio recording is not used.
- The selected Yes/No choice is the final scoring response.

When Task 1A is 7 to 10, Task 2A is not shown to the learner. It receives an
automatic score of 10.

## Low Task 1A Completion Rule

When Task 1A is 0 to 6:

1. Task 2A Rhyme Check is administered.
2. Task 2B Word Pronunciation is not administered.
3. Task 2B score is recorded as 0.
4. Task 3A Passage Reading is not administered.
5. Task 3B Comprehension Check is not administered.
6. The Part 1 Score is calculated as:

```text
Task 1A score + Task 2A score + 0
```

The maximum possible Part 1 Score on this branch is 16 out of 30. The final
reading score is automatically recorded as 0, and the final reading profile is
`Low Emerging Reader`.

This path ends the ReaDirect Assessment task sequence.

## Task 2B: Word Pronunciation

Task 2B checks word pronunciation.

Rules:

- Task 2B is administered only when Task 1A is 7 to 10.
- Task 2A is automatically scored as 10 before Task 2B is administered.
- The learner receives 10 word-pronunciation items.
- Each item has a target word.
- The scoring target is the target word.
- Mu is used for raw word transcription.
- Expected-aware ASR comparison is used for the target word.
- Equivalence Book rules have high priority when a reviewed expected/Mu-raw
  transcript difference is acceptable for scoring.
- GOP can support the decision when pronunciation evidence is available.
- The final scoring transcript is compared with the target word.

Per-item scoring:

- A matching scoring transcript scores 1.
- A non-matching scoring transcript scores 0.

Task score:

```text
Task 2B score = number of matching scoring transcripts
```

The final Task 2B score is clamped to the 0 to 10 range.

When Task 1A is 7 to 10, the minimum possible Part 1 Score is 17 out of 30:

```text
minimum Part 1 Score = 7 + 10 + 0
```

## Part 1 Score Labels

The Part 1 Score uses the 30-point ReaDirect Assessment level labels.

| Part 1 Score | ReaDirect Assessment level |
|---:|---|
| 0-10 | Full Refresher |
| 11-16 | Moderate Refresher |
| 17-26 | Light Refresher |
| 27-30 | Grade Ready |

These levels describe the Part 1 assessment result only. They do not define
module placement or the final reading profile.

## Task 3 Eligibility And Timing

Task 3A and Task 3B are administered only when the learner completes Task 2B and
has a Part 1 Score from 17 to 30.

Learners with a Task 1A score of 0 to 6 do not proceed to Task 3A or Task 3B.
Their final reading score is recorded as 0 and their final reading profile is
`Low Emerging Reader`.

Learners with a Part 1 Score of 0 to 16 do not proceed to Task 3A or Task 3B.
Their final reading score is recorded as 0 and their final reading profile is
`Low Emerging Reader`.

The Task 3A passage reading time limit is 60 seconds. Reading stops at this
limit. Words not reached within the time limit are counted as incorrect words.

Before Task 3A begins, an eligible learner chooses between the two fixed story
options in the shared assessment form. Story selection is not scored.

- The learner may change the highlighted choice before confirming it.
- Confirming the choice persists its permanent story key on the assessment run.
- Refreshing, reopening, or resuming returns the same confirmed story.
- A confirmed story cannot be rerolled or replaced during that run.
- The selected story supplies the one Task 3A passage administered to the
  learner and the five linked Task 3B questions.
- Diagnostic and Final runs expose the same two story choices.

## Task 3A: Passage Reading

Task 3A checks oral passage reading.

Rules:

- The shared form contains two authored passages, and the learner reads only the
  passage selected before Task 3A.
- The passage reading recording is capped at 60 seconds.
- Mu produces a raw transcript.
- Expected-aware processing produces the final scoring passage transcript.
- Scoring compares the expected passage with the final scoring passage
  transcript.
- Mu raw transcript, word alignment, Equivalence Book rules, and GOP are
  evidence for the scoring transcript; they are not scored directly.
- Fallback comparison uses normalized word-level edit distance on the scoring
  transcript.
- Unread words are counted as incorrect.

Miscue and error counting:

| Error type | Description | Count rule |
|---|---|---|
| Mispronunciation | Word spoken incorrectly. | Count as 1 incorrect word. |
| Substitution | Incorrect word spoken instead. | Count as 1 incorrect word. |
| Omission | Word skipped. | Count as 1 incorrect word. |
| Unread word | Word not reached before one minute. | Count as 1 incorrect word. |

Incorrect-word count:

- Empty expected passage gives 0 incorrect words.
- Empty scoring transcript gives up to 50 incorrect words.
- Incorrect-word count is capped at 50.

Reading accuracy:

```text
reading accuracy percent = max(0, 100 - (incorrect words * 2))
```

Task 3A produces a reading accuracy percentage. It does not change the Part 1
Score.

Task 3A also persists presentation evidence for the later Passage Results step:

- The authoritative equivalence-resolved word alignment is stored with the
  response. React must not realign or rescore the passage.
- Reading time is measured from the first timed Mu speech segment to the end of
  the last timed speech segment. The captured-audio duration is the fallback
  only when segment timing is unavailable.
- Reading speed is stored as recognized words per minute. Correct words per
  minute is stored separately for future reporting.
- The alignment, highlighted story, and reading speed remain hidden throughout
  Task 3B. They become visible only after all five comprehension responses
  commit and the run reaches the dedicated Passage Results step.
- Passage Results uses the Part 2 route and precedes the original Part 2 Results
  score page. `Next` moves from Passage Results to Part 2 Results; `Continue`
  moves from Part 2 Results toward assessment completion.
- A skipped passage has no fabricated alignment or reading speed.

## Task 3B: Comprehension Check

Task 3B checks comprehension of the Task 3A passage.

Eligibility:

- Task 3A passage reading is administered.

Rules:

- The learner receives 5 comprehension questions.
- The shared form contains 10 authored questions: 5 for each story.
- Only the five questions linked to the confirmed story are administered.
- Each story's five questions cover Who, What, Where, When, and Why exactly once.
- Each story contains one canonical person, thing, place, time, and purpose for
  those questions. It must not introduce a competing fact that could also answer
  one of the five questions.
- Each question has 4 answer choices.
- The task therefore contains 20 visible choices in total.
- The learner selects one answer per question.
- Each correct answer scores 1.
- Each incorrect answer scores 0.
- The raw score range is 0 to 5.
- ASR is not used.
- Audio recording is not used.
- The selected choice is the final scoring response.

Comprehension percentage:

```text
comprehension percent = (correct answers / 5) * 100
```

Task 3B produces a comprehension percentage. It does not change the Part 1
Score.

## Final Reading Score

The final reading score combines comprehension and reading accuracy.
Comprehension has the higher weight because the reading profile should reflect
passage understanding while still including oral reading accuracy.

```text
final reading score = round((comprehension percent * 0.60) + (reading accuracy percent * 0.40))
```

The final reading score is displayed as a whole number with no decimals.

If Task 3A and Task 3B are not administered, the final reading score is recorded
as 0.

## Final Reading Profile

The final reading profile comes from the final reading score.

| Final reading score | Final reading profile |
|---:|---|
| 0-25 | Low Emerging Reader |
| 26-50 | High Emerging Reader |
| 51-75 | Developing Reader |
| 76-90 | Transitioning Reader |
| 91-100 | Reading at Grade Level |

Learners who stop on the low Task 1A branch automatically receive the final
reading profile `Low Emerging Reader`.

## Task Sequence

```text
Task 1A Letter Pronunciation
-> if Task 1A score is 0-6:
   Task 2A Rhyme Check
   -> Task 2B score = 0
   -> Part 1 Score results page
   -> final reading score = 0
   -> final reading profile = Low Emerging Reader
   -> stop

-> if Task 1A score is 7-10:
   Task 2A score = 10
   -> Task 2B Word Pronunciation
   -> Part 1 Score results page
   -> choose and confirm Story 1 or Story 2
   -> Task 3A Passage Reading
   -> five Task 3B questions linked to the selected story
   -> final reading score
   -> final reading profile
```

## Implementation Notes

- Store every task score separately.
- Store the Part 1 Score separately.
- Store the ReaDirect Assessment level derived from the Part 1 Score.
- Store the confirmed Task 3 story key on the assessment run before Task 3A
  begins.
- Store Task 3A passage evidence and reading accuracy separately from the Part 1
  Score.
- Store Task 3B comprehension score, selected choices, and comprehension
  percentage separately from the Part 1 Score.
- Store the final reading score separately.
- Store the final reading profile separately.
- Store the scoring transcript or scoring response used for scoring.
- Keep Nu raw Mu transcript and strict resolver evidence available for Task 1A review.
- Keep Mu raw transcript and repair metadata available for Task 2B and Task 3A
  review, but do not score from raw model evidence directly.
- Keep selected-choice evidence available for Task 2A and Task 3B review.
- Store completion state for each Diagnostic and Final Assessment run so the
  learner dashboard can apply its fixed progression gates.
- Do not use an assessment score to choose, reorder, skip, or replace lessons.

### Implemented diagnostic runtime boundary

The Diagnostic Part 1 implementation uses one Laravel-owned, refresh-safe
assessment run:

- `assessment_runs` stores the fixed `v1` content snapshot, current stage,
  current item, branch, separate task scores, Part 1 score, and Part 1 level.
- `assessment_responses` stores the committed choice or speech scoring
  response, or a distinct learner-selected skip. A skip is stored with
  `response_type = skipped`, `decision = SKIPPED`, and `score = 0`; it carries
  no audio or transcript evidence. Submitted responses retain private audio
  evidence, raw transcript, scoring transcript, decision, score, and resolver
  evidence as applicable.
- Laravel imports the active shared Part 1 CSV rows into the immutable run
  snapshot when a run begins. React never reads a root CSV.
- Orientation, Task 1A, Task 2A, Task 2B, and Part 1 Results are served by the
  learner Part 1 API under `/api/learners/assessments/part-one`.
- Every assessment Submit atomically persists the current response and opens
  the next item or documented result page. The response exposed to React never
  reveals per-item correctness, and active assessment items never expose a
  separate learner-controlled Next action. The microphone check follows the
  same rule after usable audio is confirmed.
- Skip is an atomic save-and-advance action. It commits zero for the active
  scored item and opens the following item in the same server operation without
  exposing `Next`. It is unavailable on the microphone orientation and result
  pages. Submit and Skip both advance automatically, but only Skip persists the
  distinct zero-score skipped response.
- Part 1 uses neutral, keyed item motion without exposing correctness: Task 1A
  letter tiles settle into place, Task 2A words enter from opposite sides, and
  Task 2B words assemble letter by letter. Processing only applies a neutral
  visual lock, while a committed response depresses the active item consistently
  for both correct and incorrect results.
- Submit or Skip replaces the active item with a short exit-and-entry sequence
  and animates the completed progress segment. The next item restores the normal
  Submit-and-Skip action split; documented result pages replace it with
  Continue. These movements collapse to immediate state changes when reduced
  motion is enabled.
- Item 1 of each Part 1 task plays the complete task instruction. Items 2
  through 10 use one short neutral ordinal cue before their controls become
  available:

  | Task | Ordinal cue template |
  | --- | --- |
  | Task 1A Letters | `Now, try the {ordinal} letter.` |
  | Task 2A Rhyme Check | `Now, check the {ordinal} pair.` |
  | Task 2B Words | `Now, read the {ordinal} word.` |

  The supported ordinal words are `second` through `tenth`. Submit and Skip
  must produce the same next-item cue, and no cue may praise, criticize, or
  reveal the previous response's score. Every Part 1 instruction and ordinal
  cue is a published, pre-generated catalog WAV and must never invoke runtime
  synthesis. After the current cue finishes, the client prefetches only the
  next published file in the same task. It must not request all
  remaining cues or speculate across a score-dependent task boundary. If the
  learner skips before that cue is ready, the centered Clara voice cube appears
  after a short anti-flicker delay and stays visible through the next-item
  handoff. A completed file prefetch keeps fast skips unobstructed.
- Task 1A uses Mu plus the strict letter resolver and active global letter
  equivalences. Task 2B uses Mu plus the expected-aware Equivalence Book
  resolver. Task 2A never calls ASR.
- Part 1 Results continues through a server-owned branch. A high Part 1 score
  opens story selection and Part 2; a low Part 1 score opens Assessment Complete
  without creating an empty Part 2 result.
- The high branch persists one immutable story choice, administers its Task 3A
  passage and five linked Task 3B questions, then calculates and stores reading
  accuracy, comprehension, final reading score, and final reading profile.
- Task 3A and Task 3B Submit and Skip are atomic save-and-advance operations.
  Task 3A Skip stores zero reading accuracy and opens Task 3B. Task 3B Skip
  stores a distinct zero-score skipped response and opens the next question or
  Passage Results.
- Passage Results advances to the original Part 2 Results score page. Part 2
  Results continues to Assessment Complete. Finishing the completion page marks
  the assessment run completed and advances the learner progression state to
  required Lesson 1.
- System-admin page portals expose every persisted diagnostic checkpoint:
  orientation, Tasks 1A/2A/2B, Part 1 Results, story selection, Tasks 3A/3B,
  the Passage Results entry point for the two-step Part 2 result sequence, and
  Assessment Complete. Each portal builds the same prior persisted state used
  by normal learner progression and is reset on exit.
