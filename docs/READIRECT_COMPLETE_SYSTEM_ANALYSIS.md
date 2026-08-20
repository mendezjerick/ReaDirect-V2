# ReaDirect Complete System Documentation

> Current as of August 20, 2026, at repository revision `3c2d51df1e5e8e49a96528488a056f7f11011177`.
>
> This is the canonical repository-wide technical guide. It describes the implemented system, not only its intended design. Uncommitted Learn With Clara changes and the modified local SQLite file present during this review are not treated as finalized behavior.

## 1. Executive summary

ReaDirect is a Filipino reading-intervention platform with four user portals: learner, teacher, school administrator, and system administrator. Its academic path starts with a diagnostic assessment, continues through six reading lessons, and ends with a final assessment. Teachers review derived learning evidence and progress; administrators manage users, assignments, content, and operational reports.

The system consists of:

- A React/TypeScript web application used in desktop browsers and packaged as an Android application through Capacitor.
- A Laravel API that owns identity, authorization, academic progression, scoring, content, reports, sessions, queues, and relational persistence.
- A FastAPI speech-recognition service that provides Mu transcription and Nu deterministic letter decisions.
- A FastAPI VoxCPM2 text-to-speech service for Ma'am Clara audio.
- A shared GPU-runtime package that coordinates scarce model capacity across the Python services.
- Three active educational games, with a fourth legacy placeholder still present in the repository.

The core learner experience is compatible between supported browsers and Android because both clients use the same React application and Laravel contracts. They are not fully interchangeable: Android uses native encrypted bearer sessions and provides the noncanonical Offline Practice feature, while the browser uses HttpOnly cookies and has no equivalent offline academic mode. Staff portals should be treated as browser-first; their relative API and realtime assumptions are not fully native-safe.

The largest readiness gaps are production deployment topology, model packaging, durable private audio storage, PostgreSQL migration/restore rehearsal, environment and network hardening, resource benchmarking, research-governance controls, and continuous integration.

## 2. Documentation scope and authority

This document covers application behavior, architecture, roles, data ownership, persistence, AI services, games, browser/mobile compatibility, deployment, security, tests, and known risks. It was derived from repository source, configuration, migrations, routes, tests, scripts, and existing focused documentation.

When sources disagree, use this precedence:

1. Executed code and database migrations.
2. Automated tests that exercise the code.
3. Environment examples and startup/build scripts.
4. Focused current documentation.
5. Older planning notes and comments.

Statements labeled **inferred** are strongly supported by code structure but were not executed end to end. Statements labeled **unconfirmed** need runtime or deployment evidence.

## 3. System boundaries

ReaDirect owns:

- Learner, teacher, school-administrator, and system-administrator identities.
- Learner enrollment and teacher/school relationships.
- Academic content, snapshots, assessment runs, lesson runs, responses, scores, reviews, and progress.
- Browser and Android session transport.
- Transient learner speech processing and derived transcripts, scores, and instructional evidence.
- Staff dashboards, exports, notifications, and audit records.
- Local ASR, deterministic pronunciation decisions, TTS, and GPU coordination.
- Educational game launch and progress integration.

External or environment-provided capabilities include:

- PostgreSQL in the intended production deployment.
- Gmail SMTP for staff verification and email workflows.
- Cloudflare Tunnel for the current staging helper.
- Android OS facilities exposed through Capacitor plugins.
- Browser microphone, media encoding, storage, and network APIs.
- Model files and GPU/CPU runtimes required by the Python services.

## 4. Technology stack

| Area                 | Current implementation                                      | Primary responsibility                          |
| -------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| Web                  | React 19, TypeScript 5.9, Vite 8                            | All user interfaces                             |
| Routing              | React Router 7                                              | Portal and learner route trees                  |
| Server state         | TanStack Query                                              | API cache, mutations, invalidation              |
| Android              | Capacitor 8.5                                               | Native shell and device integration             |
| Native plugins       | App, Filesystem, File Transfer, Network                     | Lifecycle, downloads, file access, connectivity |
| API                  | Laravel 13.20 on PHP 8.3                                    | Domain rules, HTTP, queues, persistence         |
| Realtime             | Laravel Reverb                                              | Staff-facing events and live updates            |
| Database             | Eloquent; PostgreSQL production orientation; SQLite locally | Relational system of record                     |
| ASR                  | FastAPI, faster-whisper                                     | Speech transcription and validation             |
| Deterministic speech | Nu plus Laravel equivalence rules                           | Expected-aware letter/word decisions            |
| TTS                  | FastAPI, VoxCPM2 2.0.3                                      | Clara speech generation                         |
| GPU coordination     | Shared Python `gpu-runtime` package                         | Cross-process lock and capacity management      |
| Games                | PixiJS and KAPLAY                                           | Three learner minigames                         |
| Testing              | PHPUnit, Vitest, Playwright, pytest                         | Unit, feature, and end-to-end checks            |

The repository contains both `pnpm-lock.yaml` and `package-lock.json`. The scripted and documented JavaScript workflow uses pnpm; the duplicate lockfile is a maintenance risk unless deliberately required.

## 5. Repository structure

