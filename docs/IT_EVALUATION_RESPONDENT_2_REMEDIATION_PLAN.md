# ReaDirect Respondent 2 Remediation Plan

Analysis date: 2026-08-16  
Primary evaluation: `ReaDirect IT Expert Technical Quality Evaluation Tool (Responses).xlsx`, respondent 2 (`AI QA Agent`, `QA Automation Engineer`)  
Repository branch inspected: `development/post-pilot-updates`  
Pilot surfaces inspected: `https://pilot.readirect.org` and `https://api-pilot.readirect.org`

This is an analysis, debugging, and implementation plan only. No application source, database, configuration, deployment, or dependency change is part of this work.

## 1. Executive Summary

The respondent's **Do not accept at this time** recommendation appears primarily driven by a confirmed learner-critical Diagnostic failure and by unclear or non-recoverable loading behavior. The Diagnostic start failure is reproducible and has a narrow root cause: Diagnostic-related clients use raw cross-origin `fetch` instead of the existing credentialed API wrapper. In a browser session, the raw requests send the `cookie-session` sentinel as a bearer value but omit the HttpOnly learner-session cookie. Laravel correctly rejects that request with 401 before the controller runs.

The reported Guest setup hang is not reproducible in the current pilot build. The current anonymous game-profile setup completes locally without a Guest API request. However, public Guest support is not actually complete: the repository contains Guest data-model and System Admin foundations, while public Guest authentication, session creation, persistence, and a coherent destination contract are absent. The exposed anonymous lobby skeleton therefore promises more than the supported product. Guest should be classified as **C: partially implemented and should be safely disabled** until a separate product requirement authorizes its completion.

The low academic-sequence rating cannot be reduced to one proven progression bug. The Diagnostic 401 prevents normal browser validation of downstream progression. Separately, the current backend and tests intentionally unlock Lessons 1-6 independently after Diagnostic, which conflicts with the evaluator/manuscript's strictly ordered journey. That conflict requires a product-owner decision before progression code is changed.

The defects can be addressed without weakening Laravel authority, changing the database, or redesigning the Admin dashboard. The first implementation should be the narrow Diagnostic transport correction plus security-focused regression coverage.

## 2. Respondent 2 Findings

| Finding | Rating | Reproduced? | Root cause / classification | Risk | Recommended action |
|---|---:|---|---|---|---|
| Diagnostic start returns 401 | Authentication 2/5; integration 2/5 | **Yes** | **Confirmed defect:** raw cross-origin fetch omits the browser session cookie | Critical: blocks the learner academic journey | Use the existing credentialed API transport for the complete Diagnostic request chain; retain server middleware |
| Guest setup hangs | Error recovery 1/5 | **No, not in the current build** | Reported hang is **not reproduced**. The broader Guest experience is an **intentional/partial product limitation** exposed through placeholder UI | High product/support risk; anonymous users can enter a lobby that cannot provide verified Guest persistence | Hide/guard the Guest entry or show a clear unavailable state; do not invent a Guest account system in this remediation |
| Important loading states can remain pending indefinitely | Error recovery 1/5 | **Yes, by code inspection; root Clara startup also reproduced** | **Confirmed defect:** several fetch paths have no bounded recovery; render failures also lack feature boundaries | High: users cannot distinguish slow, offline, auth failure, or crashed UI | Add a small bounded-request policy and explicit retry/auth/unavailable/cancelled states; add only meaningful Error Boundaries |
| Fixed Diagnostic -> Lessons 1-6 -> Final behavior | 1/5 | **Blocked in browser; implementation conflict confirmed** | **Likely consequence of the Diagnostic blocker**, plus a real specification conflict: current code allows Lessons 1-6 in any order after Diagnostic | Very high if progression is changed against the controlling academic rule | Resolve the manuscript-versus-current-guide conflict before any progression change |
| Learner/staff page readiness | 2/5 | **Mixed** | Normal tested pages became meaningful in about 0.6-3.1 seconds; `/` remained blocked on Clara readiness beyond 15 seconds | Medium/high on affected entry flow | Treat the Clara case as hung recovery, not broad performance degradation |
| Non-speech API performance | 2/5 | **No general slowness reproduced** | Sampled public/rejected requests returned in about 0.19-1.05 seconds; authenticated business-operation measurement was blocked by the no-mutation constraint | Medium; evidence is incomplete for authenticated operations | Correct reliability first, then measure approved authenticated read-only scenarios against agreed thresholds |
| Repeated representative use / responsiveness | 1/5 | **Partially blocked** | Diagnostic cannot proceed; raw requests fail quickly rather than repeatedly processing | High because the primary workflow is unavailable | Retest after Phase A with request-count assertions and repeated browser runs |
| Repeated authoritative outcomes | 2/5 | **Server tests pass; browser flow blocked** | Security and progression unit/feature behavior is stable, but the browser transport prevents an authoritative end-to-end outcome | High | Preserve server authority; add cross-origin browser transport coverage |
| Admin dashboard quality, aggregation, and responsiveness | High / explicitly praised | Baseline only | No contrary defect found in this investigation | Regression risk if included in unrelated refactoring | Protect and retest only; no redesign or refactor |
| Invalid/revoked/cross-role/cross-scope protection and secrecy | Full marks | Supported by targeted tests and code inspection | Working control to preserve | Critical if auth correction bypasses server validation | Add positive valid-cookie coverage while retaining all negative cases |

