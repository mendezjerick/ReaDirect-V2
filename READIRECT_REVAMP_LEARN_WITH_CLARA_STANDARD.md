# ReaDirect Revamp: Learn with Ma'am Clara Standard

This document is the source of truth for the learner-dashboard feature named
`Learn with Ma'am Clara`.

The experience is a listening-only companion class. It is separate from the
required recording lesson, assessment scoring, and academic mastery evidence.

## Current Implementation Status

Development is intentionally paused after the Chapter 1 companion-class
foundation. The implemented Chapter 1 remains available to learners, and a
new short-class menu now establishes the future entry point for five reading
skill sessions. The sessions behind that menu remain deferred while
higher-priority learner-flow work continues.

When development resumes, continue from the persisted scene contract,
published-only speech catalog, and shared SVG vignette foundation documented
here. Do not replace or duplicate these systems.

## Dashboard Placement

The learner dashboard order is mandatory:

```text
Required reading activity
Games
Learn with Ma'am Clara
Achievements
```

The feature is always available to an authenticated learner, including before
the Diagnostic Assessment. It is optional and does not change assessment
content, scores, or progression.

- `Start Class` opens the short-class menu.
- The menu offers exactly `Letters`, `Words`, `Phrases`, `Sentences`, and
  `Comprehension`. It does not offer a passage class.
- Choosing a skill currently confirms the selection without starting or
  changing any persisted session. Future slices may connect each choice to one
  complete short listening session.
- `Continue Class` resumes a listening checkpoint.
- `Listen Again` restarts a completed chapter without clearing heard-story
  history.

## Experience Identity

Ma'am Clara must feel like a present, consistent person rather than a sequence
of instructional recordings.

The approved structure combines:

- Short teaching moments
- Time-aware greetings
- Brief personal stories
- Harmless humor and mistakes
- Optional two-choice reactions
- Natural pauses
- Remembered authored stories

This is not an unrestricted chatbot. Every spoken line and every branch is
authored, reviewed, pre-generated, published, and seeded.

## Lesson 1 Scope

Lesson 1 contains three listening chapters:

1. Big and small letters
2. First letters in words
3. Missing first letters

Each chapter has exactly five short explanations:

```text
Chapter 1: 5 letter-pair explanations
Chapter 2: 5 first-letter explanations
Chapter 3: 5 missing-letter explanations
Total:    15 teaching explanations
```

The complete experience uses fifteen unique letter targets. Teaching language
must use the shared isolated-letter pronunciation map.

## Chapter Rhythm

The default chapter rhythm is:

```text
Time-aware or returning greeting
        |
        v
Two short teaching items
        |
        v
One Clara story
        |
        v
Optional two-button reaction
        |
        v
Three short teaching items
        |
        v
Short chapter closing
```

The feature should be mostly Clara's stories and presence. Teaching
explanations must be brief and must not become lectures.

Teaching explanations form a continuous listening sequence. After one
explanation finishes, the next teaching item begins automatically following a
short natural pause. Replay and Continue buttons must not interrupt these
explanations.

The paired mid-session choice buttons are reserved for authored story moments.
After a learner chooses `Tell me more`, Clara continues the remaining story
parts automatically. `Keep learning` returns directly to the teaching
sequence.

Stories must have an actual beginning, development, and ending. A complete
optional continuation should normally span several published clips and
approximately 30 to 40 seconds of calm speech. Story audio must use deliberate
child-friendly pacing and must not sound like a rapid instruction clip.

Every story scene must replace plain title-only item content with a small
authored vector vignette synchronized at the scene level:

- Opening establishes the story's visual problem.
- Optional detail visibly develops it.
- Closing resolves it.
- A return scene clears the story and restores the teaching target.

The vignette must use React, Motion for React, inline SVG, shared theme
variables, and the existing item frame. It must not introduce raster story
artwork, a new animation package, or a second canvas runtime. Reduced-motion
mode presents the final static composition for each scene.

After every story path, including `Keep learning`, Clara must speak an explicit
published bridge such as `Now, let us go back to our letters` before the next
teaching explanation begins.

## Initial Story Families

The approved initial story families are:

- A funny classroom moment
- Clara learning to write her name
- A missing pencil or notebook
- A rainy reading day
- A harmless mistake Clara corrected
- A small animal interrupting her reading

Stories may rotate across visits. An unheard story is preferred, and the same
story must not repeat twice in succession.

Clara may refer back to a story only when the learner has actually heard it.

## Interface

The page must reuse the shared intro composition:

- Non-scrollable learner viewport
- The approved Clara crop and global interaction behavior
- The learner's active themed background
- The teaching item in the original ReaDirect title position above Clara
- Shared buttons and design tokens
- No recorder and no ASR

The short-class menu is a separate responsive learner page that:

- Keeps the approved Clara runtime visibly present.
- Reuses the learner background, surfaces, depth, type, and focus tokens.
- Provides a dashboard-return control.
- Presents the five skill choices as real buttons with a visible selected
  state and polite confirmation.
- Does not create listening checkpoints, academic evidence, or progression
  changes until a complete session is implemented behind a choice.

Speech starts only after Clara's model is ready.

During a teaching item, the item display supplies the visual interaction:

- Every active item is displayed inside a shared vector-like frame with fake
  panel depth so it remains readable over themed backgrounds.
- Letter pairs are the dominant visual element. They must use most of the
  frame's safe interior instead of appearing as ordinary heading text.
- Letter pairs move gently together.
- A first letter receives a brief highlight or bounce.
- A missing letter fills the blank after Clara reveals it.
- Reduced-motion mode uses opacity and color changes instead of movement.

## Time-Aware Greeting Contract

The learner device's local hour selects a published greeting:

| Local time | Greeting period |
| --- | --- |
| 05:00-11:59 | Morning |
| 12:00-16:59 | Afternoon |
| 17:00-04:59 | Evening |

Time-aware lines remain pre-generated. The browser selects a speech key; it
never submits the current time as unrestricted TTS text.

## Speech Delivery

The activity speech key is:

```text
learn-with-clara-lesson-1
```

Its published group is:

```text
learn-with-clara-lesson-1-fixed
```

The activity declares no runtime Vox profiles. Missing or modified published
audio must fail closed with a retry state and must never fall back to runtime
generation.

The current greeting keys are:

```text
learn-with-clara-lesson-1-greeting-morning
learn-with-clara-lesson-1-greeting-afternoon
learn-with-clara-lesson-1-greeting-evening
```

## Progress and Safety Boundaries

Listening checkpoints must remain separate from:

- Assessment scores
- Lesson response outcomes
- Mastery evidence
- Required lesson unlocking
- Achievement unlock criteria
- Teacher performance analytics

Ma'am Clara must not:

- Guilt a learner for leaving
- Encourage secrecy
- Ask for private personal information
- Claim to be human
- Create emotional dependency
- Pretend to remember unstored events

Her role is warm, playful, professionally safe teacher companionship.

## Implementation Slices

### Slice 1: Entry and presence foundation

Implemented:

- Dashboard card between Games and Achievements
- Always-available authenticated learner entry
- Responsive short-class menu with Letters, Words, Phrases, Sentences, and
  Comprehension choices
- Lesson 1 learner route
- Shared intro-stage composition
- Morning, afternoon, and evening greeting selection
- Three approved greeting WAVs in the published catalog
- Clara-ready speech gate
- Published-only activity manifest

### Slice 2: Chapter 1 companion class

Implemented:

- Server-authoritative Chapter 1 scene state machine
- Five letter-pair moments using `A` through `E`
- Clara learning to write her name story
- Optional `Tell me more` and `Keep learning` branch
- Current and possible-next published-clip prefetch
- Server-side checkpoint persistence
- Refresh and return resume behavior
- Automatic explanation-to-explanation progression
- Story-only `Tell me more` and `Keep learning` controls
- A published return-to-letters bridge on every story exit
- Four responsive SVG vignette states for the story opening, detail, closing,
  and return
- Reduced-motion static story compositions
- `Listen Again` and dashboard-return completion controls
- Separate listening completion with no academic side effects

Deferred slices add Chapters 2 and 3, story rotation, returning greetings, and
the final companion-class completion state.
