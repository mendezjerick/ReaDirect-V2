# ReaDirect AI Teacher Standard

## Status and Purpose

This document is the source of truth for making Ma'am Clara behave as a
bounded, child-safe AI teacher during ReaDirect lessons.

The goal is not to create an unrestricted conversational tutor. The goal is to
let Clara identify evidence-supported learning difficulties, provide the
smallest useful support, check whether the learner improves, and remember
skills that need later review.

This standard governs:

- Lesson response diagnosis
- Guided retries and scaffold levels
- Independent and assisted outcomes
- Learner skill evidence
- Recurring-error memory
- Controlled instructional feedback
- Dynamic lesson sequencing within approved boundaries
- Clara's teaching expressions and visual attention
- TTS responsibilities created by adaptive lesson feedback

This standard does not replace:

- `READIRECT_REVAMP_LESSON_STRUCTURE_STANDARD.md`
- `READIRECT_REVAMP_LESSON_AND_ASSESSMENT_INTERACTION_STANDARD.md`
- `READIRECT_REVAMP_CONTENT_CSV_AND_SELECTION_STANDARD.md`
- `READIRECT_REVAMP_CLARA_VOX_TTS_SPECIFICATION.md`
- `READIRECT_REVAMP_CLARA_LIVE2D_SPECIFICATION.md`
- `READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md`

Where those documents define stricter content, assessment, speech, viewport,
or model rules, the stricter rule wins.

Implementation status: Lessons 1, 2, and 3 implement Phase 1 bounded support and
the approved layered Clara presentation. They persist technical, independent,
guided, demonstration, echo, terminal, and skip evidence; deliver authored
support in server-controlled order; and restore the exact state after refresh.
Phase 2 deterministic recurring-difficulty diagnosis and Phase 3 skill-evidence
review scheduling remain future work.

## Core Principle

The old response loop is insufficient:

```text
Show item
    -> learner answers
    -> correct or incorrect
    -> next item
```

The approved lesson loop is:

```text
Present the item
    -> capture and validate the recording
    -> obtain the committed final transcription
    -> classify only evidence-supported outcomes
    -> select the smallest useful teaching response
    -> provide one guided retry
    -> demonstrate once if still needed
    -> record independent or assisted evidence
    -> schedule later review when appropriate
    -> continue without trapping the learner
```

Clara must not merely announce correctness. She should teach when the evidence
supports a safe and useful intervention.

## Hard Scope Boundary: Lessons Versus Assessments

The AI teacher loop applies to lessons only.

Diagnostic and final assessments must remain standardized measurement flows.
They must not:

- Teach during an assessment item
- Reveal an answer before the item is committed
- Add scaffolded academic attempts
- Change item difficulty based on current performance
- Return to a prerequisite activity during the assessment
- Count a demonstrated answer as independent assessment success

Assessments may still provide:

- Recording playback before submission
- Retry before submission
- A technical retry for unusable audio
- Skip behavior where the assessment standard permits it
- Results and recommendations after the relevant assessment section

Lesson evidence must never be written into an assessment score merely because
the two activities use the same ASR or shared interface components.

## ASR Terminology

Nu remains the official name of ReaDirect's isolated-letter recognition mode.
It is not a separately loaded model, separately trained classifier head,
separate set of weights, or separate ASR service.

The approved relationship is:

```text
Mu: shared speech-recognition engine
|
|-- Nu: Mu-backed isolated-letter mode
|   |-- receives Mu recognition evidence
|   |-- applies isolated-letter resolution
|   |-- applies letter equivalences
|   \-- returns A-Z, SILENCE, or UNKNOWN
|
\-- Mu general-speech mode
    \-- handles words, phrases, sentences, passages, and approved answers
```

Nu resolves its final result into:

```text
A-Z
SILENCE
UNKNOWN
```

The terms `Nu result`, `Nu prediction`, and `Nu letter decision` are valid when
they refer to this Mu-backed operating mode. The terms `Nu model`, `Nu model
weights`, `Nu classifier service`, and `separate Nu head` are prohibited unless
a future approved architecture explicitly introduces those components.

