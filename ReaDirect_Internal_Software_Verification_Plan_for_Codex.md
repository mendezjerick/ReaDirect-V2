# ReaDirect Internal Software Verification Plan

## Purpose

This document defines the internal software verification activities that must be completed before ReaDirect proceeds to external validation by IT Experts and DepEd Personnel.

Codex must use this document to generate and maintain a complete verification checklist. The checklist must cover every required test in this plan and must not omit any item.

The purpose of internal verification is to confirm that the official ReaDirect research build:

- functions according to the approved design;
- preserves learner progress and records accurately;
- handles errors and interruptions safely;
- protects learner information;
- operates on approved devices and browsers;
- performs reliably under the expected research workload; and
- is ready to be designated as the Research Release Candidate.

This plan evaluates the software implementation only. It does not determine whether ReaDirect improves reading performance and does not replace the official Comprehensive Rapid Literacy Assessment.

---

# 1. Codex Instructions

Codex must generate a checklist from this plan using the following rules.

## 1.1 Checklist Format

Each checklist item must contain:

- [ ] Test ID
- Module or component
- Test objective
- Preconditions
- Test data or account required
- Exact execution steps
- Expected result
- Actual result
- Status
- Evidence path or link
- Defect ID, when applicable
- Remarks

## 1.2 Allowed Status Values

Use only the following status values:

- `NOT TESTED`
- `PASSED`
- `FAILED`
- `BLOCKED`
- `PASSED WITH OBSERVATION`
- `NOT APPLICABLE`

## 1.3 Evidence Requirements

Each completed test must include at least one applicable form of evidence:

- screenshot;
- screen recording;
- automated test output;
- API response;
- application log;
- queue or service log;
- database record;
- exported file;
- browser console output;
- network request record;
- controlled audio sample;
- ASR output;
- generated TTS output; or
- defect report.

Codex must create a consistent evidence-folder structure and reference the correct evidence location in every checklist item.

Suggested structure:

```text
testing-evidence/
├── 01-static-analysis/
├── 02-frontend-tests/
├── 03-backend-tests/
├── 04-ai-service-tests/
├── 05-end-to-end/
├── 06-functional/
├── 07-integration/
├── 08-compatibility/
├── 09-reliability-recovery/
├── 10-security-privacy/
├── 11-performance/
├── 12-regression/
└── 13-release-summary/
```

Section 43 evidence must additionally separate `asr-queue`, `tts-queue`, `gpu-coordination`, `reverb-transport`, `broadcast-queue`, `capacity-load`, and `launcher-lifecycle` artifacts beneath the applicable AI-service, integration, reliability, security, or performance folder. Capacity evidence must retain the harness configuration, effective environment values, timestamps, response status and headers, queue snapshots, process identities, and resource measurements needed to reproduce the result.

## 1.4 Defect Handling

When a test fails, Codex must:

1. create or reference a defect record;
2. assign a severity;
3. document reproduction steps;
4. identify the affected component;
5. record the expected and actual results;
6. attach evidence;
7. mark the test as `FAILED` or `BLOCKED`;
8. retest after correction; and
9. record the final regression result.

Allowed severity values:

- `CRITICAL`
- `MAJOR`
- `MINOR`
- `COSMETIC`

## 1.5 Priority Rules

- All `P0` tests must pass before the build may proceed to external validation.
- No unresolved `CRITICAL` defect may remain.
- `MAJOR` defects affecting essential workflows must be corrected and retested.
- `P1` defects must be corrected or formally documented with an acceptable workaround.
- `P2` issues may be deferred only when they do not affect readability, task completion, data accuracy, privacy, or security.

---

# 2. Verification Scope

Internal verification covers the following areas:

1. Build and environment readiness
2. Static analysis and formatting
3. Automated frontend testing
4. Automated backend and API testing
5. Automated Python and AI-service testing
6. Database and migration verification
7. Authentication and session management
8. Role-based access control
9. Learner workflow
10. Diagnostic Assessment
11. Lessons 1–6
12. Final Assessment
13. Learning progression
14. Save-and-resume
15. Skipped activity tracking
16. Teacher module
17. Administrator module
18. Data import and export
19. Data integrity
20. Audio recording and playback
21. Nu ASR
22. Mu ASR
23. Clara AI-assisted support
24. Text-to-Speech
25. Live2D presentation
26. Game component
27. Compatibility and responsive interface
28. Accessibility
29. Reliability and recovery
30. Performance
31. Security and privacy
32. Error handling
33. Regression testing
34. Release-candidate verification
35. Release applicability and feature-scope confirmation
36. Versioned content and asset integrity
37. School-administrator workspace
38. System-administrator control plane
39. Page Portal test mode
40. Speech-administration tools
41. Game profile and persistence
42. Operational recovery, privacy governance, and deployment controls
43. Bounded inference admission, shared GPU coordination, and real-time transport

---

# 3. Build and Environment Readiness

## ENV-01 Official Build Identification — P0

Verify that the official research build is uniquely identified.

Expected result:

- application version or commit hash is recorded;
- database schema version is recorded;
- frontend, backend, ASR, TTS, and Reverb versions are recorded;
- environment configuration is documented;
- build date is recorded.

## ENV-02 Required Services — P0

Verify that all required services start successfully:

- React frontend;
- Laravel API;
- PostgreSQL;
- queue worker;
- Reverb;
- ASR service;
- TTS service;
- private storage;
- required caching services.

Expected result:

- all services start without an unresolved critical error;
- the local launcher records and supervises Reverb and the dedicated `broadcasts` queue worker;
- cloud startup does not open the tunnel until Web, API, ASR, TTS, Reverb, and the broadcast worker are ready;
- a Reverb or broadcast-worker startup failure prevents a partially ready deployment; and
- the stop scripts terminate Reverb and the broadcast worker without leaving orphaned listeners or workers.

## ENV-03 Environment Variables — P0

Verify that required environment variables exist and that secrets are not committed to the repository.

Expected result:

- required variables are present;
- missing variables produce a controlled failure;
- secrets are not exposed in source files, logs, screenshots, or client bundles.

## ENV-04 Database Connectivity — P0

Verify that the application connects to the intended PostgreSQL database.

Expected result:

- migrations are current;
- reads and writes succeed;
- the application does not silently fall back to an unintended database.

## ENV-05 Private Storage — P0

Verify that learner recordings, generated audio, and protected files use authorized private storage paths.

Expected result:

Protected files are not publicly accessible without authorization.

## ENV-06 Release Applicability Matrix - P0

Before testing begins, record every capability as `IN SCOPE`, `NOT APPLICABLE`, or `BLOCKED` for the official research build. The matrix must include Reverb and real-time events, PWA installation/service worker/offline cache, queue worker and cache backend, ASR, TTS, Live2D, Page Portal test mode, guest-account administration, speech-administration tools, and Game Zero, Game One, and Game Two.

Expected result:

- every `NOT APPLICABLE` decision is supported by approved release-scope and implementation evidence;
- every `IN SCOPE` capability has the required service, account, device, and test data; and
- no exit criterion requires a capability not in the official build.

## ENV-07 Build Manifest and Dependency Record - P0

Record the frontend, API, ASR, TTS, game, content, asset, model, voice, migration, lockfile, and dependency versions used by the research build.

Expected result:

- the build can be reproduced or unambiguously identified from the evidence; and
- the manifest includes commit hash, build date, package-lock hashes, migration list, content version, ASR/TTS model or voice versions, and dependency or SBOM evidence.

---

# 4. Static Analysis and Automated Verification

## SA-01 TypeScript Compilation — P0

Run the TypeScript compiler.

Expected result:

No unresolved compilation error remains.

## SA-02 ESLint — P1

Run ESLint across the frontend codebase.

Expected result:

No unresolved error-level violation remains.

## SA-03 Prettier Check — P2

Run the configured formatting check.

Expected result:

The codebase satisfies the approved formatting configuration.

## SA-04 Laravel Pint — P2

Run Laravel Pint.

Expected result:

Backend formatting satisfies the configured standard.

## SA-05 Ruff — P1

