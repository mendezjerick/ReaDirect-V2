# ReaDirect Lightweight Mode And Hybrid TTS Standard

## Status And Authority

This document is the source of truth and implementation plan for ReaDirect's
system-wide lightweight learner experience, Clara renderer selection, hybrid
speech boundary, published-only speech option, speech-asset preservation, and
speech retirement rules.

Implementation status as of 2026-08-01: catalog authoring, staged generation,
technical publication, and controlled retirement are complete. The active
`clara-sh-v1` catalog now has 300 published rows: 53 new WAVs and two
archive-backed replacements were promoted without regenerating the other 245
approved WAVs. The System
Administrator lightweight-mode contract is also complete: its additive setting
migration, atomic authenticated update, audit event, and Agent Settings UI are
in place. The shared learner renderer now resolves the effective setting before
mounting Clara and can use the approved theme-specific static portrait without
loading Live2D. The server speech policy is also in place: terminal outcomes
are published in every mode, hybrid speech is restricted to a first-clear-
incorrect diagnosis, and published-only mode never prepares or calls runtime
speech.

This standard complements:

- `READIRECT_REVAMP_CLARA_VOX_TTS_SPECIFICATION.md` for VoxCPM2 operation,
  publication, storage, warm-up, and playback safety.
- `READIRECT_REVAMP_CLARA_LIVE2D_SPECIFICATION.md` for Clara's approved model,
  crop, palette, static portraits, and renderer behavior.
- `READIRECT_REVAMP_AI_TEACHER_STANDARD.md` for the bounded teaching loop,
  evidence safety, and outcome meanings.
- `READIRECT_REVAMP_LESSON_AND_ASSESSMENT_INTERACTION_STANDARD.md` for learner
  controls, layout, and speech sequencing.
- `READIRECT_REVAMP_LESSON_STRUCTURE_STANDARD.md` for lesson persistence,
  attempts, support states, and scoring.
- `READIRECT_REVAMP_USER_ROLES_AND_DASHBOARDS.md` for System Administrator
  authority, confirmation, and audit behavior.

If another document describes terminal lesson feedback as runtime speech,
describes the Lesson 2 word demonstration as runtime-only, or prohibits the
approved static Clara portrait from learner runtime, this document supersedes
that statement for the lightweight-mode implementation.

## Purpose

The lightweight feature reduces browser rendering cost and optional runtime
speech generation without changing assessment validity, lesson scoring, ASR,
learner evidence, progression, or content selection.

The default ReaDirect experience remains:

```text
Live2D Clara
    +
hybrid speech: published WAVs plus bounded live feedback
```

The System Administrator may enable lightweight mode and independently select:

```text
Static Clara portrait
Published-only speech
```

The term `published-only speech` is mandatory in code, documentation, and UI.
Do not call it `purely generated speech`, because that can be mistaken for live
runtime generation. Published speech means a pre-generated, reviewed, cataloged
WAV delivered by Laravel without calling VoxCPM2 during the learner request.

## Non-Negotiable Boundaries

1. Lightweight mode is off by default.
2. Enabling lightweight mode initially selects both lightweight options.
3. The two options remain independently selectable.
4. Lightweight mode must not change ASR routing, equivalences, scoring,
   attempts, lesson outcomes, progress, achievements, or assessment behavior.
5. The browser must not choose unrestricted speech text or private audio paths.
6. Published-only mode must not warm or call runtime VoxCPM2.
7. Terminal lesson feedback is published in both standard hybrid mode and
   published-only mode.
8. Live TTS is reserved for the first clear incorrect response when a
   learner-specific diagnosis adds teaching value.
9. Every deterministic demonstration is published in both modes.
10. Existing approved WAVs must be reused unless this document explicitly
    marks their wording or role for replacement.
11. Published catalog files and runtime cache files are different asset
    classes and must never be deleted by the same broad operation.
12. A setting change must not interrupt audio that is already playing. It takes
    effect on the next learner page or activity load.

## System Setting Contract

Use one atomic JSON system setting rather than three unrelated rows:

```json
{
  "enabled": false,
  "static_clara": true,
  "published_speech_only": true
}
```

Recommended stable setting key:

```text
learner.lightweight_mode
```

Effective behavior is resolved as:

| Master | Static Clara | Published-only speech | Effective learner experience |
| --- | ---: | ---: | --- |
| Off | remembered | remembered | Live2D plus hybrid speech |
| On | On | On | Static Clara plus published-only speech |
| On | On | Off | Static Clara plus hybrid speech |
| On | Off | On | Live2D plus published-only speech |

