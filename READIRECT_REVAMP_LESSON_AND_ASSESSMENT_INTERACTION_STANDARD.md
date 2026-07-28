# ReaDirect Lesson And Assessment Interaction Standard

Purpose: define the authoritative learner-facing UI, interaction flow, recorder
review behavior, lesson mission map, and assessment presentation rules for
ReaDirect-V2.

This document is the source of truth for how required lessons and the ReaDirect
Assessment look and behave on mobile, tablet, and desktop.

It complements:

- `READIRECT_REVAMP_FRONTEND_DESIGN_SYSTEM.md` for shared visual language,
  components, tokens, typography, and button behavior.
- `READIRECT_REVAMP_VIEWPORT_STANDARD.md` for required responsive viewports.
- `READIRECT_REVAMP_CLARA_LIVE2D_SPECIFICATION.md` for Ma'am Clara's approved
  crop, palette, behavior, and fallback.
- `READIRECT_REVAMP_LESSON_STRUCTURE_STANDARD.md` for lesson persistence, ASR
  targets, content formatting, and scoring separation.
- `READIRECT_REVAMP_ASSESSMENT_GUIDE.md` for fixed assessment tasks, item
  counts, branches, timers, and scoring.
- `READIRECT_REVAMP_AUDIO_PREPROCESSING_AND_RECORDING_STANDARD.md` and
  `READIRECT_REVAMP_ASR_GUIDE.md` for audio and ASR processing.
- `READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md` for completion-based lesson
  and assessment awards and their shared queued presentation.
- `READIRECT_REVAMP_RESULTS_AND_COMPLETION_PRESENTATION_STANDARD.md` for Part 1,
  Part 2, lesson completion, assessment completion, and final Reading Journey
  result-page design and animation.
- `READIRECT_REVAMP_CONTENT_CSV_AND_SELECTION_STANDARD.md` for fixed assessment
  forms, lesson item counts, content pools, target selection, and pronunciation
  restrictions.

Authority boundaries:

- This document owns learner-facing lesson and assessment layout, interaction
  choreography, control state, recorder review, and the required lesson mission
  map.
- The Assessment Guide owns assessment validity, fixed item counts, branches,
  scoring, and result timing. Presentation must never change those rules.
- The Results And Completion Presentation Standard owns shared result-stage
  layout, animation, Clara behavior, completion choreography, and the final
  congratulatory page.
- The Lesson Structure Standard owns displayed content versus spoken targets,
  ASR model selection, accepted answers, persistence, and unlock behavior.
- If a presentation idea would change the expected answer, scoring target,
  assessment branch, or number of assessment items, it is prohibited unless the
  corresponding scoring standard is explicitly updated.

## Non-Negotiable Experience Rules

1. Lesson and assessment activity pages must not scroll on mobile, tablet, or
   desktop.
2. Every activity page must fit within the current safe viewport using
   `100svh`, safe-area insets, and responsive layout constraints.
3. Ma'am Clara must always remain visible. On mobile she is centered inside the
   lower action dock's character region, bounded by the dock's left inner edge
   and the button column's left edge.
4. Every Clara viewport uses the approved square passport crop.
5. Clara's default instruction dialogue is audio-only. A permanent dialogue
   text box must not consume activity space.
6. Tapping Clara replays the current instruction when replay is allowed.
7. The circular recorder is the largest and most visually dominant control on
   speech activities.
8. The displayed activity item is the second-largest visual element.
9. Submit is an explicit action. Capturing audio must never automatically commit
   an answer.
10. Shared components must be used by lessons and assessments wherever their
    interaction is the same.
11. All colors and theme-controlled visuals use semantic variables. No component
    may hard-code a color.
12. The interface uses solid vector-like fills, fake downward depth, and no
    gradients.
13. Clara's TTS must never play while her Live2D model is loading. Speech may
    be prepared early, but audible playback waits for the currently mounted
    shared `ClaraStage` to report `ready`.
14. Part 1 item 1 uses the complete task instruction. Items 2 through 10 use
    the task's short ordinal cue: `Now, try the {ordinal} letter.`,
    `Now, check the {ordinal} pair.`, or
    `Now, read the {ordinal} word.` Controls remain unavailable until the cue
    finishes.
15. Ordinal cues are neutral and identical after Submit or Skip. All assessment
    instructions and ordinal cues are published, pre-generated catalog WAVs;
    they must never invoke runtime synthesis. Once the current instruction
    finishes, prefetch only the next published file within that task. Never
    fetch every remaining line or speculate across a score-dependent assessment
    branch. If the next cue is not ready on entry, use the shared TTS cube loader
    under the mandatory Clara-loader priority.
16. Every assessment and lesson activity header starts with the shared Home
    control. It returns directly to `/learner/dashboard`, uses the standard
    tactile commit, and must remain visible without crowding the title or
    progress at the priority `360 x 740` viewport.

## Required Lesson Intro Gate

Every learner-dashboard primary reading action opens Lesson Intro before the
next diagnostic, lesson, or final assessment, regardless of the learner's
current progression stage. This screen reuses the canonical Intro composition
without the `ReaDirect` title or theme selector: plain themed surface, the
canonical square Clara stage at the bottom, and one primary button labeled
`Continue`.

The dashboard click must synchronously unlock browser audio and begin the
deduplicated named Clara speech request. After the shared tactile button commit,
the dashboard navigates directly without a Link Start overlay. Lesson Intro
then reuses the pending or completed request. Clara
uses `happy + speaking` for the line; `speaking` becomes true only during actual
playback. Speech preparation and Live2D initialization run in parallel, but
playback begins only after both are ready. The Live2D CSS wave, active
hair-color reveal, centered TTS warm-up cube, an elapsed timer, or a ready state
inherited from a previous route must never open this gate. The model wave has
loader priority: the TTS cube may appear only after the mounted Clara stage is
ready and only while its requested speech is still preparing.

The state contract is:

```text
PREPARING -> SPEAKING -> READY
                    \-> ERROR -> retry -> PREPARING
```

- `Continue` is always visible and always retains that exact label.
- `Continue` is disabled in `PREPARING`, `SPEAKING`, and `ERROR`.
- While unavailable, Continue uses the shared intrinsically disabled
  `BigButton` `unavailable` variant and its fixed muted-grey cross-theme
  palette. It changes to the theme-controlled `primary` variant only in
  `READY`.
- It becomes enabled only after Clara's audio playback has ended successfully.
- A fetch response or completed synthesis alone must never unlock it.
- Failure exposes a secondary `Try again` action and must not bypass the gate.
- The page is non-scrollable and follows all canonical Intro safe-viewport,
  copy-prevention, custom-cursor, touch-trail, loading-reveal, and Live2D rules.
- The next activity remains progression-owned; Lesson Intro must not change or
  infer learner progress.

## Mandatory No-Image Rule

