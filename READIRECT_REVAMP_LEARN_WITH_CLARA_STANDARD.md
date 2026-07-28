# ReaDirect Revamp: Learn with Ma'am Clara Standard

This document is the source of truth for the optional learner-dashboard
feature named `Learn with Ma'am Clara`.

## Product Boundary

`Learn with Ma'am Clara` is a set of short listening-and-speaking practice
classes. It is separate from required lessons, assessments, academic mastery,
and achievement progression.

It is always available to an authenticated learner, including before the
Diagnostic Assessment. Its checkpoints must never change assessment scores,
required-lesson progression, mastery evidence, achievements, or teacher
analytics.

The experience does not use ASR, a recorder, or response scoring. Clara models
a target, the learner says it aloud without recording, and the learner chooses
when to continue.

## Dashboard and Menu

The learner dashboard order is:

```text
Required reading activity
Games
Learn with Ma'am Clara
Achievements
```

The dashboard action opens `/learner/learn-with-clara`. The menu contains
exactly:

```text
Letters
Words
Phrases
Sentences
Comprehension
```

There is no passage choice. Only `Letters` currently opens a class. The
remaining choices must not create checkpoints until their complete sessions
are implemented.

## The Little-Letter Parade

The Letters choice opens:

```text
/learner/learn-with-clara/letters
```

The retired `/learner/learn-with-clara/lesson-1` route and its name-writing
story interface must not be restored.

The implemented Letters class is one continuous story named
`The Little-Letter Parade`. Uppercase A-E are ready to march, but a playful
gust scatters their lowercase partners. Clara and the learner visit five
animated parade stops to reunite each pair:

```text
Apple Arch    -> A a -> ay
Balloon Float -> B b -> bee
Curved Banner -> C c -> see
Drum Cart     -> D d -> dee
Final Wagon   -> E e -> ee
```

Each stop follows this learner-controlled rhythm:

```text
Clara narrates the next parade problem
        |
        v
Learner finds and taps the matching lowercase letter
        |
        v
The correct pair visibly joins the accumulating parade
        |
        v
Clara models the shared letter name
        |
        v
Learner says the name during an explicit "Your turn" pause
        |
        v
Learner chooses Next Stop
```

An incorrect lowercase choice gently wiggles and stays in the scene. It does
not create a score, attempt, or penalty. Clara gives a short visual-text hint
and waits for another choice. Only the correct visual choice moves the story
forward.

The story must not auto-advance through a learner search or echo pause. Short
narration and animation beats may play automatically inside the active scene,
but every meaningful transition remains learner controlled.

After E, `Next Stop` becomes `Start the Parade`. Completion animates all five
pairs marching together and offers:

- `Play Again`, which restarts at the story opening.
- `Back to Classes`, which returns to the Clara menu.

## Interface and Animation

The page reuses the learner's active theme, shared surfaces, fake depth,
typography, buttons, focus treatment, and approved Clara runtime.

Its responsive composition contains:

- A compact header with a back control and A-E story progress.
- A Clara teacher surface with live narration status and the current action.
- A lesson surface containing one continuous animated parade world.
- A welcome visual, story opening, five find scenes, five teaching scenes, and
  a parade finale.

The parade world is authored inline SVG driven by Motion for React. It
includes animated wind, bunting, clouds, hills, five distinct parade props,
uppercase characters, interactive lowercase choices, an accumulating row of
found pairs, and a confetti finale. Clara's expression changes across story,
search, demonstration, and celebration states.

The uppercase and lowercase forms remain visually dominant during each
teaching beat. The pronunciation badge appears when Clara models the shared
letter name.

Reduced-motion mode shows the final static composition of each scene without
depending on movement for meaning.

At the priority `360 x 740` viewport, the active story, Clara, learner action,
and interactive choices must remain visible without page scrolling. Tablet
and desktop layouts place Clara beside the story while retaining the same
hierarchy and controls.

## Audio Activation

The welcome screen does not autoplay speech. It presents the server-backed
Start or Continue action immediately after the checkpoint loads. That explicit
learner action unlocks browser audio before the story opening or resumed scene,
so direct navigation and refresh cannot trap the learner behind an autoplay
restriction.

Speech waits for Clara's model-ready signal. The client may prefetch only the
server-declared possible-next speech key.

## Published Speech

The activity manifest key is:

```text
learn-with-clara-letters
```

Its published group is:

```text
learn-with-clara-letters-fixed
```

It declares no runtime Vox profiles. Every line is an authored, approved,
published WAV. A missing or invalid published file fails closed with a retry
state and never falls through to runtime generation.

The class uses these twelve published speech keys:

```text
learn-with-clara-letters-parade-opening
learn-with-clara-letters-find-a
learn-with-clara-letters-find-b
learn-with-clara-letters-find-c
learn-with-clara-letters-find-d
learn-with-clara-letters-find-e
learn-with-clara-letters-parade-finale
lesson-1-letter-demo-A
lesson-1-letter-demo-B
lesson-1-letter-demo-C
lesson-1-letter-demo-D
lesson-1-letter-demo-E
```

The seven dedicated story clips live under:

```text
apps/api/storage/app/private/tts/catalog/sh/learn-with-clara/letters/parade/
```

The five demonstrations are intentionally reused from the approved required
Lesson 1 catalog because they already model each letter with:

```text
The letter name is {spoken form}. Listen: {spoken form}. Now you try.
```

Browser code requests stable speech keys only. It does not submit synthesis
text or storage paths.

## Server Checkpoint Contract

Laravel owns the story sequence and validates every transition. The learner
web client uses:

```text
POST /api/learners/learn-with-clara/letters/start
POST /api/learners/learn-with-clara/letters/advance
POST /api/learners/learn-with-clara/letters/restart
```

The persisted checkpoint uses:

```text
lesson_key:  letters
chapter_key: letter-names-a-e
status:      active | letters-complete
```

The scene sequence is:

```text
parade-opening
  -> find-a -> teach-a
  -> find-b -> teach-b
  -> find-c -> teach-c
  -> find-d -> teach-d
  -> find-e -> teach-e
  -> parade-finale
```

`advance` accepts only the current server scene plus the controlled
`continue` action. A stale scene is rejected. Refreshing or returning resumes
the saved story scene. Restarting increments the visit count and returns to
`parade-opening`.

Retired `letters-a` through `letters-complete` drill checkpoints are
normalized to `parade-opening` on their next start request.

The existing `learner_clara_listening_sessions` table remains separate from
required lesson runs and assessment attempts. Historical story fields may
remain nullable for schema compatibility. The current parade is one authored
path rather than an optional branch.

## Clara Safety

Clara must remain warm, playful, and professionally safe. She must not:

- Guilt a learner for leaving.
- Encourage secrecy.
- Ask for private personal information.
- Claim to be human.
- Create emotional dependency.
- Pretend to remember unstored events.

Future Words, Phrases, Sentences, and Comprehension classes must follow this
same optional, published-speech, learner-controlled boundary unless an
approved source-of-truth slice explicitly changes it.
