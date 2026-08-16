# ReaDirect Respondent 2 Local Retest

Retest date: 2026-08-16  
Scope: local repository, local Laravel API, local Vite/Playwright application  
Deployment status: no pilot or production deployment occurred

## 1. Scope

This document records Phase D verification only. It evaluates whether the Phase A
Diagnostic transport correction, Phase B Guest guard, and Phase C bounded recovery
changes address Respondent 2's actionable local blockers. No application behavior was
changed during Phase D. The only Phase D changes are QA coverage in
`apps/web/tests/end-to-end/phase-c-recovery.spec.ts` and this document.

The result is local evidence, not pilot evidence. A real disposable learner and the
deployed pilot network topology were not used, so valid-cookie browser behavior is
supported by Laravel/transport fixtures and remains a pilot retest requirement.

## 2. Phase A Verification

| Case                                                    | Local result                     | Evidence / limitation                                                                                                                                    |
| ------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 fresh valid login -> dashboard -> Diagnostic         | PASS in isolated fixtures        | Learner login/dashboard browser flow, assessment page tests, and Laravel assessment/auth suites pass; a real disposable browser learner was not created. |
| A2 restored valid learner -> Diagnostic                 | PASS in focused coverage         | Learner restore/auth tests and transport tests pass; timeout coverage preserves stored session.                                                          |
| A3 direct authenticated Diagnostic route                | PASS in route/component coverage | Direct page startup and 401-to-login behavior are covered; deployed-cookie browser ordering remains pilot work.                                          |
| A4 Part Two remains credentialed                        | PASS                             | `DiagnosticTransport.test.ts` and Part Two API/page tests pass.                                                                                          |
| A5 Diagnostic readiness/Clara calls remain credentialed | PASS                             | Activity manifest/readiness and Clara transport assertions pass.                                                                                         |
| A6 Learn With Clara authenticated calls                 | PASS                             | Letters transport test passes with credentials and bearer preserved.                                                                                     |
| A7 connectivity/session probe                           | PASS                             | Connectivity probe tests pass with explicit probe timeout and auth classification.                                                                       |
| A8 sentinel without cookie                              | PASS negative                    | Laravel Part One test returns 401.                                                                                                                       |
| A9 invalid token                                        | PASS negative                    | Laravel learner auth/security coverage rejects unusable bearer values.                                                                                   |
| A10 malformed token                                     | PASS negative                    | Malformed bearer tests return 401 with a bearer challenge.                                                                                               |
| A11 expired session                                     | PASS negative                    | Part One expired-session test returns 401.                                                                                                               |
| A12 revoked session                                     | PASS negative                    | Part One revoked-session test returns 401.                                                                                                               |
| A13 logged-out learner                                  | PASS negative                    | Logout followed by Diagnostic start returns 401.                                                                                                         |
| A14 foreign learner/run                                 | PASS negative                    | Foreign learner mutation is denied; ownership tests remain green.                                                                                        |
| A15 valid native bearer                                 | PASS                             | Existing native bearer transport assertions and Laravel auth coverage remain green.                                                                      |
| A16 repeated Diagnostic start/resume                    | PASS                             | Repeated Part One start returns the same run and keeps one active run in the isolated test.                                                              |

The targeted Laravel set covering these cases passed 119 tests and 1,117 assertions.

## 3. Phase B Verification

Guest behavior is correctly treated as unavailable rather than public functionality:

- Anonymous `/learner/games` reaches the unavailable state without a Guest API request.
- No fake durable Guest handle, persistence, or setup API is presented.
- Learner Login and Back actions remain usable.
- Direct anonymous game entry returns to the safe unavailable flow.
- Authenticated learners retain the normal lobby.
- Existing authenticated Game One and supported Game Two lobby entries were not changed
  during Phase D.

`GameLobbyGuestAccess.test.tsx` and the Guest browser suite pass. The browser Guest
suite passed 3/3 once, and the repeated run passed both repetitions (6/6 Guest tests).
No public Guest account system was added.

## 4. Phase C Verification

The shared transport tests confirm normal JSON success, the 12-second normal ceiling,
caller cancellation, credential inclusion, Authorization preservation, FormData
preservation, and API-origin resolution. Speech/TTS paths retain their separate
longer budget; no ASR/TTS/audio-upload path was changed to the normal JSON ceiling.

Learner restore/login tests cover success, 401/auth-required behavior, wrong-credential
messages, timeout/network/5xx recovery, form re-enable, identifier retention, and safe
retry. Diagnostic Part One and Part Two tests cover bounded startup, Retry, Back, and
distinct 401 navigation. Clara tests cover settings failure and static fallback after
the intended Live2D bound. Game Alpha's startup bound and rules tests pass; Game One's
host transport is covered by the shared web build/tests. Staff transport uses the same
normal policy without redesigning Staff/Admin pages.

## 5. Repeated-Use Results

The repeated local browser command ran Phase C recovery, Guest, and Staff teacher flows
with `--repeat-each=2`: 14/14 tests passed. This exercised repeated learner login
timeout recovery, Clara fallback, Guest unavailable/lobby entry, phone-landscape retry
reachability, and Staff read/navigation flows.