Run Ruff across the Python services.

Expected result:

No unresolved error-level violation remains.

## AUTO-FE-01 Frontend Unit Tests — P0

Run all Vitest unit tests.

Expected result:

All essential frontend unit tests pass.

## AUTO-FE-02 Frontend Component Tests — P0

Run React Testing Library tests.

Expected result:

Components correctly render required states, controls, labels, dialogs, loading indicators, and error states.

## AUTO-BE-01 Backend Unit Tests — P0

Run PHPUnit unit tests.

Expected result:

All essential backend unit tests pass.

## AUTO-BE-02 Laravel Feature Tests — P0

Run Laravel feature tests for:

- authentication;
- authorization;
- assessments;
- lessons;
- progression;
- teacher functions;
- administrator functions;
- imports;
- exports;
- audio and AI records.

Expected result:

All P0 feature tests pass.

## AUTO-AI-01 Python Unit Tests — P0

Run Pytest for the ASR and AI services.

Expected result:

All required service tests pass.

## AUTO-AI-02 Inference Admission and GPU Coordination Tests - P0

Run the ASR, TTS, and shared GPU-runtime queue, capacity, coordinator, deployment, cancellation, timeout, and overload tests.

Expected result:

- ASR and TTS each enforce bounded FIFO admission;
- failed, cancelled, and timed-out requests release their queue and GPU permits;
- ASR and TTS cannot execute CUDA inference simultaneously when configured for the same GPU resource key;
- duplicate service processes for one GPU resource key are rejected; and
- overload responses and capacity telemetry match the configured limits.

## AUTO-BE-03 Reverb Transport and Domain Event Tests - P0

Run the backend feature and unit tests for realtime configuration, private-channel authorization, event scope, after-commit publication, rollback suppression, queue health, and live Reverb socket health.

Expected result:

All realtime transport, event-contract, authorization-boundary, and health-monitoring tests pass.

## AUTO-E2E-01 Playwright Essential Flows — P0

Run Playwright tests for all essential user journeys.

Expected result:

All P0 browser workflows pass on the approved default browser.

## SA-06 Production Build and Asset Manifest - P0

Run the production frontend build and inspect its emitted asset manifest.

Expected result:

- the build completes without unresolved error;
- every required runtime asset, including Live2D, game, published-audio, and content assets, resolves from the official build; and
- no source map, development endpoint, test credential, or unapproved local path is exposed in the release output.

## SA-07 Dependency and License Review - P1

Run the approved dependency, vulnerability, and license review for Node, PHP, and Python dependencies.

Expected result:

- the evidence identifies the lockfiles and tool versions examined;
- unresolved findings are recorded as defects or formally accepted risks; and
- no disallowed dependency or license is included in the research release.

---

# 5. Database and Migration Verification

## DB-01 Fresh Migration — P0

Create a fresh test database and run all migrations.

Expected result:

All migrations complete successfully in the correct order.

## DB-02 Existing Database Upgrade — P0

Apply current migrations to a representative existing schema.

Expected result:

The schema upgrades without data corruption.

## DB-03 Foreign-Key Integrity — P0

Attempt invalid relationships between learners, teachers, schools, assessments, lessons, and activity records.

Expected result:

Invalid relationships are rejected.

## DB-04 Required Constraints — P0

Verify unique, non-null, range, and status constraints.

Expected result:

Invalid or duplicate records are rejected where required.

## DB-05 Transaction Rollback — P0

Force failure during a multi-step write operation.

Expected result:

The incomplete operation is rolled back and no partial committed state remains.

## DB-06 Duplicate Prevention — P0

Repeat delayed or duplicated requests.

Expected result:

No duplicate assessment run, lesson completion, achievement, import, or submission is created.

## DB-07 Audit Evidence — P1

Verify that important learner-state and administrative changes are traceable.

Expected result:

Required audit records identify the action, actor, affected record, and timestamp.

---

# 6. Authentication and Session Management

## AUTH-01 Valid Learner Login — P0

Expected result:

The learner dashboard opens and only learner-authorized functions are available.

## AUTH-02 Invalid Credentials — P0

Expected result:

Access is denied with an appropriate message.

## AUTH-03 Inactive Account — P0

Expected result:

An inactive account cannot authenticate.

## AUTH-04 Valid Teacher Login — P0

Expected result:

The teacher workspace opens with teacher-level permissions.

## AUTH-05 Valid Administrator Login — P0

Expected result:

The administrator workspace opens with authorized management functions.

## AUTH-06 Logout — P0

Expected result:

The session is terminated and protected routes cannot be reopened without authentication.

## AUTH-07 Expired Session — P0

Expected result:

The user is redirected safely to authentication without exposing protected information.

## AUTH-08 Revoked Session — P0

Expected result:

A revoked session cannot continue to access protected routes or APIs.

## AUTH-09 Concurrent Session Handling — P1

Verify behavior when the same account is used in more than one session.

Expected result:

Behavior follows the approved session policy and does not corrupt progress.

## AUTH-10 Reset or One-Time Credential Protection — P0

Expected result:

Reset tokens and one-time learner passwords are not exposed in logs, URLs, analytics, or persistent browser storage.

---

# 7. Role-Based Access Control

## RBAC-01 Learner to Teacher Route — P0

Expected result:

Access is denied without exposing teacher data.

## RBAC-02 Learner to Administrator Route — P0

Expected result:

Access is denied without exposing administrator data.

## RBAC-03 Teacher to Administrator Route — P0

Expected result:

Access is denied unless explicitly permitted.

## RBAC-04 Cross-Teacher Learner Access — P0

Expected result:

A teacher cannot access a learner outside the assigned scope.

## RBAC-05 Cross-School Access — P0

Expected result:

A user cannot access records from another unauthorized school scope.

## RBAC-06 Identifier Manipulation — P0

Modify route IDs, API IDs, query parameters, and request payload identifiers.

Expected result:

Unauthorized records remain inaccessible.

## RBAC-07 Server-Authoritative Permissions — P0

Expected result:

Changing the client interface or local state does not grant additional access.

---

# 8. Learner Workflow

## LRN-01 Dashboard Load — P0

Expected result:

The dashboard displays the correct current activity, progression state, and available actions.

## LRN-02 Immediate Progress Refresh — P0

Complete an assessment or lesson and return to the dashboard.

Expected result:

The dashboard immediately reflects the new current lesson, completion state, badges, and achievements without requiring logout, reopening, or a second navigation.

## LRN-03 Authorized Next Action — P0

Expected result:

Only the activity permitted by the documented progression rules is available.

## LRN-04 Completed Activity Handling — P1

Expected result:

Completed activities display the correct state and do not create duplicate completion records when reopened.

## LRN-05 Learner Instructions — P1

Expected result:

Instructions are visible, readable, and consistent with the activity.

## LRN-06 Loading and Processing States — P1

Expected result:

The learner can distinguish loading, listening, recording, uploading, processing, success, and error states.

---

# 9. Diagnostic Assessment

## DA-01 Start Diagnostic Assessment — P0

Expected result:

The correct instructions and first permitted item are displayed.

## DA-02 Valid Response Submission — P0

Expected result:

The response is processed and stored correctly.

## DA-03 Invalid or Incomplete Response — P0

Expected result:

The system prevents invalid submission or provides an appropriate recovery instruction.

## DA-04 Skip Behavior — P1

Expected result:

Supported skipped items are recorded accurately and the activity proceeds according to the documented rules.

## DA-05 Audio Item Handling — P0

Expected result:

Recording, playback, retry, submission, and result processing work correctly.

## DA-06 Completion — P0

Expected result:

Completion is recorded once and the next permitted activity becomes available.

## DA-07 Refresh During Assessment — P0

Expected result:

Saved progress remains accurate and no duplicate run is created.

## DA-08 Resume After Logout — P0

Expected result:

The learner resumes from the correct saved state.

---

# 10. Lessons 1–6

Codex must create separate checklist entries for every lesson.

## LES-01 to LES-06 Lesson Access — P0

For each lesson:

- verify access rules;
- verify instructions;
- verify activity ordering;
- verify audio and non-audio tasks;
- verify result storage;
- verify skip handling;
- verify navigation;
- verify completion;
- verify dashboard update;
- verify progression to the next lesson.

Expected result:

Each lesson behaves according to the documented design and produces one accurate completion state.

## LES-ASSESS-01 to LES-ASSESS-06 Lesson Assessment — P0

For each lesson assessment, test:

- correct response;
- incorrect response;
- incomplete response;
- skipped response;
- repeated submission;
- refresh;
- logout and resume;
- audio failure;
- service failure.

Expected result:

Responses and completion states are stored accurately.

## LES-NAV-01 Back and Forward Navigation — P1

Expected result:

Navigation does not lose progress or bypass required rules.

## LES-DUP-01 Duplicate Completion Prevention — P0

Expected result:

Repeated clicks or delayed requests do not create repeated completion records or achievements.

---

# 11. Final Assessment

## FA-01 Access Rule — P0

Expected result:

The Final Assessment becomes available only when permitted by the documented progression rules.

## FA-02 Valid Response Submission — P0

Expected result:

Responses and generated results are stored correctly.

## FA-03 Invalid or Incomplete Response — P0

Expected result:

Invalid submissions are prevented or handled with clear instructions.

## FA-04 Audio Processing — P0

Expected result:

Required recordings are processed and linked to the correct assessment run.

## FA-05 Completion — P0

Expected result:

The Final Assessment is marked complete once.

## FA-06 Refresh and Resume — P0

Expected result:

Saved assessment state remains accurate.

## FA-07 Final Dashboard State — P0

Expected result:

The learner dashboard immediately displays the correct final completion and achievement state.

---

# 12. Learning Progression

## PROG-01 Diagnostic to Lesson 1 — P0

Expected result:

Lesson 1 becomes available immediately after the Diagnostic Assessment is completed.

## PROG-02 Lesson-to-Lesson Progression — P0

Verify every transition:

- Lesson 1 → Lesson 2
- Lesson 2 → Lesson 3
- Lesson 3 → Lesson 4
- Lesson 4 → Lesson 5
- Lesson 5 → Lesson 6
- Lesson 6 → Final Assessment

Expected result:

The correct next activity appears immediately and unauthorized future activities remain unavailable.

## PROG-03 Progress after Refresh — P0

Expected result:

The current activity and completion state remain accurate.

## PROG-04 Progress after Logout and Login — P0

Expected result:

The correct next activity is restored.

## PROG-05 Progress after Interrupted Request — P0

Expected result:

The system resolves to one authoritative state without duplicate completion.

## PROG-06 Achievement Synchronization — P1

Expected result:

Badges and achievements update with the same authoritative completion state.

## PROG-07 Stale Client Data — P0

Simulate cached or stale client state after completion.

Expected result:

The dashboard refreshes or invalidates stale data and displays the server-authoritative progression state.

---

# 13. Save-and-Resume

## SR-01 Exit Incomplete Activity — P0

Expected result:

The latest valid saved state is restored.

## SR-02 Browser Refresh — P0

Expected result:

Progress is preserved without duplication.

## SR-03 Browser Close and Reopen — P0

Expected result:

The learner can resume from the correct state.

## SR-04 Logout and Login — P0

Expected result:

The correct saved state is restored.

## SR-05 Temporary Network Loss — P0

Expected result:

No silent loss occurs and the learner receives an appropriate recovery option.

## SR-06 Delayed Response — P1

Expected result:

The system does not overwrite newer progress with an older request.

## SR-07 Retry after Failure — P0

Expected result:

Retry succeeds without creating a duplicate run.

---

# 14. Skipped Activity Tracking

## SKIP-01 Supported Skip — P1

Expected result:

The skipped item is recorded with the correct activity, learner, and timestamp.

## SKIP-02 Skip Progression — P1

Expected result:

The activity proceeds according to the approved skip rules.

## SKIP-03 Teacher Monitoring — P1

Expected result:

Authorized teachers can view the correct skipped activity evidence.

## SKIP-04 Administrator Monitoring — P1

Expected result:

Authorized administrators can view the correct skipped activity evidence.

## SKIP-05 Duplicate Skip Prevention — P1

Expected result:

Repeated clicks do not create duplicate skip records.

---

# 15. Teacher Module

## TCH-01 Assigned Learner List — P1

Expected result:

Only assigned learners are displayed.

## TCH-02 Learner Progress View — P1

Expected result:

Displayed progress matches the database.

## TCH-03 Completed Activity View — P1

Expected result:

Completed activities are accurate and current.

## TCH-04 Skipped Activity View — P1

Expected result:

Skipped activities are accurately displayed.

## TCH-05 Assessment and Review Evidence — P1

Expected result:

Available assessment and review evidence is understandable and linked to the correct learner.

## TCH-06 Unauthorized Learner Access — P0

Expected result:

Access is denied.

## TCH-07 Teacher Data Refresh — P1

Expected result:

Recent learner changes appear without stale or conflicting information.

---

# 16. Administrator Module

## ADM-01 Create Account — P0

Expected result:

The account is created with the correct role and scope.

## ADM-02 Update Account — P0

Expected result:

Changes are stored and enforced.

## ADM-03 Activate and Deactivate Account — P0

Expected result:

Account status immediately affects authentication.

## ADM-04 Assign Role — P0

Expected result:

Permissions match the selected role.

## ADM-05 Assign School or Scope — P0

Expected result:

The assigned scope is enforced server-side.

## ADM-06 View Records — P1

Expected result:

Displayed records match stored data.

## ADM-07 Audit Actions — P1

Expected result:

Important administrative changes are traceable.

## ADM-08 Unauthorized Administrative Action — P0

Expected result:

The operation is denied and stored data is unchanged.

---

# 17. Data Import and Export

## IMP-01 Valid CSV Import — P1

Expected result:

Valid rows are processed correctly.

## IMP-02 Invalid CSV Structure — P1

Expected result:

The file is rejected with clear feedback.

## IMP-03 Invalid Row Data — P1

Expected result:

Invalid rows are rejected or handled according to the approved import rules.

## IMP-04 Duplicate Import — P1

Expected result:

Duplicate records are prevented or reported appropriately.

## IMP-05 Unauthorized Import — P0

Expected result:

The operation is denied.

## EXP-01 Authorized Export — P1

Expected result:

The exported file contains the correct selected records.

## EXP-02 Export Filtering — P1

Expected result:

Only authorized and selected data is included.

## EXP-03 Unauthorized Export — P0

Expected result:

The operation is denied.

## EXP-04 Export Accuracy — P1

Expected result:

Exported data matches the application and database records.

---

# 18. Data Integrity

## DI-01 Response Consistency — P0

Compare:

- submitted response;
- displayed result;
- API response;
- database record;
- teacher view;
- administrator view;
- export, when applicable.

Expected result:

All representations are consistent.

## DI-02 Completion Consistency — P0

Expected result:

Completion state is consistent across learner, teacher, administrator, and database records.

## DI-03 Progression Consistency — P0

Expected result:

The dashboard and server store the same authoritative next activity.

## DI-04 Achievement Consistency — P1

Expected result:

Achievements correspond to valid completed requirements.

## DI-05 Audio Reference Integrity — P0

Expected result:

Audio references remain linked to the correct learner, item, and attempt.

## DI-06 Interrupted Transaction — P0

Expected result:

No partial or contradictory data remains.

---

# 19. Audio Recording and Playback

## AUD-01 Grant Microphone Permission — P0

Expected result:

Recording controls become available.

## AUD-02 Deny Microphone Permission — P0

Expected result:

Clear instructions are shown and progress is preserved.

## AUD-03 Revoke Permission — P0

Expected result:

The system handles the change safely.

## AUD-04 Start and Stop Recording — P0

Expected result:

The recording begins and ends correctly.

## AUD-05 Playback — P0

Expected result:

The selected recording plays correctly.

## AUD-06 Retry Recording — P0

Expected result:

The previous attempt is handled according to the approved rule and the new attempt is submitted correctly.

## AUD-07 Cancel Recording — P1