```text
ReaDirect-V2/
├── apps/
│   ├── api/                 Laravel API, database, queues, Reverb
│   └── web/                 React application and Capacitor Android project
├── games/
│   ├── game-alpha/          Space Letter game (PixiJS)
│   ├── game-one/            Readscape (KAPLAY)
│   ├── game-two/            Ottertale (PixiJS)
│   └── game-zero/           Dormant/legacy placeholder
├── services/
│   ├── asr/                 Mu/Nu speech service
│   ├── tts/                 VoxCPM2 Clara service
│   └── gpu-runtime/         Shared model-capacity coordination
├── scripts/                 Bootstrap, lifecycle, Android and utility scripts
├── docs/                    System, deployment, and compatibility documentation
├── start.ps1 / stop.ps1     Local full-stack lifecycle
└── cstart.ps1 / cstop.ps1   Cloudflare-backed staging lifecycle
```

The main navigation points for future maintainers are:

- `apps/web/src/App.tsx` for the client route graph.
- `apps/web/src/lib/api.ts` and auth/session modules for transport behavior.
- `apps/api/routes/api.php` for the HTTP surface.
- `apps/api/app/Http/Controllers` for request orchestration.
- `apps/api/app/Services` for domain behavior.
- `apps/api/database/migrations` for the persistent data contract.
- `services/asr/app` and `services/tts` for model-service behavior.
- Each active game's `src` and test folders for gameplay logic.

## 6. Processes and local startup

`start.ps1` starts the complete local development stack:

| Process         | Default port | Notes                                                |
| --------------- | -----------: | ---------------------------------------------------- |
| Vite web client |         5174 | React development server                             |
| Laravel API     |         8000 | HTTP API and local storage delivery                  |
| ASR service     |         8001 | CPU-oriented local defaults use `base.en` and `int8` |
| TTS service     |         8002 | CPU-oriented local VoxCPM2 process                   |
| Laravel Reverb  |         8080 | WebSocket/realtime server                            |
| Queue worker    |          n/a | Database-backed queue processing                     |

The script bootstraps temporary service tokens, applies Laravel migrations with `--force`, prunes failed queue jobs, and coordinates process startup. This is convenient for development but is not a production process manager.

`cstart.ps1` is a staging convenience wrapper. It starts the local services and publishes the Vite frontend through Cloudflare Tunnel. It does not itself prove that the API, ASR, TTS, Reverb, private media, and Android networking are production-ready behind one public topology.

## 7. High-level request and data flow

```text
Browser or Android WebView
        │
        ├── React routes and local UI state
        │       │
        │       ├── HTTPS API requests ───────► Laravel
        │       │                                 ├── policies/domain services
        │       │                                 ├── PostgreSQL/SQLite
        │       │                                 ├── private audio storage
        │       │                                 ├── queue jobs
        │       │                                 └── Reverb events
        │       │
        │       ├── recording upload ──────────► Laravel ─► ASR/Nu
        │       └── Clara speech request ───────► Laravel ─► TTS
        │
        └── Android-only Capacitor bridge
                ├── encrypted session storage
                ├── connectivity status
                └── Offline Practice package files
```

Laravel is the authority for academic and authorization decisions. The browser is the authority only for temporary presentation state. Python model outputs are evidence consumed by Laravel rather than a replacement for Laravel's score/progression rules.

## 8. Frontend architecture

The web application is a single React application with route groups for public pages, learners, teachers, school administrators, system administrators, games, and native-only experiences. Major frontend patterns include:

- React Router route guards for identity and role boundaries.
- TanStack Query for server-state reads and mutations.
- Context/providers for cross-cutting UI and session concerns.
- Feature-oriented folders for assessments, lessons, Learn With Clara, Offline Practice, staff portals, audio, and games.
- Browser storage for nonauthoritative cache, resume hints, UI preferences, and native transport support.
- Shared responsive CSS/components plus feature-specific layouts.

Client-side route guards improve navigation and presentation but are not security boundaries. All protected data and mutations must remain authorized by Laravel middleware, policies, and ownership checks.

## 9. Browser and Android compatibility

Both form factors run the same compiled React code and share learner API contracts. The detailed compatibility matrix is in [Browser and Mobile Compatibility](./BROWSER_AND_MOBILE_COMPATIBILITY.md).

| Capability                           | Desktop/mobile browser                            | Android package                                      | Compatibility conclusion                                          |
| ------------------------------------ | ------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| Core learner lessons and assessments | Supported                                         | Supported through WebView                            | Shared behavior when API/media access works                       |
| Authentication transport             | HttpOnly cookie plus session snapshot/sentinel    | Encrypted native bearer session                      | Same account semantics, different transport                       |
| Recording                            | Browser media APIs                                | WebView media APIs and Android permissions           | Compatible in design; device codecs/permissions need device tests |
| Online persistence                   | Laravel                                           | Laravel                                              | Same authoritative data                                           |
| Offline Practice                     | Not a canonical browser workflow                  | Android-first local downloads                        | Native-only and noncanonical                                      |
| Staff portals                        | Browser-first                                     | Technically routable but not fully native-safe       | Do not claim native staff support                                 |
| Realtime                             | Uses current host assumptions                     | Host assumptions may not match configured API origin | Requires native-specific validation                               |
| PWA install/offline                  | Dependencies exist but no complete Workbox wiring | Native shell supplies installability                 | Browser PWA support is unconfirmed                                |

Offline Practice does not write assessment, lesson, or progress records to the academic system. A learner may practice downloaded material without network access, but those actions do not later become official completion or scores.

## 10. API architecture

`apps/api/routes/api.php` defines approximately 144 static route declarations; assessment route generation adds repeated diagnostic/final surfaces. Routes are grouped by public access, learner authentication, staff authentication, role/permission middleware, and service-to-service access.

The API codebase contains approximately:

- 51 controllers for HTTP orchestration.
- 74 services for domain and integration behavior.
- 27 Eloquent models.
- 35 database migrations.