The child values remain stored while the master is off. Re-enabling the master
restores the last explicit choices. On a new installation both child values
default to `true`, so the first activation enables the complete lightweight
experience.

If an administrator turns both child switches off, the UI should turn the
master off in the same confirmed atomic update. An enabled master with no
effective optimization is prohibited because it communicates a false state.

## System Administrator Experience

The controls belong in System Administrator `Agent settings`, because they own
Clara's display and speech-delivery policy. The existing AI Services noise-
reduction control remains separate because it owns ASR preprocessing rather
than Clara presentation.

Required UI order:

```text
Lightweight learner experience                         [Off]

When On:
    Static Clara portrait                              [On]
    Published-only speech                              [On]

Effective mode:
    Static portrait + published-only speech
```

Rules:

- The master switch uses the shared staff switch design.
- Enabling or disabling the master requires confirmation.
- A child change updates the complete configuration atomically and requires
  the same explicit confirmation pattern.
- The confirmation states that the change applies on the next learner page or
  activity load and does not rewrite existing learner evidence.
- Every effective change writes one staff audit event with previous and new
  values.
- The authenticated settings response reports stored values and effective
  display and speech modes.
- The learner-facing read contract exposes only the effective modes and a
  revision identifier. It must not expose audit metadata or private TTS paths.

Recommended effective response:

```json
{
  "revision": "2026-08-01T05:00:00Z",
  "display_mode": "static",
  "speech_mode": "published_only"
}
```

Allowed values are:

```text
display_mode: live2d | static
speech_mode: hybrid | published_only
```

## Clara Renderer Contract

### Standard renderer

When `display_mode = live2d`, the existing shared `ClaraStage` remains the
authority. It loads the Cubism model, texture, physics, expressions, pointer
tracking, teaching gaze, speaking overlay, and approved reveal transition.

### Static renderer

When `display_mode = static`, the shared `ClaraStage` must:

1. Render the approved theme-specific PNG inside the same square stage.
2. Preserve the same container, crop boundary, accessible name, center point,
   responsive sizing, and Clara-owned layout space.
3. Report `ready` only after the selected image decodes successfully.
4. Report `error` if the image cannot load.
5. Avoid rendering or importing `ClaraLive2DCanvas`.
6. Avoid downloading the Cubism model, 8192 texture, physics, shaders, and
   renderer chunks.
7. Keep speech playback gated on the mounted Clara stage's `ready` state.
8. Represent speaking without fake mouth animation. Audio may play while the
   portrait remains visually static.

Approved browser portraits already present:

| Theme | Browser asset | Current verified size |
| --- | --- | ---: |
| Default theme | `apps/web/public/assets/live2d/clara/stills/clara-default.png` | 245,285 bytes |
| Theme 2 | `apps/web/public/assets/live2d/clara/stills/clara-t2.png` | 160,991 bytes |

These assets must be reused. Do not regenerate them merely to implement the
mode switch. Regeneration is allowed only after an approved crop, palette,
model, or theme change and must follow the Live2D specification's deterministic
capture procedure.

The current Live2D texture is 13,258,373 bytes and the compiled model is
1,353,472 bytes before renderer code and supporting assets. Static mode must
provide a real loading reduction by preventing those requests, not merely
covering an already loaded canvas with a PNG.

## Speech Mode Contract

### Published speech

Published speech is the default for every line known before a learner responds:

- Introductions and mission instructions
- Item and ordinal cues
- Technical retry language
- General incorrect-response fallback lines
- Clues and scaffold instructions
- Letter, word, phrase, and sentence demonstrations
- Independent, supported, demonstrated, not-yet, unscorable, and skipped
  terminal outcomes
- Passage review, comprehension support, results, and completions

### Live speech in hybrid mode

Live TTS is allowed only for the first `CLEAR_INCORRECT` academic response in
Lessons 1 through 4, and only when the committed response evidence supports a
learner-specific correction.

Approved examples:

```text
Letter:   I heard bee.
Word:     I heard bat.
Phrase:   You missed the word red.
Sentence: I heard cat instead of cap.
```

The variable value must come from the server-committed final transcript or
server-owned deterministic alignment evidence. The browser supplies neither
the diagnosis nor the inserted word.

After the live diagnostic line, Clara plays the existing published clue. If
runtime synthesis fails, hybrid mode uses the corresponding published general
incorrect line and continues. A live-speech failure must not trap the learner
or convert a clear academic result into a technical audio failure.