The low scores are not ten independent bugs. Several are downstream consequences of the Diagnostic blocker or the lack of bounded recovery around a small set of requests.

## 3. Diagnostic 401

### Exact reproduction

The pilot frontend is served from `https://pilot.readirect.org`, while its API base is `https://api-pilot.readirect.org`. A browser learner session stores the non-secret sentinel `cookie-session` in `sessionStorage`; the authoritative learner credential is an HttpOnly API cookie.

A direct authenticated-route reproduction with the structurally valid sentinel but without an API cookie produced:

1. Open `/learner/assessment/part-one`.
2. The page displays `Learner authentication is required.` and offers `Try again`.
3. `POST https://api-pilot.readirect.org/api/learners/assessments/part-one/start` returns 401.
4. The request uses raw `fetch`, has an `Authorization: Bearer cookie-session` header, and has no credentialed cookie transport.
5. CORS preflight succeeds with status 204, the exact pilot origin, credential support, and the Authorization header allowed. CORS is therefore not the source of the 401.

A safe direct request with the same sentinel and no cookie also returned 401 JSON `Learner authentication is required.` with a Bearer challenge. The failure was fast (approximately 0.19-0.26 seconds), not a slow controller operation.

### Complete request path

1. **Login/session creation:** `apps/web/src/features/learner-auth/learnerApi.ts` uses the central `apiFetch` wrapper for learner login and session restore.
2. **Browser persistence:** the browser stores `cookie-session` as a sentinel; the API issues the real learner session in an HttpOnly cookie. Native storage can instead hold a real bearer token.
3. **Session bootstrap:** restore calls are credentialed and can resolve a valid browser session from the cookie.
4. **Diagnostic navigation:** `AssessmentPartOnePage` invokes the part-one start client after mounting.
5. **Diagnostic request:** `apps/web/src/features/assessment/assessmentApi.ts` imports `apiUrl` only and calls raw global `fetch` for the start request. The same bypass pattern exists in part two and Diagnostic speech/readiness clients.
6. **Browser transport:** because the API is cross-origin, raw fetch defaults to `credentials: "same-origin"`; the API cookie is omitted.
7. **Authorization header:** the stored sentinel is emitted as `Authorization: Bearer cookie-session`. It is deliberately not a valid server token.
8. **API route/middleware:** the endpoint is inside the `learners` route group protected by `learner.auth` (`apps/api/routes/api.php`).
9. **Session resolver:** `LearnerSessionResolver` recognizes and discards the browser sentinel, then attempts cookie fallback. With no cookie present, it calls its unauthorized response.
10. **Outcome:** middleware emits 401 before `LearnerAssessmentController` or assessment services run. Learner ownership and run creation are never reached.

### Root cause

The exact defect is an API-client transport inconsistency introduced/exposed by the browser's HttpOnly-cookie session design: **the Diagnostic chain bypasses the credentialed `apiFetch` wrapper and therefore drops the cross-origin learner-session cookie.** The authentication design and Laravel resolver are behaving correctly.

Affected Diagnostic-dependent raw fetch paths found during inspection:

- `apps/web/src/features/assessment/assessmentApi.ts`
- `apps/web/src/features/assessment/assessmentPartTwoApi.ts`
- `apps/web/src/features/clara-audio/activitySpeechReadiness.ts`
- `apps/web/src/features/clara-audio/claraSpeech.ts`
- `apps/web/src/features/letters/learnWithClaraLettersApi.ts` (adjacent learner-authenticated risk)
- `apps/web/src/features/connectivity/connectivityProbe.ts` (adjacent browser-session status risk)

The native application may still work when it supplies a real bearer token. The confirmed failure is the cross-origin browser-cookie path used by pilot.

### Current reproduction matrix