Observed behavior showed no duplicate request-driven run, loading loop, navigation loop,
uncaught page exception, or stale retry state in those repeated flows. Academic data was
not generated for repetition.

## 6. Performance / Readiness

Five local samples per endpoint were collected with `curl.exe` against the local API:

| Endpoint                                | Statuses |                           Samples (ms) |    Range (ms) |
| --------------------------------------- | -------- | -------------------------------------: | ------------: |
| `/up`                                   | 200 x5   | 219.07, 227.46, 240.21, 213.08, 216.36 | 213.08–240.21 |
| `/api/experience/intro/settings`        | 200 x5   | 249.02, 230.66, 248.95, 218.75, 225.29 | 218.75–249.02 |
| `/api/learners/session` unauthenticated | 401 x5   | 202.64, 233.02, 226.91, 222.12, 237.92 | 202.64–237.92 |
| `/api/staff/session` unauthenticated    | 401 x5   | 207.10, 212.86, 237.43, 205.92, 225.02 | 205.92–237.43 |

These are FAST local responses, not a new SLA. They are within the earlier sampled
approximately 0.19–1.05 second range. Unresolved requests are classified as timed out
with recovery rather than silently treated as slow success. Authenticated mutation and
speech performance was not benchmarked without an approved disposable pilot fixture.

## 7. Security Regression

The targeted security/ownership suite and the full Laravel suite preserve the following:

- sentinel-only, invalid, malformed, expired, revoked, idle-expired, and logged-out
  sessions remain rejected;
- HttpOnly browser-cookie resolution works only with the sentinel plus authoritative
  cookie;
- native bearer behavior remains supported;
- learner ownership and foreign-run access remain enforced;
- Staff/Admin and teacher/school boundaries remain covered by the targeted role suites;
- no Guest authorization bypass was introduced;
- Phase C timeout handling has no auth fallback and does not clear a valid session solely
  because a request timed out;
- Phase D added no token/secret logging or authentication behavior.

No destructive or offensive testing was performed.

## 8. Admin Overview Regression

Laravel `SystemAdminOverviewTest` and `SchoolAdminOverviewDataTest`, plus focused web
School Admin/System Admin page tests, passed in the targeted set. No Admin dashboard
layout, charts, metrics, aggregation, responsive rules, or role scope were changed in
Phase D.

The existing System Admin browser fixtures for school-administrator and page-portal
routes did not reach their expected heading in this local run. They remain classified as
fixture/navigation-baseline blockers, not silently converted into a pass; the focused
API/page coverage remains green and no Admin code was changed.

## 9. Browser / Responsive Verification

Actual Playwright coverage:

- desktop, tablet (768px), and phone portrait (390px): Phase C recovery matrix 6/6;
- dedicated phone landscape (844x390): Retry remains reachable and document width has
  no horizontal overflow, 1/1;
- desktop intro flow: 1/1;
- desktop Guest entry: 3/3;
- desktop Staff teacher flow: 1/1;
- repeated desktop recovery/Guest/Staff flows: 14/14.

The recovery checks verified visible Retry/error states, Clara static fallback, safe
login/Back affordances, and no endless loading in the target scenarios. System Admin
browser navigation remains blocked by the existing fixture/route mismatch described in
Section 8.

## 10. Automated Test Results

Passed:

- targeted Laravel auth/assessment/ownership/Staff/Admin set: 119 tests, 1,117 assertions;
- full Laravel suite: 353 passing tests out of 362;
- focused web regression suite: 72 tests across 12 files;
- focused Phase C transport/recovery suite: 41 tests across 6 files;
- Game Alpha rules: 10 tests;
- repeated browser recovery/Guest/Staff: 14 tests;
- browser matrix recovery: 6 tests plus phone-landscape 1 test;
- ESLint on the Phase D test: pass;
- Prettier on the Phase D test: pass;
- Vite production build: pass, with existing large-chunk warnings.

The broad web Vitest command exceeded four minutes without a completed result. The
isolated `GameSkeletonFlow.test.tsx` fails before tests load because the current harness
cannot resolve `react-reconciler/constants` for `@pixi/react`.

## 11. Known Pre-Existing Failures

These were not fixed during Phase D:

- Game One package export/typecheck and host typing errors;
- stale Game One route-test typing and stale real-token E2E fixture;
- Game One save-contract `restoreTutorialProgress` runtime failures (3 tests);
- `@pixi/react` / `react-reconciler/constants` harness resolution;
- Filipino TTS source/catalog mismatch (7 errors plus 2 catalog-count failures in the
  full Laravel run);
- existing System Admin browser fixture/navigation heading failures;
- unrelated stale TTS catalog-count failures.

They are PRE-EXISTING / OUT OF SCOPE unless a later investigation proves direct Phase A,
B, or C causation.

## 12. Academic Sequence — Open Specification Conflict

The conflict remains OPEN — PRODUCT/ACADEMIC AUTHORITY REQUIRED.

