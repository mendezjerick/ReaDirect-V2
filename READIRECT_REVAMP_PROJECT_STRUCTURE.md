# ReaDirect Revamp Project Structure

This document defines the required repository and asset structure for ReaDirect-V2.

```text
ReaDirect-V2/
|-- apps/
|   |-- games/
|   |   |-- lobby/
|   |   |   |-- src/
|   |   |   |-- tests/
|   |   |   |-- package.json
|   |   |   \-- README.md
|   |   |-- game-one/
|   |   |   |-- src/
|   |   |   |-- backend/
|   |   |   |-- assets/
|   |   |   |-- tests/
|   |   |   |-- GAME_DESIGN.md
|   |   |   |-- composer.json
|   |   |   \-- package.json
|   |   \-- game-two/
|   |       |-- src/
|   |       |-- backend/
|   |       |-- assets/
|   |       |-- tests/
|   |       |-- GAME_DESIGN.md
|   |       |-- composer.json
|   |       \-- package.json
|   |
|   |-- web/
|   |   |-- public/
|   |   |   \-- assets/
|   |   |       |-- live2d/
|   |   |       |-- backgrounds/
|   |   |       |-- illustrations/
|   |   |       |-- icons/
|   |   |       |-- audio/
|   |   |       |   |-- music/
|   |   |       |   |-- sound-effects/
|   |   |       |   |-- prerecorded-voice/
|   |   |       |   \-- phonemes/
|   |   |       |-- videos/
|   |   |       |-- animations/
|   |   |       \-- fonts/
|   |   |-- src/
|   |   |-- tests/
|   |   |-- package.json
|   |   |-- vite.config.ts
|   |   \-- tsconfig.json
|   |
|   \-- api/
|       |-- app/
|       |-- bootstrap/
|       |-- config/
|       |-- database/
|       |-- public/
|       |-- routes/
|       |-- storage/
|       |-- tests/
|       |-- composer.json
|       |-- composer.lock
|       |-- .rr.yaml
|       \-- artisan
|
|-- services/
|   |-- asr/
|   |   |-- app/
|   |   |-- configs/
|   |   |-- fixtures/
|   |   |   |-- content/
|   |   |   |-- distractors/
|   |   |   |   |-- fptn/
|   |   |   |   \-- silence/
|   |   |   \-- letters/
|   |   |-- scripts/
|   |   |-- tests/
|   |   |-- main.py
|   |   |-- pyproject.toml
|   |   |-- uv.lock
|   |   \-- .env.example
|   |
|   \-- tts/
|       |-- app/
|       |-- configs/
|       |-- scripts/
|       |-- storage/
|       |   \-- cache/
|       |-- tests/
|       |-- main.py
|       |-- pyproject.toml
|       |-- uv.lock
|       \-- .env.example
|
|-- assets/
|   |-- live2d/
|   |   |-- source/
|   |   |-- runtime/
|   |   \-- licenses/
|   |
|   |-- backgrounds/
|   |   |-- source/
|   |   \-- exported/
|   |
|   |-- illustrations/
|   |   |-- stories/
|   |   |-- lessons/
|   |   |-- vocabulary/
|   |   |-- rewards/
|   |   \-- source/
|   |
|   |-- icons/
|   |   |-- source/
|   |   \-- exported/
|   |
|   |-- audio/
|   |   |-- music/
|   |   |-- sound-effects/
|   |   |-- prerecorded-voice/
|   |   |-- phonemes/
|   |   |-- tts-samples/
|   |   \-- voice-references/
|   |
|   |-- videos/
|   |   |-- source/
|   |   \-- exported/
|   |
|   |-- animations/
|   |-- fonts/
|   |-- licenses/
|   \-- asset-manifest.json
|
|-- content/
|   |-- README.md
|   |-- lexicon/
|   |-- assessments/
|   \-- lessons/
|
|-- packages/
|   |-- shared-types/
|   |   \-- package.json
|   \-- design-tokens/
|       \-- package.json
|
|-- infrastructure/
|-- scripts/
|   |-- bootstrap.ps1
|   \-- setup-live2d.ps1
|-- tests/
|   |-- end-to-end/
|   |-- integration/
|   |-- performance/
|   \-- fixtures/
|
|-- docs/
|   |-- requirements/
|   |-- architecture/
|   |-- content/
|   |-- character/
|   |-- voice/
|   \-- testing/
|
|-- READIRECT_REVAMP_ASR_GUIDE.md
|-- READIRECT_REVAMP_ASSESSMENT_GUIDE.md
|-- READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md
|-- READIRECT_REVAMP_AUDIO_PREPROCESSING_AND_RECORDING_STANDARD.md
|-- READIRECT_REVAMP_CONTENT_CSV_AND_SELECTION_STANDARD.md
|-- READIRECT_REVAMP_FRONTEND_DESIGN_SYSTEM.md
|-- READIRECT_REVAMP_GAME_DATABASE_AND_API_STANDARD.md
|-- READIRECT_REVAMP_GAME_MODULE_STANDARD.md
|-- READIRECT_REVAMP_GAME_TECH_STACK.md
|-- READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md
|-- READIRECT_REVAMP_PROJECT_STRUCTURE.md
|-- READIRECT_REVAMP_TECH_STACK.md
|-- READIRECT_REVAMP_USER_ROLES_AND_DASHBOARDS.md
|-- READIRECT_REVAMP_VIEWPORT_STANDARD.md
|-- README.md
|-- package.json
|-- pnpm-lock.yaml
|-- pnpm-workspace.yaml
|-- .node-version
|-- .npmrc
|-- .gitignore
\-- .env.example
```