| Case | Current result | Basis | Expected after remediation |
|---|---|---|---|
| A. Fresh browser login -> Diagnostic | **Fails 401** | Login is credentialed, but the subsequent raw cross-origin Diagnostic fetch omits the cookie | Start succeeds for a valid session |
| B. Persisted browser login -> reopen -> Diagnostic | **Fails 401** | Restore can succeed through the cookie, then Diagnostic repeats the transport defect | Restore and start succeed |
| C. Dashboard -> Diagnostic | **Fails 401** | Navigation source does not change raw-fetch credential behavior | Start succeeds |
| D. Direct Diagnostic route while authenticated | **Fails 401** | Reproduced with the browser-session shape; start request omitted credentials | Bootstrap completes, then start succeeds |
| E. Expired session -> Diagnostic | Denied / safe-login behavior required | Negative security behavior is intentional | Remains denied with 401 or safe login redirect |
| F. Revoked session -> Diagnostic | Denied / safe-login behavior required | Resolver and targeted auth tests enforce revocation | Remains denied with 401 or safe login redirect |
| G. Logout -> Diagnostic | Denied / safe-login behavior required | No valid session should reach a run | Remains denied with 401 or safe login redirect |

Cases A-D are a code-path conclusion supported by the reproduced direct-route request and the shared raw client. A disposable real learner was not created because this analysis was prohibited from mutating the database.

### Smallest safe fix

Replace raw learner-authenticated fetch calls in the Diagnostic request chain with the existing `apiFetch` transport so the browser sends `credentials: "include"`. Keep the Authorization header behavior needed by native clients and keep all Laravel middleware/session resolution unchanged. Do not make the route public, accept `learner_id`, or add a sentinel bypass.

The first patch should include the part-one and part-two assessment clients plus activity manifest/readiness and Clara speech requests needed by Diagnostic. The adjacent connectivity and letters clients should be evaluated in the same transport audit, but unrelated UI or auth refactoring should not be bundled.

### Security regression risks

- Accidentally treating `cookie-session` as a real bearer token.
- Making assessment routes public or bypassing `learner.auth`.
- Trusting a frontend-provided learner/run owner.
- Changing cookie policy or exposing the real browser token to JavaScript.
- Letting expired or revoked sessions pass because a cached UI learner exists.
- Breaking native real-bearer operation while fixing browser cookies.
- Broadening Staff/Admin or cross-school authorization in a shared wrapper change.

## 4. Guest Mode Hang

### Intended product status

Guest mode is **C: partially implemented and should be safely disabled**. Current evidence does not support classifying it as a production-ready public ReaDirect feature:

- `GuestAccount` and `GuestSession` models/tables exist as a foundation.
- System Admin can inspect Guest-related directory/access data.
- `SystemAdminOperationsService` explicitly reports `guest_game_persistence_available = false`.
- the System Admin games/players page says Guest game persistence is not connected and separates it from standard learner persistence.
- repository system analysis describes Guest support as foundation-only/partially implemented.
- no public Guest login/setup API route, controller, resolver, or authenticated React Guest client exists.

The lobby README's verified-Guest wording does not match the executable product and should not be treated as proof of an implemented contract.

### Exact current reproduction

In a clean anonymous browser session on the current pilot:

1. `/learner/games` returned 200 and showed the local profile setup.
2. Setup became ready in approximately 1.8 seconds.
3. Entering `Guest7` completed setup in approximately 1.0 second.
4. The lobby displayed an in-memory generated identity such as `Guest7#2648` and four games.
5. No Guest setup/profile/session API request was made.
6. Launching Readscape redirected to `/learner/login` in approximately 1.4 seconds.

The evaluator's indefinite setup hang and proposed missing-handler cause were **not reproduced** in this build.

### Pending request/state and endpoint

There is no pending Guest API request and no Guest setup endpoint in the current flow. `/learner/games` is publicly exposed by the web router. `GameLobbySkeletonContext` creates the profile synchronously in browser memory, and `GameLobbyPage` advances to the lobby. Consequently, a missing Laravel handler cannot explain this reproduction.

### Actual root cause and supported-versus-placeholder decision

The exact cause of the evaluator's historical hang remains **not reproduced**. The actionable current defect is a product-state mismatch: an anonymous placeholder setup is exposed even though verified Guest authentication, persistence, and consistent game destinations are not implemented. Some destinations can require a learner login immediately after the apparent Guest setup.

The smallest safe correction is to hide or guard the anonymous Guest entry and present a clear `Guest mode is currently unavailable` state with a route back to learner login/home. This correction should not create new backend Guest APIs, migrations, or security semantics. Full Guest support, if desired, needs a separate approved product and security design.

## 5. Loading / Timeout / Error Recovery

The central rule should be small and explicit: a critical asynchronous workflow must resolve to `SUCCESS`, `RETRYABLE ERROR`, `AUTH REQUIRED`, `SERVICE UNAVAILABLE`, or `CANCELLED`; it must not stay in a permanent loading state.