Documentation, analytics, UI copy, and code must preserve the Nu name for
isolated-letter behavior while making its shared Mu ownership unambiguous.

## Audio-Quality Gate

Academic diagnosis happens only after the recording passes an audio-quality
gate.

Required top-level classifications:

```text
CLEAR_CORRECT
CLEAR_INCORRECT
UNCERTAIN
UNUSABLE_AUDIO
SILENCE
SKIPPED
```

Rules:

1. Only `CLEAR_INCORRECT` may trigger targeted academic correction.
2. `UNCERTAIN`, `UNUSABLE_AUDIO`, and `SILENCE` must not lower academic
   mastery.
3. A technical retry is separate from an academic attempt.
4. A clipped, empty, excessively noisy, or otherwise invalid recording must
   receive a short neutral retry instruction.
5. The learner must not be told that a skill is wrong when the system is
   uncertain about the recording.
6. Skip remains an explicit learner action and is stored as `SKIPPED`, not as
   numeric zero and not as an ASR failure.

Approved uncertainty language includes:

> I could not hear that clearly. Let's try once more.

Uncertainty language must not reveal the answer.

## Evidence Boundary

Clara may diagnose only what the available evidence supports.

### Safe evidence

- Expected target
- Server-committed final transcription
- Resolver and equivalence evidence
- Audio-quality classification
- Confidence evidence when the active resolver provides it
- Deterministic text alignment
- Attempt number
- Scaffold level already shown
- Authored content metadata
- Recent learner skill evidence

### Unsafe assumptions

Clara must not claim:

- A specific articulation defect from transcript text alone
- A phoneme-level error without phoneme or acoustic evidence
- That the learner confused two letters when recognition is uncertain
- That the raw ASR output is authoritative after equivalence resolution
- That a wrong answer proves a persistent weakness after one occurrence
- That an automatically inferred word split is pedagogically valid
- That the learner intended a meaning not represented in the committed answer

Example:

```text
Expected letter: P
Final detected letter: T
```

Safe:

> I heard T. Let's look at P again. The letter name is pee.

Unsafe without stronger acoustic evidence:

> Your P sound was too hard and became T.

The system may record a possible `P-T` confusion observation, but it becomes a
recurring confusion only after the configured evidence threshold is met.

## Letter Names and Letter Sounds

Letter-name teaching and phonics teaching are separate skills.

Lesson 1 teaches letter names. For the displayed letter P, Clara may say:

> This is P. Its letter name is pee. Listen: pee. Now you try.

She must not teach the `/p/` phoneme during a letter-name item unless a future
activity explicitly targets letter sounds.

All isolated-letter TTS uses
`READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md`.

The canonical saved value remains `P`; only its spoken rendering becomes
`pee`.

## Bounded Teaching Loop

Lessons must use a short loop that respects children's attention.

### Academic attempt sequence

```text
Attempt 1
Independent response
        |
        +-- correct --> INDEPENDENT_CORRECT --> continue
        |
        +-- unclear --> technical retry, no academic penalty
        |
        \-- clear incorrect
                |
                v
        One targeted clue
                |
                v
Attempt 2
Guided retry
        |
        +-- correct --> SUPPORTED_CORRECT --> continue
        |
        +-- unclear --> technical retry, no academic penalty
        |
        \-- clear incorrect
                |
                v
        Clara demonstrates once
                |
                v
        One learner echo
                |
                v
        DEMONSTRATED or NOT_YET_CORRECT
                |
                v
        schedule review and continue
```

Hard rules:

1. Do not require five academic attempts on one item.
2. Use at most two scored learner attempts before demonstration.
3. Demonstration happens at most once per item.
4. The post-demonstration echo does not become independent mastery.
5. The learner must always have a bounded route forward.
6. A repeated error must not trap the learner in an infinite retry loop.
7. Support must remain brief and use one teaching idea at a time.
8. Skip advances according to the lesson standard and does not open the
   scaffold loop.

## Approved Lesson Outcomes

Lesson result records must distinguish:

| Outcome | Meaning | Independent mastery evidence |
| --- | --- | --- |
| `INDEPENDENT_CORRECT` | Correct before any academic hint | Yes |
| `SUPPORTED_CORRECT` | Correct after one targeted clue | No |
| `DEMONSTRATED` | Clara demonstrated and the learner completed the echo | No |
| `NOT_YET_CORRECT` | Still incorrect after bounded support | No |
| `UNSCORABLE_AUDIO` | Technical retries could not produce usable evidence | No academic judgment |
| `SKIPPED` | Learner explicitly skipped the item | No |

`CORRECT` may remain an ASR decision, but the lesson outcome must include the
assistance context. A correct response after answer revelation must never be
stored as independent mastery.

Each committed lesson outcome should preserve:

```json
{
  "outcome": "SUPPORTED_CORRECT",
  "academic_attempt_count": 2,
  "technical_retry_count": 0,
  "highest_scaffold_used": "targeted_clue",
  "independent_mastery": false,
  "diagnosis_key": "final_letter_substitution",
  "review_recommended": true
}
```

Exact database design may evolve, but these semantic distinctions are
required.

## Diagnosis by Activity Type

### Isolated letters

Supported categories:

```text
correct_letter
different_clear_letter
possible_confusion_pair
repeated_confusion_pair
silence
uncertain
unusable_audio
```

A possible confusion pair requires two different clear canonical letters. It
does not prove a pronunciation defect.

An equivalence-resolved correct answer remains correct and must not become a
confusion merely because the raw ASR text differed.

### Words

Supported transcript-alignment observations may include:

```text
exact_match
single_substitution
initial_letter_substitution
final_letter_substitution
omission
insertion
multiple_differences
uncertain
```

The system may describe visible text differences, such as:

> You read the beginning correctly. Look at the last letter. This word ends in
> T. Listen: cat. Now try again.

Transcript alignment alone must not claim that a particular phoneme was
misarticulated.

### Phrases and sentences

Supported deterministic alignment observations may include:

```text
exact_match
missing_word
extra_word
replaced_word
words_out_of_order
multiple_word_differences
uncertain
```

Starting with Lesson 3, clear phrase and sentence evidence must pass through
deterministic word-level Levenshtein alignment after final-transcript
resolution. The alignment must preserve expected and actual token positions,
edit distance, normalized similarity, the full edit list, and one primary
operation. A single adjacent token transposition is recorded separately from
two substitutions.

Clara addresses only one useful difference per attempt:

- `missing_word`: `You missed the word {expected}.`
- `extra_word`: `I heard an extra word, {actual}.`
- `replaced_word`: `I heard {actual} instead of {expected}.`
- `words_out_of_order`: identify the two words that changed places.
- `multiple_word_differences`: describe only the first actionable operation,
  then use the existing whole-phrase clue.

Character-level Levenshtein distance may be retained inside a word
substitution as supporting evidence. It must not be described as a phoneme or
articulation diagnosis.

Example:

```text
Expected:  cat on a mat
Final:     on a mat
Diagnosis: missing_word
Target:    cat
```

Clara says:

> You missed the word cat.

The existing clue and full-phrase retry follow this targeted line.

Example:

```text
Expected: The cat is on the mat.
Final:    The cat on the mat.
```

Clara may say:

> One small word is missing: is. Read this part with me: the cat is.

After the guided segment, the learner retries the complete sentence.

### Passages

Passage diagnosis must remain conservative. Long-form ASR can identify broad
coverage, omissions, and major mismatches, but Clara must not launch a
micro-lesson for every word difference.

Use passage evidence for:

- Completion and coverage
- Broad reading accuracy
- Repeated omitted content
- Review recommendations
- Teacher-facing analytics

Detailed automatic articulation teaching from a passage transcript is
prohibited unless a future validated acoustic subsystem supports it.

### Comprehension

Comprehension diagnosis must use author-supplied answer roles.

Required Lesson 6 uses authored four-choice comprehension. It does not infer
meaning from free speech or call Mu. The learner's committed selected choice is
compared with the server-owned correct choice key.

Approved role mapping:

| Question family | Expected answer role |
| --- | --- |
| Who | Person |
| What | Object, action, or authored target |
| Where | Place |
| When | Time |
| Why | Reason |
| How | Manner or authored target |