Required lesson content must not use instructional pictures, picture prompts,
image choices, raster illustrations, or image-dependent answers.

The learner must be able to complete every lesson from text, audio, and direct
interaction alone.

Allowed:

- Ma'am Clara's Live2D model and approved PNG fallback.
- Simple SVG or CSS control icons such as microphone, play, pause, and arrows.
- Code-rendered rectangles, circles, outlines, progress segments, particles,
  and other interface geometry.
- Solid typography-based animation and feedback.

Allowed icons and shapes must not reveal or carry information required to solve
an item. They are controls or feedback, not lesson content.

Prohibited:

- Image-based vocabulary prompts.
- Picture matching as a required lesson mechanic.
- Decorative raster lesson backgrounds.
- Photographic, textured, or illustrated answer choices.
- Replacing written content with an icon that a learner must interpret to
  answer correctly.

The same text-first presentation should be used for assessment activities so
the learner does not encounter a conflicting interaction language.

## Visual Priority

The required hierarchy on speech activities is:

1. Circular recorder or playback control.
2. Displayed letter, word, phrase, sentence, passage, or question content.
3. Ma'am Clara.
4. Submit.
5. Progress and supporting status.
6. Skip or Next when the current flow permits it.

Large elements must not compete equally. The recorder remains the center of
attraction even after it transforms into Play or Pause.

## Responsive Activity Stage

The activity shell uses three stable regions:

```text
auto                 Header and progress
minmax(0, 1fr)       Displayed activity item
protected fixed row  Recorder and Retry review space
bounded fixed row    Clara, Submit, and navigation
```

The page itself uses:

```css
height: 100svh;
overflow: hidden;
```

The stage must not create nested scrolling regions for ordinary lesson items.
Long passages use authored pages, not scrolling.

### Mobile composition

```text
┌────────────────────────────────┐
│ Exit       Lesson       ■ ■ □  │
├────────────────────────────────┤
│                                │
│         DISPLAYED ITEM         │
│         C c / cat / _at        │
│                                │
├────────────────────────────────┤
│             ◯                  │
│       RECORD / PLAY / PAUSE    │
│            Retry?              │
│                                │
│ Clara       Submit      Skip   │
└────────────────────────────────┘
```

Mobile rules:

- The activity header uses three content-aware columns: compact Home control,
  flexible title copy, and content-sized progress. Home is always the leftmost
  control and uses an accessible `Back to dashboard` name.
- Clara occupies the dock's left grid column and is centered between the dock's
  left inner edge and the button column.
- Clara is not absolutely offset. Her square stage shrinks or grows from both
  the character-column width and the dock's inner height.
- The action dock, Clara stage, and button stack use one shared responsive
  height budget. Clara's maximum height is the dock's inner height.
- The circular recorder stays horizontally centered.
- Skip or Next stays at the lower-right.
- Submit remains visually stronger than Skip.
- The layout reserves the navigation position during processing so controls do
  not jump.
- At very narrow widths, Submit may sit directly beneath the recorder while
  Clara and Skip or Next remain in their corners.
- Clara must not overlap the recorder, Submit, displayed item, or navigation.
- The compact-height rules include the priority `360 x 740` viewport and must
  not create a breakpoint cliff immediately below or above it.
- On compact-height speech pages, short letters, words, phrases, and sentences
  use only the item-panel height their content needs. The remaining vertical
  budget enlarges the recorder and Clara dock together. A semantic passage
  container is the explicit exception because its full authored text owns the
  flexible content row.

### Tablet and desktop composition

```text
+---------------------------------------------------------+
| Home  Lesson or assessment                     Progress |
+---------------------------------------------------------+
|                                                         |
|                    DISPLAYED ITEM                       |
|                                                         |
+---------------------------------------------------------+

+------------------+  +--------------------+  +-----------+
|                  |  |                    |  |           |
|      Clara       |  |  RECORD / PLAY     |  |  Submit   |
|                  |  |      Retry         |  |   Skip    |
|                  |  |                    |  |           |
+------------------+  +--------------------+  +-----------+
```

At viewports of at least `768px` wide and `600px` tall, tablet and desktop use
the same sliced activity workspace. The header and displayed-item region share
one outer width but remain separate ReaDirect cards. The lower interaction row
uses three real sibling cards with a small, consistent background gap between
them. Every card retains the approved border, corner radius, surface color, and
fake depth instead of relying on one overlapping panel to imitate dividers.

The lower strip assigns Clara the left region, the recorder and Retry review
slot the center region, and Submit plus Skip or Next the right region. Clara
scales from both the left-region width and the strip's inner height, with a
calibrated large-desktop ceiling that preserves her approved Live2D passport
crop on tall monitors. Her stage is centered from the actual left-card edges.
The recorder remains centered inside its protected middle card, so Retry can
appear without clipping, covering Clara's card, or blocking the recorder.

Short letters, words, phrases, and sentences use a content-sized displayed-item
row and return the remaining scale to Clara and the recorder. Passage pages are
the semantic exception: their displayed-item row receives the space required
to keep the complete authored passage visible without scrolling. Lesson 5 may
use a slightly taller passage allocation because its reading card includes an
instruction line and an inner passage frame.

This large-screen composition is progressive enhancement only. Phone
composition, including short landscape-phone viewports, remains governed by
the mobile rules.

## Text As The Interactive Material

ReaDirect lessons use kinetic typography instead of instructional images.

Letters, words, and passages may:

- Enter and settle into position.
- Separate and reconnect.
- Appear on raised text tiles.
- Depress like physical game controls.
- Pulse briefly when Clara refers to them.
- Shake gently after an unclear result.
- Lock into place after completion.
- Change semantic solid colors.
- Respond subtly to microphone energy.
- Highlight sequentially during post-result feedback when reliable alignment
  evidence exists.

Animation rules:

- Entrance motion must finish before the learner is expected to read.
- Displayed content remains still during active reading and recording.
- Continuous bouncing, flashing, or decorative movement behind reading text is
  prohibited.
- Accuracy must never be inferred from a live volume animation.
- Reduced-motion mode replaces movement with immediate state changes and solid
  emphasis.

Standard item choreography:

```text
Text enters
    -> learner explores the item
    -> learner records or selects
    -> learner reviews
    -> learner submits
    -> committed result is processed
    -> text provides permitted feedback
    -> Next
```

## Complete Speech-Item Interaction Walkthrough

The following example is the mandatory visible behavior for an ordinary lesson
speech item. It is included as an implementation reference and not merely as a
conceptual flow.

### 1. Item entrance and Ready

```text
┌────────────────────────────────┐
│ Exit       Lesson 2      ■ ■ □ │
├────────────────────────────────┤
│                                │
│              cat               │
│                                │
├────────────────────────────────┤
│              ◯                 │
│            RECORD              │
│                                │
│ Clara       Submit       Skip  │
└────────────────────────────────┘
```