Existing conventions are inconsistent. `apiFetch` includes credentials but has no timeout. `apiFetchWithTimeout` defaults to 90 seconds and is speech-oriented. Connectivity probing uses 5 seconds. Server-side speech clients have separate connection/request timeouts. A 5-second global timeout is therefore inappropriate, especially for ASR/TTS.

Before Phase C implementation, define an owner-approved named recovery ceiling for normal JSON calls using pilot measurements and product tolerance. A 15-second ceiling is a possible review candidate, not an approved requirement. Keep distinct, existing speech/upload budgets. On component unmount/navigation, abort where safe and classify the result as cancelled rather than an error toast.

| Component / flow | Request or asynchronous work | Current behavior/risk | Proposed bounded state | Retry / Back behavior |
|---|---|---|---|---|
| `LearnerLoginPage` session restore | `getLearnerSession` / `restoreLearnerSession` through `apiFetch` | A request that never settles can leave `Restoring your reading session...` indefinitely | Normal-JSON recovery ceiling; then retryable/service-unavailable state, while an authoritative 401 becomes auth-required | Retry restore; allow return to the login form |
| `LearnerLoginPage` sign-in | learner login mutation | Pending fetch can leave the submit action disabled indefinitely | Normal-JSON recovery ceiling; distinguish bad credentials, unavailable service, and cancelled navigation | Re-enable Retry/Sign in; preserve entered identifier where safe |
| `AssessmentPartOnePage` | part-one start | Rejected requests show an error, but a never-settling raw fetch leaves `Opening Part 1...` indefinitely | Credentialed request plus normal-JSON ceiling; auth-required for 401, retryable/unavailable for network/5xx | Existing Try again plus Back; retry must not create duplicate active runs |
| Part Two assessment page | part-two start/load | Same raw-fetch/no-timeout class as part one | Same explicit state model | Retry and Back; idempotency/run-state verification |
| Diagnostic activity preparation | speech manifest/readiness | Raw fetch can stall preparation before an activity becomes usable | Normal-JSON ceiling for manifest/readiness, not the speech-processing budget | Retry preparation; Back to assessment route |
| Clara speech | TTS request/playback preparation | Raw fetch can leave Clara speech pending; operation timing differs from normal JSON | Existing speech-specific budget and message; explicit unavailable/cancelled state | Retry audio, skip/continue where academic rules permit, or Back |
| `LearnerExperienceProvider` / `IntroPage` / `ClaraStage` | experience settings and Clara readiness | Reproduced `/` stayed `Loading... Loading Ma'am Clara` beyond 15 seconds; intro button remains disabled if readiness errors or never settles | Explicit Clara unavailable/error state after bounded initialization; render failure handled by a nearby boundary | Retry Clara; provide a product-approved non-destructive Back/continue option rather than a disabled-only screen |
| Learner dashboard | session/background queries | Initial cached session usually keeps meaningful UI visible; pending revalidation can leave auth stale | Bounded background revalidation; 401 clears session and routes safely | Retry non-auth data; login for auth-required |
| Anonymous games setup | synchronous in-memory profile | Current setup did not hang; the issue is unsupported product exposure, not a pending request | Immediate unavailable state if Guest is disabled | Back to home/login; no retry against a nonexistent endpoint |
| Game launch/host adapter | launch transition and game API | Credentialed wrapper is used, but requests have no general bound; placeholder Guest may redirect inconsistently | Guard unsupported Guest before launch; bound authenticated JSON calls | Retry launch only when safe; always allow lobby/back exit |
| Staff/Admin workspaces | shared `staffApi` fetches and TanStack queries | Most pages show errors after rejection, but a never-settling fetch can keep query loading indefinitely; Query retry count alone cannot stop a pending request | Add bounded normal-JSON behavior in the common staff transport, preserving per-page errors | Existing Retry; keep navigation/sidebar usable |

TanStack Query's configured retry behavior (one query retry) does not solve a promise that never settles. The timeout belongs in the transport/request layer, while the view remains responsible for the user-facing state and safe Retry/Back behavior.

## 6. Error Boundary Strategy

React Error Boundaries are warranted for unexpected render, lazy-load/chunk, or lifecycle failures at meaningful containment points:

- the application/route shell, so an unexpected route render failure does not leave a blank screen;
- the learner academic activity area, so a broken activity offers a safe return to the learner path without corrupting assessment state;
- the game host boundary, so a game crash does not take down the lobby/application shell;
- optionally the Staff/Admin workspace shell, preserving sign-out/navigation when a page render fails.

Each fallback should log through the existing approved observability path if one is available, show plain recovery guidance, and provide Reload/Back as appropriate. It must not expose stack traces, tokens, configuration, learner data, or assessment answers.