The architectural intent is controller-thin/service-rich, although maintainers should verify individual paths before changing them. Route names and response shapes are public contracts for the React application, tests, service calls, and potentially deployed clients.

API responsibilities include:

- Sessions, verification, logout, device/session revocation, and throttling.
- User, school, assignment, and roster management.
- Assessment and lesson run lifecycle.
- Content selection and immutable run snapshots.
- Recording ingestion, quality checks, transcription, review, and scoring.
- Learner progression, reports, exports, notifications, and audit data.
- TTS brokerage and private media delivery.
- Realtime event publication.

## 11. Authentication and session model

### 11.1 Learners

Learner sessions have a 12-hour absolute lifetime, a 60-minute idle window, and a maximum of five concurrent sessions. Login is throttled by both IP and account identifier.

- Browsers receive an HttpOnly authentication cookie. A readable sentinel/session snapshot helps the UI restore presentation state but is not the credential authority.
- Android stores an opaque bearer session using the native encrypted storage path. The web layer sends that token with API requests.
- Logout and revocation must clear both server authority and the applicable client transport state.

### 11.2 Staff

Staff sessions default to eight hours. A remembered session may last 30 days. Activity uses a 30-second heartbeat and a 120-second lease, and registered devices use HMAC-based verification. Email verification and recovery flows depend on configured mail delivery, currently oriented toward Gmail SMTP.

### 11.3 Guest data

Guest-related tables exist in the schema, but no public guest login flow was found. Treat guest functionality as dormant/incomplete unless a current route and client flow are introduced together.

## 12. Roles and authorization

| Role                 | Main capabilities                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Learner              | Complete assigned diagnostic, lessons, final assessment, games, and optional native practice    |
| Teacher              | View assigned learners, review derived evidence, monitor progress, use reports and learning resources |
| School administrator | Manage school users/relationships and school-level operational views                            |
| System administrator | Manage cross-school configuration, staff, content, permissions, audit and system operations     |

Authorization is layered:

- Route middleware verifies the session type and broad role/permission.
- Policies and service checks restrict resource ownership and school/teacher scope.
- Query scoping limits which records can be listed or reported.
- The client hides or redirects inaccessible UI, but this is convenience only.

Any new endpoint must define all four: authentication type, role/permission, record ownership/scope, and safe response fields.

## 13. Learner journey and progression

The canonical academic journey is:

1. Learner signs in.
2. Diagnostic assessment is required before lessons.
3. Lessons 1 through 6 become available; they are not implemented as a strict one-by-one unlock chain.
4. Every lesson must be completed before the final assessment becomes available.
5. The final assessment produces the ending profile and comparison data.

Progress is server-owned. Client storage can help resume screens, but it must never unlock content or invent completion independently.

## 14. Assessment architecture

Diagnostic and final assessments share a common structure and much of the same implementation.

### 14.1 Part One

Part One contains:

1. Orientation.
2. Task 1A: Nu-supported letter work.
3. Task 2A: rhyme selection.
4. Task 2B: Mu/equivalence-supported word work.

The branch threshold is:

- Score `<= 6`: low branch.
- Score `> 6`: high branch.

The current `continueResult` behavior completes a low-branch assessment immediately after Part One and records score `0` with profile `Low Emerging`. This behavior is shared by diagnostic and final paths and is easy to misread if only the UI is inspected.

### 14.2 Part Two

The high branch continues to a passage and five comprehension questions. Reading accuracy is calculated as:

```text
accuracy = max(0, 100 - (2 × incorrectWords))
incorrectWords is capped at 50 for this calculation
```

The final combined score is:

```text
combined = (comprehension × 0.60) + (accuracy × 0.40)
```

Profile bands are:

| Combined score | Profile       |
| -------------: | ------------- |
|        `<= 25` | Low Emerging  |
|        `<= 50` | High Emerging |
|        `<= 75` | Developing    |
|        `<= 90` | Transitioning |
|         `> 90` | Grade Level   |

Part One band labels elsewhere in the system are:

| Part One score | Band           |
| -------------: | -------------- |
|        `<= 10` | Full Refresher |
|        `<= 16` | Moderate       |
|        `<= 26` | Light          |
|         `> 26` | Grade Ready    |

### 14.3 Assessment invariants

- A run snapshots its content so later content edits do not rewrite historical evidence.
- Submitted responses and recordings belong to a specific run/task.
- Server services compute authoritative branching, completion, and profile outcomes.
- Automatic speech evidence can be reviewed or corrected by authorized staff where the workflow permits.
- Retrying, abandoning, and resuming must preserve the run-state contract rather than infer state from the current screen.

## 15. Lesson architecture

| Lesson | Primary skill | Main interaction                             |
| -----: | ------------- | -------------------------------------------- |
|      1 | Letters       | Nu-assisted letter recognition/pronunciation |
|      2 | Words         | Mu-assisted word reading                     |
|      3 | Phrases       | Recorded phrase reading                      |
|      4 | Sentences     | Recorded sentence reading                    |
|      5 | Short passage | Passage reading and recording                |
|      6 | Comprehension | 5W choice-only questions                     |

Each lesson uses a server-owned run and content snapshot. Completion should be derived from required submitted tasks, not solely from route visitation or local storage. Lesson 6 differs from the recording-oriented lessons because its core response is choice-based comprehension.

Changes to lesson content, task counts, or completion logic must be evaluated against existing in-progress runs, snapshots, reports, tests, and final-assessment gating.