The evaluator/manuscript describes Diagnostic -> Lesson 1 -> Lesson 2 -> Lesson 3 ->
Lesson 4 -> Lesson 5 -> Lesson 6 -> Final, while the current implementation exposes
Lessons 1–6 independently after Diagnostic and gates Final after all six. Phase D did
not alter lesson access, `current_required_lesson_order`, completion, Final access,
scoring, or progression state.

## 13. Respondent 2 Re-Evaluation Matrix

| Evaluation area                      | Original rating | Local status                                                   | Evidence                                                                       |         Provisional local rating | Confidence | Remaining action                                               |
| ------------------------------------ | --------------: | -------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------: | ---------- | -------------------------------------------------------------- |
| Authentication/session behavior      |             2/5 | Corrected locally                                              | 119 targeted Laravel tests; valid cookie/sentinel and negative auth coverage   |                      4/5 locally | High       | Repeat with disposable deployed learner                        |
| Diagnostic accessibility/integration |             2/5 | Corrected in focused local coverage                            | Credentialed Part One/Two transport, 401 distinction, retry/start-resume tests |                      4/5 locally | Medium     | Fresh/restored/direct browser pilot matrix                     |
| Error recovery                       |             1/5 | Corrected in target flows                                      | 12-second normal bound; Retry/Back/login; Clara/Game Alpha fallback            |                      4/5 locally | High       | Verify real service failures in pilot                          |
| Page readiness                       |             2/5 | Improved; no target infinite state observed                    | Recovery browser matrix and repeated runs                                      |                      4/5 locally | Medium     | Measure deployed asset/service readiness                       |
| Normal non-speech responsiveness     |             2/5 | No regression observed                                         | 0.20–0.25s local representative requests                                       |                      4/5 locally | Medium     | Sample authenticated pilot reads                               |
| Repeated representative use          |             1/5 | Passed local repeated safe flows                               | 14/14 repeated browser tests                                                   |                      4/5 locally | Medium     | Repeat authoritative learner path in pilot                     |
| Repeated authoritative outcomes      |             2/5 | Server/fixture evidence passes; real browser authority pending | Ownership/idempotency tests and repeated start assertions                      |                      3/5 locally | Medium     | Capture deployed server run identities/results                 |
| Admin dashboard quality              |       High/full | No local regression found                                      | API/page tests passed; no Phase D Admin code changes                           |                     No downgrade | High       | Browser Admin fixture repair, then pilot visual check          |
| Responsive interface/controls        |       High/full | No target recovery regression found                            | Desktop/tablet/portrait/landscape checks; no overflow                          |                     No downgrade | Medium     | Full deployed device matrix                                    |
| RBAC/isolation/secrecy               |            Full | Preserved locally                                              | Auth, ownership, Staff/security suites passed                                  |                     No downgrade | High       | Repeat with deployed role accounts                             |
| Overall technical acceptability      |   Do not accept | Actionable local blockers addressed                            | Phase A–C focused suites and browser recovery evidence                         | Provisionally acceptable locally | Medium     | Pilot retest; resolve academic authority and baseline blockers |

## 14. Remaining Blockers

1. No deployed pilot retest has occurred.
2. A real disposable learner was not created for this no-mutation local verification, so
   fresh/restored/direct authenticated browser Diagnostic success is represented by
   isolated API/component fixtures rather than a deployed cookie session.
3. The academic sequence conflict remains unresolved.
4. Existing Game One, Pixi harness, TTS catalog, and System Admin browser fixture
   failures remain separate baseline work.

## 15. Local Technical Acceptability Assessment

The three actionable Respondent 2 causes—Diagnostic transport denial, unsupported Guest
exposure, and indefinite target loading/error states—are locally addressed by the
available evidence. Security authority, ownership, scoring, Admin behavior, and
academic progression were not weakened or changed during this retest.

This is a local technical assessment only. It is not production readiness and does not
establish pilot acceptance.

## 16. Pilot Retest Requirements

When deployment is explicitly confirmed, execute this checklist with a disposable QA
learner and retain request/status evidence:

- verify deployment commit/branch and API/frontend origins;
- fresh learner login -> dashboard -> Diagnostic;
- restored session -> Diagnostic;
- direct authenticated Diagnostic route;
- sentinel-only, invalid, expired, revoked, and logged-out denial;
- cross-learner ownership denial;
- Guest unavailable state, no anonymous authorization bypass;
- Clara settings/readiness/Live2D failure and recovery;
- normal API timeout/network/5xx and Retry recovery;
- repeated Diagnostic start/resume with request/run counts;
- Admin Overview metrics, charts, aggregation, layout, and role scope;
- browser console, failed-request, CORS, Authorization, and HttpOnly-cookie review;
- supported desktop, tablet, phone portrait, and phone landscape viewports;
- supported native bearer path where applicable.

Do not run this checklist against `pilot.readirect.org` until deployment is explicitly
confirmed.

## 17. Final Local Verdict

**LOCAL REMEDIATION PASSED — PILOT VERIFICATION PENDING**

This verdict applies to the Phase A–C actionable blockers in the local evidence set. It
does not claim `pilot.readirect.org` is fixed, production is fixed, or that the open
academic specification conflict and unrelated baseline failures are resolved.