- The word assembles or enters, then becomes completely still.
- Clara gives the instruction through audio.
- Submit is present but visibly disabled.
- Skip is available because no audio has been submitted.
- Tapping Clara replays the instruction.

### 2. Recording

```text
┌────────────────────────────────┐
│                                │
│              cat               │
│                                │
│              ◉                 │
│             STOP               │
│           ▂ ▅ ▇ ▃              │
│                                │
│ Clara       Submit       Skip  │
└────────────────────────────────┘
```

- The circular button depresses and becomes Stop.
- Solid microphone-energy bars confirm that sound is being captured.
- The bars represent volume only and never accuracy.
- Displayed reading content remains still.
- Submit and Skip retain their positions but are disabled while recording.

### 3. Captured but not reviewed

```text
┌────────────────────────────────┐
│                                │
│              cat               │
│                                │
│              ▶                 │
│             PLAY               │
│                                │
│ Clara       Submit       Skip  │
└────────────────────────────────┘
```

- Stopping creates a local, unsubmitted recording.
- The circular button transforms into Play without moving.
- Submit remains disabled until the required playback finishes.
- Skip is available because no recording has been submitted.
- Retry is not shown before playback completes.

### 4. Playback

```text
┌────────────────────────────────┐
│                                │
│              cat               │
│                                │
│              Ⅱ                 │
│             PAUSE              │
│          ━━━━━────              │
│                                │
│ Clara       Submit       Skip  │
└────────────────────────────────┘
```

- The center becomes Pause during playback.
- A solid progress rail may show playback position.
- Submit and Skip are disabled during active playback.
- Playing the learner's recording does not invoke ASR or create a score.

### 5. Reviewed

```text
┌────────────────────────────────┐
│                                │
│              cat               │
│                                │
│              ▶                 │
│          PLAY AGAIN            │
│            Retry?              │
│                                │
│ Clara      [SUBMIT]      Skip  │
└────────────────────────────────┘
```

- Submit becomes enabled.
- `Retry?` appears directly beneath the circular playback control.
- Play again remains available.
- Retry deletes the local recording and returns to Ready.
- Skip remains available until Submit is pressed.

### 6. Submitted and processing

```text
┌────────────────────────────────┐
│                                │
│              cat               │
│                                │
│              ◌                 │
│          CHECKING…             │
│                                │
│ Clara     [PROCESSING]          │
└────────────────────────────────┘
```

- Submit uses its tactile press animation before the request is committed.
- Record, Play, Retry, and Submit become unavailable.
- Skip disappears completely.
- The lower-right navigation space remains reserved and empty.
- The interface cannot return to the reviewed state unless submission fails
  before the server accepts the attempt.

### 7. Result and Next

```text
┌────────────────────────────────┐
│                                │
│              cat               │
│          Result saved          │
│                                │
│ Clara                    Next →│
└────────────────────────────────┘
```

- The lesson displays only the feedback permitted for its result type.
- Clara plays the corresponding short feedback audio and expression.
- The Skip position becomes Next.
- Next appears only after the result and save checkpoint are confirmed.
- Pressing Next advances after the standard tactile commit delay.

### 8. Skip path

If the learner presses Skip before submission:

```text
in_progress or reviewed
    -> item result becomes skipped
    -> no zero score is created
    -> no captured audio is submitted
    -> checkpoint is saved
    -> following item opens
```

If the learner recorded and reviewed before pressing Skip, the system may retain
the event that an unsubmitted recording existed, but the raw discarded audio is
not treated as a scored response.

## Shared Recording Review And Submission Flow

The same recording-review foundation is mandatory for lessons and all speech
assessment tasks.

```text
Ready
    -> Recording
    -> Captured locally
    -> Playback
    -> Reviewed
        -> Retry? returns to Ready
        -> Submit commits the recording
    -> Processing
    -> Result
    -> Next
```

### Recorder transformation

The circular control does not move when its purpose changes.

| Recording state | Circular control |
|---|---|
| Ready | Microphone / Record |
| Recording | Stop |
| Captured | Play |
| Playing | Pause |
| Reviewed | Play again |
| Processing | Non-interactive processing state |

The recorder must:

- Be a perfect circle.
- Use the same tactile vector-game family as primary buttons.
- Have strong solid downward fake depth.
- Move downward and reduce its visible depth when pressed.
- Use icon, label, and state motion rather than color alone.
- Provide Spacebar support on desktop where the audio standard permits it.

### Retry

`Retry?` appears beneath the circular control only after successful playback of
the captured audio.

Activating Retry:

- Deletes the unsubmitted recording.
- Returns the recorder to Ready.
- Keeps the current item unchanged.
- Does not advance the lesson or assessment.
- Does not create a score.
- Does not mark the item failed or skipped.
- Records only retry metadata needed for product and reliability analysis.

Discarded raw audio must not remain stored as a scored attempt. The submitted
recording is the sole candidate passed into the final scoring flow.

### Submit

Submit is a separate raised button and must never be renamed to `Use this
recording`.

For short letter, word, phrase, sentence, and spoken-comprehension recordings:

- Submit is disabled before a recording exists.
- Submit remains disabled until playback completes.
- Submit becomes enabled after review.
- Pressing Submit shows the standard tactile press animation before committing.
- Submission locks Record, Play, Retry, Skip, and other answer-changing
  controls.
- The interface must not report a result until the API confirms the committed
  response.

Task 3A passage review is the documented exception because a recording can last
60 seconds:

- Submit may become available after the passage recording is captured.
- Playback remains available for optional review.
- Retry appears after playback completes.
- Retrying restarts the complete passage recording and its 60-second timer.
- The active passage and all linked comprehension questions remain neutral:
  they do not reveal word alignment, errors, or reading speed.
- After Task 3B commits, the dedicated Passage Results step may show the
  persisted complete-passage alignment and reading speed defined by the
  Assessment Guide and Results And Completion Presentation Standard.

## Lesson Skip, Processing, And Next Control

The lower-right lesson control has one stable slot and changes by state.

| Lesson item state | Navigation slot |
|---|---|
| No submitted audio or answer | Skip |
| Actively recording or playing | Skip label remains but control is disabled |
| Submitted and processing | Empty and unavailable |
| Committed result available | Next |

Rules:

- Skip exists only before submission.
- Skip disappears completely after Submit.
- Skip is never available while ASR or scoring is processing.
- Next appears only after the committed result and save are available.
- The slot remains geometrically reserved while empty so the interface does not
  shift.
- Skip records the result as `skipped`, never as zero.
- A submitted answer cannot later become a skip.
- A microphone, network, or ASR failure is `technical_failure`, not `skipped`.
- A valid skip advances to the following item after its tactile press commit.

Recommended item states:

```text
unseen
in_progress
captured
reviewed
submitting
completed
needs_support
skipped
technical_failure
```

## Assessment Submit, Skip, And Automatic Advance Rule