## 16. Learn With Clara

Learn With Clara is a guided practice area adjacent to the canonical lesson/assessment path.

- The Letters experience includes a server-backed checkpoint.
- Words and other practice interactions are primarily client-side practice experiences.
- Practice UI state is not automatically equivalent to academic progress.
- Clara voice output is obtained through the system TTS boundary rather than generated by browser speech synthesis as the canonical path.

Because Learn With Clara currently has uncommitted working-tree changes, this document does not treat those edits as a stable final contract. Before changing the feature, compare the active source and tests rather than relying on this section alone.

## 17. Recording and audio pipeline

### 17.1 Capture

The React client obtains microphone access through `getUserMedia`, records with `MediaRecorder`, provides recording state and playback controls, and uploads the resulting media to Laravel. Browser or WebView support determines the exact source encoding, so the backend and model services must not assume every device produces the same container or codec.

### 17.2 Ingestion and deletion

Laravel validates the request and its academic ownership, associates the temporary upload with the correct run/task, and forwards it to ASR without copying it into application storage. ASR deletes its bounded scratch file after processing. Laravel persists only derived evidence such as transcripts, decisions, and scores.

### 17.3 Processing

Depending on task type, Laravel sends the recording and expected content to the speech service. The response can include transcript, confidence/quality evidence, deterministic matches, and error information. Laravel interprets this evidence through its domain services and persists the result used by academic workflows.

### 17.4 Review

Authorized teachers can review progress and derived machine output for learners in their scope. The teacher audio-playback and historical recording-review feature is not part of V1.

### 17.5 Operational concerns

- Codec support must be tested on real target browsers and Android devices.
- Upload limits, request timeouts, reverse-proxy limits, and model timeouts must agree.
- Private storage needs backup, retention, deletion, and orphan-cleanup policies.
- Database backup alone is insufficient if audio files live on ephemeral or separate storage.
- Microphone denial, interruption, zero-length audio, poor signal, and network loss require explicit recoverable UI states.

## 18. ASR, Mu, and Nu

The FastAPI ASR service exposes two conceptual capabilities:

- **Mu** uses faster-whisper to transcribe speech and support expected-word/equivalence decisions.
- **Nu** supplies deterministic, expected-aware decisions for letter-oriented tasks rather than depending only on a free-form transcript.

Laravel remains the academic authority. A model-service response is not itself proof that a lesson or assessment is complete. Service-to-service requests use configured tokens, and callers need explicit handling for unavailable models, capacity exhaustion, malformed media, and timeouts.

Local startup defaults favor CPU compatibility (`base.en`, `int8`). Production accuracy, latency, memory, and concurrency cannot be inferred from those developer defaults. The deployed model identity and compute configuration should be versioned and recorded alongside benchmarks.

## 19. Transcript processing and scoring authority

Transcript handling spans multiple layers:

1. The client captures media and identifies the expected academic item.
2. Laravel validates the run, task, user, and content snapshot.
3. ASR produces speech evidence.
4. Laravel equivalence/alignment logic interprets that evidence against expected content.
5. Laravel persists response-level results and recalculates run-level state.
6. Staff review may add authorized corrections or decisions.

This boundary is important: changing only a React success animation cannot change the authoritative score, and changing only ASR text normalization may not change Laravel equivalence behavior. Scoring changes require coordinated tests at both service and Laravel integration levels.

## 20. Ma'am Clara and TTS

The TTS service uses VoxCPM2 2.0.3 to synthesize Clara speech. Laravel brokers requests and application access; the client should not need direct model-service credentials.

The repository contains approximately 600 tracked private TTS WAV artifacts. They improve repeat playback and reduce synthesis demand, but they also create storage, licensing, provenance, retention, and repository-size obligations. A production design should clarify whether these files are immutable application assets, generated cache, or learner-related records and then enforce the matching lifecycle.

TTS readiness depends on more than an HTTP process being alive. Model files must exist, initialization must succeed, the device must have capacity, and a representative synthesis must complete within acceptable latency.

## 21. Shared GPU coordination

`services/gpu-runtime` coordinates model capacity across the ASR and TTS processes. Its purpose is to prevent independent services from assuming the same accelerator memory is simultaneously available.

The package supplies cross-process locking/capacity behavior, but production limits still need measurement. Relevant dimensions include:

- Cold-start and model-load time.
- Peak GPU and system memory per model.
- Safe concurrent requests.
- Queueing and timeout behavior during contention.
- Recovery after a worker or model process crashes while holding capacity.
- CPU fallback throughput and acceptable user-facing wait time.

## 22. Offline Practice

Offline Practice is an Android-first, noncanonical practice subsystem. Signed-in learners can download validated practice packages and use them without a live academic API connection.

The download path validates package schema, file paths, hashes, and sizes before treating content as usable. Capacitor Filesystem and File Transfer provide device storage and transfer behavior, while Network reports connectivity.

Important boundaries:

- It is practice, not an offline clone of assessments or lessons.
- It does not award official completion, progression, or assessment scores.
- It does not synchronize offline academic attempts after reconnection.
- Package identity/version must be preserved so files are not mixed across releases.
- Downloads need sufficient storage, interruption handling, integrity failure states, and cleanup behavior.
- Access to download packages is still tied to a signed-in learner.

If future work adds offline academic sync, that is a new distributed-data feature requiring conflict rules, idempotent server APIs, attempt identity, clock-independent ordering, revocation handling, and migration/version compatibility.

## 23. Educational games

Three games are active:

