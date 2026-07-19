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
|-- READIRECT_REVAMP_AUDIO_PREPROCESSING_AND_RECORDING_STANDARD.md
|-- READIRECT_REVAMP_FRONTEND_DESIGN_SYSTEM.md
|-- READIRECT_REVAMP_GAME_DATABASE_AND_API_STANDARD.md
|-- READIRECT_REVAMP_GAME_MODULE_STANDARD.md
|-- READIRECT_REVAMP_GAME_TECH_STACK.md
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
guest leaderboard views, queued achievement presentation, and the
owner-controlled game registry.

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

### `apps/api`

Contains the Laravel application responsible for authentication, learner and teacher records, lessons, assessment results, scoring records, progress, PostgreSQL operations, and communication with the ASR and TTS services.

## Speech Services

### `services/asr`

Contains the standalone FastAPI speech-recognition and pronunciation-processing service.

### `services/tts`

Contains the standalone FastAPI voice-generation service and its generated-audio cache.

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
\-- voice-references/
```

Background music, sound effects, prerecorded dialogue, phoneme recordings, and TTS voice references must remain in separate directories.

Raw classmate voice recordings and private voice-reference files must not be placed in the public directory.

Generated TTS audio belongs in:

```text
services/tts/storage/cache/
```

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
|-- READIRECT_REVAMP_AUDIO_PREPROCESSING_AND_RECORDING_STANDARD.md
|-- READIRECT_REVAMP_FRONTEND_DESIGN_SYSTEM.md
|-- READIRECT_REVAMP_GAME_DATABASE_AND_API_STANDARD.md
|-- READIRECT_REVAMP_GAME_MODULE_STANDARD.md
|-- READIRECT_REVAMP_GAME_TECH_STACK.md
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