Scored assessment items show Skip before a response is committed. The
unscored microphone orientation and result pages never show Skip.

| Assessment item state | Action slot |
|---|---|
| Before submission | Submit 80% above Skip 20% |
| Recording or playback active | Skip remains visible but unavailable |
| Submitted and processing | Both actions remain unavailable |
| Committed submitted response | Save, fill progress, then automatically open the following item or result |
| Skip processing | Save zero, then automatically open the following item |

Before submission, the scored-item action slot uses an `80% / 20%` vertical
split: Submit occupies the upper 80% and Skip occupies the lower 20%. After a
normal submission is committed, both actions stay unavailable while the save is
confirmed, then the next item restores the same split. A documented result page
uses Continue. Active assessment items never show a separate Next button.
Skip uses the shared fixed-color `skip-vertical` button variant: `#FFFAFA`
surface through
`--color-action-skip-surface`, with all border, hover, pressed, and fake-depth
colors supplied by semantic variables.

Pressing Skip follows the tactile commit delay, persists a distinct response
with `response_type = skipped`, `decision = SKIPPED`, and `score = 0`, and then
atomically advances to the following assessment item. It never reveals an
intermediate Next button. Skip never sends an unsubmitted recording to ASR,
and it must be unavailable while recording, playing, uploading, ASR, or scoring
is active.

Pre-submission Retry remains available for speech assessment items. After a
valid submission, the response is final. A recording can return to review only
when the submission itself was not accepted, such as an upload or network
failure. A committed ASR scoring response follows the Assessment Guide and does
not become a learner-controlled retake.

## Required Lesson Mission Map

The required course contains six sequential lessons:

```text
Lesson 1: Letters
    -> Lesson 2: Words
    -> Lesson 3: Phrases
    -> Lesson 4: Sentences
    -> Lesson 5: Short Passage
    -> Lesson 6: Comprehension
```

Later lessons become harder through larger reading units, not by accumulating
more missions. Do not add required missions beyond this map without updating
this source of truth.

### Lesson 1 — Letters

#### Mission 1 — Display Letter Pair

Example:

```text
C c
```

- Uppercase and lowercase appear as two raised text tiles.
- The pair is one displayed letter item and one spoken target.
- The learner says the letter name. Nu remains restricted to isolated English
  letter names.
- Any approved instructional playback of that isolated letter must use
  `READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md`. Displaying the
  pair alone must not trigger playback.
- The content becomes still before recording.

#### Mission 2 — Highlighted First Letter

Example:

```text
Cat
```

- The first letter is emphasized through a raised solid-color character.
- The remaining letters stay readable and visually secondary.
- The learner responds using the configured spoken target.

#### Mission 3 — Missing First Letter

Required presentation:

```text
cat - _at
```

- No image accompanies the item.
- The complete word provides context for the missing-letter form.
- Entrance motion may show the first letter separating from the word.
- After permitted success feedback, the missing letter may return to the blank.
- The expected response remains the configured missing letter name, not the
  full display string.

### Lesson 2 — Words

#### Mission 1 — Display Word

- Show one isolated word.
- Letters may assemble into the word before the reading state begins.
- The full word remains still during recording.

#### Mission 2 — Highlighted Sentence Word

Example:

```text
The cat is sleeping.
```

- One target word is emphasized inside a sentence.
- The learner reads only the configured highlighted target.
- The target may briefly lift into focus before returning to the sentence.
- There is no third required mission in Lesson 2.

### Lesson 3 — Phrases

#### Mission 1 — Simple Phrase

Examples:

```text
red cap
under the table
runs very fast
```

- This is the only required mission in Lesson 3.
- Words may enter left to right as raised text units.
- The entire phrase is one recording target.

### Lesson 4 — Sentences

#### Mission 1 — Simple Sentence

Examples:

```text
The dog can run.
Mia has a blue bag.
The children are playing.
```

- This is the only required mission in Lesson 4.
- Capitalization and punctuation remain visible.
- Words and punctuation may provide post-result feedback without creating
  additional missions.

### Lesson 5 — Short Passage

#### Mission 1 — Short Passage Reading

- This is the only required mission in Lesson 5.
- The learner reads one authored short passage item at a time.
- The complete 50-word passage remains visible as one continuous reading item.
  Lesson 5 must not split it into authored pages, add page-turn controls, or
  make the learner scroll while recording.
- The passage panel owns the flexible viewport space. Its Lexend text is
  measured against the available panel height and fitted only within the
  approved Lesson 5 range of `16px` to `23px`.
- The recorder panel owns a protected minimum row. A longer passage may reduce
  its own type size within that range, but it must never compress, crop, or
  flatten the circular recorder.
- Recording is capped at 60 seconds.
- Playback and Retry remain available before Submit, but one clear submitted
  recording is the final academic passage attempt.
- Do not run clue, demonstration, echo, or academic retry states for Lesson 5.
- A clear submission opens the dedicated passage result directly before the
  ordinary Lesson Complete result.
- The passage result reuses the assessment passage-review component and shows
  the complete text, authoritative word markings, accuracy, and speed.
- `Next` commits the review boundary. Passage Explorer and lesson progression
  are not granted until this continuation succeeds.
- Clara speaks one published accuracy-band response while the passage result is
  visible. Keep `Next` unavailable until she finishes.
- Reading speed is supporting evidence only and must not lower Clara's response
  band.
- A skip opens a neutral passage result without invented timing or alignment.

Example:

```text
Lena has a small plant. She waters it every morning. The plant grows beside her window.
```

### Lesson 6 — Comprehension

#### Mission 1 — Five-question choice comprehension

This is the only required mission in Lesson 6.

It contains one item for each of these question types:

```text
Who
What
Where
When
Why
```

Each question uses a different simple sentence. The required per-item flow is:

```text
One sentence is displayed
    -> Ma'am Clara asks one question through published audio
    -> the sentence remains visible
    -> four authored choices are displayed
    -> learner selects one choice
    -> learner explicitly submits
    -> Laravel compares the selected choice key
    -> correct answers enter feedback and Next
    -> wrong answers remain on the item and activate Clara support
```

Example:

```text
Displayed sentence: Lena waters the plant.
Clara audio: Who waters the plant?
Correct choice: Lena
```

A short question-type token such as `WHO?` may be displayed. Clara's complete
spoken question must not be duplicated as a permanent dialogue box.

The hidden correct choice key, evidence span, answer role, and support text
remain server-owned authored data. Lesson 6 has no learner recording, Mu
request, transcript, pronunciation equivalence, or runtime-generated answer
feedback.

After a committed correct result, the relevant answer portion of the sentence
may be highlighted as feedback. It must not be highlighted before submission.

Wrong choices do not finalize the lesson item. Clara escalates deterministically:

1. First wrong choice: a question-family reminder with no answer reveal.
2. Second wrong choice: the authored evidence span is highlighted.
3. Third wrong choice: the correct choice and evidence are demonstrated.