| Package      | Learner-facing identity | Engine | Status                |
| ------------ | ----------------------- | ------ | --------------------- |
| `game-alpha` | Space Letter            | PixiJS | Active                |
| `game-one`   | Readscape               | KAPLAY | Active                |
| `game-two`   | Ottertale               | PixiJS | Active                |
| `game-zero`  | Placeholder/legacy      | Varies | Dormant route/package |

Games run inside the broader learner application but retain their own rendering loops, assets, input handling, and tests. Their integration must respect authenticated learner context, navigation back to the application, viewport/safe-area behavior, audio lifecycle, and any server progress contract.

Game Zero should not be described as an active learner feature. Removing it safely requires checking routes, imports, build/package references, tests, and documentation together.

## 24. Teacher portal

The teacher portal provides an assigned-learner view rather than unrestricted school data. Its main domains are:

- Roster and learner status.
- Diagnostic, lesson, and final progress.
- Recording review and machine-output inspection.
- Reports and exports.
- Notifications/realtime updates.
- Learning resources and supporting content.

Teacher mutations must enforce assignment and school scope in Laravel. A learner identifier supplied by the browser is never sufficient authorization.

## 25. School-administrator portal

School administrators operate within a school boundary. Their responsibilities include school-scoped staff and learner administration, relationship/assignment management, and school-level operational views. Cross-school records must be excluded at query and policy level, not merely hidden in the interface.

Changes to school membership can affect authentication, teacher visibility, reports, historical ownership, and active sessions. Destructive or reassignment operations therefore need explicit validation and audit records.

## 26. System-administrator portal

System administrators manage cross-school concerns, including staff, schools, roles/permissions, content, audits, and system-level operational data. These are high-impact routes and should have the strongest authorization, validation, audit, and confirmation controls.

Content changes must preserve historical assessment/lesson snapshots. Editing current content must not silently rewrite what a learner previously saw or how an existing run is interpreted.

## 27. Realtime behavior

Laravel Reverb supports staff-facing notifications and live updates. Realtime is an enhancement to persisted state, not the system of record: after a missed event or reconnect, the client must be able to refetch current Laravel state.

The browser path derives realtime connection information from the current host. The Android app can use a separately configured API origin, so current-host assumptions may point the WebView at the wrong server. Native staff/realtime support remains unconfirmed until origin, TLS/WSS, authentication, reconnect, and background/foreground behavior are verified on a packaged app.

## 28. Content model

Academic content is managed centrally and consumed through run snapshots. The core rule is immutability of historical context:

- A new run selects current eligible content.
- The run stores or references a stable snapshot/version.
- Learner responses point to the run/task evidence.
- Later administrative edits affect future selection, not completed history.

Content-management changes must account for media references, ordering, active/inactive state, validation, duplicate identifiers, assessment and lesson consumers, TTS artifacts, and existing in-progress runs.

## 29. Database architecture

The Laravel schema is the relational source of truth. The repository currently has 35 migrations and 27 models covering these broad domains:

- Users, roles, permissions, schools, staff devices, and sessions.
- Learners, teacher assignments, enrollment, and guest-related records.
- Academic content and version/snapshot relationships.
- Diagnostic and final assessment runs, tasks, responses, and results.
- Lesson runs, activities, progress, and completion.
- Transcripts, model evidence, reviews, and scoring metadata; raw learner voice is not persisted.
- Notifications, reports, audit/operational records, and supporting data.

Production is oriented toward PostgreSQL; local development can use SQLite. SQLite success is not proof of PostgreSQL correctness because constraints, JSON behavior, indexes, types, concurrency, and SQL features differ.

The tracked `apps/api/database/database.sqlite` file is a repository hygiene and privacy risk. It remains tracked despite ignore rules and was modified in the reviewed working tree. Its values were intentionally not inspected for this documentation task. The team should determine whether it contains only disposable fixtures, remove it from version control if appropriate, and rotate any exposed secrets or personal data following an approved process.

## 30. Persistence and resume behavior

Authoritative persisted state includes sessions, content versions/snapshots, assessment and lesson runs, responses, model results, reviews, completion, profiles, and staff/audit records. Raw learner recordings are transient and are not authoritative persisted state.

Client-side state includes current screen, unsubmitted interaction state, cached API responses, playback/recording UI state, and selected presentation preferences. Native encrypted storage additionally holds the Android session token, and Offline Practice stores validated packages.

Resume behavior must follow these rules:

- Reload from the latest server run rather than reconstructing academic truth from a route.
- Do not create a duplicate run when an eligible in-progress run already exists.
- Do not resubmit an already accepted response without an idempotency/retry contract.
- Handle expired/revoked sessions before attempting protected resume calls.
- Treat local cache as stale after account changes, logout, or package version changes.

## 31. Security and privacy

### 31.1 Security controls present in the design

- Separate learner and staff session models.
- HttpOnly browser credentials and encrypted Android bearer storage.
- Absolute/idle session lifetimes, concurrency limits, revocation, and throttling.
- Role, permission, ownership, assignment, and school scoping.
- Staff device verification and email-verification workflows.
- Private media access through authorized application paths.
- Service tokens between Laravel and Python services.
- Input validation and server-owned score/progression rules.
- Audit-oriented records for sensitive staff actions.

### 31.2 High-priority security work