### Published-only mode

When `speech_mode = published_only`:

- activity manifests expose no runtime profiles;
- activity readiness never calls Vox `/warmup`;
- support presentations contain only published speech keys;
- the lesson-feedback and runtime-demonstration routes are not called;
- the first clear incorrect response uses a unit-specific general line, then
  the same published clue used by hybrid mode;
- all demonstrations and terminal results use the same approved published
  catalog as hybrid mode.

## Bounded Lesson Speech Sequence

The teaching state machine and outcome meanings do not change.

| Teaching moment | Hybrid mode | Published-only mode |
| --- | --- | --- |
| Item introduction | Published | Published |
| Attempt 1 correct | Published independent-success result | Same |
| Attempt 1 clear incorrect | Live specific diagnosis, then published clue | Published general incorrect line, then published clue |
| Attempt 1 unclear | Published technical retry | Same |
| Attempt 2 correct | Published supported-success result | Same |
| Attempt 2 clear incorrect | Published target demonstration | Same |
| Echo correct | Published demonstrated-correct result | Same |
| Echo incorrect | Published not-yet-correct result | Same |
| Final unscorable audio | Published unscorable result | Same |
| Skip | Published skip acknowledgement when the lesson owns one | Same |
| Lesson completion | Published | Published |

Terminal feedback must never prepend a runtime `You said ...` line. Correct and
incorrect terminal outcomes remain distinct:

```text
INDEPENDENT_CORRECT -> published independent-success line
SUPPORTED_CORRECT   -> published supported-success line
DEMONSTRATED        -> published correct-echo line
NOT_YET_CORRECT     -> published incorrect-echo line
UNSCORABLE_AUDIO    -> published unscorable line
SKIPPED             -> published skip line when configured
```

## Published Speech Preservation Inventory

### Verified pre-publication baseline

The 2026-08-01 inventory resolved the configured catalog through the same
families used by `TtsSpeechCatalogSeeder` and checked the private catalog disk.

```text
Configured published lines: 247
Configured WAV files found:  247
Missing configured WAVs:       0
Configured WAV bytes:      91,203,188
Physical catalog WAVs:            261
Unreferenced catalog WAVs:         14
Unreferenced WAV bytes:     7,984,828
All physical catalog bytes: 99,188,016
Published voice: clara-sh-v1
```

The 247 configured files were the active published inventory before this
migration. The 14 additional physical WAVs were not configured speech lines and
remain explicitly classified for removal below; they must not be counted as
reusable published content.

Current family counts:

| Catalog family | Existing lines | Preservation decision |
| --- | ---: | --- |
| Lesson Intro | 1 | Reuse |
| Part 1 assessment | 32 | Reuse all |
| Part 2 assessment | 13 | Reuse all |
| Assessment completion variants | 2 | Reuse both |
| Lesson 1 | 51 | Reuse 50; replace the demonstrated-correct WAV under the same key |
| Lesson 2 | 19 | Reuse 18; replace the demonstrated-correct WAV under the same key |
| Lesson 3 | 33 | Reuse all |
| Lesson 4 | 33 | Reuse all |
| Lesson 5 | 9 | Reuse all |
| Lesson 6 | 47 | Reuse all |
| Learn with Ma'am Clara letters | 7 | Reuse all |

The exact existing speech-key, text, reference-role, and storage-path authority
remains `apps/api/config/speech.php`. Publication integrity remains enforced by
`apps/api/database/seeders/TtsSpeechCatalogSeeder.php`, the private WAV, and its
stored SHA-256. This table is a preservation ledger, not a replacement for
those machine-readable authorities.

### Existing families that already fit the new plan

Reuse without regeneration:

- All assessment, result, completion, and comprehension lines
- Lesson Intro
- Lesson 1 mission cues, ordinal cues, technical retry, three clues, all 26
  A-Z demonstrations, independent success, supported success, not-yet, and
  unscorable feedback
- Lesson 2 mission cues, ordinal cues, technical retry, two clues, independent
  success, supported success, not-yet, and unscorable feedback
- All 20 Lesson 3 phrase demonstrations and all other Lesson 3 published lines
- All 20 Lesson 4 sentence demonstrations and all other Lesson 4 published
  lines
- Every Lesson 5 passage-review line
- Every Lesson 6 question, clue, guided response, demonstration, correct
  response, and completion line
- All seven Learn with Ma'am Clara Letter Parade lines

Do not regenerate a reusable family simply because the lightweight feature is
being added. Generation tooling must default to missing or explicitly selected
keys, and `--force` requires an intentional reviewed replacement operation.