Expected result:

The recording is cancelled without producing an unintended result.

## AUD-08 Empty Audio — P0

Expected result:

Empty audio is rejected or handled with a clear retry instruction.

## AUD-09 Low Volume — P0

Expected result:

Low-volume audio is identified or handled appropriately.

## AUD-10 Clipping or Unusable Audio — P0

Expected result:

Unusable audio does not produce an unsupported final result.

## AUD-11 Audio Routing — P1

Expected result:

Clara, TTS, playback, and game audio do not contaminate learner recording.

---

# 20. Nu ASR Verification

## NU-01 Supported Letter Samples — P0

Expected result:

Known-correct controlled samples resolve consistently to the expected supported letter.

## NU-02 Wrong Letter — P0

Expected result:

A clearly wrong letter is not falsely accepted.

## NU-03 Silence — P0

Expected result:

Silence resolves to the documented silence or retry outcome.

## NU-04 Unknown or Ambiguous Input — P0

Expected result:

Ambiguous input is not silently accepted as correct.

## NU-05 Unusable Audio — P0

Expected result:

Unusable audio produces the documented failure or retry outcome.

## NU-06 Deterministic Resolution — P0

Expected result:

Repeated runs using the same locked input and configuration produce the same final decision.

## NU-07 Traceability — P0

Expected result:

The final decision is traceable to raw Mu output, resolver evidence, target letter, and configuration version.

## NU-08 False Acceptance Baseline — P0

Expected result:

Locked negative fixtures do not regress into false acceptance.

## NU-09 False Rejection Baseline — P0

Expected result:

Locked positive fixtures do not regress into false rejection.

---

# 21. Mu ASR Verification

## MU-01 Word Transcription — P0

Expected result:

The raw transcript is stored and available separately from normalized output.

## MU-02 Phrase Transcription — P0

Expected result:

The transcript and final scoring evidence are generated correctly.

## MU-03 Sentence Transcription — P0

Expected result:

Omissions, insertions, replacements, and wrong-target responses are represented accurately.

## MU-04 Passage Transcription — P0

Expected result:

Required word-level accuracy, incorrect-count, timing, and speed evidence is available when supported.

## MU-05 Punctuation Handling — P1

Expected result:

Punctuation behavior follows the documented normalization rules.

## MU-06 Accepted Equivalences — P0

Expected result:

Only reviewed and configured equivalences affect the final decision.

## MU-07 Incomplete Recording — P0

Expected result:

An explicit incomplete outcome is produced.

## MU-08 Timeout — P0

Expected result:

The system produces a safe retry, review, or unavailable state.

## MU-09 Noisy Recording — P1

Expected result:

The system returns a controlled result or failure without corrupting progress.

## MU-10 Raw Evidence Preservation — P0

Expected result:

Raw service output is immutable and remains traceable to the final decision.

---

# 22. Clara AI-Assisted Support

## CLARA-01 Required Published Lines — P1

Expected result:

Required lines are available without runtime generation when designed as published audio.

## CLARA-02 Instruction Relevance — P1

Expected result:

Instructions match the current activity.

## CLARA-03 Child-Appropriate Language — P1

Expected result:

Language is understandable and appropriate for the intended learners.

## CLARA-04 Turn-Taking — P0

Expected result:

Clara stops or mutes before recording and learner playback begins.

## CLARA-05 Dynamic Feedback Boundary — P1

Expected result:

Dynamic feedback remains bounded and linked to the authoritative final result.

## CLARA-06 Failure Handling — P1

Expected result:

Service failure does not block the learner permanently or corrupt progress.

## CLARA-07 Duplicate Request Prevention — P1

Expected result:

Repeated triggers do not create overlapping generation requests.

---

# 23. Text-to-Speech

## TTS-01 Published Audio Playback — P1

Expected result:

Required published audio is available and intelligible.

## TTS-02 Dynamic Audio Generation — P1

Expected result:

Permitted dynamic audio is generated, cached, and linked correctly.

## TTS-03 Warm-Up State — P1

Expected result:

The user receives an appropriate loading state.

## TTS-04 Failure State — P1

Expected result:

A controlled fallback or unavailable message is provided.

## TTS-05 Repeated Playback — P1

Expected result:

Repeated playback remains stable.

## TTS-06 Recording Conflict — P0

Expected result:

TTS stops or mutes before learner recording begins.

## TTS-07 Private Audio Access — P0

Expected result:

Generated or published private audio requires authorized access.

---

# 24. Live2D and Game Component

## LIVE2D-01 Character Load — P2

Expected result:

The character loads without blocking the learning activity.

## LIVE2D-02 Animation State — P2

Expected result:

Animations correspond to intended states and do not interfere with controls.

## LIVE2D-03 Failure Handling — P2

Expected result:

A Live2D failure does not prevent the essential learning workflow.

## GAME-01 Optional Access — P2

Expected result:

The game remains optional and secondary.

## GAME-02 Progress Isolation — P0

Expected result:

Game state does not alter required lesson progression, assessment results, or achievements.

## GAME-03 Styling Isolation — P2

Expected result:

The game does not unintentionally modify host-system styling.

## GAME-04 Return to Main System — P1

Expected result:

Returning from the game restores the correct learner state.

## GAME-05 Portrait and Touch Behavior — P2

Expected result:

The game functions on the intended supported viewport and touch input.

---

# 25. Compatibility and Responsive Interface

Codex must generate checklist entries for every approved browser and device combination.

## COMP-01 Desktop Browser Workflow — P1

Test all P0 workflows.

## COMP-02 Tablet Browser Workflow — P1

Test learner activities, recording, playback, navigation, and responsive layout.

## COMP-03 Mobile Browser Workflow — P1

Test learner activities, recording, playback, navigation, and responsive layout.

## COMP-04 Required Viewports — P1

Expected result:

No essential control is clipped, hidden, overlapped, or unreachable.

## COMP-05 Touch Input — P1

Expected result:

Primary controls respond reliably without repeated accidental activation.

## COMP-06 Keyboard Navigation — P1

Expected result:

Primary interactive controls are reachable and usable by keyboard where applicable.

## COMP-07 Dialogs and Overlays — P1

Expected result:

Dialogs remain readable, dismissible, and within the viewport.

## COMP-08 PWA Installation — P2

Expected result:

Installation works when included in the official build.

## COMP-09 Cached Resource Behavior — P2

Expected result:

Supported cached resources behave according to the documented PWA boundary.

---

# 26. Accessibility Verification

## A11Y-01 Labels — P1

Expected result:

Important controls have understandable visible or accessible labels.

## A11Y-02 Focus Visibility — P1

Expected result:

Keyboard focus is visible.

## A11Y-03 Status Communication — P1

Expected result:

Loading, recording, processing, success, and error states are communicated clearly.

## A11Y-04 Text Readability — P1

Expected result:

Text is readable at approved viewports.

## A11Y-05 Reduced Motion — P1

Expected result:

Reduced-motion behavior does not prevent task completion.

## A11Y-06 Color Independence — P1

Expected result:

Essential meaning is not communicated by color alone.

## A11Y-07 Error Recovery Instructions — P1

Expected result:

Errors provide a clear next action.

---

# 27. Reliability and Recovery

## REL-01 Refresh During Lesson — P0

Expected result:

Progress remains accurate.

## REL-02 Refresh During Assessment — P0

Expected result:

Progress remains accurate and no duplicate run is created.

## REL-03 Browser Close During Activity — P0

Expected result:

The latest valid state can be resumed.

## REL-04 Network Loss Before Submission — P1

Expected result:

No silent data loss occurs.

## REL-05 Network Loss During Submission — P0

Expected result:

The request resolves safely to failed, pending, retried, or committed without duplication.

## REL-06 Network Loss During Audio Upload — P0

Expected result:

The learner can retry safely.

## REL-07 ASR Service Restart — P1

Expected result:

The service recovers according to the configured procedure.

## REL-08 TTS Service Restart — P1

Expected result:

The service recovers or provides a safe unavailable state.

## REL-09 Queue Worker Restart — P1

Expected result:

Committed broadcast work remains durable, resumes after the dedicated worker restarts, and does not create duplicate or lost domain changes. Failed jobs remain visible for operator review and are not replayed automatically without a safety decision.

## REL-10 Reverb Interruption — P1

Expected result:

The application preserves authoritative HTTP and database state, reports degraded realtime health, and reconnects or refreshes safely after Reverb returns without duplicating mutations or exposing stale authorization.

## REL-11 Repeated Representative Use — P1

Expected result:

No crashes, runaway retries, stalled queues, or progressive slowdown occur.

## REL-12 ASR and TTS Queue Recovery - P0

Cancel requests, force inference failures, expire queued requests, and restart each speech service while work is running and waiting.

Expected result:

- queued requests resolve to one controlled success, timeout, cancellation, or service-unavailable result;
- no timed-out or cancelled waiting request executes later;
- temporary audio and inference resources remain available only for the required lifetime;
- permits and queue slots are released after every terminal outcome; and
- a failed request does not stop subsequent admitted work.

## REL-13 Reverb Launcher Supervision - P0

Start the local and cloud launchers, then independently terminate Reverb and the `broadcasts` queue worker.

Expected result:

The launcher detects either failure, records actionable log evidence, and stops or rejects the managed stack instead of leaving cloud staging in a partially working state.

---

# 28. Performance Verification

Before running these tests, Codex must locate or request the documented performance thresholds. It must not invent thresholds.

## PERF-01 Learner Page Readiness — P1

Expected result:

The page becomes ready within the approved threshold.

## PERF-02 Staff Page Readiness — P1

Expected result:

The page becomes ready within the approved threshold.

## PERF-03 Non-Speech API Read — P1

Expected result:

The request completes within the approved threshold.

## PERF-04 Non-Speech API Write — P1

Expected result:

The request completes within the approved threshold without duplicate commits.

## PERF-05 Nu Submission Latency — P1

Expected result:

The result is returned within the approved threshold.

## PERF-06 Mu Short Submission Latency — P1

Expected result:

The result is returned within the approved threshold.

## PERF-07 Mu Passage Submission Latency — P1

Expected result:

The result is returned within the approved threshold.

## PERF-08 TTS Start Latency — P1

Expected result:

Playback starts within the approved threshold.

## PERF-09 Report Generation — P1

Expected result:

Reports load within the approved threshold using representative expected data volumes.

## PERF-10 Expected Concurrent Workload — P1

Expected result:

The system remains usable under the expected research workload.

---

# 29. Security and Privacy Verification

## SEC-01 Invalid Authentication — P0

Expected result:

Access is denied.

## SEC-02 Direct Protected Route Access — P0

Expected result:

Unauthorized access is denied.

## SEC-03 API Authorization — P0

Expected result:

Unauthorized API requests are denied.

## SEC-04 Cross-Account Access — P0

Expected result:

Another account's records are not exposed.

## SEC-05 Cross-Role Access — P0

Expected result:

Another role's functions and records are not exposed.

## SEC-06 Cross-Teacher Access — P0

Expected result:

Another teacher's learner scope is not exposed.

## SEC-07 Cross-School Access — P0

Expected result:

Another school scope is not exposed.

## SEC-08 Protected Media Access — P0

Expected result:

Recordings and generated audio require authenticated and authorized access.

## SEC-09 Input Validation — P0

Expected result:

Malformed or unsafe input is rejected without exposing internal details.

## SEC-10 File Upload Validation — P1

Expected result:

Unsupported, malformed, oversized, or incorrectly structured files are rejected.

## SEC-11 Error Information Exposure — P1

Expected result:

User-facing errors do not expose stack traces, secrets, file paths, database details, or internal configuration.

## SEC-12 Browser Storage Review — P0

Expected result:

Credentials, protected tokens, one-time passwords, and learner data are not stored insecurely.

## SEC-13 URL and Analytics Review — P0

Expected result:

Protected information is not exposed in URLs or analytics events.

## SEC-14 Repository Secret Scan — P0

Expected result:

No credential, token, private key, or protected learner record is committed.

## SEC-15 Log Review — P0

Expected result:

Logs do not expose secrets, full credentials, or unnecessary protected learner information.

## SEC-16 Export Authorization — P0

Expected result:

Exports contain only authorized information.

## SEC-17 Session Fixation and Reuse — P0

Expected result:

Invalid or terminated sessions cannot be reused.

---

# 30. Error Handling

## ERR-01 Validation Error — P1

Expected result:

The message is clear and provides a next action.

## ERR-02 API Error — P1

Expected result:

The interface displays a safe and understandable error state.

## ERR-03 Database Error — P0

Expected result:

No partial or corrupted state is committed.

## ERR-04 ASR Error — P0

Expected result:

The learner can retry or continue safely.

## ERR-05 TTS Error — P1

Expected result:

The learning activity remains usable or provides an approved fallback.

## ERR-06 Upload Error — P0

Expected result:

The learner can retry without duplicate records.

## ERR-07 Unknown Client Error — P1

Expected result:

The application fails safely and records useful diagnostic evidence without exposing protected information.

---

# 31. Regression Testing

Codex must generate a regression checklist whenever any code, configuration, migration, AI rule, prompt, model, fixture, or content change is introduced.

## REG-01 Authentication Change

Minimum regression coverage:

- login;
- logout;
- session expiration;
- protected routes;
- affected roles;
- cross-account access.

## REG-02 Assessment or Lesson Change

Minimum regression coverage:

- affected activity;
- response storage;
- progression;
- save-and-resume;
- completion;
- badges and achievements;
- teacher monitoring;
- administrator records.

## REG-03 Progression Change

Minimum regression coverage:

- every affected transition;
- immediate dashboard refresh;
- stale cache handling;
- logout and resume;
- duplicate completion prevention.

## REG-04 ASR or AI Change

Minimum regression coverage:

- recording;
- raw evidence;
- final decision;
- positive and negative fixtures;
- failure handling;
- result storage;
- progression safety.

## REG-05 Database or Import Change

Minimum regression coverage:

- migration;
- create;
- update;
- retrieve;
- duplicate prevention;
- reports;
- exports;
- rollback;
- data integrity.

## REG-06 Interface Change

Minimum regression coverage:

- affected page;
- approved viewports;
- navigation;
- readability;
- labels;
- primary controls;
- dialogs;
- recording controls.

## REG-07 Security Correction

Minimum regression coverage:

- original security test;
- related authorization paths;
- session behavior;
- protected records;
- logs;
- exports.

---

# 32. Research Release Candidate Exit Checklist

Codex must generate a final release checklist containing every requirement below.

The build may be designated as the **Research Release Candidate** only when:

- [ ] The official build version or commit hash is recorded.
- [ ] The database schema version is recorded.
- [ ] All required services start successfully.
- [ ] Reverb and the dedicated broadcast queue worker are registered, ready, supervised, and stopped by the approved PowerShell lifecycle.
- [ ] ASR and TTS bounded admission, overload, timeout, cancellation, and shared-GPU coordination tests pass.
- [ ] Realtime private-channel authorization, payload privacy, after-commit delivery, rollback suppression, capacity, rate-limit, health, interruption, and recovery tests pass.
- [ ] All P0 static and automated checks pass.
- [ ] All P0 functional test cases pass.
- [ ] All P0 authentication and authorization tests pass.
- [ ] All P0 assessment and lesson tests pass.
- [ ] All P0 progression tests pass.
- [ ] The dashboard immediately reflects completed progress, badges, achievements, and the correct next lesson.
- [ ] All P0 save-and-resume tests pass.
- [ ] All P0 data-integrity tests pass.
- [ ] All P0 audio tests pass.
- [ ] All required Nu and Mu verification tests pass.
- [ ] Clara and TTS do not interfere with learner recording.
- [ ] All P0 reliability and recovery tests pass.
- [ ] All P0 security and privacy tests pass.
- [ ] Essential workflows operate on approved browsers and devices.
- [ ] No unresolved Critical defect remains.
- [ ] Major defects affecting essential workflows have been corrected and retested.
- [ ] Required regression testing is complete.
- [ ] Test evidence is complete and organized.
- [ ] Known limitations are documented.
- [ ] The final internal verification summary is complete.
- [ ] The release applicability matrix is approved and all `NOT APPLICABLE` decisions are evidenced.
- [ ] The build manifest, dependency record, content version, ASR/TTS model or voice versions, and migration list are retained with release evidence.
- [ ] All P0 school-administrator, system-administrator, Page Portal, speech-administration, and shipped-game tests pass.
- [ ] Page Portal and other test data are isolated from research records and reported aggregates.
- [ ] Backup-and-restore verification, private-media recovery, and required retention controls pass.
- [ ] Required transport, CORS, security-header, media-validation, and authentication-abuse checks pass.