- Confirm production cookie flags, CORS allowlists, trusted proxies, HTTPS, and WSS.
- Store production secrets outside repository files and rotate staging/development tokens before deployment.
- Remove or formally sanitize the tracked SQLite database.
- Verify zero-retention learner-audio handling across browser memory, Laravel request temp files, ASR scratch files, logs, and database fields.
- Verify Android backup policy and device-session key handling.
- Threat-model exports, ID enumeration, school-boundary queries, and speech-upload handling.
- Limit model-service access to authenticated internal callers and bound upload/time/resource use.
- Add dependency and secret scanning to CI.

### 31.3 Research and child-data governance

The application processes learner identity, educational performance, and transient voice input. Technical tables alone do not establish a lawful research or school deployment process. Before real participant use, define and implement:

- Consent/assent and withdrawal status.
- Purpose limitation and data-minimization rules.
- A zero-retention rule for raw audio and retention schedules for derived transcripts, scores, exports, and backups.
- Deidentification/pseudonymization for research datasets.
- Authorized export workflow and audit trail.
- Deletion and correction procedures across database, files, replicas, and backups.
- Incident response and access-review responsibilities.

These requirements need project/legal/institutional approval; they cannot be inferred from code alone.

## 32. Configuration

Configuration spans multiple trust zones:

- React build-time variables for API/public origins and client behavior.
- Laravel environment for database, session, cache, queue, mail, Reverb, storage, and Python-service endpoints/tokens.
- ASR environment for model identity, quantization, device, capacity, and service authentication.
- TTS environment for model paths, device/capacity, cache/output, and authentication.
- Android build/runtime configuration for API origin, permissions, cleartext/TLS policy, package identity, and signing.
- Cloudflare/reverse-proxy configuration for public routing and trusted forwarded headers.

Never assume an `.env.example` value is production-safe. A deployable configuration inventory should state which component owns each variable, whether it is secret, its allowed values, default behavior, and whether it is required at build time or runtime.

## 33. Deployment and operational readiness

### 33.1 Current local/staging posture

The repository provides a strong developer launcher and a Cloudflare-backed staging helper. Docker-related material exists, but the reviewed setup does not yet demonstrate a complete production topology.

### 33.2 Confirmed gaps

- Model directories are excluded by `.dockerignore`, so a built model-service image will not contain required weights unless another provisioning mechanism supplies them.
- Private learner audio does not have a documented durable production volume/object-store and restore plan.
- The API container/process approach relies on `artisan serve`, which is a development server rather than a production PHP serving topology.
- Separate production supervision/topology for API, queue workers, scheduler, and Reverb is not fully defined.
- A clean PostgreSQL migration plus backup/restore rehearsal has not been evidenced.
- Production CORS, trusted proxy, HTTPS/WSS, domain, mail, storage, and Python-service network settings are not finalized.
- ASR/TTS/GPU memory, latency, concurrency, and timeout budgets are not benchmarked.
- Readiness endpoints can return HTTP 200 while their body reports `not_ready`; orchestration must inspect semantics or the endpoints should use failing status codes.
- No tracked CI/CD workflow was found.

### 33.3 Minimum production topology

A production deployment should explicitly provide:

1. Static web hosting or a production frontend server.
2. A production PHP runtime/web server for Laravel.
3. PostgreSQL with managed backups and restore verification.
4. Durable private object/file storage for learner audio.
5. Supervised queue workers and scheduler.
6. Reverb behind correctly configured secure WebSockets.
7. Authenticated ASR and TTS services with provisioned models.
8. Shared GPU coordination where services share hardware.
9. Central logs, metrics, alerting, and request correlation.
10. Secret management, TLS, network policy, and disaster-recovery procedures.

See [Pre-deployment Hosting Audit](./PRE_DEPLOYMENT_HOSTING_AUDIT.md) for the focused hosting checklist.

## 34. Testing architecture

The repository contains approximately:

| Suite                      | Count observed | Main focus                                         |
| -------------------------- | -------------: | -------------------------------------------------- |
| Laravel tests              |             70 | API, services, authorization, academic behavior    |
| Web unit/integration tests |            104 | Components, hooks, client contracts, feature logic |
| Playwright specifications  |             11 | Browser end-to-end paths                           |
| Python test modules        |              8 | ASR/TTS/runtime behavior                           |
| Game tests                 |             24 | Game rules and integration behavior                |

Counts are repository-shape indicators, not coverage percentages. High-value end-to-end scenarios still requiring explicit production-like evidence include:

- A new learner from diagnostic through all lessons and final assessment.
- Low-branch and high-branch assessment behavior.
- Session expiry/revocation during recording or submission.
- Teacher review with strict assignment/school boundaries.
- Real-device Android login, microphone, upload, playback, downloads, and reconnect.
- Reverb reconnect and stale-data recovery.
- ASR/TTS overload, timeout, and model-unavailable behavior.
- PostgreSQL clean install, upgrade, backup, and restore.

One focused mobile test currently conflicts with the Android manifest: `OfflinePracticeAndroidBackup.test.ts` forbids `MODIFY_AUDIO_SETTINGS`, while the manifest declares it. Resolve whether the permission or the test expresses the intended product policy before treating the mobile suite as fully green.

## 35. Logging, errors, and observability

Laravel, Vite/browser, Python services, queue workers, Reverb, and Android each produce separate failure signals. Production support needs correlation across them.

Recommended minimum fields are request/correlation ID, authenticated actor ID and role where safe, run/task ID, service/model version, latency, outcome category, and retryability. Do not log session tokens, raw passwords, complete personal exports, or raw learner audio payloads.

User-facing errors should distinguish:

- Permission or session failure.
- Connectivity interruption.
- Microphone/codec/capture failure.
- Invalid or too-low-quality recording.
- Model service busy/unavailable.
- Server validation conflict.
- Safe retry versus action requiring restart or staff help.

Health endpoints should separately represent process liveness and dependency/model readiness.

## 36. Representative end-to-end flows

### 36.1 Browser learner login

```text
Credentials → Laravel throttle/authenticate → server learner session
→ HttpOnly cookie → client session snapshot → protected learner routes
```

### 36.2 Android learner login

```text
Credentials → Laravel authenticate → opaque native session token
→ encrypted Capacitor storage → Authorization header on API requests
→ protected learner routes
```

### 36.3 Speech academic task

```text
Load server run/snapshot → request microphone → record/play back
→ upload to authorized Laravel task → transient ASR processing
→ delete browser/request/ASR audio → Laravel equivalence/scoring
→ persist derived response/run progress → client refetches authoritative state
```

### 36.4 Teacher evidence review

```text
Staff session/device verification → scoped learner/run query
→ authorized progress/transcript/evidence delivery
→ report and realtime invalidation
```

### 36.5 Offline Practice

```text
Signed-in Android learner → fetch package manifest
→ download files → validate schema/path/hash/size
→ store native package → practice offline
→ no academic completion or score sync
```

## 37. Ownership matrix

| Concern                        | Authoritative owner                            | Non-authoritative consumers/caches                  |
| ------------------------------ | ---------------------------------------------- | --------------------------------------------------- |
| Identity and session validity  | Laravel/database                               | React session presentation, Android encrypted token |
| Roles and permissions          | Laravel/database                               | Route visibility                                    |
| Academic content               | Laravel/database                               | Query cache, run snapshot consumers                 |
| Historical run content         | Persisted run snapshot                         | Current content editor/UI                           |
| Assessment branching and score | Laravel services                               | React feedback, reports                             |
| Lesson completion              | Laravel services/database                      | Learner dashboard cache                             |
| Raw recording                  | No durable owner; transient request processing | Temporary browser Blob and ASR scratch file         |
| Transcript/model evidence      | Python result persisted/interpreted by Laravel | Progress and evidence UI                            |
| Human review                   | Authorized Laravel workflow                    | Report/query caches                                 |
| Clara audio                    | TTS plus Laravel/private artifact policy       | Browser playback/cache                              |
| Realtime state                 | Persisted Laravel data                         | Reverb event stream                                 |
| Offline Practice package       | Validated Android local files                  | Download UI                                         |
| Offline Practice activity      | Device-local only                              | No academic consumer                                |

## 38. Risk register

| Priority | Risk                                                         | Why it matters                                            | Required direction                                    |
| -------- | ------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------- |
| Critical | Tracked modified SQLite database                             | Possible secrets or learner data in version history       | Classify, sanitize/remove safely, rotate if necessary |
| Critical | No durable private-audio plan                                | Database restore could leave academic evidence missing    | Provision storage, backup, restore, retention         |
| Critical | Incomplete production topology                               | Development processes are not resilient or secure hosting | Define and rehearse deployment architecture           |
| High     | Model weights excluded from images                           | ASR/TTS can start without being operational               | Provision/version models and test readiness           |
| High     | PostgreSQL lifecycle unproven                                | Local SQLite may hide migration/query failures            | Clean migration and restore rehearsal                 |
| High     | Network/auth/TLS config unfinished                           | Browser, Android, Reverb, and services may disagree       | Produce environment matrix and integration tests      |
| High     | No ML capacity benchmarks                                    | Recording/Clara requests may time out under use           | Benchmark and set concurrency/backpressure            |
| High     | Research governance not implemented                          | Voice and child education data are sensitive              | Approve consent, retention, export, deletion controls |
| Medium   | Readiness returns 200 when not ready                         | Orchestrators may route traffic too early                 | Correct probe status/semantics                        |
| Medium   | Staff Android/realtime assumptions                           | Packaged staff UI may call wrong origins                  | Declare unsupported or implement/test native config   |
| Medium   | Audio retention and orphan files                             | Storage growth and privacy exposure                       | Add lifecycle jobs and reconciliation                 |
| Medium   | Polymorphic review relationships lack database FK guarantees | Orphans/type mismatch can evade relational checks         | Add service validation and integrity auditing         |
| Medium   | PWA dependencies are unwired                                 | Browser offline/install claims could be misleading        | Finish service-worker design or remove claims/deps    |
| Low      | XState appears unused                                        | Dependency and conceptual overhead                        | Confirm and remove or document usage                  |
| Low      | Dual JS lockfiles and tracked temp/output artifacts          | Reproducibility and repository noise                      | Standardize tooling and clean generated files         |

## 39. Change-risk guide

| Change area            | Also inspect                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| Login/session behavior | Browser cookies, Android encrypted storage, guards, throttles, device records, logout/revocation tests |
| Assessment scoring     | Both diagnostic/final services, branch thresholds, reports, profiles, snapshots, tests                 |
| Lesson completion      | Run state, required task count, dashboard, final gate, reports, resume tests                           |
| Recording UI           | MediaRecorder codecs, permissions, upload validation, ASR inputs, retries, private storage             |
| ASR/Mu/Nu              | Python contract, Laravel client/equivalence, model config, timeouts, fixtures                          |
| Clara/TTS              | Laravel broker, Python model, generated audio lifecycle, GPU lock, playback UI                         |
| Content schema         | Admin validation, snapshots, in-progress runs, reports, TTS/media references                           |
| Staff data views       | Policies, school/assignment scopes, exports, realtime channels, audit                                  |
| Android API origin     | Auth transport, downloads, private media, Reverb, TLS/network policy                                   |
| Games                  | Host route, engine lifecycle, assets, viewport/input, learner progress contract                        |
| Database migration     | SQLite and PostgreSQL, indexes/FKs, backfill, rollback/restore, models/tests                           |