### Non-regeneration guard

Before generating any catalog line, the publication command must resolve its
configured key, approved text, reference role, expected private path, existing
database metadata, file existence, and SHA-256. Then it must follow this rule:

```text
existing published row + existing WAV + matching checksum -> skip generation
missing approved new key                              -> generation allow-list
approved replacement key                             -> replacement allow-list
any other mismatch                                   -> fail for human review
```

For this migration, the generation allow-list contains exactly the 53 keys
defined below and the replacement allow-list contains exactly the two
demonstrated-success keys. A broad whole-catalog regeneration command is
prohibited.

## Required New Published Audio

### General first-incorrect fallbacks

Add four published result lines:

| New speech key | Approved text |
| --- | --- |
| `lesson-1-feedback-incorrect-first` | That letter was not quite right. Let us try again. |
| `lesson-2-feedback-incorrect-first` | That word was not quite right. Let us try again. |
| `lesson-3-feedback-incorrect-first` | That phrase was not quite right. Let us try again. |
| `lesson-4-feedback-incorrect-first` | That sentence was not quite right. Let us try again. |

Published-only mode uses these lines before the existing clue. Hybrid mode uses
them only when the first-response live diagnostic is unavailable.

### Lesson 2 target-word demonstrations

Generate one published demonstration for each of the 49 active Version 1 word
targets in `content/lessons/v1/lesson-2-word-items.csv`.

Stable key pattern:

```text
lesson-2-word-demo-{word-slug}
```

Approved text template:

```text
The word is {spoken_target}. Listen: {spoken_target}. Now you try.
```

Approved path pattern:

```text
lessons/lesson-2/support/demonstrations/lesson-2-word-demo-{word-slug}.wav
```

The server maps the immutable run snapshot's content ID to this key. The
browser must not construct the key from displayed text or submit the target.

### Catalog publication record

The completed technical publication was:

```text
Pre-publication configured catalog:       247
General first-incorrect fallback lines:     4
Lesson 2 word demonstrations:              49
Published catalog rows after promotion:   300
Physical active catalog WAVs:              314
Explicitly unreferenced WAVs retained:      14
Replacement WAV archives retained:           2
```

All 55 staged WAVs passed structural validation and were checksum-verified at
promotion. The publication script retains the two superseded demonstrated-echo
WAVs under the private archive. A manual listening review remains a required
content-QA record; it does not authorize broad regeneration or alter the
published-file preservation rules.

## Required Replacement And Retirement

### Published WAV replacements

The current demonstrated-result wording for Lessons 1 and 2 is ambiguous about
whether the echo was correct. Keep the stable keys but replace their approved
text and WAVs:

| Existing key | Required replacement text |
| --- | --- |
| `lesson-1-feedback-demonstrated` | That is correct. You said the letter correctly with me. |
| `lesson-2-feedback-demonstrated` | That is correct. You read the word correctly with me. |

The previous WAV versions are retired publication artifacts. They must not
remain addressable by the active published voice after the new voice catalog is
committed. Preserve a review/archive copy only when required by the publication
audit process; otherwise remove it after checksum-backed replacement is
verified.

Lesson 3 and Lesson 4 demonstrated-result lines already state that the response
was correct and remain reusable. Existing not-yet lines remain the incorrect
echo result and must not be reused for a correct echo.

### Runtime generated-speech cache

The current active Vox dynamic cache contained 451 WAVs totaling 183,771,524
bytes during the 2026-08-01 inventory. Cache filenames are content digests and
do not provide a reliable policy classification. Some may contain the terminal
`You said ...` speech that the new standard prohibits.

The nested `regenerated-backups` folder contained 2 additional WAVs totaling
1,751,128 bytes. The separate reference cache contained 5 files totaling
3,025,116 bytes. Backup outputs are review artifacts; reference-cache files are
conditioning inputs and must be preserved for effective hybrid mode.

During implementation rollout:

1. Stop the TTS service.
2. Clear active files under `services/tts/storage/cache/` after recording the
   pre-removal count and total size.
3. Do not clear `services/tts/storage/reference-cache/`; hybrid first-incorrect
   feedback still needs the approved conditioned references.
4. Do not delete anything under the private published catalog path.
5. Restart and warm only the runtime profiles required by effective hybrid
   activities.
6. Confirm that new cache entries can arise only from approved first-incorrect
   response feedback.