---

# 33. Required Codex Outputs

Codex must produce the following files.

## 33.1 Master Checklist

Suggested filename:

```text
internal-verification-checklist.md
```

This file must include every test in this plan as a checkable item.

## 33.2 Machine-Readable Checklist

Suggested filename:

```text
internal-verification-checklist.json
```

Each test object should include:

```json
{
  "test_id": "PROG-02",
  "title": "Lesson-to-Lesson Progression",
  "priority": "P0",
  "module": "Learning Progression",
  "preconditions": [],
  "steps": [],
  "expected_result": "",
  "actual_result": "",
  "status": "NOT TESTED",
  "evidence": [],
  "defect_ids": [],
  "remarks": ""
}
```

## 33.3 Defect Log

Suggested filename:

```text
defect-log.md
```

Each defect must include:

- Defect ID
- Title
- Description
- Severity
- Priority
- Affected module
- Build version
- Preconditions
- Reproduction steps
- Expected result
- Actual result
- Evidence
- Status
- Resolution
- Retest result
- Regression result

## 33.4 Coverage Summary

Suggested filename:

```text
internal-verification-summary.md
```

The summary must report:

- total tests;
- total P0, P1, and P2 tests;
- passed tests;
- failed tests;
- blocked tests;
- tests passed with observation;
- not-applicable tests;
- unresolved defects by severity;
- missing evidence;
- release blockers;
- Research Release Candidate decision.

## 33.5 Traceability Matrix

Suggested filename:

```text
internal-verification-traceability.md
```

The traceability matrix must map:

- requirement or component;
- test IDs;
- priority;
- automated or manual method;
- evidence;
- status;
- related defect IDs.

---

# 34. Codex Completion Rule

Codex must not mark internal verification as complete merely because automated tests pass.

Completion requires:

- automated verification;
- manual workflow verification;
- database comparison;
- controlled audio and AI testing;
- compatibility testing;
- security and privacy verification;
- evidence collection;
- defect resolution;
- regression testing; and
- completion of the Research Release Candidate Exit Checklist.

If a requirement cannot be verified from the repository or available environment, Codex must mark it as `BLOCKED`, identify the missing requirement, and state exactly what evidence, account, device, service, threshold, fixture, or documentation is needed.

---

# 35. Release Applicability and Feature-Scope Confirmation

The verification record must not assume that every installed package or launcher service is an enabled research-release capability. Before execution, the test lead must approve the ENV-06 applicability matrix and attach it to the release evidence.

## SCOPE-01 Reverb and Real-Time Applicability - P0

Verify whether the official build uses real-time events or Reverb.

Expected result:

- when real-time functionality is in scope, startup, connection, authorization, interruption, and recovery are tested;
- when it is not in scope, the matrix records `NOT APPLICABLE` and the release does not claim real-time behavior; and
- a service started by a launcher is not treated as a release dependency without implementation evidence.

## SCOPE-02 PWA and Offline Applicability - P0

Verify whether the official build registers a service worker or supports installation/offline caching.

Expected result:

- when PWA functionality is in scope, COMP-08 and COMP-09 are executed for the actual service-worker and cache behavior; and
- when it is not in scope, COMP-08 and COMP-09 are marked `NOT APPLICABLE` with evidence that no PWA runtime is released.

## SCOPE-03 Game and Optional-Feature Inventory - P1

Record the exact games, Live2D modes, staff tools, guest functions, and Page Portal functions shipped in the build.

Expected result:

Every public route, optional feature, and feature flag in the official build maps to at least one test or an approved `NOT APPLICABLE` decision.

---

# 36. Versioned Content and Asset Integrity

## CNT-01 Content Package Schema and Identity - P0

Validate every released assessment and lesson content file against the approved schema.

Expected result:

- required fields are present;
- item IDs are unique and stable;
- unsupported, duplicate, malformed, or orphaned rows are rejected or detected; and
- the recorded content version is the version used by the learner and ASR/TTS services.

## CNT-02 Content Ordering and Mapping - P0

Verify assessment part, lesson, mission, item, target text, expected answer, progression rule, and displayed instruction mappings.

Expected result:

The learner sees the approved item sequence and the stored response is linked to the same content identity and version.

## CNT-03 Published Speech and Asset Coverage - P0

Verify the released speech catalog and asset manifest against all required learner activities.

Expected result:

- each required published line and referenced asset exists, is intelligible or renderable, and resolves from the release build;
- no asset path points outside the approved private/public storage boundary; and
- missing, duplicate, or mismatched speech keys are detected before release.

## CNT-04 Fixture and Equivalence Baseline Version - P0

Record the approved positive, negative, noisy, silence, and ambiguous audio fixtures, together with the ASR resolver and equivalence-rule version.

Expected result:

The same locked corpus can be used to reproduce the Nu and Mu baseline results and distinguish a model or rule change from a test-data change.

---

# 37. School-Administrator Workspace

Codex must create a separate checklist entry for each implemented school-administrator function and execute it using at least two schools.

## SCH-01 School Setup and Profile - P0

Verify first-time school setup, profile update, validation failure, duplicate-name handling, audit evidence, and immediate scope enforcement.

Expected result:

Only an authorized school administrator can create or modify the assigned school profile, and changes are reflected consistently in staff and learner records.

## SCH-02 Teacher Creation and Class Assignment - P0

Verify teacher creation, temporary credentials, grade/section assignment, reassignment, invalid assignment rejection, and audit evidence.

Expected result:

The teacher can access only the assigned class after the change is committed, and previous scope is not retained.

## SCH-03 School-Scoped Learners and Detail - P0

Verify school learner lists and learner-detail views, including direct identifier manipulation.

Expected result:

Only records for the current school are returned; learner results, audio references, and identifying data from another school are never exposed.

## SCH-04 Reports, Insights, and Teacher Dashboards - P1

Verify totals, filters, empty states, review indicators, reading-profile summaries, and refresh behavior in school reports, instructional insights, and teacher dashboards.

Expected result:

Displayed aggregates reconcile with authorized source records and exclude Page Portal/test accounts where configured.

---

# 38. System-Administrator Control Plane

## SYS-01 Directory and Monitoring Views - P1

Verify system-administrator school, teacher, learner, guest, operations, monitoring, and games-and-players views.

Expected result:

Counts, statuses, timestamps, filters, and links reconcile with database records without exposing secret values or unnecessary protected payloads.

## SYS-02 Guest Account Access Control - P0

Verify guest activation and deactivation, current-session revocation, reactivation, concurrent update behavior, and audit logging.

Expected result:

Deactivation immediately prevents further authorized use, revokes active guest sessions as designed, and preserves a complete audit record.

## SYS-03 School-Administrator Provisioning - P0

Verify creation of school-administrator accounts, temporary credentials, role/school assignment, duplicate prevention, invalid input handling, and audit evidence.

Expected result:

The created administrator receives only the intended role and school scope.

## SYS-04 Audit-Log Privacy and Traceability - P0

Verify audit entries for authentication, account and scope changes, Page Portal actions, guest changes, speech-rule changes, staff review, and operational actions.

Expected result:

- logs identify actor, action, target, and timestamp where required; and
- logs do not contain plaintext credentials, bearer tokens, protected audio, full private payloads, or unnecessary learner information.

## SYS-05 Read-Only Learning and AI Configuration Views - P1

