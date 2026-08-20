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
|   |   |-- game-zero/
|   |   |   |-- src/
|   |   |   |-- backend/
|   |   |   |-- assets/
|   |   |   |-- tests/
|   |   |   |-- GAME_DESIGN.md
|   |   |   |-- composer.json
|   |   |   \-- package.json
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
|   |   |       |-- profile/
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
|   |-- profile/
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
|-- READIRECT_REVAMP_DEVELOPMENT_AND_STAGING_LAUNCHER_STANDARD.md
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
|-- start.ps1
|-- stop.ps1
|-- cstart.ps1
|-- cstop.ps1
\-- .env.example
```

## Repository Launchers

The root `start.ps1` and `stop.ps1` scripts own local service startup and
shutdown. The root `cstart.ps1` and `cstop.ps1` scripts compose that local
launcher with the owner-controlled Cloudflare staging tunnel. They must not
duplicate application startup logic or expose API, ASR, TTS, Reverb, or
PostgreSQL ports directly.

Generated manifests, logs, stop requests, and the temporary tunnel
configuration belong below `.runtime/` and remain Git-ignored. Complete
launcher, credential, network-boundary, and first-successful-build recovery
rules are defined by
`READIRECT_REVAMP_DEVELOPMENT_AND_STAGING_LAUNCHER_STANDARD.md`.

## Main Applications

### apps/games

Contains the owner-controlled game lobby and three independently developed game
modules. These folders are source packages compiled into apps/web and,
when accepted, locally loaded Laravel packages used by apps/api. They are not
separate deployments, databases, schemas, domains, iframes, or microfrontends.

The required slots are:

~~~text
apps/games/
|-- lobby/
|-- game-zero/
|-- game-one/
\-- game-two/
~~~

The lobby owns game selection, game-username onboarding, separate learner and
guest leaderboard views, and the owner-controlled game registry. It is an entry
surface for queued game-achievement presentation, but it consumes the central
achievement feature defined by
`READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md`; it does not own a private
queue or overlay.

Each contributor repository root must match its assigned game-zero, game-one,
or game-two directory exactly. Each game contains its React frontend, selected
KAPLAY or PixiJS runtime, Laravel package, migrations, tests, runtime assets,
editable asset sources, licenses, and completed GAME_DESIGN.md.

Every game is governed by:

- READIRECT_REVAMP_GAME_TECH_STACK.md
- READIRECT_REVAMP_GAME_MODULE_STANDARD.md
- READIRECT_REVAMP_GAME_DATABASE_AND_API_STANDARD.md

### `apps/web`

Contains the React learner application, teacher interface, Live2D character integration, PixiJS effects, lesson screens, assessment screens, microphone controls, and frontend API communication.

The public Home page owns its compact About entry point and institutional
content under:

```text
apps/web/src/features/home/HomePage.tsx
apps/web/src/features/home/AboutReaDirectDialog.tsx
apps/web/tests/HomePage.test.tsx
```

The About dialog is page-local because its content and interaction are unique
to Home. If another route later needs the same dialog contract, the reusable
overlay and profile-card presentation must be promoted to shared components
instead of copied.

Professional presentation shared by every authenticated staff role belongs
under:

```text
apps/web/src/components/staff/StaffBadge.tsx
apps/web/src/components/staff/StaffButton.tsx
apps/web/src/components/staff/StaffCard.tsx
apps/web/src/components/staff/StaffContentPatterns.tsx
apps/web/src/components/staff/StaffDataTable.tsx
apps/web/src/components/staff/StaffFormControls.tsx
apps/web/src/components/staff/StaffNotice.tsx
apps/web/src/components/staff/StaffSectionHeader.tsx
apps/web/src/components/staff/StaffState.tsx
apps/web/src/components/staff/StaffShell.tsx
```

System Administrator, School Administrator, and Teacher feature pages compose
these contracts. Role feature directories own queries, mutations, business
copy, and page composition, but not parallel visual primitives or
role-prefixed design CSS. Shared responsive staff styling remains in
`apps/web/src/styles/index.css`; it must not alter learner-flow routes,
components, or feature styles.

Cross-boundary regressions are guarded by:

```text
apps/web/tests/LearnerFlowBoundary.test.ts
apps/web/tests/StaffDesignTokenImports.test.ts
apps/api/tests/Feature/LearnerRouteBoundaryTest.php
```

These tests preserve the first-successful-build learner route contract, reject
staff dependencies inside learner feature directories, require the global
Tailwind and ReaDirect token imports, and prevent Laravel's staff authentication
or role middleware from enclosing learner API routes. An intentional learner
flow change must update the applicable source of truth and its contract test in
the same slice.

The System Administrator frontend also owns the IsoLetter Sandbox, True
Sandbox, and Equivalence Book workspaces. True Sandbox consumes its selectable
assessment and lesson speech-target catalog through Laravel; React must never
open or parse root content CSV files.

The System Administrator overview aggregation belongs to:

```text
apps/api/app/Services/SystemAdminOverviewService.php
apps/api/app/Http/Controllers/SystemAdminOverviewController.php
apps/web/src/features/staff-dashboard/SystemAdminDashboardPage.tsx
```

The service may read global standard-Learner assessment records, persisted
speech-sandbox failures, the published TTS catalog, audit logs, and existing
service readiness endpoints. It must exclude portal-system Learners and must
not write learner progress, create migrations, warm speech models, or alter
assessment and lesson controllers.

The read-only System Administrator Schools directory belongs to:

```text
apps/api/app/Services/SystemAdminSchoolDirectoryService.php
apps/api/app/Http/Controllers/SystemAdminSchoolController.php
apps/web/src/features/staff-dashboard/SystemAdminSchoolsPage.tsx
```

It aggregates existing school, staff, and standard-Learner records without a
new schema. Portal-system Learners are excluded. Unassigned School
Administrator accounts are reported separately, while school creation and
profile changes remain owned by the existing School Administrator setup and
profile workspaces. This directory has no deletion, reassignment, or learner
progress mutation behavior.

The read-only System Administrator Teachers directory belongs to:

```text
apps/api/app/Services/SystemAdminTeacherDirectoryService.php
apps/api/app/Http/Controllers/SystemAdminTeacherController.php
apps/web/src/features/staff-dashboard/SystemAdminTeachersPage.tsx
```

It reads existing Teacher account, school, Grade, Section, credential,
assignment acknowledgement, and assigned standard-Learner state. Portal-system
Learners are excluded. Teacher creation and assignment remain owned by the
school-scoped School Administrator workspace; this directory cannot deactivate,
reassign, impersonate, or write learner progress.

The read-only System Administrator Learners directory belongs to:

```text
apps/api/app/Services/SystemAdminLearnerDirectoryService.php
apps/api/app/Http/Controllers/SystemAdminLearnerController.php
apps/web/src/features/staff-dashboard/SystemAdminLearnersPage.tsx
```

Its query begins with `account_purpose = standard`, so portal-system Learners
are excluded before aggregation and serialization. It may read existing school,
Teacher, class, account-status, and `LearnerProgressState` fields. It must not
load passwords, sessions, audio, assessment responses, or lesson responses,
and it cannot create Learners, reset credentials, reassign Teachers, or write
progress.

The System Administrator Guest identity and access workspace belongs to:

```text
apps/api/database/migrations/2026_07_30_000023_create_guest_accounts_table.php
apps/api/app/Models/GuestAccount.php
apps/api/app/Models/GuestSession.php
apps/api/app/Services/SystemAdminGuestDirectoryService.php
apps/api/app/Http/Controllers/SystemAdminGuestController.php
apps/web/src/features/staff-dashboard/SystemAdminGuestsPage.tsx
```

`guest_accounts` is an identity boundary separate from `learners`.
`guest_sessions` stores only hashed bearer tokens and lifecycle timestamps.
The System Administrator response may expose approved Guest identity,
verification, access, sign-in, and active-session summaries but never password
hashes or session-token hashes. Deactivation revokes active Guest sessions and
writes a staff audit record; reactivation cannot verify email or create a
session. This workspace must not create synthetic Learners or modify learner,
assessment, lesson, achievement, or game ownership.

The read-only System Administrator Learning Content workspaces belong to:

```text
apps/api/app/Services/SystemAdminLearningContentService.php
apps/api/app/Http/Controllers/SystemAdminLearningContentController.php
apps/web/src/features/staff-dashboard/SystemAdminAssessmentsPage.tsx
apps/web/src/features/staff-dashboard/SystemAdminLessonsPage.tsx
apps/web/src/features/staff-dashboard/SystemAdminLearningRulesPage.tsx
```

The Laravel service reads the reviewed root assessment and lesson CSV sources
to expose publication metadata, active counts, pool readiness, and current
runtime rule summaries. It is a read-only inspection boundary: it must not call
learner-specific lesson snapshot methods, create target exposures, start runs,
write progress, or modify the content files. React consumes only its
authenticated JSON and never opens root CSV files. Equivalence mutations stay
in the existing Equivalence Book boundary.

The System Administrator Agents and AI catalog boundary belongs to:

```text
apps/api/app/Services/SystemAdminAgentsAiService.php
apps/api/app/Http/Controllers/SystemAdminAgentsAiController.php
apps/api/app/Services/LearnerLightweightModeSettings.php
apps/api/app/Services/LearnerSpeechPolicy.php
apps/api/app/Http/Controllers/SystemAdminLearnerExperienceSettingsController.php
apps/api/app/Http/Controllers/LearnerExperienceController.php
apps/api/database/migrations/2026_08_01_000010_add_learner_lightweight_mode_setting.php
apps/api/scripts/audit-tts-catalog-retirement.php
apps/api/scripts/clear-tts-runtime-cache.php
apps/web/src/features/learner-auth/LearnerExperienceProvider.tsx
apps/web/src/features/staff-dashboard/SystemAdminAiServicesPage.tsx
apps/web/src/features/staff-dashboard/SystemAdminAgentSettingsPage.tsx
apps/web/src/features/staff-dashboard/SystemAdminPromptTemplatesPage.tsx
```

AI Services reuses the authenticated System Administrator overview health
contract and the existing audited conditional-Mu-noise-reduction endpoint.
Agent Settings reads the published TTS voice catalog and source-controlled
display and typography contracts. Prompt Templates reads approved published
`TtsSpeechLine` text and metadata only; it never serializes storage paths,
audio hashes, private voice assets, or credentials. Display, typography, voice,
and fixed-speech publication remain read-only until an authoritative runtime
mutation contract exists.

The System Administrator Operations boundary belongs to:

```text
apps/api/app/Services/SystemAdminOperationsService.php
apps/api/app/Http/Controllers/SystemAdminOperationsController.php
apps/web/src/features/staff-dashboard/SystemAdminAuditLogsPage.tsx
apps/web/src/features/staff-dashboard/SystemAdminMonitoringPage.tsx
apps/web/src/features/staff-dashboard/SystemAdminSpeechToolsPage.tsx
apps/web/src/features/staff-dashboard/SystemAdminGamesPlayersPage.tsx
```

Audit Logs serializes approved audit-event fields but not metadata. System
Monitoring reuses the overview health contract and exposes no restart or repair
mutation. Speech Tools is a hub for existing authenticated tools and owns no
parallel speech runtime. Games and Players reads the catalog plus
standard-Learner profile and save metadata, excludes portal-system records, and
does not serialize game-save state. Guest game persistence remains explicitly
unavailable until its separate ownership contract is implemented.

Cross-feature achievement gallery, queue, and unlock presentation components
belong under `apps/web/src/features/achievements/`. The Learner Dashboard and
Game Lobby both compose that shared feature.

School Administrator workspace ownership remains inside the existing staff
dashboard and Laravel boundaries:

```text
apps/api/app/Http/Controllers/SchoolAdminClassController.php
apps/api/app/Http/Controllers/SchoolAdminLearnerController.php
apps/api/app/Http/Controllers/SchoolAdminReportController.php
apps/api/app/Http/Controllers/SchoolAdminInstructionalInsightsController.php
apps/api/app/Http/Controllers/SchoolAdminTeacherDashboardController.php
apps/api/app/Http/Controllers/SchoolAdminWorkspaceController.php
apps/api/app/Services/SchoolAdminInstructionalInsightsService.php
apps/api/app/Services/SchoolAdminOverviewService.php
apps/api/app/Services/SchoolAdminReportService.php
apps/web/src/features/staff-dashboard/SchoolAdminClassesPage.tsx
apps/web/src/features/staff-dashboard/SchoolAdminInstructionalInsightsPage.tsx
apps/web/src/features/staff-dashboard/SchoolAdminLearnerDetailPage.tsx
apps/web/src/features/staff-dashboard/SchoolAdminLearnersPage.tsx
apps/web/src/features/staff-dashboard/SchoolAdminProfilePage.tsx
apps/web/src/features/staff-dashboard/SchoolAdminReportsPage.tsx
apps/web/src/features/staff-dashboard/SchoolAdminTeacherDashboardsPage.tsx
apps/web/src/features/staff-dashboard/schoolAdminApi.ts
```

These controllers resolve the authenticated School Administrator identity
before applying `school_id` scope. Learner queries additionally require
`account_purpose = standard`. Read-only pages may reuse Teacher serialization
services only after the school scope is resolved. Class assignment updates own
staff and Learner account context only; they must not call assessment, lesson,
progression, scoring, or achievement writers.

`SchoolAdminInstructionalInsightsService` is the read-only school instructional
aggregation boundary. It owns the versioned assessment-task and required-lesson
topic map, uses only the latest persisted runs for active standard Learners, and
returns aggregate skip and saved-review evidence without transcripts or
learner-flow writes.

The read-only Teacher Learner Detail workspace belongs under:

```text
apps/web/src/features/staff-dashboard/TeacherLearnerDetailPage.tsx
apps/web/src/features/staff-dashboard/teacherLearnerDetailApi.ts
```

It is protected by the existing Teacher role route boundary, consumes the
shared authenticated `staffFetch` client, and is reached from the Teacher
Learner directory. It reuses `StaffShell`, `StaffPageHeader`, shared surfaces,
shared buttons, and the professional staff responsive foundations.

Teacher Learner password reset remains in the existing
`LearnerAccountsPage.tsx` directory instead of the read-only detail feature.
Its typed API contract belongs with the other learner-account calls in
`features/staff-auth/staffApi.ts`. The directory owns the explicit confirmation
and one-time credential notice; it must not retain the returned password in
session storage, query data, or the learner list.

Teacher Learner CSV import belongs under:

```text
apps/web/src/features/staff-dashboard/TeacherLearnerImportPage.tsx
apps/web/src/features/staff-dashboard/learnerImportCsv.ts
apps/api/app/Services/TeacherLearnerImportService.php
```

The browser parser owns file selection and a non-authoritative preview. The
authenticated Laravel endpoint validates the complete roster again, creates
the assigned accounts in one transaction through the canonical Learner Code
and temporary-password generators, and returns passwords only in the creation
response.

Teacher credential-sheet issuance belongs in
`TeacherCredentialSheetsPage.tsx` and
`app/Services/TeacherCredentialSheetService.php`. Laravel locks and
scope-checks the complete selected set before rotating passwords, revoking
active sessions, and writing one audit event in the same transaction. The
print layout is browser-owned, contains no persisted plaintext password, and
must not include staff navigation or unrelated workspace content.

The Teacher Diagnostic and Final Assessment review workspaces belong under:

```text
apps/web/src/features/staff-dashboard/TeacherAssessmentReviewPage.tsx
apps/web/src/features/staff-dashboard/TeacherDiagnosticAssessmentPage.tsx
apps/web/src/features/staff-dashboard/TeacherFinalAssessmentPage.tsx
apps/web/src/features/staff-dashboard/teacherAssessmentReviewApi.ts
```

Both are protected Teacher routes, use the same shared responsive review page
and `staffFetch` contract, and drill into the existing Learner Detail route
rather than creating another evidence-detail UI.

The learner Part 1 assessment frontend belongs under
`apps/web/src/features/assessment/`. `AssessmentPartOnePage.tsx` composes the
shared non-scrollable shell, Clara, orientation, Task 1A, Task 2A, Task 2B, and
Part 1 Results. `assessmentApi.ts` owns only the authenticated Laravel contract,
`useAudioRecorder.ts` owns browser recording and review lifecycle, and
`assessment.css` owns the responsive activity/result layout. Future Part 2
pages must reuse this boundary rather than copy its recorder or shell.

### `apps/api`

Contains the Laravel application responsible for authentication, learner and teacher records, lessons, assessment results, scoring records, progress, PostgreSQL operations, and communication with the ASR and TTS services.

Staff authentication is server-backed. `StaffAuthController` issues opaque
bearer tokens, `StaffSessionResolver` resolves only their stored hashes, and
the `staff.auth` plus `staff.role` middleware aliases protect every staff
workspace API. `staff_sessions` is the source of truth for expiry, activity,
and revocation. React stores the plaintext token only in tab-scoped session
storage, verifies it through `/api/staff/session` before mounting a protected
staff route, and sends it through the shared `staffFetch` client. Frontend
guards are never a replacement for Laravel role and account-scope checks.

Teacher Learner Detail serialization belongs in
`app/Services/TeacherLearnerDetailService.php`. The Teacher detail controller
must first resolve one Learner through both the authenticated Teacher ID and
`account_purpose = standard`. The service may read progression, assessment
runs and responses, lesson runs and responses, and the immutable lesson
attempt ledger, but its browser contract exposes only safe review evidence.
Raw ASR transcripts, private audio paths, audio checksums, and internal service
evidence remain server-private.

Teacher Learner account creation and password reset share
`app/Services/LearnerTemporaryPasswordGenerator.php`. The reset controller
must resolve an active Learner by authenticated `teacher_id` and
`account_purpose = standard` before changing the hashed password. The same
transaction revokes active `learner_sessions` and writes a
`learner.password_reset` staff audit event whose description and metadata
exclude the plaintext password. It does not modify learner progress.

Teacher overview aggregation belongs in
`app/Services/TeacherOverviewService.php`. It owns Teacher-scoped progression
counts, latest-result distributions, and the bounded recent learner activity
feed. The controller supplies assignment and account context; aggregate queries
must still constrain both `teacher_id` and `account_purpose = standard`.

Teacher assessment cohort serialization belongs in
`app/Services/TeacherAssessmentReviewService.php`, behind the explicit
Diagnostic and Final Assessment controllers. The shared service resolves
assigned standard Learners first, then attaches only their latest run of the
requested type and a skipped-response count. Final readiness comes from the
canonical progression stage when no Final run exists. It never serializes
response bodies or private speech evidence.

Teacher class-report serialization belongs in
`app/Services/TeacherReportService.php`, behind
`TeacherReportController.php`. Its React owners are
`TeacherReportsPage.tsx` and `teacherReportApi.ts`. It reads canonical
progression, latest assessment runs, required-lesson completion, skips, and
persisted review flags without adding report snapshots or changing source
records.

Teacher analytics aggregation belongs in
`app/Services/TeacherAnalyticsService.php`, behind
`TeacherAnalyticsController.php`. `TeacherAnalyticsPage.tsx` and
`teacherAnalyticsApi.ts` render its read-only contract. The service owns
latest-run deduplication and keeps learning, support, technical-audio, skip,
and review categories separate.

Teacher audio-review ownership is separated from the learner runtime:

```text
apps/api/app/Http/Controllers/TeacherAudioReviewController.php
apps/api/app/Models/StaffResponseReview.php
apps/api/app/Services/TeacherAudioReviewService.php
apps/api/database/migrations/2026_07_25_000020_create_staff_response_reviews_table.php
apps/web/src/features/staff-dashboard/TeacherAudioReviewPage.tsx
apps/web/src/features/staff-dashboard/teacherAudioReviewApi.ts
```

`TeacherAudioReviewService` resolves an assigned standard Learner before it
resolves an assessment or lesson response. The controller streams private
recording bytes only through the authenticated Teacher route and writes
append-only `staff_response_reviews` annotations. It must not call learner
progression, scoring, assessment, lesson, or achievement writers, and it must
not update the source response. Private storage paths, checksums, raw service
evidence, and unauthenticated media URLs remain server-only.

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
controlled speech publication and, in effective hybrid mode, the first clear
incorrect personalized diagnosis. Fixed learner-flow lines and every
published-only activity do not call it at runtime.

Laravel is the authenticated browser-facing speech proxy. Published metadata
belongs in `tts_voice_versions` and `tts_speech_lines`, while approved WAVs live
under `apps/api/storage/app/private/tts/catalog/`. The current `clara-sh-v1`
catalog contains Lesson Intro, every fixed Part 1 instruction and ordinal cue,
all fixed Part 2 prompts and questions, the Diagnostic and Final Assessment
completion lines, and
52 fixed Lesson 1 lines, 69 fixed Lesson 2 lines, 34 fixed Lesson 3 lines, 34
fixed Lesson 4 lines, 9 fixed Lesson 5 lines, 47 fixed Lesson 6 lines, and 7
dedicated companion-class story lines. Its 300 published rows are grouped under
`sh/lesson-intro/`, `sh/part-1/`, `sh/part-2/`, `sh/completion/`, and
`sh/lessons/` for human review. Laravel verifies the catalog status, file
existence, and SHA-256 checksum before returning audio. Browser code must never
send or receive private paths.

The catalog slice of the approved lightweight/hybrid migration defined by
`READIRECT_REVAMP_LIGHTWEIGHT_MODE_AND_HYBRID_TTS_STANDARD.md` is published:
it added 53 WAVs for the 300-row catalog, including 49 Lesson 2 word
demonstrations and four general first-incorrect lines. It also replaced two
demonstrated-success WAVs under their existing keys. The remaining 245
published WAVs are preserved.
Fourteen additional WAVs currently present below the physical catalog root are
not configured published lines; the lightweight standard names each path for
explicit reviewed removal. They must not be promoted or regenerated.

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
without contacting Vox. In the currently deployed baseline, Lesson 1 prepares
only `result`; Lesson 2 prepares `result` and `instruction`; and Lessons 3 and 4
prepare only `result`. The approved migration makes every deterministic
demonstration and terminal outcome published, requests a runtime profile only
for a first clear incorrect personalized diagnosis in effective hybrid mode,
and declares no runtime profiles in effective published-only mode. Lesson 5 is published-only:
its instruction, technical recovery, six review-band responses, and completion
line require no runtime Vox profile.

Deterministic Philippine-English CVC vowel tolerance is owned by:

```text
apps/api/app/Services/CvcVowelEquivalenceCatalog.php
apps/api/database/seeders/CvcVowelEquivalenceSeeder.php
```

The catalog derives deduplicated global-token `a/o/u` middle-vowel
substitutions from the active Mu content registry. The seeder persists each
token pair once, and the resolver applies it word-by-word to isolated words,
phrases, sentences, and passages while preserving raw ASR evidence. Lesson 6
choice comprehension never enters this resolver. The seed remains idempotent
across content revisions.

System Administrator Page Portals begin with the normal Learner Dashboard,
then resolve persisted Diagnostic, Lesson 1 through Lesson 6, and Final
Assessment checkpoints through `LearnerPortalLaunchService`. The Dashboard
destination resets Kristen to `before_diagnostic`, creates no activity run,
and opens `/learner/dashboard`. Lesson destinations create Kristen's completed
Diagnostic prerequisite and Ready Reader first. Lesson 2 destinations also
create her completed Lesson 1 prerequisite and Letter Leader before the
selected `required-lesson-2` run. Lesson 3 destinations additionally create a
completed Lesson 2 prerequisite and Word Wizard before the selected
`required-lesson-3` run. Lesson 4 destinations additionally persist completed
Lesson 3 and Phrase Pro before creating the selected `required-lesson-4` run,
then navigate to the matching versioned lesson route. Lesson 5 destinations
additionally persist completed Lesson 4 and Sentence Star before opening the
passage item, dedicated passage review, or Passage Explorer completion state.
Lesson 6 destinations additionally persist completed Lesson 5 and Passage
Explorer before opening the selected comprehension support checkpoint or the
all-lessons completion state.
Final Assessment destinations persist the completed Diagnostic Assessment and
all six completed lesson runs and awards before creating the selected
`assessment_type = final` checkpoint. Its ten destinations use the shared
assessment engine under `/learner/final-assessment/...`; the finale destination
also commits ReaDirect Champion and `reading_journey_complete` before it opens.
The learner page reloads that exact snapshot through the normal lesson API.
Portal-only prerequisites remain in normal
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
- Original development-team portraits under `assets/profile/`
- Original videos
- Uncompressed music and sound effects
- Voice reference recordings
- Asset licenses and attribution documents

### Browser-ready assets

The `apps/web/public/assets/` directory contains only optimized files that the browser must load during runtime.

Examples include:

- WebP, AVIF, SVG, or optimized PNG images
- Browser-ready development-team portraits under
  `apps/web/public/assets/profile/`
- OGG, MP3, or WebM audio
- MP4 or WebM videos
- Live2D runtime model files
- Theme-specific static Clara portraits under
  `apps/web/public/assets/live2d/clara/stills/`
- Web fonts

The browser-ready assets are derived from the master assets. Editable source
files must not be placed in the public directory. For the Home About dialog,
`assets/profile/` is the master source and
`apps/web/public/assets/profile/` contains the browser-served copies referenced
by `/assets/profile/<file>`.

The current Home About portrait mapping is:

| Master source | Browser-served copy |
|---|---|
| `assets/profile/jerick.png` | `apps/web/public/assets/profile/jerick.png` |
| `assets/profile/nick.png` | `apps/web/public/assets/profile/nick.png` |
| `assets/profile/victor.jpg` | `apps/web/public/assets/profile/victor.jpg` |

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

Approved lightweight static portraits are copied to:

```text
apps/web/public/assets/live2d/clara/stills/clara-default.png
apps/web/public/assets/live2d/clara/stills/clara-t2.png
```

They are explicit renderer assets, not automatic Live2D error fallbacks. Static
mode must avoid importing or downloading the Live2D model bundle.

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

Published, reviewed Clara speech belongs in Laravel private storage:

```text
apps/api/storage/app/private/tts/catalog/
```

Its authoritative keys, text, hashes, and source groups belong in the Laravel
speech catalog configuration and database publication workflow. Published WAVs
must never be confused with disposable runtime cache entries.

Runtime-generated dynamic TTS cache audio belongs in:

```text
services/tts/storage/cache/
```

The dynamic cache may be cleared by an approved rollout or maintenance action.
Published catalog WAVs and `services/tts/storage/reference-cache/` must not be
removed by that operation.

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
|   |   |-- game-zero/
|   |   |   |-- src/
|   |   |   |-- backend/
|   |   |   |-- assets/
|   |   |   |-- tests/
|   |   |   |-- GAME_DESIGN.md
|   |   |   |-- composer.json
|   |   |   \-- package.json
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
apps/api/app/Http/Controllers/LearnerLessonThreeController.php
apps/api/app/Http/Controllers/LearnerLessonFourController.php
apps/api/app/Http/Controllers/LearnerSpokenTextLessonController.php
apps/api/app/Models/LessonRun.php
apps/api/app/Models/LessonResponse.php
apps/api/app/Models/LessonItemAttempt.php
apps/api/app/Services/LessonContentCatalog.php
apps/api/app/Services/IsolatedLetterPronunciation.php
apps/api/app/Services/LessonOneSupportPresentation.php
apps/api/app/Services/LessonTwoSupportPresentation.php
apps/api/app/Services/LessonThreeSupportPresentation.php
apps/api/app/Services/LessonFourSupportPresentation.php
apps/api/app/Services/SpokenTextLessonSupportPresentation.php
apps/api/app/Services/LessonPracticeTryService.php
apps/api/app/Services/LessonTeachingStateMachine.php
apps/api/app/Services/SpeechEquivalenceResolver.php
apps/api/app/Services/TranscriptAlignmentService.php
apps/api/scripts/generate-published-tts-lines.php
apps/api/database/migrations/2026_07_23_000017_add_bounded_support_to_lesson_runtime.php
apps/web/src/features/learner-activity/LearnerActivityShell.tsx
apps/web/src/features/learner-activity/LearnerActivityResult.tsx
apps/web/src/features/lesson/LessonOnePage.tsx
apps/web/src/features/lesson/LessonTwoPage.tsx
apps/web/src/features/lesson/LessonThreePage.tsx
apps/web/src/features/lesson/LessonFourPage.tsx
apps/web/src/features/lesson/LessonFivePage.tsx
apps/web/src/features/lesson/SpokenTextLessonPage.tsx
apps/web/src/features/learner-activity/PassageReadingResult.tsx
apps/web/src/features/lesson/LessonPracticeTriesToggle.tsx
apps/web/src/features/lesson/LessonProgressRail.tsx
apps/web/src/features/lesson/lessonApi.ts
apps/web/src/features/lesson/lesson.css
```