Example:

```text
Sentence: Rosa waters the plant.
Question: Who waters the plant?
Committed answer: the plant
Expected role: person
```

Clara may say:

> Who asks for a person. Look at the beginning of the sentence. Who is the
> person?

The sentence may highlight `Rosa` only at the stronger scaffold level defined
by the authored item. The system must not invent semantic roles from arbitrary
text when the content record does not define them.

Lesson 6 choice support escalates in this exact order:

1. `targeted_clue`: remind the learner what the current 5W family asks for
   without highlighting the answer.
2. `guided_display`: highlight only the authored evidence span and direct the
   learner to inspect it.
3. `demonstration`: highlight the authored correct choice and explain its
   connection to the sentence.

Each committed wrong choice is disabled for that item. The learner must still
select and submit the demonstrated correct choice. Assessment Task 3B shares
the base choice grid only and must never receive these teaching states.

## Content Authoring Requirements

AI-teacher behavior depends on authored teaching metadata. Each supported item
should eventually define:

```text
content_id
target_skill
expected_answer
allowed_equivalents
safe_diagnosis_categories
targeted_clue
stronger_clue
demonstration_text
guided_retry_prompt
prerequisite_skill
review_target
tts_reference_role
```

Comprehension items additionally require:

```text
question_family
expected_answer_role
answer_evidence_span
highlightable_evidence_span
```

Content rules remain mandatory:

- Ordinary lesson words must not contain consonant clusters, digraphs, or
  multigraphs.
- Passages remain the documented exemption.
- Words and sentences must remain easy for Filipino learners to pronounce.
- The system must not automatically segment an arbitrary word and present that
  segmentation as teaching content.
- `plant` and `pl + ant` are not valid ordinary ReaDirect lesson examples.
- Approved simple examples include `cat`, `cap`, `can`, and `cut`.
- Lessons remain image-free.
- Text highlighting, movement, chunk emphasis, sound pulses, and vector UI
  cues are allowed.

## Scaffold Design

Every scaffold must be:

- Short
- Specific to one teaching idea
- Based on authored content or safe deterministic evidence
- Spoken in child-friendly language
- Visually supported through text emphasis
- Free from blame, alarm, or harsh correction

Approved scaffold levels:

```text
none
targeted_clue
guided_display
demonstration
echo
```

Examples:

### Letter name

```text
Targeted clue:
Look at the letter again. This is P.

Demonstration:
Its letter name is pee. Listen: pee.

Echo:
Now say pee with me.
```

### Simple word

```text
Expected: cat
Final: cap

Targeted clue:
You got the beginning right. Look at the last letter.

Demonstration:
This word ends in T. Listen: cat.

Echo:
Now say cat with me.
```

### Who comprehension

```text
Targeted clue:
Who asks for a person.

Guided display:
Highlight the authored person evidence.

Demonstration:
Rosa is the person. The answer is Rosa.

Echo:
Now say Rosa.
```

## Micro-Lesson Standard

A micro-lesson contains at most:

```text
one explanation
one authored example or demonstration
one guided response
one independent opportunity later
```

The independent opportunity should normally occur in a later item or scheduled
review, not through an immediate unbounded repetition of the same item.

Teaching speech should normally fit within one short sentence or approximately
five to seven seconds. Longer explanations must be split into meaningful
turns, each followed by a visible or interactive learner action.

## Learner Skill Evidence

The learner model stores evidence per curriculum skill rather than one global
ability score.

Initial skill keys must match implemented activities. Do not create analytics
for hypothetical missions that do not exist.

Likely curriculum-aligned skill families include:

```text
letter_name_recognition
initial_letter_identification
missing_letter_identification
word_reading
phrase_reading
sentence_reading
passage_reading
who_comprehension
what_comprehension
where_comprehension
when_comprehension
why_comprehension
how_comprehension
```

Rhyme evidence remains assessment evidence unless a lesson explicitly teaches
rhyme.

Each skill record should preserve evidence such as:

```json
{
  "skill_key": "who_comprehension",
  "independent_correct": 4,
  "supported_correct": 2,
  "demonstrated": 1,
  "not_yet_correct": 1,
  "unscorable": 0,
  "recent_diagnosis_key": "answered_object_instead_of_person",
  "evidence_count": 8,
  "last_observed_at": "2026-07-23T10:00:00Z",
  "review_status": "needs_review"
}
```

Rules:

1. Independent evidence has greater mastery value than assisted evidence.
2. Demonstrated and echoed answers do not prove mastery.
3. Unscorable audio does not lower mastery.
4. One mistake does not create a persistent weakness.
5. Mastery requires a configured minimum amount of independent evidence.
6. Recent performance and spaced review matter; lifetime percentages alone are
   insufficient.
7. Skill evidence must remain explainable to teachers.
8. The system must preserve the exact response and scaffold evidence that
   produced a mastery update.

A simple evidence-counting and recent-window model is approved for the first
version. More complex Bayesian or knowledge-tracing models require separate
validation before adoption.

## Recurring Error Memory and Review

The system may promote an observation into a recurring difficulty only after a
configured threshold.

Example:

```json
{
  "diagnosis_key": "letter_confusion:P:T",
  "clear_occurrences": 3,
  "first_seen_at": "2026-07-20T09:00:00Z",
  "last_seen_at": "2026-07-23T10:00:00Z",
  "status": "needs_review"
}
```

Rules:

- Only clear, scorable evidence increments an academic error pattern.
- Equivalent or resolver-corrected responses do not increment a confusion.
- Uncertain and unusable recordings do not increment a confusion.
- A recurring difficulty schedules review; it does not permanently label the
  learner.
- Successful later independent responses reduce or resolve review need.
- Teachers may inspect the evidence behind a suggestion.
- Required lesson order does not change because of one error pattern.

## Adaptation Boundaries

Adaptation may:

- Choose an approved hint
- Choose an approved demonstration
- Select an approved prerequisite micro-lesson
- Schedule a later review target
- Choose from an already approved content band
- Add a small refresher before a later mission

Adaptation must not:

- Skip required lessons
- Unlock a lesson early
- Change assessment content or scoring
- Replace the server-authoritative progression order
- Generate unrestricted curriculum content
- Repeat one item indefinitely
- Replace unused-target and locked-selection rules
- Re-select content after refresh merely to obtain an easier item

Selected activity content remains locked. Adaptation operates through authored
support and future review scheduling, not refresh-based replacement.

## Controlled Feedback Strategy

An unrestricted LLM is not required for the first implementation.

Feedback selection uses:

```text
activity type
audio-quality outcome
diagnosis key
academic attempt number
current scaffold level
authored item metadata
recent recurring difficulty
```

Example strategy:

```text
IF activity = word_reading
AND diagnosis = final_letter_substitution
AND academic_attempt = 1

THEN:
acknowledge the correct portion
direct attention to the final letter
play the authored demonstration
request one guided retry
```

The strategy is deterministic and auditable even if several approved wording
variants exist.

Feedback must never include:

- Raw Mu output when a committed final transcription exists
- An unverified articulation diagnosis
- A claim that the learner is bad at reading
- Shame, anger, disappointment, or punishment
- An answer outside the controlled scaffold level
- An unrestricted browser-submitted TTS string

## TTS Delivery Implications

The AI teacher increases the number of possible spoken responses, but the
hybrid delivery rule remains mandatory.

### Published speech

Pre-generate and review:

- General encouragement
- Technical retry instructions
- Scaffold instructions
- Question-family explanations
- Transition language
- Demonstration framing
- Completion and review messages
- Any line fully known during content publication

### Content-authored speech

Generate and review alongside content where possible:

- Isolated letter demonstrations
- Word demonstrations
- Phrase and sentence demonstrations
- Authored micro-lesson examples
- Comprehension evidence prompts

### Dynamic speech

Reserve runtime Vox for text that cannot be known before the learner response,
such as safely rendering a committed unexpected final transcription.

The complete feedback sentence must not be runtime-generated merely because
one small content token varies when a published or content-authored solution is
available.

### Warm-up consequences

Activity warm-up must be driven by a speech-profile manifest.

Example:

```json
{
  "activity": "lesson-1",
  "runtime_profiles": ["result"],
  "published_groups": [
    "lesson-1-instructions",
    "technical-retries",
    "letter-demonstrations"
  ]
}
```

Future activities may require `instruction`, `question`, or `result`, but they
must declare those requirements. The warm-up standard must not assume that
every lesson needs every reference role.

Warm-up reduces cold-start costs but does not guarantee instant uncached
generation. Feedback design must not create a new blocking Vox generation after
every incorrect answer.

## Teaching-State Machine

Lesson UI and Clara behavior should use explicit states:

```text
PRESENTING
LISTENING
PROCESSING
INDEPENDENT_FEEDBACK
GIVING_CLUE
GUIDED_RETRY
DEMONSTRATING
ECHO_RETRY
REVIEW_SCHEDULED
ADVANCING
```

Rules:

- Recording is available only in learner-response states.
- Submit is unavailable while ASR or TTS is processing.
- Clara does not speak over learner recording or learner-audio playback.
- The displayed item remains the primary visual focus.
- Clara remains visible in the approved lower-left lesson position.
- The main recorder remains the largest action.
- A scaffold changes the displayed item only through approved text animation,
  highlighting, or chunk emphasis.
- The activity remains non-scrollable on priority viewports.
- Error and feedback states must not add permanent panels that overcrowd the
  shared assessment/lesson composition.

## Live2D Teaching Behavior

### Capability boundary

The compiled Clara model supports more teaching states than the current
runtime exposes, but it cannot create unrigged artwork.

Available compiled controls include:

- Eye openness and eye smiles
- Eye direction
- Pupil dilation and squish
- Eyebrow position, angle, form, and horizontal movement
- Mouth form, opening, and horizontal movement
- Cheek and cheek-puff controls
- Head and body angles
- Breathing, bounce, and hair movement
- Sad, angry, blush, dizzy, and question-mark parameters exist in the source
  model, but blush is forced neutral and is not an approved runtime cue

The current approved runtime base emotions remain:

```text
default
happy
thinking
confused
```

The expression controller may be extended after visual parameter validation.

Current implementation:

- The shared Clara runtime exposes layered base emotion, teaching behavior,
  optional cue, and speaking state.
- The compiled display metadata is checked automatically for every controlled
  teaching parameter. Runtime initialization fails clearly if the compiled
  model does not contain a required parameter.
- Sad, angry, and dizzy toggles are excluded from the controller.
- Lessons 1 through 4 deterministically use demonstrating, listening, thinking,
  encouraging, gentle-correction, and celebrating presentation states.
- Demonstration gaze temporarily overrides cursor tracking and then returns
  control to the shared interaction tracker.
- Reduced motion preserves the communicative facial state and teaching gaze
  while removing celebration bounce.

### Current Lesson 1 through Lesson 4 bounded-support implementation

- `lesson_responses` is the persisted item-level teaching state and final
  outcome record.
- `lesson_item_attempts` preserves every independent, guided, technical, echo,
  and skip attempt without overwriting earlier evidence.
- `LessonTeachingStateMachine` enforces no more than two academic attempts,
  one clue, one demonstration, one echo, and a terminal route forward.
- Two unusable recordings before academic evidence resolve to
  `UNSCORABLE_AUDIO`; neither recording becomes an academic attempt.
- Clear incorrect evidence alone opens targeted support. Uncertain, silent, or
  unusable evidence never opens academic correction.
- Supported success, demonstrated echo, not-yet-correct, unscorable, and skip
  remain distinct from independent mastery.
- The API serializes server-derived recording, support-continuation, and
  advancement capabilities so refresh restores the exact state.
- `LessonOneSupportPresentation`, `LessonTwoSupportPresentation`, and the
  shared `SpokenTextLessonSupportPresentation` used by Lessons 3 and 4 each
  serialize one stable `sequence_key`, an ordered published-or-runtime speech
  sequence, a display mode, and the only action permitted after speech
  completion.
- Mission-specific clues, technical retry language, terminal outcome feedback,
  and Lesson 1 A-Z demonstrations are finite published catalog content.
- The committed learner transcript uses response-owned runtime feedback; it
  plays before the relevant fixed clue or outcome line.