Every committed wrong choice is disabled for the remainder of that item. The
learner still selects and submits the correct choice after demonstration. The
terminal outcome records whether the item was completed independently, with
support, after demonstration, or by Skip.

## Explicit Lesson Interaction Examples

These examples define how the lesson content itself becomes interactive without
instructional images. They are required behavioral references for later page
implementation.

### Lesson 1, Mission 1 — Letter-pair interaction

Entrance:

```text
     C                 c
     ↓                 ↓
┌─────────┐       ┌─────────┐
│    C    │       │    c    │
└─────────┘       └─────────┘
```

Interaction:

1. Uppercase and lowercase enter as separate raised tiles.
2. Both settle before Clara finishes the instruction.
3. Tapping either tile may briefly emphasize the pair, but does not change the
   expected spoken target.
4. The learner records, reviews, and submits one response for the pair.
5. During recording, both tiles remain still.
6. After permitted successful lesson feedback, both tiles press down together
   and lock.
7. After unclear or needs-support feedback, both tiles make one gentle lateral
   movement and then return to stillness.

The pair must never look like two separately scored items.

### Lesson 1, Mission 2 — Highlighted-first-letter interaction

Entrance:

```text
[ C ] + at
      ↓
    [C]at
```

Interaction:

1. The first letter and remaining letters enter separately.
2. They assemble into one readable word.
3. The first letter remains slightly raised with a solid semantic emphasis
   color.
4. Optional exploration: tapping the raised first letter lifts it briefly and
   then restores the full word.
5. The content becomes still during recording.
6. After committed success, the first letter depresses into the completed word.
7. Feedback must not separate the visible display value from the configured
   spoken target.

Example ready state:

```text
                 [C]at

                   ◯
                 RECORD
```

### Lesson 1, Mission 3 — Missing-first-letter interaction

The required display remains:

```text
cat - _at
```

Entrance sequence:

```text
cat
 ↓
c separates from at
 ↓
cat - _at
```

Interaction:

1. The complete word appears first.
2. Its first letter briefly lifts away.
3. The final stable display becomes `cat - _at`.
4. The underscore uses a raised empty letter slot; it is not a text input.
5. The learner says the configured missing letter name.
6. Nothing is typed and no image is shown.
7. After committed correct lesson feedback, the missing character slides into
   the blank and the completed word presses down.
8. After needs-support feedback, the blank makes one gentle emphasis movement
   without revealing the answer.

Correct post-result reinforcement:

```text
cat - _at
        ↓
cat - cat
```

The completed form appears only after scoring. It must never reveal the answer
before submission.

### Lesson 2, Mission 1 — Display-word interaction

Entrance:

```text
c     a     t
 \    |    /
     cat
```

Interaction:

1. Letters arrive individually and assemble quickly into the word.
2. The assembled word becomes the single second-largest visual element after
   the recorder.
3. The individual letters are not separate buttons or separately scored units.
4. The word remains still while Clara speaks, the learner records, and playback
   runs.
5. After a committed result, the complete word provides one short press,
   outline, or alignment-based feedback response.

### Lesson 2, Mission 2 — Highlighted-sentence-word interaction

Ready presentation:

```text
The [ cat ] is sleeping.
```

Entrance and exploration:

```text
The cat is sleeping.
    ↓
The [ cat ] is sleeping.
    ↓ optional tap
             cat
    ↓
The [ cat ] is sleeping.
```

Rules:

- The full sentence supplies context.
- Only the configured highlighted word is the spoken and scored target.
- The target may lift into the center before recording, then returns to its
  original sentence position.
- The optional lift is visual only and must not pronounce the answer.
- The sentence stays still during recording.
- There is no missing-word or third mission in Lesson 2.

### Lesson 3, Mission 1 — Phrase interaction

Ready presentation:

```text
[ red ] [ cap ]
```

Interaction:

1. Phrase words enter from left to right as one short reading path.
2. The bases use shallow solid depth so the phrase feels physical without
   resembling three separate answers.
3. Once assembled, the entire phrase remains still.
4. The full phrase is recorded and submitted as one target.
5. After scoring, reliable word-alignment evidence may press or highlight the
   words in spoken order.
6. If reliable alignment is unavailable, feedback applies to the complete
   phrase instead of guessing which word matched.

### Lesson 4, Mission 1 — Sentence interaction

Ready presentation:

```text
The dog can run.
```

Interaction:

1. Words settle into their normal sentence positions in reading order.
2. Ending punctuation receives one short arrival motion.
3. Capitalization and punctuation remain visible at all times.
4. The sentence does not animate while the learner reads or records.
5. After scoring, reliable alignment may provide sequential word feedback.
6. Punctuation may respond once after completion but must not become a separate
   question or mission.

The interaction layer must not introduce sentence building, word selection, or
punctuation quizzes into this mission.

### Lesson 5, Mission 1 — Short-passage interaction

Continuous single-page example:

```text
┌────────────────────────────────┐
│ Lena has a small plant.        │
│ She waters it every morning.   │
│ The plant grows by the window. │
│                                │
│             1 of 1             │
└────────────────────────────────┘
```

Interaction:

- Keep all authored words in their original order inside one passage card.
- Refit the passage after viewport changes and after the authored reading font
  finishes loading. The fitting calculation must use the actual available text
  area rather than a passage-length guess.
- Keep the circular recorder and its fake-shadow depth fully inside a protected
  recorder panel at every supported portrait viewport.
- Never add passage pagination or an internal scrollbar to solve this layout.
- The current line may receive a learner-selected focus rail, but the system
  must not auto-advance or reveal correctness from unconfirmed live ASR.
- After result processing, post-reading feedback may identify confirmed
  transcript alignment without adding fluency or timing scores.

### Lesson 6, Mission 1 — Five-question choice comprehension interaction

This mission contains five sentence-and-answer items. Each item uses a different
sentence and one question type.

| Item | Token | Displayed sentence | Clara's audio question | Authored correct choice |
|---:|---|---|---|---|
| 1 | `WHO?` | Lena waters the plant. | Who waters the plant? | Lena |
| 2 | `WHAT?` | Marco carries a red bag. | What does Marco carry? | a red bag; red bag; bag |
| 3 | `WHERE?` | The children read in the library. | Where do the children read? | in the library; the library; library |
| 4 | `WHEN?` | Ana eats breakfast in the morning. | When does Ana eat breakfast? | in the morning; the morning; morning |
| 5 | `WHY?` | Ben wears boots because it is raining. | Why does Ben wear boots? | because it is raining; it is raining; raining |

Ready screen example:

```text
┌────────────────────────────────┐
│              WHO?              │
│                                │
│     Lena waters the plant.     │
│                                │
│ [A] Lena        [B] Rosa       │
│ [C] Mia         [D] Ben        │
│                                │
│ Clara       Submit       Skip  │
└────────────────────────────────┘
```