Normal API outcomes—including 401, 403, 404, 422, 5xx, offline, timeout, and cancellation—must remain explicit query/mutation state handling. Error Boundaries do not catch asynchronous fetch failures and must not replace these states.

Do not wrap every control, query, chart, or Clara subcomponent individually. Excessive boundaries fragment state, hide systemic faults, complicate assessment recovery, and can make retries unsafe.

## 7. Academic Sequence Rating

The 1/5 rating is **unverified in the browser and likely influenced by the Diagnostic blocker**, but inspection also found a material requirements conflict:

- the evaluator/manuscript describes a fixed order: Diagnostic -> Lesson 1 -> Lesson 2 -> Lesson 3 -> Lesson 4 -> Lesson 5 -> Lesson 6 -> Final;
- the current assessment guide says Diagnostic completion/skip unlocks Lessons 1-6 together;
- `LearnerLessonAccessService` gates lessons on Diagnostic completion but does not require completion of each prior numbered lesson;
- the current targeted feature tests explicitly assert independent lesson access, including arbitrary lesson starts after Diagnostic;
- `LearnerFinalAssessmentAccessService` correctly keeps Final locked until all six distinct required lessons are complete.

Targeted tests passed for the implementation as written, including zero-score Diagnostic completion unlocking lessons and Final remaining locked until six distinct lesson completions. Thus:

- If the current assessment guide is authoritative, independent Lessons 1-6 are intentional and the evaluator's strict-order expectation is not the controlling rule.
- If the manuscript is authoritative, the current lesson-access policy is a confirmed high-risk progression defect.

No progression change is safe until the academic/product owner identifies the controlling specification and defines skip/retry/remediation behavior. Scoring, Mu, Nu, lesson completion, and Final eligibility must not be modified as part of the Diagnostic transport fix.

## 8. Performance Findings

### Browser page measurements

Measurements used a fresh Chromium context against the current pilot. Times are observations, not formal service-level thresholds.

| Page | HTTP / DOM ready | First meaningful or target-ready content | Classification / blocker |
|---|---:|---:|---|
| `/` | 200 / 693 ms | Not ready within 15,000 ms; remained on Clara loading copy | **Hung/blocked by Clara readiness**, not slow document delivery |
| `/home` | 200 / 2,978 ms | `Let's Read!` at 3,050 ms | Ready; relatively heaviest measured page but no hang |
| `/learner/login` | 200 / 596 ms | Usable at 977 ms | Ready |
| `/staff/login` | 200 / 648 ms | `Welcome back` visible by DOM ready | Ready |

Headless runs also observed an external Google Fonts/ORB browser warning. It did not explain the Diagnostic 401 and should be triaged separately only if it affects supported-browser rendering.

### Non-speech/API measurements

Three read-only samples were taken per representative endpoint:

| Request | Status | Latency samples (TTFB / total, seconds) | Retry / duplicates | Classification |
|---|---:|---|---|---|
| `GET /up` | 200 | 0.225/0.225, 0.195/0.196, 0.193/0.193 | None | Normal in this sample |
| `GET /api/experience/intro/settings` | 200 | 1.045/1.046, 1.044/1.044, 1.040/1.040 | None | Consistent, not hung |
| `GET /api/learners/session` without auth | 401 | 0.305/0.306, 0.237/0.238, 0.186/0.186 | None | Fast authoritative rejection |
| Diagnostic start with sentinel/no cookie | 401 | 0.261/0.261, 0.192/0.193, 0.204/0.204 | None | **Blocked by auth transport**, not slow |
| Diagnostic CORS preflight | 204 | Completed normally | One preflight | CORS policy allowed the request shape |

The instrumented Diagnostic browser reproduction issued one experience-settings call, one session call, one speech-manifest call, and one assessment-start call. It did not duplicate the start call. The start failed quickly.

No disposable valid learner was supplied, and this analysis could not create database records. Authenticated read/write API latency, completed assessment readiness, and repeated valid runs are therefore **blocked**, not passed. No repository document supplied an approved numeric threshold, so these samples cannot be labeled formal performance acceptance results.

The available evidence does not show broad non-speech API slowness. It shows reliability/authentication blocking and one reproduced indefinitely blocked Clara entry state.

## 9. Security Regression Requirements

The remediation must preserve all of the following:

- Laravel `learner.auth` remains authoritative for Diagnostic and learner assessment routes.
- Browser sessions continue to use the HttpOnly, Secure production cookie; JavaScript receives only the non-secret sentinel.
- CORS remains restricted to approved origins with credential support; it must not become wildcard-plus-credentials.
- A valid sentinel plus matching valid cookie succeeds.
- A sentinel without a valid cookie remains 401.
- Invalid, malformed, expired, revoked, idle-expired, and logged-out learner sessions remain denied.
- Native clients with a valid real bearer token continue to work.
- No frontend `learner_id`, run ID, or cached learner object becomes authorization evidence.
- A learner cannot read, resume, submit, or complete another learner's assessment run.
- A learner cannot access Staff or Admin endpoints.
- Staff do not gain Admin privileges.
- teacher ownership and cross-school scope remain enforced.
- tokens, reset credentials, environment values, application files, stack traces, and configuration remain secret.
- Retry behavior must not create duplicate active runs, duplicate submissions, or repeated scoring.

The server should continue returning authoritative 401/403/404/422 outcomes. The client correction only ensures a valid browser credential reaches that authority.

## 10. Implementation Plan for LUNA

### Phase A - Diagnostic 401 fix

1. Replace raw cross-origin fetch in the Diagnostic request chain with the existing `apiFetch` transport in part one, part two, activity speech manifest/readiness, and Clara speech.
2. Preserve native Authorization handling and browser sentinel/cookie behavior.
3. Audit the adjacent authenticated letters and connectivity clients for the same transport bypass; change them only when coverage proves they share the defect.
4. Add focused client tests asserting `credentials: "include"` and correct headers without exposing the cookie/token.
5. Add/retain API security tests for valid browser cookie, sentinel-without-cookie, real native bearer, expired, revoked, and cross-owner cases.
6. Verify that a retry/resume does not create duplicate active Diagnostic runs.

Do not change Laravel middleware, session schema, assessment scoring, or progression in this phase.

### Phase B - Guest mode resolution

1. Confirm with the product owner that public Guest persistence is not currently supported.
2. Guard or remove the anonymous Guest entry and replace it with a clear unavailable state plus home/login navigation.
3. Prevent unsupported anonymous launch paths from presenting an in-memory identity as a durable Guest account.
4. Align lobby/support documentation with the executable product status.

Do not add Guest APIs, session models, migrations, or role rules. Full Guest support would be a separate project.

### Phase C - Bounded loading/error recovery

1. Define and approve a named normal-JSON request recovery ceiling from pilot measurements; retain distinct speech/upload timing policies.
2. Extend the smallest common request layer with abort/cancellation classification while retaining credential and response behavior.
3. Apply explicit success/retryable/auth-required/unavailable/cancelled states to learner restore/login, Diagnostic start/preparation, Clara startup, game launch, and the shared Staff transport.
4. Ensure critical screens retain Retry and Back/login navigation after failure.
5. Add route/feature Error Boundaries only at the application shell, learner academic activity, game host, and—if justified—Staff workspace.

### Phase D - Focused regression tests

1. Add transport unit tests and Laravel auth/ownership tests.
2. Add component tests for pending-to-timeout, 401-to-login, 5xx/network-to-retry, cancellation, Retry recovery, and Back usability.
3. Add Guest unavailable-route tests rather than tests for nonexistent Guest persistence.
4. Repair the existing game test harness resolution failure before relying on `GameSkeletonFlow.test.tsx`; evaluate any dependency change separately.
5. Retain the full academic progression suite unchanged until the controlling sequence is decided.

### Phase E - Browser/pilot retest

1. Deploy only the reviewed phases to pilot.
2. Execute the browser matrix in section 14 with a disposable learner authorized for QA.
3. Capture status, latency, credential mode, retry count, duplicate requests, route outcome, and authoritative server result.
4. Repeat the valid academic path enough times to expose race/restore issues, then validate expired, revoked, logout, ownership, and role-negative cases.
5. Regression-check Admin Overview metrics, aggregation, charts, responsive layout, and role scope without redesign.

## 11. Files Expected to Change

These are implementation candidates, not changes made by this analysis.

### Phase A candidates

- `apps/web/src/features/assessment/assessmentApi.ts`
- `apps/web/src/features/assessment/assessmentPartTwoApi.ts`
- `apps/web/src/features/clara-audio/activitySpeechReadiness.ts`
- `apps/web/src/features/clara-audio/claraSpeech.ts`
- `apps/web/src/features/letters/learnWithClaraLettersApi.ts` (only if the adjacent audit confirms the same authenticated requirement)
- `apps/web/src/features/connectivity/connectivityProbe.ts` (only if browser learner-session status is in scope)
- `apps/web/src/lib/apiUrl.ts` (only if a small shared transport helper or named bounded policy is required)
- focused web API/page test files under `apps/web/tests`
- focused Laravel feature tests under `apps/api/tests/Feature`

### Phase B candidates

- `apps/web/src/App.tsx`
- `apps/games/lobby/src/GameLobbyPage.tsx`
- `apps/games/lobby/src/GameLobbySkeletonContext.tsx`
- `apps/games/lobby/README.md`
- `apps/games/lobby/src/__tests__/GameSkeletonFlow.test.tsx`