## 40. Development and verification commands

From the repository root in PowerShell:

```powershell
# Bootstrap dependencies and local prerequisites
.\scripts\bootstrap.ps1

# Start/stop local full stack
.\start.ps1
.\stop.ps1

# Start/stop Cloudflare staging helper
.\cstart.ps1
.\cstop.ps1

# Web checks
corepack pnpm --filter @readirect/web lint
corepack pnpm --filter @readirect/web typecheck
corepack pnpm --filter @readirect/web test
corepack pnpm --filter @readirect/web build

# Laravel checks (run in apps/api)
composer test
vendor/bin/pint --test

# Python service checks (run in the applicable service)
uv run pytest
uv run ruff check .

# Android debug build against staging
.\scripts\mobile-cloudflare-build.ps1 `
  -ApiOrigin "https://staging.readirect.org" `
  -SkipInstall
```

Run the smallest relevant tests while developing, then the affected suite and production build before handoff. Database, auth, academic progression, or deployment changes warrant broader validation.

## 41. Important source files

| Domain              | Starting points                                               |
| ------------------- | ------------------------------------------------------------- |
| Client routes       | `apps/web/src/App.tsx`                                        |
| Web API transport   | `apps/web/src/lib/api.ts` and adjacent session/auth modules   |
| Learner features    | `apps/web/src/features`                                       |
| Android project     | `apps/web/android` and Capacitor configuration                |
| API routes          | `apps/api/routes/api.php`                                     |
| Controllers         | `apps/api/app/Http/Controllers`                               |
| Domain services     | `apps/api/app/Services`                                       |
| Policies/middleware | `apps/api/app/Policies`, `apps/api/app/Http/Middleware`       |
| Models/migrations   | `apps/api/app/Models`, `apps/api/database/migrations`         |
| Queue jobs/events   | `apps/api/app/Jobs`, events/listeners/broadcast configuration |
| ASR/Mu/Nu           | `services/asr/app`                                            |
| TTS                 | `services/tts`                                                |
| GPU coordination    | `services/gpu-runtime`                                        |
| Games               | `games/game-alpha`, `games/game-one`, `games/game-two`        |
| Lifecycle scripts   | `start.ps1`, `stop.ps1`, `cstart.ps1`, `cstop.ps1`, `scripts` |
| Compatibility       | `docs/BROWSER_AND_MOBILE_COMPATIBILITY.md`                    |
| Hosting readiness   | `docs/PRE_DEPLOYMENT_HOSTING_AUDIT.md`                        |

## 42. Verified, inferred, and unconfirmed areas

### Verified from repository source and tests

- Four primary roles and their separated portal architecture.
- Diagnostic → six lessons → final learner journey.
- Assessment branch thresholds, weighting, and profile bands described above.
- Separate browser-cookie and Android-bearer session transports.
- Android Offline Practice package validation and noncanonical status.
- Three active games plus dormant Game Zero.
- Laravel/Reverb/queue and ASR/TTS local process layout.
- Current repository and test-suite shape counts.

### Inferred from implementation structure

- Staff experiences are intentionally browser-first.
- Run snapshots are designed to preserve historical academic content.
- Realtime events are refresh hints rather than authoritative state.
- GPU coordination is meant for colocated/shared accelerator deployment.

### Unconfirmed without deployment or real-device evidence

- Complete supported-browser and Android device/version matrix.
- Production microphone codec compatibility and long-recording limits.
- Native staff portal and Reverb behavior.
- ASR/TTS accuracy, latency, and concurrency at target load.
- Production storage durability, disaster recovery, and database restore time.
- Gmail deliverability and production domain configuration.
- Accessibility compliance under assistive technology, zoom, and text scaling.
- Formal consent, retention, deidentification, and research-export governance.

## 43. System health summary

### Strong foundations

- Clear separation between React presentation, Laravel academic authority, and Python model services.
- Rich server-owned assessment/lesson persistence and role-specific portals.
- Explicit browser versus Android authentication paths.
- Content snapshots and review/reporting concepts suited to longitudinal learner evidence.
- Broad automated-test footprint across the API, web, Python services, and games.

### Fragile or highly coupled areas

- Recording → storage → ASR → equivalence → score → report pipeline.
- Diagnostic/final shared branching and scoring behavior.
- Session behavior across cookie and native bearer transports.
- Content changes that interact with snapshots and in-progress runs.
- Deployment origins across HTTPS API, WSS realtime, private media, Android, and Python services.

### Partially implemented or operationally incomplete

- Production deployment and CI/CD.
- Durable media/model provisioning.
- Browser PWA behavior.
- Native staff/realtime support.
- Research data governance.
- Capacity and disaster-recovery validation.

### Legacy or cleanup candidates

- Game Zero.
- Guest schema without a public flow.
- Potentially unused XState dependency.
- Duplicate JavaScript lockfiles.
- Tracked SQLite and generated/temp artifacts.

## 44. Maintenance rule

Update this document whenever a change affects architecture, roles, routes, session transport, academic progression/scoring, data ownership, speech/TTS contracts, Android capabilities, deployment, persistence, or operational requirements. For narrow details, keep the focused document authoritative and link to it here rather than duplicating large procedures.