Interaction:

1. The sentence enters and becomes still.
2. The short question-type token appears.
3. Clara asks the complete question through audio.
4. The question is not duplicated as a permanent dialogue paragraph.
5. Four authored choices use the shared assessment comprehension grid.
6. The learner selects one choice and explicitly submits it.
7. Laravel compares only the server-owned choice key; Lesson 6 never calls Mu.
8. Before the first submission, no word or choice is emphasized in a way that
   reveals the answer.
9. After committed correct lesson feedback, the answer-bearing part may be
   raised or highlighted.
10. A wrong choice remains practice evidence, is disabled, and activates
    authored Clara support without advancing the item.
11. First support reminds the learner what the 5W family asks for. Second
    support highlights the authored evidence span. Third support demonstrates
    the correct choice.
12. Even after demonstration, the learner must select and submit the correct
    choice. Skip remains available and resolves the item without a false score.

Post-result example:

```text
[Lena] waters the plant.
```

The assessment remains neutral and must not inherit these lesson-only feedback
states. Only the base four-choice component is shared.

## Lesson Motivation Without Images

Permitted engagement patterns include:

- Solid confetti rectangles and circles after meaningful completion.
- Expanding vector rings.
- Letter particles and text assembly.
- Raised progress segments.
- Completed words pressing into the activity surface like stamps.
- Mission headings changing from outline emphasis to filled emphasis.
- Ma'am Clara's expressions, speech, and short audio reactions.
- Text-based progress such as `■ ■ ■ □ □`.
- Subtle microphone-energy bars that indicate captured volume only.

Feedback must reward continued participation without disguising incorrect,
skipped, or technical results as correct.

## Assessment Integrity And Interaction

The assessment can feel playful and tactile, but its active item presentation
must remain neutral.

During an active assessment:

- Do not reveal per-item correctness.
- Do not provide hints after a response.
- Do not pronounce a target letter or word unless the fixed assessment
  protocol explicitly requires it.
- The isolated-letter pronunciation table defines sound only; its existence
  never authorizes assessment playback.
- Do not add bonus items, lives, streaks, penalties, or adaptive content outside
  the documented branch.
- Do not celebrate an individual answer in a way that reveals its score.
- Keep processing and item replacement neutral, then advance automatically after
  the committed response is confirmed.
- Show score-based celebration only at documented result pages.

### Unscored microphone orientation

Before the first scored speech task, provide one neutral microphone check that
uses the same Record, Stop, Play, Retry, and Submit controls.

The orientation:

- Is not an assessment item.
- Does not use a scored assessment letter or word.
- Does not affect any score or branch.
- Confirms that the microphone receives usable audio.
- Teaches the control flow before Task 1A begins.
- A successful Submit opens Task 1A automatically without Continue or Next.

### Task 1A — Letter Pronunciation

- Preserve the fixed ten letter items.
- Display the letter pair as large raised typography.
- Use the shared recording review and Submit flow.
- Save the final scoring response internally.
- After neutral persistence, open the next letter automatically.
- Do not show `CORRECT`, `UNCERTAIN`, or another decision during the active
  task.

### Task 2A — Rhyme Check

- Preserve ten Yes-or-No rhyme-decision items.
- Display the two words as large text units.
- Use two large tactile Yes and No controls.
- Permit changing the selection before Submit.
- Submit atomically commits the selected choice and opens the next rhyme item.
- Lock both choices during persistence.
- Do not reveal a separate Next action for Task 2A.
- Do not add recording or ASR.
- Do not make a word playable or pronounce it unless the assessment protocol
  explicitly requires that support.

### Task 2B — Word Pronunciation

- Preserve the fixed ten word items.
- Display one large isolated target word.
- The word may assemble before the activity becomes ready.
- Use the shared recording review and Submit flow.
- Do not reveal whether the scoring transcript matched during the active task.
- After neutral persistence, open the next word or Part 1 Results automatically.

### Part 1 Score result

The Part 1 Score page appears only at the point defined by the Assessment
Guide.

It may use:

- Score digits assembling into place.
- Task segments locking together.
- Clara's appropriate expression and audio.
- Solid vector particles.
- A large Continue button.

It must not imply that the score selected a lesson route.

### Task 3A — Passage Reading

- Preserve two fixed story choices, one confirmed selection per assessment run,
  one administered passage, and the 60-second cap.
- Present the story-choice screen after Part 1 results and before Task 3A.
- A confirmed story choice persists through refresh and resume.
- Divide the passage into authored visual pages when necessary.
- Do not remove, reorder, summarize, or alter passage words during pagination.
- The timer continues across page turns.
- Page controls do not stop or restart recording.
- The timer may use a calm solid segmented ring around the recorder.
- Avoid flashing countdowns, ticking sounds, and punitive final-seconds motion.
- Stop recording at the documented limit.
- Use the passage review exception defined in this document.
- Keep the word-level story review hidden until the Passage Results stage.
- On Passage Results, highlight only authoritative substitutions and
  omissions; accepted equivalences remain visually correct, and the browser
  never recalculates alignment or speed.
- `Next` advances to the original Part 2 Results score composition. That score
  page contains no full passage and retains `Continue` as its primary action.

### Task 3B — Comprehension Check

Assessment Task 3B is a fixed evaluation and remains distinct from the
supported four-choice comprehension practice in Lesson 6.

- Preserve five questions.
- Load only the five questions linked to the confirmed story. The shared CSV
  contains ten authored questions total, five per story.
- Cover Who, What, Where, When, and Why exactly once for the selected story.
- Preserve four answer choices per question.
- Use no recording and no ASR.
- Render answer choices as raised text tiles.
- Use one column or a `2 × 2` grid depending on available width and text length.
- Permit changing the selected answer before Submit.
- Submit commits one selected choice.
- Do not reveal the correct choice during the active task.
- After neutral persistence, open the next question or final result automatically.
- Display the comprehension result only at the documented result stage.

## Explicit Assessment Interaction Examples

These screens define how the fixed assessment feels interactive without
changing its content or revealing correctness.

Every scored-item wireframe in this section inherits the canonical assessment
action dock even when its compact text row labels only the primary action:
Submit occupies the upper 80%, Skip occupies the lower 20%, and either action
advances automatically after persistence without showing Next. Skip additionally
commits zero. The microphone orientation, story selection, and result screens
remain non-skippable.

### Assessment orientation screen

Before scored items:

```text
┌────────────────────────────────┐
│        MICROPHONE CHECK        │
│                                │
│              ◯                 │
│            RECORD              │
│                                │
│ Clara                 Continue │
└────────────────────────────────┘
```

Visible behavior:

1. Clara asks the learner to say a neutral word such as `ready`.
2. The microphone-energy bars respond to volume.
3. The learner can Stop, Play, and Retry using the real controls.
4. The system checks only whether usable audio was captured.
5. No Nu or Mu assessment score is produced.
6. A successful Submit opens Task 1A immediately.