## Main Applications

### apps/games

Contains the owner-controlled game lobby and at most two independently developed
game modules. These folders are source packages compiled into apps/web and,
when accepted, locally loaded Laravel packages used by apps/api. They are not
separate deployments, databases, schemas, domains, iframes, or microfrontends.

The required slots are:

~~~text
apps/games/
|-- lobby/
|-- game-one/
\-- game-two/
~~~

The lobby owns game selection, game-username onboarding, separate learner and
guest leaderboard views, and the owner-controlled game registry. It is an entry
surface for queued game-achievement presentation, but it consumes the central
achievement feature defined by
`READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md`; it does not own a private
queue or overlay.

Each contributor repository root must match its assigned game-one or game-two
directory exactly. Each game contains its React frontend, selected KAPLAY or
PixiJS runtime, Laravel package, migrations, tests, runtime assets, editable
asset sources, licenses, and completed GAME_DESIGN.md.

Every game is governed by:

- READIRECT_REVAMP_GAME_TECH_STACK.md
- READIRECT_REVAMP_GAME_MODULE_STANDARD.md
- READIRECT_REVAMP_GAME_DATABASE_AND_API_STANDARD.md

### `apps/web`

Contains the React learner application, teacher interface, Live2D character integration, PixiJS effects, lesson screens, assessment screens, microphone controls, and frontend API communication.

The System Administrator frontend also owns the IsoLetter Sandbox, True
Sandbox, and Equivalence Book workspaces. True Sandbox consumes its selectable
assessment and lesson speech-target catalog through Laravel; React must never
open or parse root content CSV files.

Cross-feature achievement gallery, queue, and unlock presentation components
belong under `apps/web/src/features/achievements/`. The Learner Dashboard and
Game Lobby both compose that shared feature.

The learner Part 1 assessment frontend belongs under
`apps/web/src/features/assessment/`. `AssessmentPartOnePage.tsx` composes the
shared non-scrollable shell, Clara, orientation, Task 1A, Task 2A, Task 2B, and
Part 1 Results. `assessmentApi.ts` owns only the authenticated Laravel contract,
`useAudioRecorder.ts` owns browser recording and review lifecycle, and
`assessment.css` owns the responsive activity/result layout. Future Part 2
pages must reuse this boundary rather than copy its recorder or shell.

### `apps/api`