No Guest backend file should change if the approved decision is to disable the unsupported public flow.

### Phase C/D candidates

- `apps/web/src/lib/apiUrl.ts`
- `apps/web/src/features/learner-auth/LearnerLoginPage.tsx`
- learner auth provider/session-query files under `apps/web/src/features/learner-auth`
- `apps/web/src/features/assessment/AssessmentPartOnePage.tsx`
- the corresponding part-two page
- `apps/web/src/features/learner-experience/LearnerExperienceProvider.tsx`
- `apps/web/src/features/learner-experience/IntroPage.tsx`
- `apps/web/src/features/clara/ClaraStage.tsx` or its current equivalent
- the shared Staff API client, rather than every Staff/Admin page
- a small new route/feature Error Boundary component if no suitable existing component exists
- focused Vitest/Playwright test files

Exact names should be reconfirmed at implementation time because the branch may move. No dependency addition is expected.

## 12. Files / Systems to Protect

Do not casually refactor or broaden:

- Laravel learner, Staff, and Admin authentication/session authority;
- role middleware and endpoint groups;
- teacher ownership, learner ownership, and school scoping;
- browser HttpOnly-cookie and native secure-storage separation;
- Diagnostic and Final assessment scoring;
- canonical academic progression and unlock rules pending the specification decision;
- Mu and Nu calculations/interpretation;
- ASR request, scoring, and recovery behavior;
- TTS generation, caching, and speech-specific timeout behavior;
- learner submissions, run idempotency, and completion transactions;
- Admin Overview health metrics, aggregation, charts, responsive layout, and role scope;
- database schema, migrations, deployment, CORS configuration, and dependencies unless separately justified and approved.

## 13. Tests

### Evidence already run

- Laravel targeted suites: learner auth security, part-one assessment, reading path, independent lesson access, and Final assessment — **27 tests, 236 assertions passed** in approximately 5.4 seconds using the isolated test database.
- Vitest assessment pages: part one and part two — **2 files, 11 tests passed**.
- Game host adapter — **4 tests passed**.
- Game skeleton flow — **suite failed to load**, not a product assertion failure: `@pixi/react` could not resolve `react-reconciler/constants` in the current test harness. This gap must be fixed before the Guest/game test is authoritative.

### Required Phase A automated tests

1. Part-one start uses the central credentialed transport and includes credentials in browser mode.
2. Part-two and Diagnostic manifest/readiness/speech clients use the same transport.
3. Valid sentinel plus valid HttpOnly cookie resolves the learner and starts/resumes the learner-owned run.
4. Sentinel without cookie returns 401.
5. Invalid, malformed, expired, revoked, idle-expired, and logged-out sessions return 401.
6. A valid native bearer token remains accepted.
7. A client-supplied learner identifier cannot select another learner.
8. Another learner's run is not readable/submittable/completable.
9. Retry/resume does not create duplicate active runs or duplicate scoring.
10. Learner, Staff/Admin, teacher, and school isolation tests remain green.

### Required loading/recovery component tests

For learner restore/login, both assessments, Clara initialization, game launch, and representative Staff queries:

- unresolved normal request reaches the approved bounded state;
- 401 becomes auth-required/safe login, not generic infinite loading;
- network/5xx becomes retryable or service-unavailable;
- navigation abort becomes cancelled without a stale error update;
- Retry starts one new request and can recover;
- Back/navigation remains usable;
- speech keeps its distinct budget and is not cut off by the normal-JSON policy;
- render failures are contained by the intended feature boundary, while API failures use normal state handling.

### Academic tests

Keep current Diagnostic, independent-lesson, six-distinct-lesson, Final-lock, scoring, Mu, and Nu tests unchanged until the controlling sequence is approved. If strict sequence is later selected, first write owner-approved behavior tests for every transition, skip, retry, zero score, direct route, and Final eligibility; only then change implementation.

## 14. Browser Verification Matrix

Run against pilot with a disposable QA learner and capture the network/server evidence for each row.