Development comparison outputs, regeneration backups, and `.runtime` review
folders are not learner runtime authority. They may be archived or removed in a
separate explicit cleanup after active catalog and review requirements are
confirmed. They must not be mistaken for published files.

### Orphaned catalog cleanup

The physical catalog currently contains these 14 WAVs that are absent from the
247-line configuration and active publication contract:

| Unreferenced private path | Bytes | Decision |
| --- | ---: | --- |
| `sh/learn-with-clara/lesson-1/chapter-1/completion/chapter-1-complete.wav` | 399,404 | Remove |
| `sh/learn-with-clara/lesson-1/chapter-1/items/pair-a.wav` | 460,844 | Remove |
| `sh/learn-with-clara/lesson-1/chapter-1/items/pair-b.wav` | 491,564 | Remove |
| `sh/learn-with-clara/lesson-1/chapter-1/items/pair-c.wav` | 491,564 | Remove |
| `sh/learn-with-clara/lesson-1/chapter-1/items/pair-d.wav` | 537,644 | Remove |
| `sh/learn-with-clara/lesson-1/chapter-1/items/pair-e.wav` | 445,484 | Remove |
| `sh/learn-with-clara/lesson-1/chapter-1/story/name-close.wav` | 1,005,360 | Remove |
| `sh/learn-with-clara/lesson-1/chapter-1/story/name-detail.wav` | 902,222 | Remove |
| `sh/learn-with-clara/lesson-1/chapter-1/story/name-opening.wav` | 1,090,024 | Remove |
| `sh/learn-with-clara/lesson-1/chapter-1/story/name-return.wav` | 424,862 | Remove |
| `sh/learn-with-clara/lesson-1/greetings/afternoon.wav` | 384,044 | Remove |
| `sh/learn-with-clara/lesson-1/greetings/evening.wav` | 430,124 | Remove |
| `sh/learn-with-clara/lesson-1/greetings/morning.wav` | 537,644 | Remove |
| `sh/unresolved/5080a21209d15dac3b565f18d1a9478d9dd973b9c04e5dfb94b225dcdea6032d.wav` | 384,044 | Remove |

These are retired Learn with Ma'am Clara chapter/greeting outputs plus one
unresolved generation artifact. They must not be regenerated, imported into the
new catalog, or retained as active learner speech. Their deletion belongs to
Slice 5 and occurs only after a fresh configuration-to-disk comparison confirms
they remain unreferenced.

After the new 300-line catalog is validated:

- retire database rows no longer present in the approved configuration;
- list private WAVs not referenced by an active or retained voice version;
- remove only reviewed orphan files with an explicit path list;
- never delete by recursively targeting the catalog root;
- retain the active 300 approved files and any deliberately retained prior
  voice version required for rollback.

### Completed retirement record

The guarded 2026-08-01 retirement audit resolved 300 configured WAVs and 314
physical catalog WAVs before removal. Its orphan set exactly matched the 14
reviewed paths above, with no missing configured file and no unexpected
orphan. Those 14 files were removed by explicit path. The post-removal audit
now resolves 300 configured and 300 physical WAVs with no orphan.

The active runtime cache was cleared only after the local TTS service was
stopped: 505 runtime-cache files were removed. The five conditioned files in
`services/tts/storage/reference-cache/` were preserved. The TTS service was
then restarted; new runtime cache files can arise only from the approved
hybrid first-incorrect path.

## Implementation Plan

### Slice 1: Persistent setting and governance

Status: complete. The additive migration inserts `learner.lightweight_mode`;
the settings service also safely resolves the default for a database that has
not yet run the migration.

- Authenticated System Administrator read/update contracts resolve stored and
  effective values.
- Full configuration validation, the setting update, and its audit event share
  one transaction.
- Agent Settings has the master, two conditional child switches, an explicit
  confirmation, and the effective-mode summary.

### Permanent database safety guard

This work and all later ReaDirect work use additive migrations only.
`migrate:fresh`, `migrate:refresh`, and `db:wipe` are permanently blocked by the
application console guard in every environment, including local development.
Tests may rebuild only their isolated in-memory SQLite schema through the test
base class. No implementation or recovery procedure may introduce a bypass.

### Slice 2: Learner runtime setting delivery

Status: delivery contract complete; renderer consumption remains Slice 3.

- The authenticated read-only learner-experience endpoint returns only effective
  display and speech modes plus a revision, for standard and Page Portal
  Learner sessions.
- It omits stored child switches, audit metadata, and private TTS paths.
- The browser helper is ready for the shared renderer to consume before its
  Live2D import in Slice 3.