Contains the Laravel application responsible for authentication, learner and teacher records, lessons, assessment results, scoring records, progress, PostgreSQL operations, and communication with the ASR and TTS services.

Learner Part 1 orchestration is owned by
`LearnerAssessmentPartOneController`, `AssessmentContentCatalog`, and
`LearnerAssessmentAsr`. The `assessment_runs` and `assessment_responses` tables
are the PostgreSQL source of truth for resume state and committed Part 1
evidence. Browser code never supplies expected answers, branch decisions,
scores, or result labels.

Normal Part 1 Submit endpoints persist the active response and leave navigation
to the separate `advance` endpoint. The dedicated `skip` endpoint is the only
exception: it atomically stores `response_type = skipped`, `decision = SKIPPED`,
and `score = 0`, then moves to the next item or completes the current task. This
keeps refresh and retry behavior deterministic during automatic Skip advances.

Laravel owns the admin speech-content catalog boundary and Equivalence Book
management API. It exposes only the active Mu-spoken targets approved for True
Sandbox and keeps choice-only, question-only, and isolated-letter content out of
that catalog.

## Authored Content CSVs

The root `content/` directory contains versioned, reviewed assessment forms,
lesson pools, and shared lexicon CSV sources. Its schemas, validation,
publication, and learner-selection rules are defined by
`READIRECT_REVAMP_CONTENT_CSV_AND_SELECTION_STANDARD.md`.

Laravel imports approved versions into PostgreSQL. The root CSV files are not
served directly to the browser. `docs/content/` remains explanatory
documentation and must not be used as the runtime content source.

## Speech Services

### `services/asr`

Contains the standalone FastAPI speech-recognition and pronunciation-processing service.

Its tracked `app/` package owns shared audio decoding and quality analysis, Mu
transcription, and the deterministic Nu letter resolver. Its local-only
`model_artifacts/` directory owns only the selected Mu runtime files and must
remain Git-ignored. Laravel is the application-facing proxy for authenticated
or staff-scoped speech requests; browser features must not depend on direct
FastAPI access.

Its `fixtures/content/` tree holds the voice-keyed `millie2`, `millie2-plus`,
`jz`, and `shai` controlled positive speech fixtures and their shared resumable
audit manifest. `fixtures/letters/` holds the separate isolated-letter fixture
sets. `fixtures/distractors/fptn/` and `fixtures/distractors/silence/` hold the
fixed negative evaluation pools. Reproducible assignment and result evidence
belongs in the audit manifests defined by the ASR Guide.

### `services/tts`

Contains the standalone FastAPI voice-generation service and its generated-audio cache.

The service owns one process-wide VoxCPM2 runtime and begins loading it in the
background when FastAPI starts. Activity manifests request only the reference
profiles their controlled dynamic speech can use. The service conditions and
encodes each requested profile once per current reference fingerprint, runs a
disposable generation probe, and retains the resulting Vox prompt cache in
process memory. Concurrent preparation for one profile is single-flight,
generation is serialized around the non-reentrant model, and a dynamic cache
hit still confirms that the required profile is resident. VoxCPM2 is used for
controlled speech publication and unpredictable final-transcript feedback;
fixed learner-flow lines do not call it at runtime.

Laravel is the authenticated browser-facing speech proxy. Published metadata
belongs in `tts_voice_versions` and `tts_speech_lines`, while approved WAVs live
under `apps/api/storage/app/private/tts/catalog/`. The current `clara-sh-v1`
catalog contains Lesson Intro, every fixed Part 1 instruction and ordinal cue,
all fixed Part 2 prompts and questions, the assessment completion line, and
51 fixed Lesson 1 lines, 19 fixed Lesson 2 lines, and 13 fixed companion-class
lines. Its 130 published rows are grouped under
`sh/lesson-intro/`, `sh/part-1/`, `sh/part-2/`, `sh/completion/`, and
`sh/lessons/` for human review. Laravel verifies the catalog status, file
existence, and SHA-256 checksum before returning audio. Browser code must never
send or receive private paths.