| Scenario | Expected UI outcome | Expected API/security outcome | Evidence to retain |
|---|---|---|---|
| Fresh learner login -> Diagnostic | Dashboard/Diagnostic opens and part one becomes usable | Valid cookie session accepted; one owned run started/resumed | request credentials mode, status, run identity, request count |
| Persisted learner -> close/reopen -> Diagnostic | Session restores, then Diagnostic opens | Cookie session accepted after restore; no sentinel-only 401 | restore/start statuses and timing |
| Dashboard -> Diagnostic | Navigation succeeds without auth race | Same valid server-resolved learner | route timing and single start call |
| Direct Diagnostic route while authenticated | Bootstrap completes, then assessment opens | Valid cookie accepted; no premature start before bootstrap | request ordering and status |
| Expired learner -> Diagnostic | Clear login/auth-required state | 401; no run created | server reason/status and route outcome |
| Revoked learner -> Diagnostic | Clear login/auth-required state | 401; no run created | server reason/status and route outcome |
| Logout -> Diagnostic | Login redirect/auth-required state | No credential accepted; no run created | storage/cookie cleared as designed and 401/redirect |
| Cross-learner run attempt | No foreign data; safe denial | Authoritative 403/404 as designed | status and absence of leaked data |
| Guest entry/setup | Clear unavailable state, **or** success only if separately approved and fully implemented | No request to a nonexistent handler; no false durable identity | route, copy, network log, exit path |
| API request never settles | Loading ends at approved bound | Request aborted/classified; no duplicate mutation | elapsed time and final explicit state |
| API 5xx/offline | Retryable/service-unavailable state | No auth fallback or silent success | status/error class |
| Retry | Workflow recovers when service recovers | Exactly one new safe request; no duplicate run/submission | request count and final state |
| Back | User returns to a usable safe route | In-flight work cancelled where appropriate | route and console/network cleanliness |
| Clara startup failure | Explicit recovery or approved continuation, not disabled infinite loading | Speech/settings failure stays scoped | elapsed time and fallback controls |
| Staff representative page failure | Workspace/navigation remains usable with Retry | Role/scope remains enforced | status, role, scope, recovery |
| Admin Overview | Metrics, aggregation, charts, layout, and scope remain unchanged | Existing Admin authorization only | visual/data baseline and role-negative check |

Repeat key valid and failure scenarios across the supported desktop/mobile browser matrix and the native shell where applicable. Browser and native credentials must both be covered because their token transport differs.

## 15. Acceptance Criteria

The remediation is acceptable when all of the following are true:

1. A valid freshly authenticated browser learner can start or resume Diagnostic part one from the dashboard.
2. A valid persisted browser learner and an authenticated direct route produce the same successful authoritative result.
3. Diagnostic part two and its required manifest/readiness/speech calls use the credentialed transport.
4. The browser sentinel alone is never accepted; missing, invalid, expired, revoked, idle-expired, and logged-out sessions remain denied.
5. Valid native bearer authentication still works.
6. No learner can select another learner or access another learner's run; Staff/Admin/teacher/school boundaries remain unchanged.
7. Diagnostic retry/resume does not duplicate runs, submissions, completion, or scoring.
8. Public Guest UI either reaches a separately approved, complete supported flow or clearly states that Guest is unavailable and provides a usable exit. It never hangs or presents a false durable account.
9. Every audited critical async workflow reaches an explicit success, retryable, auth-required, unavailable, or cancelled state within its approved operation-specific policy.
10. Retry and Back remain usable; render errors are contained at the selected feature boundaries.
11. Normal JSON recovery does not shorten ASR/TTS/upload operation budgets.
12. The strict-versus-independent lesson-order conflict is resolved by the academic/product owner before any progression implementation change.
13. Targeted Laravel, Vitest, game, and browser suites pass, including credential-mode and duplicate-request assertions.
14. Pilot measurements record page readiness, request latency, retry count, and blockers without labeling blocked scenarios as passes.
15. Admin Overview and the high-rated security controls regress neither visually nor functionally.

## 16. Final Recommendation

The current critical defects can be corrected without an authentication redesign, database change, dependency change, or weakened security boundary. The Diagnostic failure needs a small client transport correction: send the already-authoritative browser cookie by using the existing credentialed wrapper. Laravel should remain unchanged and continue rejecting sentinel-only, invalid, expired, revoked, foreign-owner, and cross-role requests.

Do not implement a Guest account system under this remediation. Treat the currently exposed lobby setup as an unsupported placeholder and disable or clearly label it unless product ownership separately approves full Guest authentication and persistence.

The exact recommended first LUNA task is:

> Replace raw cross-origin fetch in the Diagnostic request chain (`assessmentApi`, `assessmentPartTwoApi`, `activitySpeechReadiness`, and `claraSpeech`) with the existing credentialed `apiFetch`; add unit/integration coverage proving browser sentinel requests use `credentials: include`; and verify that a valid cookie succeeds while sentinel-without-cookie, invalid, revoked, and expired sessions remain 401. Do not change auth middleware, session authority, scoring, or progression.

After that narrow fix passes security tests, proceed independently through Guest exposure, bounded recovery, focused regression automation, and pilot browser retesting. Reconsider technical acceptance only after the valid learner matrix passes and the academic sequence authority is resolved.