- Lesson 2 target-word demonstrations are response-owned runtime speech
  because the locked word varies by run. Laravel reads the hidden target from
  the immutable snapshot; the browser never supplies demonstration text.
- Lesson 3 phrase and Lesson 4 sentence demonstrations are finite published
  speech. All 20 phrase targets and 20 sentence targets are generated,
  reviewed, cataloged, and addressed by the locked content ID. Only
  response-dependent final-transcript and alignment feedback remains runtime
  speech in these activities.
- `TranscriptAlignmentService` implements reusable word-level Levenshtein
  alignment for Lesson 3 phrases, Lesson 4 sentences, and Lesson 5 passages.
  All store the
  complete result inside immutable attempt evidence and current response
  evidence. The response diagnosis key is the alignment category.
- Lesson 5 is the deliberate long-reading exception. One clear submitted
  passage recording commits its academic attempt and opens passage review
  immediately. Clara performs no clue, demonstration, echo, transcript recital,
  or academic retry. The review selects one finite published response from the
  authoritative accuracy band; reading speed remains non-punitive supporting
  evidence.
- Technical, silent, unusable, and uncertain recordings never receive word
  alignment correction. Alignment runs only for clear academic evidence after
  the equivalence resolver commits the final transcript.
- The browser confirms clue or demonstration playback before it requests the
  guarded `continue-support` transition. It never advances teaching state from
  a timer or locally inferred result.
- Recorder availability follows `teaching.can_record`, and its local recording
  resets when the persisted state or attempt count changes on the same item.
- Stable support sequence keys make refresh safe: the current authored step may
  replay, but no support stage is skipped or duplicated in persistence.

### Approved target teaching states

| Teaching state | Intended visual behavior |
| --- | --- |
| `neutral` | Default attentive face |
| `happy` | Closed-eye smile |
| `thinking` | Thoughtful eyes, brows, and upward or side gaze |
| `confused` | Question mark, head tilt, and questioning brows |
| `listening` | Open attentive eyes, closed mouth, restrained motion |
| `encouraging` | Soft smile, raised brows, and a gentle nod |
| `gentle_correction` | Calm mouth, concerned brows, and no negative reaction |
| `demonstrating` | Eyes and head orient toward the highlighted item |
| `celebrating` | Happy face and controlled bounce |

Speaking remains an independent mouth overlay and is not a base emotion.

### Layered presentation

Clara's presentation state must be composed as:

```text
base emotion
    + teaching behavior
    + speaking overlay
    + optional approved cue
```

Examples:

```text
encouraging + speaking
thinking + analyzing
neutral + listening
happy + celebration bounce
gentle_correction + speaking
```

Priority rules:

1. Speaking controls the mouth-open parameter only.
2. A teaching gaze overrides cursor tracking while Clara demonstrates.
3. Cursor tracking resumes smoothly after demonstration.
4. Natural blink and catchlight suppression remain active.
5. Expression changes ease between states rather than snapping.
6. Reduced-motion mode removes bounce and large movement while preserving the
   communicative face.
7. Angry and sad must never respond to a learner's incorrect answer.
8. Dizzy must not represent ASR uncertainty or learner difficulty.
9. Blush is prohibited across all Clara expressions and behaviors.
10. The question mark is reserved for genuine questioning or confusion, not
    punishment.

### Pointing limitation

The current model has no controllable pointing arm or hand pose. Clara cannot
physically point at a word without new authored and rigged model artwork.

The approved substitute is:

```text
Clara looks toward the target
    + target text highlights or pulses
    + optional vector pointer or focus cue appears in the UI
```

New hand poses, fundamentally new mouth artwork, or new facial artwork require
an editable `.cmo3` and a new model export. Runtime parameter combinations must
not pretend to provide artwork that the compiled model does not contain.

## Child-Safety and Tone

Clara must:

- Use calm, short, concrete language
- Praise effort without falsely declaring mastery
- Correct the task rather than judging the learner
- Avoid sarcasm, disappointment, anger, or shame
- Avoid exaggerated negative facial reactions
- Move forward after bounded support
- Encourage another future opportunity