Dashboard entry may begin a deduplicated Lesson Intro catalog request during
the shared route transition. The destination reuses that same in-memory browser
promise rather than issuing a duplicate file request.

Shared destination speech preparation belongs under:

```text
apps/web/src/features/clara-audio/activitySpeechReadiness.ts
apps/web/src/features/clara-audio/useActivitySpeechPreparation.ts
```

The first file owns the authenticated manifest/readiness contract and
token-plus-destination single-flight cache. The second owns React lifecycle,
retry invalidation, and runtime-loader visibility. Dashboard, Lesson Intro,
assessment, lesson, refresh, and portal paths must compose these shared modules
rather than create route-specific warm-up clients.

`ActivitySpeechManifestService` resolves server-owned speech requirements from
normal progression, active assessment stage, or active portal target.
`ActivitySpeechPreparationService` validates the complete published group
against one published voice version and verifies private WAV checksums before
calling Vox for manifest-declared profiles. The authenticated
`POST /api/learners/tts/activity-readiness` contract accepts no browser-selected
activity or profile. Assessments therefore validate their published catalog
without contacting Vox. Lesson 1 prepares only `result`; Lesson 2 prepares
`result` and `instruction` for controlled response feedback and word
demonstration.

Deterministic Philippine-English CVC vowel tolerance is owned by:

```text
apps/api/app/Services/CvcVowelEquivalenceCatalog.php
apps/api/database/seeders/CvcVowelEquivalenceSeeder.php
```

The catalog derives item-aware `a/o/u` middle-vowel substitutions from the
active Mu content registry. The seeder persists the derived token aliases,
preserves raw ASR evidence, and is idempotent across content revisions.

System Administrator Page Portals currently resolve persisted Diagnostic,
Lesson 1, and Lesson 2 checkpoints through
`LearnerPortalLaunchService`. Lesson destinations create Kristen's completed
Diagnostic prerequisite and Ready Reader first. Lesson 2 destinations also
create her completed Lesson 1 prerequisite and Letter Leader before the
selected `required-lesson-2` run, then navigate to
`/learner/lessons/2?run={id}`. The learner page reloads that exact snapshot
through the normal Lesson 2 API. Portal-only prerequisites remain in normal
assessment and lesson tables with explicit evidence and no fabricated audio.

Before VoxCPM2 receives a Clara reference, the TTS adapter creates a private
conditioned working copy under `services/tts/storage/reference-cache/`. The
working copy preserves the source sample rate, downmixes all channels to mono,
and attenuates peaks above `-6 dBFS` without boosting quiet references. Original
files in `assets/audio/voice-references/` remain unchanged. The conditioning
version must participate in both reference-cache and generated-speech cache
keys so old stereo or full-scale generations cannot survive a rule change.

Every TTS adapter resolves approved isolated A-Z utterances through
`READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md`. Engine- or
voice-specific workarounds belong inside the TTS adapter/configuration and must
not create competing root pronunciation tables.

The ASR and TTS services must remain separate from the Laravel application and communicate through their defined API endpoints.

## Asset Management

### Master asset library

The top-level `assets/` directory contains original, editable, high-resolution, licensed, or private source files.

Examples include:

- PSD, Krita, SVG, and Cubism source files
- High-resolution backgrounds and illustrations
- Original videos
- Uncompressed music and sound effects
- Voice reference recordings
- Asset licenses and attribution documents

### Browser-ready assets

The `apps/web/public/assets/` directory contains only optimized files that the browser must load during runtime.

Examples include:

- WebP, AVIF, SVG, or optimized PNG images
- OGG, MP3, or WebM audio
- MP4 or WebM videos
- Live2D runtime model files
- Web fonts

The browser-ready assets are derived from the master assets. Editable source files must not be placed in the public directory.

### Self-contained game-module assets

Contributor game repositories are the approved exception to the top-level
master-asset location because their repository roots must merge directly into a
game slot.

~~~text
apps/games/<slot>/
|-- assets/
|   |-- source/
|   \-- licenses/
\-- src/
    \-- assets/
~~~