The orientation must not reuse a scored target or teach an assessment answer.

### Task 1A screen — Letter Pronunciation

```text
┌────────────────────────────────┐
│ LETTERS              Item 3/10 │
│ ■ ■ □ □ □ □ □ □ □ □           │
├────────────────────────────────┤
│                                │
│             C c                │
│                                │
│              ◯                 │
│            RECORD              │
│                                │
│ Clara       Submit             │
└────────────────────────────────┘
```

Interaction sequence:

```text
letter tiles settle
    -> Record
    -> Stop
    -> Play
    -> Retry? or Submit
    -> neutral Processing
    -> progress segment fills
    -> next letter
```

After processing, both tiles may depress neutrally. They must use the same
animation regardless of `CORRECT`, `UNCERTAIN`, `INCORRECT`, `SILENCE`,
`UNKNOWN`, or `UNUSABLE_AUDIO`. Browser-side capture failure may be corrected
before Submit. Once the scoring response is committed, its Assessment Guide
score applies without revealing the decision during the active task.
Before submission, Skip follows the shared zero-score automatic-advance rule.

### Task 2A screen — Rhyme Check

Ready:

```text
┌────────────────────────────────┐
│ RHYME CHECK          Item 4/10 │
│ ■ ■ ■ □ □ □ □ □ □ □           │
├────────────────────────────────┤
│                                │
│        [ cat ]   [ hat ]       │
│                                │
│       [ YES ]     [ NO ]       │
│                                │
│ Clara       Submit             │
└────────────────────────────────┘
```

Selected but unsubmitted:

```text
[ YES — selected ]     [ NO ]

          [ SUBMIT ]
```

Rules:

- The two words enter from opposite horizontal directions and settle.
- Yes and No use equal size and emphasis before selection.
- The chosen answer depresses and remains selected.
- Selecting the other answer replaces the selection.
- Neither selection creates a score before Submit.
- After Submit, both choices lock and the navigation slot stays empty while the
  response saves.
- The same neutral lock animation is used for correct and incorrect choices.
- After persistence, the progress segment fills and the next rhyme pair replaces
  the current pair directly. Next never appears for Task 2A.
- Before submission, Skip follows the shared zero-score automatic-advance rule.

### Task 2B screen — Word Pronunciation

```text
┌────────────────────────────────┐
│ WORDS                Item 6/10 │
│ ■ ■ ■ ■ ■ □ □ □ □ □           │
├────────────────────────────────┤
│                                │
│            garden              │
│                                │
│              ▶                 │
│             PLAY               │
│                                │
│ Clara       Submit             │
└────────────────────────────────┘
```

- The target word may assemble before Ready.
- It must remain still during recording and playback.
- Retry and Submit follow the shared short-recording rules.
- The committed result advances to the next word or Part 1 Results without a
  separate Next action.
- No matching or non-matching transcript is revealed while Task 2B remains
  active.
- Before submission, Skip follows the shared zero-score automatic-advance rule.

### Part 1 Score screen

The score page may be celebratory because its timing is explicitly defined by
the Assessment Guide.

```text
┌────────────────────────────────┐
│          PART 1 SCORE          │
│                                │
│             24                 │
│            ───                 │
│             30                 │
│                                │
│       LIGHT REFRESHER          │
│                                │
│ Clara              Continue → │
└────────────────────────────────┘
```

Explicit animation:

1. Three solid task segments enter and lock together.
2. The score digits count or assemble into their final value.
3. The level label appears only after the score settles.
4. Clara uses the approved supportive result expression and audio.
5. Solid particles may play once.
6. Continue appears after the result is readable.

The page must not display a different required lesson path based on the score.

### Task 3 story-choice screen

After an eligible Part 1 result and before Task 3A:

- Show exactly two large raised story-title choices.
- Do not show a story illustration or reveal the comprehension questions.
- Permit changing the highlighted choice before confirmation.
- Use one shared primary confirmation button after a choice is highlighted.
- Finish the button press animation before persisting and advancing.
- After confirmation, persist the permanent story key and do not offer a reroll
  during the assessment run.
- Refresh and resume restore the confirmed story or the unconfirmed choice state
  from Laravel.
- Story selection is unscored and does not count as an assessment item.

### Task 3A screen — Passage Reading

Before recording:

```text
┌────────────────────────────────┐
│ PASSAGE              Page 1/3 │
├────────────────────────────────┤
│ Lena has a small plant.        │
│ She waters it every morning.   │
│                                │
│              Next page ›       │
├────────────────────────────────┤
│              ◯                 │
│            RECORD              │
│          60 seconds            │
│                                │
│ Clara       Submit             │
└────────────────────────────────┘
```

During recording:

```text
│ Lena has a small plant.        │
│ She waters it every morning.   │
│                                │
│ ‹ Previous          Next page ›│
│                                │
│              ◉                 │
│             STOP               │
│          42 seconds            │
```

Interaction rules:

- Starting recording starts the one continuous 60-second limit.
- Page buttons remain available while recording.
- Page changes never restart, pause, or extend the timer.
- The displayed page uses a short replacement motion and immediately becomes
  still.
- The timer uses calm solid segments and does not flash.
- At 60 seconds, recording stops automatically.
- Submit may be used after capture without forcing a full one-minute playback.
- Play remains available for optional review.
- Retry appears only after playback and restarts the entire passage attempt.
- A successful Submit opens Task 3B automatically after neutral persistence.
- Before submission, Skip follows the shared zero-score automatic-advance rule.
  It discards any unsubmitted local capture and advances to Task 3B without an
  intermediate Next button.
- Unread words remain governed by the Assessment Guide.

### Task 3B screen — Four-choice comprehension

Mobile one-column form when answer text requires width:

```text
┌────────────────────────────────┐
│ COMPREHENSION        Question 2/5│
├────────────────────────────────┤
│ Where did Lena place the plant?│
│                                │
│ [A] Near the door              │
│ [B] By the window              │
│ [C] On the table               │
│ [D] In the garden              │
│                                │
│ Clara       Submit             │
└────────────────────────────────┘
```

Wider `2 × 2` form:

```text
┌────────────────┬────────────────┐
│ [A] Near door  │ [B] By window  │
├────────────────┼────────────────┤
│ [C] On table   │ [D] In garden  │
└────────────────┴────────────────┘
```

Interaction:

1. The question and all four choices become visible before selection.
2. Selecting a choice raises or depresses it into a stable selected state.
3. The learner may change the selected choice before Submit.
4. Submit is disabled until one choice is selected.
5. Submit commits the selected choice and locks all four tiles during processing.
6. The processing state reveals neither correctness nor the correct tile.
7. The progress segment fills after persistence.
8. The next question or final result opens automatically without Next.
9. No recorder or Retry is shown; Skip remains available until the selected
   response is committed.