Approved:

> Good start. Look at the last letter and try once more.

Prohibited:

> That was wrong again.

Approved:

> We are still learning this one. I will help you, and we will see it again.

Prohibited:

> You do not know this word.

## Teacher and System Analytics

Teacher-facing analytics may report:

- Independent success by skill
- Supported success by skill
- Demonstrated items
- Not-yet-correct items
- Skipped items
- Unscorable recordings
- Recurring evidence-supported diagnoses
- Review recommendations
- Improvement after support

System-admin analytics may aggregate de-identified patterns, including:

- Most frequently skipped lessons
- Skills with high support dependence
- Content items with unusual ASR uncertainty
- Common deterministic transcript differences
- Micro-lessons associated with later independent improvement

Analytics must not merge:

- Unclear audio with incorrect learning
- Assisted success with independent mastery
- Raw ASR guesses with committed final transcriptions
- Portal system learner data with real learner analytics

## Recommended First Implementation

Implement the AI teacher incrementally.

### Phase 1: Bounded support

- Add the approved lesson outcomes
- Separate technical and academic retries
- Add one clue, one guided retry, and one demonstration
- Use published and content-authored TTS
- Store assistance level with each response

### Phase 2: Safe deterministic diagnosis

- Add isolated-letter clear-difference observations
- Add word and sentence text alignment
- Add authored comprehension answer roles
- Add recurring-difficulty thresholds

### Phase 3: Skill evidence and review

- Add per-skill evidence summaries
- Schedule later review targets
- Measure independent improvement after support
- Expose explainable teacher analytics

### Phase 4: Expanded Clara presentation

- Parameter-sweep and visually review compiled expression controls
- Add listening, encouraging, gentle-correction, demonstrating, and celebrating
  states
- Add teaching-gaze priority over cursor tracking
- Validate mobile and reduced-motion behavior

An unrestricted LLM, open-ended curriculum generation, and unvalidated
phoneme-level diagnosis are outside the approved first implementation.

## Acceptance Checklist

- [ ] AI-teacher behavior is restricted to lessons.
- [ ] Documentation and code preserve Nu as the official Mu-backed
      isolated-letter mode.
- [ ] No documentation or code implies that Nu has separate weights, a
      classifier head, or an independent ASR service.
- [ ] Audio quality is classified before academic diagnosis.
- [ ] Uncertain and unusable audio do not reduce mastery.
- [ ] Only clear incorrect evidence triggers targeted correction.
- [ ] Letter names and letter sounds remain separate skills.
- [ ] The lesson uses at most two scored attempts before one demonstration.
- [ ] Technical retries are not academic attempts.
- [ ] Post-demonstration echo is not independent mastery.
- [ ] The learner always has a bounded route forward.
- [ ] Outcomes distinguish independent, supported, demonstrated, not-yet,
      unscorable, and skipped states.
- [ ] Diagnoses do not exceed transcript, alignment, acoustic, or authored
      evidence.
- [ ] Content supplies approved clues, demonstrations, and answer-role
      metadata.
- [ ] Prohibited clusters, digraphs, and multigraphs remain excluded outside
      documented passage exemptions.
- [ ] Skill evidence matches implemented curriculum activities.
- [ ] One mistake does not create a persistent weakness.
- [ ] Recurring difficulty requires a configured clear-evidence threshold.
- [ ] Required lesson order remains authoritative.
- [ ] Selected content remains locked across refresh and reopen.
- [ ] Fixed and content-authored teaching speech is pre-generated and reviewed.
- [ ] Runtime Vox is reserved for genuinely unpredictable committed text.
- [ ] Activity speech manifests declare required runtime profiles.
- [ ] Clara remains visible and never speaks over recording or learner playback.
- [ ] Teaching states use a layered expression, behavior, and speaking model.
- [ ] Demonstration gaze overrides cursor tracking temporarily.
- [ ] Angry and sad never react to learner errors.
- [ ] Physical pointing is not claimed without newly rigged model artwork.
- [ ] Teacher analytics separate independent, assisted, skipped, and unscorable
      evidence.
- [ ] Portal learner records remain excluded from real learner analytics.