Editable and production-source game assets belong in assets/source. License and
attribution evidence belongs in assets/licenses. Optimized runtime assets belong
in src/assets and are imported by the module so Vite fingerprints them. Game
assets must not be placed in another game's directories.

## Live2D Assets

```text
assets/live2d/
|-- source/
|-- runtime/
\-- licenses/
```

### `source`

Contains editable character files such as PSD and Cubism project files.

### `runtime`

Contains the exported files required by the web application, including:

```text
main-character/
|-- character.model3.json
|-- character.moc3
|-- character.physics3.json
|-- character.cdi3.json
|-- textures/
|-- expressions/
\-- motions/
```

Runtime model files are copied to:

```text
apps/web/public/assets/live2d/main-character/
```

File names and internal paths must not be changed unless the references inside the Live2D configuration files are updated accordingly.

## Backgrounds and Illustrations

```text
assets/backgrounds/
|-- source/
\-- exported/
```

```text
assets/illustrations/
|-- stories/
|-- lessons/
|-- vocabulary/
|-- rewards/
\-- source/
```

Runtime copies are placed in:

```text
apps/web/public/assets/backgrounds/
apps/web/public/assets/illustrations/
```

## Audio Assets

```text
assets/audio/
|-- music/
|-- sound-effects/
|-- prerecorded-voice/
|-- phonemes/
|-- tts-samples/
\-- voice-references/
```

Background music, sound effects, prerecorded dialogue, phoneme recordings, and TTS voice references must remain in separate directories.

Raw classmate voice recordings and private voice-reference files must not be placed in the public directory.

Generated TTS audio belongs in:

```text
services/tts/storage/cache/
```

Explicitly requested development comparison outputs may be retained under
`assets/audio/tts-samples/` for human review. They are test artifacts, not the
runtime cache and not pronunciation authority.

Temporary learner recordings belong in private backend or ASR storage and must not be publicly accessible.

## Videos

```text
assets/videos/
|-- source/
\-- exported/
```

Only optimized runtime videos are copied to:

```text
apps/web/public/assets/videos/
```

## Naming Convention

All runtime assets must use lowercase kebab-case names.

Examples:

```text
autumn-field-mobile.webp
lesson-complete-celebration.webm
correct-answer-chime.ogg
rosa-and-the-kite-scene-01.webp
```

Do not use ambiguous names such as:

```text
final.png
final2.png
new-background.png
latest-music.mp3
```

## Private and Excluded Files

The following must not be committed to public source control or copied into `apps/web/public/`:

- Environment files containing secrets
- Learner recordings
- Raw voice-talent recordings
- Voice consent documents
- Private voice-reference files
- Generated TTS cache
- Temporary processing files
- Database backups
- Large model weights
- License-restricted editable source files

The `.gitignore` must cover these files and directories where applicable.

## Required Root Structure

The required main divisions are:

```text
ReaDirect-V2/
|-- apps/
|   |-- games/
|   |   |-- lobby/
|   |   |   |-- src/
|   |   |   |-- tests/
|   |   |   |-- package.json
|   |   |   \-- README.md
|   |   |-- game-one/
|   |   |   |-- src/
|   |   |   |-- backend/
|   |   |   |-- assets/
|   |   |   |-- tests/
|   |   |   |-- GAME_DESIGN.md
|   |   |   |-- composer.json
|   |   |   \-- package.json
|   |   \-- game-two/
|   |       |-- src/
|   |       |-- backend/
|   |       |-- assets/
|   |       |-- tests/
|   |       |-- GAME_DESIGN.md
|   |       |-- composer.json
|   |       \-- package.json
|   |
|   |-- web/
|   |   |-- public/
|   |   |   \-- assets/
|   |   |       |-- live2d/
|   |   |       |-- backgrounds/
|   |   |       |-- illustrations/
|   |   |       |-- icons/
|   |   |       |-- audio/
|   |   |       |   |-- music/
|   |   |       |   |-- sound-effects/
|   |   |       |   |-- prerecorded-voice/
|   |   |       |   \-- phonemes/
|   |   |       |-- videos/
|   |   |       |-- animations/
|   |   |       \-- fonts/
|   |   |-- src/
|   |   |-- tests/
|   |   |-- package.json
|   |   |-- vite.config.ts
|   |   \-- tsconfig.json
|   |
|   \-- api/
|       |-- app/
|       |-- bootstrap/
|       |-- config/
|       |-- database/
|       |-- public/
|       |-- routes/
|       |-- storage/
|       |-- tests/
|       |-- composer.json
|       |-- composer.lock
|       |-- .rr.yaml
|       \-- artisan
|
|-- services/
|   |-- asr/
|   |   |-- app/
|   |   |-- configs/
|   |   |-- fixtures/
|   |   |   |-- content/
|   |   |   |-- distractors/
|   |   |   |   |-- fptn/
|   |   |   |   \-- silence/
|   |   |   \-- letters/
|   |   |-- scripts/
|   |   |-- tests/
|   |   |-- main.py
|   |   |-- pyproject.toml
|   |   |-- uv.lock
|   |   \-- .env.example
|   |
|   \-- tts/
|       |-- app/
|       |-- configs/
|       |-- scripts/
|       |-- storage/
|       |   \-- cache/
|       |-- tests/
|       |-- main.py
|       |-- pyproject.toml
|       |-- uv.lock
|       \-- .env.example
|
|-- assets/
|   |-- live2d/
|   |   |-- source/
|   |   |-- runtime/
|   |   \-- licenses/
|   |
|   |-- backgrounds/
|   |   |-- source/
|   |   \-- exported/
|   |
|   |-- illustrations/
|   |   |-- stories/
|   |   |-- lessons/
|   |   |-- vocabulary/
|   |   |-- rewards/
|   |   \-- source/
|   |
|   |-- icons/
|   |   |-- source/
|   |   \-- exported/
|   |
|   |-- audio/
|   |   |-- music/
|   |   |-- sound-effects/
|   |   |-- prerecorded-voice/
|   |   |-- phonemes/
|   |   |-- tts-samples/
|   |   \-- voice-references/
|   |
|   |-- videos/
|   |   |-- source/
|   |   \-- exported/
|   |
|   |-- animations/
|   |-- fonts/
|   |-- licenses/
|   \-- asset-manifest.json
|
|-- content/
|   |-- README.md
|   |-- lexicon/
|   |-- assessments/
|   \-- lessons/
|
|-- packages/
|   |-- shared-types/
|   |   \-- package.json
|   \-- design-tokens/
|       \-- package.json
|
|-- infrastructure/
|-- scripts/
|   |-- bootstrap.ps1
|   \-- setup-live2d.ps1
|-- tests/
|   |-- end-to-end/
|   |-- integration/
|   |-- performance/
|   \-- fixtures/
|
|-- docs/
|   |-- requirements/
|   |-- architecture/
|   |-- content/
|   |-- character/
|   |-- voice/
|   \-- testing/
|
|-- READIRECT_REVAMP_ASR_GUIDE.md
|-- READIRECT_REVAMP_ASSESSMENT_GUIDE.md
|-- READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md
|-- READIRECT_REVAMP_AUDIO_PREPROCESSING_AND_RECORDING_STANDARD.md
|-- READIRECT_REVAMP_CONTENT_CSV_AND_SELECTION_STANDARD.md
|-- READIRECT_REVAMP_FRONTEND_DESIGN_SYSTEM.md
|-- READIRECT_REVAMP_GAME_DATABASE_AND_API_STANDARD.md
|-- READIRECT_REVAMP_GAME_MODULE_STANDARD.md
|-- READIRECT_REVAMP_GAME_TECH_STACK.md
|-- READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md
|-- READIRECT_REVAMP_PROJECT_STRUCTURE.md
|-- READIRECT_REVAMP_TECH_STACK.md
|-- READIRECT_REVAMP_USER_ROLES_AND_DASHBOARDS.md
|-- READIRECT_REVAMP_VIEWPORT_STANDARD.md
|-- README.md
|-- package.json
|-- pnpm-lock.yaml
|-- pnpm-workspace.yaml
|-- .node-version
|-- .npmrc
|-- .gitignore
\-- .env.example
```