- Settings continue to take effect on the next learner page or activity load.

### Slice 3: Static Clara renderer

Status: complete.

- The shared `ClaraStage` waits for the authenticated effective-mode contract
  before mounting a learner renderer. The public landing intro uses an
  equivalent mode-only contract, then selects the existing theme-specific PNG
  for static mode.
- The learner Dashboard offers a device-local renderer choice with Dynamic on
  the left and Static on the right. It initially reflects the effective system
  setting, then persists the learner's local renderer choice without calling
  the API or changing the server-owned speech mode.
- Static Clara shares the existing square stage, readiness callback,
  accessibility status, crop, and reveal behavior.
- Static mode does not mount the lazy Live2D canvas or expose its model path;
  the renderer, model, texture, and shader requests therefore cannot start.
- `LearnerExperienceProvider` resolves this endpoint for every learner
  navigation. While a new activity is resolving, it exposes no renderer mode,
  preventing a prior activity's Live2D mode from mounting briefly.

### Slice 4: Server speech policy

Status: complete.

- `LearnerSpeechPolicy` resolves the effective global speech mode without
  changing scoring, evidence, attempts, progression, or lesson-state rules.
- Terminal support presentations use their distinct published outcome lines in
  both modes. Hybrid runtime diagnosis is exposed only during the first clear
  incorrect response before its published clue.
- If hybrid synthesis fails, the endpoint streams the matching approved
  first-incorrect line as `published-fallback` instead of returning dynamic
  audio or changing learner state.
- Published-only activity manifests contain no runtime profiles, readiness
  makes no warm-up request, and direct feedback or word-demonstration runtime
  calls are rejected defensively.

### Slice 5: Catalog authoring and retirement

Status: complete.

- Four first-incorrect definitions and 49 approved Lesson 2 word
  demonstrations were added; the two ambiguous demonstrated-correct lines
  were replaced under their stable keys.
- Only the approved 53 new WAVs and two reviewed replacements were generated
  and checksum-published. The active catalog count changed to 300 at
  publication.
- The guarded audit script removed the reviewed 14-path orphan set only after
  a fresh configuration-to-disk comparison. The runtime cache reset preserved
  conditioned references and did not touch the published catalog.

### Slice 6: End-to-end verification

Status: complete.

- The learner settings contract is covered for all four effective
  renderer/speech combinations, including the off-state normalization to
  Live2D plus hybrid speech. It exposes no private setting fields.
- System Administrator authorization, confirmation, atomicity, audit
  metadata, first activation, and remembered child settings are covered by
  the focused feature suite.
- The speech-policy, activity-manifest, and lesson tests verify published
  terminal outcomes, the one permitted hybrid first-incorrect diagnosis,
  published Vox fallback, and zero runtime synthesis or warm-up in
  published-only mode.
- Renderer tests verify that static Clara does not mount the Live2D runtime.
  Browser routing tests also cover the shared learner shell after the new
  settings provider was introduced.
- Final checks passed on 2026-08-01: API focused verification (37 tests,
  2,356 assertions), complete API suite (233 tests, 4,850 assertions), web
  suite (71 files, 199 tests), web typecheck, API Pint, and `git diff --check`.

## Acceptance Criteria

The feature is complete only when:

- lightweight mode is off by default;
- first activation selects static Clara and published-only speech;
- each child mode works independently;
- all setting changes are confirmed, atomic, and audited;
- static Clara uses the existing theme PNGs and avoids Live2D downloads;
- hybrid live TTS occurs only for first clear incorrect personalized feedback;
- published-only mode makes zero warm-up and synthesis requests;
- all terminal outcomes use distinct published lines in both speech modes;
- correct echo and incorrect echo never share the same line;
- all 247 baseline WAVs have an explicit reuse or replacement decision;
- exactly 53 new WAVs and two reviewed replacements are generated;
- the active target catalog contains 300 valid published lines;
- the 14 explicitly listed unreferenced catalog WAVs are removed only after a
  fresh reference check;
- obsolete dynamic terminal cache audio has been removed through a controlled
  cache reset;
- no learner evidence, scoring, ASR, progression, or assessment contract has
  changed;
- all related source-of-truth documents point to this standard.

## Change Control

Any future change to the master setting, child option semantics, effective-mode
matrix, static Clara assets, live-speech boundary, terminal outcome wording,
published catalog count, or retirement procedure must update this document in
the same change.

Do not regenerate approved speech merely because an implementation script can
do so. Generation is a content-publication action, not a routine build step.