Versioned authored lesson items remain under `content/lessons/`. Published
Lesson 1 through Lesson 5 Clara WAV files remain private under the existing TTS
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
to that contract. Lessons 1 through 5 consume this mapping and the same Clara
controller.

`LessonOneSupportPresentation.php`, `LessonTwoSupportPresentation.php`, and
the shared `SpokenTextLessonSupportPresentation.php` used by Lessons 3 and 4
own their ordered bounded-support contracts. `LessonFiveSupportPresentation`
uses that shared foundation for instruction and technical recovery, then owns
the published accuracy-band speech on passage review. React must consume these
payloads and must not reproduce those decision tables.

## Learn with Ma'am Clara Placement

The optional listening companion class remains inside the existing Laravel and
learner-web application boundaries:

```text
apps/api/app/Http/Controllers/LearnerClaraListeningController.php
apps/api/app/Models/LearnerClaraListeningSession.php
apps/api/app/Services/LearnWithClaraLettersFlow.php
apps/api/database/migrations/2026_07_23_000018_create_learner_clara_listening_sessions_table.php
apps/web/src/features/learn-with-clara/LearnWithClaraMenuPage.tsx
apps/web/src/features/learn-with-clara/LearnWithClaraLettersPage.tsx
apps/web/src/features/learn-with-clara/LearnWithClaraLetterParade.tsx
apps/web/src/features/learn-with-clara/learn-with-clara-menu.css
apps/web/src/features/learn-with-clara/learnWithClaraLettersFlow.ts
apps/web/src/features/learn-with-clara/learn-with-clara-letters.css
```

Published companion-class audio remains under
`apps/api/storage/app/private/tts/catalog/sh/learn-with-clara/`. Its listening
checkpoint table is intentionally separate from academic lesson runs,
assessment attempts, mastery records, and progression. The menu exposes the
planned skill set, while the implemented Letters route owns the server-backed
Little-Letter Parade story, interactive A-E matching, and listening-and-echo
class.