New top-level application or service folders must not be introduced without first updating this document.

## Lesson Runtime Placement

Lesson implementations remain inside the existing application boundaries:

```text
apps/api/app/Http/Controllers/LearnerLessonOneController.php
apps/api/app/Http/Controllers/LearnerLessonTwoController.php
apps/api/app/Models/LessonRun.php
apps/api/app/Models/LessonResponse.php
apps/api/app/Models/LessonItemAttempt.php
apps/api/app/Services/LessonContentCatalog.php
apps/api/app/Services/IsolatedLetterPronunciation.php
apps/api/app/Services/LessonOneSupportPresentation.php
apps/api/app/Services/LessonTwoSupportPresentation.php
apps/api/app/Services/LessonTeachingStateMachine.php
apps/api/app/Services/SpeechEquivalenceResolver.php
apps/api/scripts/generate-published-tts-lines.php
apps/api/database/migrations/2026_07_23_000017_add_bounded_support_to_lesson_runtime.php
apps/web/src/features/learner-activity/LearnerActivityShell.tsx
apps/web/src/features/learner-activity/LearnerActivityResult.tsx
apps/web/src/features/lesson/LessonOnePage.tsx
apps/web/src/features/lesson/LessonTwoPage.tsx
apps/web/src/features/lesson/LessonProgressRail.tsx
apps/web/src/features/lesson/lessonApi.ts
apps/web/src/features/lesson/lesson.css
```

Versioned authored lesson items remain under `content/lessons/`. Published
Lesson 1 and Lesson 2 Clara WAV files remain private under the existing TTS
catalog at `apps/api/storage/app/private/tts/catalog/sh/lessons/`. Future
lessons must reuse the generic run, response, target-exposure, recorder, Clara,
button, loader, and transition foundations rather than create parallel
subsystems.

Shared Clara teaching presentation belongs under:

```text
apps/web/src/features/intro/live2d/ClaraPresentation.ts
apps/web/src/features/intro/live2d/ClaraExpressionController.ts
apps/web/src/features/lesson/lessonClaraPresentation.ts
```

`ClaraPresentation.ts` owns the cross-page layered state and teaching-gaze
priority. `ClaraExpressionController.ts` is the only runtime writer for the
approved facial, cue, and celebration parameters.
`lessonClaraPresentation.ts` maps shared lesson evidence and lifecycle states
to that contract. Lessons 1 and 2 both consume this mapping and the same Clara
controller.

`LessonOneSupportPresentation.php` and `LessonTwoSupportPresentation.php` own
their ordered learner-facing support contracts. Each maps persisted teaching
state and the latest immutable attempt to published speech keys, controlled
response-owned runtime speech, display mode, and the post-speech action. React
must consume these payloads and must not reproduce either decision table.

## Learn with Ma'am Clara Placement

The optional listening companion class remains inside the existing Laravel and
learner-web application boundaries:

```text
apps/api/app/Http/Controllers/LearnerClaraListeningController.php
apps/api/app/Models/LearnerClaraListeningSession.php
apps/api/app/Services/LearnWithClaraLessonOneFlow.php
apps/api/database/migrations/2026_07_23_000018_create_learner_clara_listening_sessions_table.php
apps/web/src/features/learn-with-clara/LearnWithClaraLessonOnePage.tsx
apps/web/src/features/learn-with-clara/LearnWithClaraStoryVignette.tsx
apps/web/src/features/learn-with-clara/learnWithClaraApi.ts
apps/web/src/features/learn-with-clara/learnWithClaraGreeting.ts
apps/web/src/features/learn-with-clara/learn-with-clara.css
```

Published companion-class audio remains under
`apps/api/storage/app/private/tts/catalog/sh/learn-with-clara/`. Its listening
checkpoint table is intentionally separate from academic lesson runs,
assessment attempts, mastery records, and progression.