Verify the implemented assessment, lesson, rule/threshold, AI-service, agent-setting, and prompt-template views.

Expected result:

Displayed configuration matches the released configuration and unauthorized roles cannot read it.

---

# 39. Page Portal Test Mode

## PORTAL-01 Authorized Launch and Target Routing - P0

Verify launch of each supported Page Portal target using an authorized system administrator.

Expected result:

The portal issues only the intended short-lived learner session and opens the requested permitted target.

## PORTAL-02 Standard-Session and Portal Isolation - P0

Verify login and concurrent-session behavior while a Page Portal run is active.

Expected result:

The protected portal learner cannot be used through an unauthorized standard session, and portal state cannot be used to access another learner.

## PORTAL-03 Expiry, Reset, and Research Isolation - P0

Verify portal expiry, reset, interrupted launch, repeated reset, and reporting/analytics treatment.

Expected result:

- reset returns the designated test learner to the documented baseline without affecting real learner records;
- expired or revoked portal sessions cannot continue; and
- portal/test data is excluded from research and school/teacher aggregates when configured.

---

# 40. Speech-Administration Tools

## SPADMIN-01 Nu Sandbox and Controlled Letter Review - P0

Verify the isolated-letter sandbox using approved positive, negative, silence, ambiguous, and unusable fixtures.

Expected result:

The displayed resolver evidence, target, final decision, fixture version, and stored attempt remain consistent and restricted to authorized administrators.

## SPADMIN-02 Mu Sandbox and Transcript Review - P0

Verify Mu sandbox upload, transcript, normalization, noise-reduction indicator, expected-text comparison, review decision, and stored evidence.

Expected result:

Raw output remains separately traceable, user-provided expected text is validated, and a failed service produces a controlled state without an unsupported decision.

## SPADMIN-03 Equivalence Rule Governance - P0

Verify creating, viewing, activating, deactivating, and applying an equivalence rule.

Expected result:

- only an approved expected-correct review can create a rule where required;
- rule scope, reason, actor, timestamp, and active state are traceable; and
- only active reviewed rules affect final scoring.

## SPADMIN-04 Confusion Matrix and Noise-Reduction Control - P1

Verify authorized filtering/export or display of raw confusion data and the conditional Mu noise-reduction control.

Expected result:

The selected configuration is persisted, visible to authorized staff, auditable, and does not silently alter locked baseline evidence.

---

# 41. Game Profile and Persistence

## GAME-06 Lobby and Profile Lifecycle - P1

Verify game lobby access, profile creation/retrieval, available-game catalog, unauthenticated access denial, and return to the learner system.

Expected result:

The profile belongs only to the authenticated learner and does not alter required learning progression.

## GAME-07 Per-Game Route Coverage - P1

Create distinct entries for every game in the official build, including Game Zero, Game One, and Game Two when shipped.

Expected result:

Each route follows the approved availability, orientation, input, error, and return-to-host behavior; unshipped games are marked `NOT APPLICABLE` under ENV-06.

## GAME-08 Save, Resume, Reset, and Revision Conflict - P0

Verify save/load, browser restart, explicit reset, duplicate request, stale expected revision, and concurrent-device update behavior.

Expected result:

The server preserves one authoritative game state, returns a controlled conflict for stale writes, and never overwrites a newer save silently.

## GAME-09 Save Contract and Privacy - P0

Verify invalid save schema/content version, malformed state, oversized state, forbidden identity or credential fields, cross-learner access, and reset authorization.

Expected result:

Invalid data is rejected without partial commit, and a game save never stores credentials or unauthorized learner identity data.

---

# 42. Operational Recovery, Privacy Governance, and Deployment Controls

## OPS-01 Backup and Restore - P0

Restore a representative database backup and protected-audio backup into an isolated verification environment.

Expected result:

Restored records, media references, authorization boundaries, and audit evidence remain consistent, and no production/research data is overwritten during the test.

## OPS-02 Seed and Migration Repeatability - P1

Run the approved seed and migration procedure more than once in an isolated environment.

Expected result:

The procedure is deterministic, does not create unintended duplicates, and documents any intentionally non-idempotent operation.

## OPS-03 Storage and Service Failure Boundaries - P1

Simulate unavailable private storage, insufficient storage capacity, corrupt media, and ASR/TTS health-check failure.

Expected result:

The application reports a safe recovery state, does not claim success, and does not commit contradictory learner results.

## OPS-04 Time, Retention, and Test-Data Controls - P0

Verify time-zone handling for session expiry, portal expiry, reports, and audit timestamps; verify the approved retention/deletion procedure; and verify test-account identification and exclusion.

Expected result:

- expiry and audit times are accurate and consistently displayed;
- retained or deleted protected data follows the approved policy; and
- Page Portal, demo, fixture, and other test data cannot contaminate research records or reported outcomes.

## SEC-18 Transport and Browser Security Headers - P0

Verify the deployment uses approved HTTPS/TLS behavior and appropriate transport, framing, content-type, referrer, and permissions-policy protections.

Expected result:

The browser does not accept downgraded or unsafe delivery of authenticated learner/staff functions, and missing required headers are recorded as release defects.

## SEC-19 CORS, Origin, and Cross-Site Request Behavior - P0

Verify allowed and disallowed origins, methods, headers, credentials, and cross-site requests for all authenticated API classes.

Expected result:

Only approved origins and request patterns can access protected APIs; a cross-origin request cannot use a learner or staff token to read or mutate protected data.

## SEC-20 Authentication Abuse and Rate Limits - P1

Verify learner and staff login throttling, repeated invalid credentials, token guessing, and protected mutation retry behavior.

Expected result:

Abuse receives a controlled response without account disclosure or service exhaustion, while legitimate recovery remains possible according to the approved policy.

## SEC-21 Media Upload Content Validation - P0

Verify actual media signature/type, corrupt or empty data, unsupported encoding, excessive duration/size, misleading filename, and path-traversal attempts for every audio-upload endpoint.

Expected result:

Only approved audio reaches private storage or ASR/TTS processing, and rejected uploads leave no accessible file or partial result.

## PERF-11 Representative Device and Network Profiles - P1

Run the approved performance tests under documented device, browser, bandwidth, latency, and cold/warm service conditions.

Expected result:

Every performance measurement records its profile and is evaluated only against an approved threshold.

## PERF-12 Storage and Report Data Volume - P1

Measure private-media upload/retrieval and report/dashboard generation using representative expected data volumes.

Expected result:

The application remains usable, returns correct aggregates, and does not expose another scope while operating at the documented research workload.

---

# 43. Bounded Inference Admission, Shared GPU Coordination, and Real-Time Transport

These tests verify the backend capacity and realtime controls used by the current single-host research deployment. Codex must record the effective environment values, selected CPU or CUDA device, GPU resource key, process count, queue limits, timeouts, Reverb limits, and warning thresholds with the evidence. A configured limit must not be treated as verified without an automated test or controlled live-capacity result.

## INFQ-01 ASR FIFO and Concurrency Boundary - P0

Submit concurrent Nu and Mu inference requests through all ASR routes while instrumenting start and completion order.

Expected result:

- every ASR inference route uses the same bounded queue;
- admitted waiting work begins in FIFO order;
- active inference never exceeds `ASR_INFERENCE_CONCURRENCY`;
- the event loop and readiness endpoint remain responsive while inference is running; and
- each completed response records its queue-wait measurement where defined.

## INFQ-02 ASR Saturation and Timeout - P0

Fill the active ASR slot and every configured waiting slot, submit one additional request, and separately hold the worker until a waiting request exceeds `ASR_QUEUE_WAIT_TIMEOUT_SECONDS`.

Expected result:

- work beyond `ASR_QUEUE_MAX_WAITING` receives controlled HTTP `503` with the configured `Retry-After` value;
- a waiting request that reaches its deadline does not execute later;
- overload and timeout do not crash or duplicate the service process; and
- queue depth, saturation, available slots, and cumulative rejection telemetry reconcile with the submitted workload.

## INFQ-03 TTS FIFO and Shared Route Boundary - P0