### Neutral assessment result behavior

Every assessment item uses the same post-submit presentation regardless of
correctness:

```text
Submitted
    -> neutral Processing
    -> progress segment fills
    -> next item or documented result
```

Correctness-specific Clara expressions, colors, sounds, particles, word
highlights, and messages are prohibited before the documented score or profile
page. This prevents the interaction layer from becoming item-by-item coaching.

## Assessment Progress And Branching Presentation

Show current-task progress rather than promising every possible later task:

```text
Item 4 of 10
■ ■ ■ □ □ □ □ □ □ □
```

The assessment branch after Task 1A remains internal. A learner on the valid
low Task 1A branch must not be shown inaccessible future Task 3 activities as
unfinished obligations.

Task-boundary transitions may use Clara, text blocks, and solid particles with
neutral messages such as:

```text
Letters complete
Preparing the next activity…
```

## Data And Analytics Events

Interaction events must remain distinct from scoring results.

Recommended recording events:

```text
recording_started
recording_stopped
recording_captured
recording_playback_started
recording_playback_completed
learner_review_retry
recording_submitted
scoring_completed
technical_failure
```

Recommended lesson navigation events:

```text
item_presented
item_skipped
item_completed
next_selected
```

Assessment skips emit `assessment_item_skipped` separately from incorrect
submitted answers. The persisted zero affects the assessment score, while the
distinct skipped response type preserves the omission for later analysis.

Lesson skip analytics should retain:

- Learner and content identifiers through internal keys.
- Lesson, mission, item, and content-version identifiers.
- Whether the learner recorded before skipping.
- Number of unsubmitted review retries.
- Time spent before skipping.
- Instruction replay count.
- Whether the exit was learner-selected or technical.

System Learner `KW000` and all Page Portal runs are excluded from learner,
lesson, assessment, retry, and skip analytics.

### Skip analytics and instructional suggestions

Dashboards must use skip rate rather than raw skip count:

```text
skip rate = unique skipped presentations / unique item presentations
```

This prevents an early or frequently presented lesson from appearing worse only
because more learners encountered it.

Teacher analytics should show:

- Most-skipped lessons, missions, and items for the Teacher's assigned class.
- Skipped before recording versus skipped after an unsubmitted recording.
- Review-retry counts separately from skips.
- Technical failures separately from learner-selected skips.
- Grade, content version, presentation count, and unique learner count.

System Administrator analytics should show the same measures globally and allow
drill-down by grade, lesson, mission, item, and content version.

An instructional suggestion may appear only when:

- The sample meets a configured minimum number of real learners and
  presentations.
- The high rate is not explained primarily by technical failures.
- The content carries a curated skill tag and recommendation mapping.
- The dashboard presents the result as a suggestion, not a diagnosis.

Example:

```text
Observed: Lesson 6 comprehension has a high verified skip rate.
Suggested response: Reinforce literal comprehension through guided,
face-to-face practice.
```

Suggestions must be defined from reviewed instructional mappings. They must not
be improvised solely from a lesson number or generated from raw skip counts.

## Shared Component Responsibilities

The implementation should converge on shared typed foundations rather than
lesson-specific copies.

Recommended responsibilities:

```text
LearningActivityShell
├── safe viewport and no-scroll layout
├── header and progress
├── Clara lower-left or desktop guide region
└── stable action geometry

TextItemStage
├── letter, word, phrase, sentence, and passage variants
├── kinetic typography states
└── reduced-motion behavior

RecordingReviewControl
├── Record, Stop, Play, Pause, and Play again
├── Retry
├── microphone energy
└── local recording lifecycle

SubmissionControl
├── explicit Submit
├── tactile commit delay
└── busy and failure states

DynamicAdvanceControl
├── lesson Skip
├── empty processing state
└── Next after committed result

AssessmentChoiceGroup
├── Yes or No
├── four-choice comprehension
└── pre-submit selection replacement

PagedReadingStage
├── authored passage pages
├── page position
└── continuous recording and timer ownership
```

One state machine should own the current item interaction. Independent buttons
must not infer submission state from unrelated local flags.

## Accessibility And Independent Use

- All controls use semantic buttons and expose changing accessible names.
- Visible icons accompany text or accessible labels.
- A visually small `Retry?` control retains a comfortable touch target.
- Keyboard focus is always visible.
- No instruction depends on hover.
- No result depends on color alone.
- Clara's instruction can be replayed without resetting the item.
- The default activity stage remains free of a permanent dialogue transcript.
- An accessibility transcript or equivalent may be exposed through an explicit
  accessibility mode without changing the default activity geometry.
- Reduced-motion mode preserves every state and result without kinetic effects.
- Audio failure provides a clear technical recovery and is never scored as a
  learner skip.

## Prohibited Practices

Do not:

- Add instructional images to lessons.
- Scroll lesson or assessment activity pages.
- Place Clara at the middle-right on mobile.
- Move the central recorder between states.
- Upload or score audio merely because recording stopped.
- Replace Submit with ambiguous wording.
- Show Skip after an answer is submitted.
- Show Skip on the assessment microphone orientation or result pages.
- Show a learner-controlled Next action on an active assessment item.
- Record a skipped lesson item as zero.
- Treat a technical failure as a learner skip.
- Reveal assessment item correctness before the appropriate result page.
- Add assessment hints through animation, audio, emphasis, or replay behavior.
- Shrink passage typography below its approved range to avoid authored pages.
- Animate displayed text continuously while the learner reads or records.
- Duplicate the same recorder or navigation logic independently across lessons
  and assessments.

## Acceptance Criteria

The lesson and assessment interaction system is complete only when:

1. The activity shell fits every mandatory viewport without page scrolling,
   clipping, overlap, or horizontal overflow.
2. Clara remains visible in her approved square crop and occupies the required
   mobile lower-left position.
3. The circular recorder is the largest speech-activity control and remains
   centered through every state.
4. The displayed item is the second-largest element.
5. Record, Stop, Play, Pause, Retry, Submit, Processing, Result, Skip,
   assessment automatic advance, and lesson Next states follow this document
   exactly.
6. Lesson and assessment Skip rules are enforced by state, not visual
   convention alone; assessment skips persist as distinct zero-score responses.
7. Discarded review recordings do not become scored attempts.
8. Lesson content uses no instructional images.
9. Typography interaction remains still during active reading and recording.
10. Assessment presentation preserves every fixed task, item count, branch,
    timer, and scoring rule.
11. Component tests cover every interaction-state transition.
12. API tests prove that Retry, Submit, Skip, technical failure, result,
    assessment automatic advance, and lesson Next persist the correct distinct
    states.
13. Playwright validates mobile-small, mobile-primary, mobile-large, tablet,
    desktop, and desktop-large layouts.
14. Reduced-motion, keyboard, touch, audio failure, save failure, and refreshed
    resume behavior are verified.