Submit concurrent uncached synthesis and warm-up requests to VoxCPM2 while instrumenting execution order.

Expected result:

- synthesis and warm-up share one bounded FIFO queue;
- only one local VoxCPM2 inference operation executes at a time;
- the event loop and health endpoint remain responsive; and
- successful synthesis reports the queue-wait measurement in the approved response metadata.

## INFQ-04 TTS Saturation and Timeout - P0

Fill the active TTS slot and every configured waiting slot, submit one additional uncached request, and separately exceed `TTS_QUEUE_WAIT_TIMEOUT_SECONDS`.

Expected result:

- work beyond `TTS_QUEUE_MAX_WAITING` receives controlled HTTP `503` with the configured `Retry-After` value;
- timed-out waiting work never reaches VoxCPM2;
- failed synthesis releases capacity for the next request; and
- health and capacity telemetry reconcile with the submitted workload.

## INFQ-05 Cancellation and Resource Lifetime - P0

Cancel one waiting request and one running request for each speech service, including an ASR upload backed by temporary audio.

Expected result:

- cancelled waiting work is removed and never executes;
- running work reaches one controlled terminal cleanup path;
- an ASR request does not delete audio while its admitted inference still needs the file;
- no queue slot, GPU permit, file handle, or temporary file leaks after cleanup; and
- later admitted requests still complete.

## GPUQ-01 Cross-Service GPU Serialization - P0

Run one real ASR inference request and one uncached TTS request concurrently while both services use CUDA and the same `READIRECT_GPU_RESOURCE_KEY`.

Expected result:

- ASR and TTS never execute GPU inference simultaneously;
- the OS-backed permit is released after success, error, cancellation, timeout, and process exit;
- cross-service waiting is bounded by `READIRECT_GPU_PERMIT_TIMEOUT_SECONDS`; and
- the validation evidence records GPU utilization and the approved minimum free-memory headroom throughout the sample.

## GPUQ-02 Process and Deployment Guard - P0

Attempt to start duplicate ASR or TTS service processes for one GPU resource key, multiple local inference workers with GPU coordination enabled, mismatched resource keys for one shared GPU, and an unbounded queue configuration.

Expected result:

Startup or deployment validation rejects each unsafe configuration with an actionable error before model workload is accepted. One service process per service and GPU resource key remains the supported single-GPU topology.

## GPUQ-03 Capacity Telemetry and CPU Mode - P1

Compare `/health` and `/ready` capacity data with live queue state in CUDA mode and CPU fallback mode.

Expected result:

- local concurrency, waiting limit, admitted limit, running count, waiting count, available slots, saturation, rejection count, and GPU coordination state are internally consistent;
- CUDA mode reports the shared GPU policy; and
- CPU mode does not claim or wait for a GPU permit.

## RT-01 Reverb Bootstrap and Local Lifecycle - P0

Run the approved bootstrap, local start, and local stop PowerShell procedures from a clean dependency state.

Expected result:

- Laravel package discovery registers `reverb:start`;
- Reverb listens only on the configured internal port;
- one dedicated database queue worker processes only the `broadcasts` queue;
- `.runtime/services.json` records both processes with verifiable process identities;
- the launcher supervises both processes; and
- shutdown removes both processes, listeners, and runtime manifest state.

## RT-02 Cloud Startup and Exposure Boundary - P0

Run cloud startup with healthy services, then repeat with Reverb unavailable and with the broadcast worker unable to start. Inspect the generated Cloudflare ingress configuration.

Expected result:

- the tunnel starts only after Web, API, ASR, TTS, Reverb, and the broadcast worker are ready;
- failure of either realtime process prevents cloud readiness;
- the public hostname routes through the approved same-origin Web path;
- Reverb, API, ASR, TTS, PostgreSQL, and their internal ports are not exposed as direct tunnel origins; and
- logs identify the failed readiness condition without revealing secrets.

## RT-03 Staff Authentication and Channel Scope - P0

Request realtime configuration and private-channel authorization as an unauthenticated user, learner, teacher, school administrator, and system administrator. Attempt role, school, teacher, and identifier manipulation.

Expected result:

- only an active authorized staff session receives transport configuration;
- each staff user can authorize only channels within the authenticated role and data scope;
- cross-teacher, cross-school, cross-role, learner, and unauthenticated subscriptions are denied; and
- denial responses do not reveal protected channel data or another scope's identifiers.

## RT-04 Event Contract and Payload Privacy - P0

Capture each released staff realtime event type and inspect its serialized payload and channel fan-out.

Expected result:

- every event contains only the approved topic names, event UUID, contract version, and timestamp;
- no learner record, credential, token, transcript, recording, private-media path, or full mutation payload is broadcast;
- one domain change creates the documented system, school, or teacher scope signals without duplicate jobs; and
- the client must retrieve authoritative data through its normal authenticated API after receiving a refresh signal.

## RT-05 Transaction Boundary and Durable Queue - P0

Perform representative learner-progress and staff-administration mutations inside successful, failed, and rolled-back database transactions while inspecting the `broadcasts` queue.

Expected result:

- a committed mutation enqueues its event only after commit;
- a rolled-back or failed mutation publishes no signal;
- an unavailable Reverb server does not roll back an already committed domain mutation;
- queued broadcasts remain available for the worker after a controlled restart; and
- retries do not recreate the underlying domain mutation.

## RT-06 Health, Backlog, and Failure Telemetry - P0

Observe system-administrator realtime health with Reverb online and offline, then create controlled ready, processing, delayed, old, and failed jobs in the `broadcasts` queue.

Expected result:

- Reverb health is based on a live socket check rather than configuration alone;
- queue depth, oldest-job age, processing, delayed, and failed counts reconcile with database records;
- health becomes degraded at the configured pending-depth or oldest-age threshold and whenever a broadcast job has failed;
- broadcasting-disabled state is reported distinctly; and
- telemetry does not expose job payloads, credentials, or learner information.

## RT-07 Connection Capacity - P0

Open authorized subscribed staff WebSocket clients up to and beyond `REVERB_APP_MAX_CONNECTIONS` using a controlled load harness.

Expected result:

- no more than the configured number of subscribed connections is accepted;
- excess clients receive the controlled Reverb connection-limit response;
- accepted clients remain responsive and isolated to their authorized channels; and
- API, ASR, TTS, queue-worker, and database health remain within approved thresholds during the test.

For the current single-host profile, evidence must reproduce or supersede the baseline of 250 accepted subscribed clients and five controlled rejections from 255 attempts. Any increase requires a new load test and deployment-capacity approval.

## RT-08 Origin, Message Size, Client Events, and Rate Limit - P0

Attempt connections from every allowed origin and representative disallowed origins; send an oversized message, a client-originated application event, and more than the configured message count inside the rate-limit window.

Expected result:

- only exact approved origins connect;
- messages larger than `REVERB_APP_MAX_MESSAGE_SIZE` are rejected;
- client-originated application events cannot mutate or publish application data;
- a client exceeding `REVERB_APP_RATE_LIMIT_MAX_ATTEMPTS` during `REVERB_APP_RATE_LIMIT_DECAY_SECONDS` is controlled or disconnected according to configuration; and
- abusive traffic does not degrade authorized clients or bypass channel authorization.

## RT-09 Disconnect, Reconnect, and Authoritative Refresh - P1

Interrupt the browser connection before, during, and after a committed domain change; restart Reverb; then restore connectivity.

Expected result:

- no authoritative domain state depends on receipt of a WebSocket signal;
- the staff client reconnects according to the approved policy or recovers through a full authenticated refresh;
- missed signals do not produce permanent stale state;
- reconnect does not duplicate mutations or subscriptions; and
- authorization is re-evaluated after logout, session revocation, role change, or scope change.

## RT-10 Single-Host Scaling Boundary - P0

Inspect runtime configuration and attempt deployment validation for an unapproved multi-host or multi-Reverb topology.

Expected result:

Reverb scaling remains disabled for the single-host research profile. A multi-host deployment is blocked until a shared pub/sub design, cross-host authorization review, capacity test, failure-recovery test, and approved operational procedure are supplied.
