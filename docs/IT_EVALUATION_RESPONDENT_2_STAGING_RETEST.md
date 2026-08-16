# ReaDirect Respondent 2 Staging Retest

## 1. Environment

- Staging frontend: `https://staging.readirect.org`
- Discovered staging API: same-origin `/api/*` requests proxied by the Vite frontend; no separate public API hostname was used.
- Deployment identity: `UNKNOWN` (the staging tunnel exposes a local Vite development server rather than an immutable build artifact).
- Local source context only: branch `development/post-pilot-updates`, HEAD `9ed7c558f8210f8366ed746a27ee348c855497a6`; the working tree was already dirty and this report does not treat that as a deployed commit identity.
- Test timestamp: 2026-08-16 (Asia/Manila workstation time).
- Browser: Playwright Chromium, headless; desktop, tablet, phone portrait, and phone landscape viewports.
- Evidence screenshots: `.runtime/qa-staging/` (credentials and secrets are not present).

## 2. Deployment Readiness

PASS. `https://staging.readirect.org/` returned HTTP 200 with the ReaDirect application, not a deployment placeholder. The intro settings endpoint returned HTTP 200. The credentialed preflight for the learner login route returned HTTP 204 with `Access-Control-Allow-Credentials: true` and `Access-Control-Allow-Origin: https://localhost`. Local ASR and TTS readiness checks were also green before browser testing.

## 3. Learner Authentication

PASS. Using the provided staging QA learner account (reported here only as **Staging QA Learner**), the learner login request returned HTTP 200 and reached `/learner/dashboard`. The dashboard displayed “Your Reading Journey.” No authentication CORS error or uncaught page exception was observed.

## 4. Diagnostic 401 Retest

PASS. From the authenticated dashboard, the Reading Journey opened and the Diagnostic route reached `/learner/assessment/complete` with the usable “Diagnostic Results” screen. No Diagnostic-related HTTP 401 occurred. The previous valid-login-to-Diagnostic 401 was not reproduced.

The QA learner already has a completed Diagnostic in staging. No new academic attempt was created and no answers were fabricated. Because of that existing state, the test observed the legitimate completed state rather than forcing a fresh start mutation.

## 5. Diagnostic Resume / Duplicate-Run Check

PASS for the observed persisted state. Reloading the completed Diagnostic kept the browser on `/learner/assessment/complete`; no new start request or duplicate-start loop was observed. The direct `/learner/assessment/part-one` route remained inside the protected assessment flow without an auth race or 401.

Fresh active-run creation was not forced because the supplied QA learner was already complete. This is a safe test limitation, not a fabricated academic result.

## 6. Session Restore / Logout

PASS. Reloading the authenticated Diagnostic restored the learner session and preserved the assessment route. After normal sign-out, direct navigation to the protected Diagnostic route returned to `/learner/login`. No post-logout access was granted.

## 7. Guest Mode

PASS. Logged-out `/learner/games` displayed the safe unavailable state: “Guest Mode is not available right now. Please sign in as a learner to continue.” The learner-login action was visible. The direct anonymous game route returned to the same safe unavailable flow and generated no Guest API request.

## 8. Clara / Loading Recovery

PASS. Normal intro startup became usable. With one scoped client-side stall of the intro settings request, the page reached the bundled static Clara state and displayed the approved fallback message: “Clara’s animation is unavailable, so a simple view is ready.” No permanent loading screen or fatal page exception was observed.

## 9. API Failure / Retry Recovery

PASS. With one scoped client-side stalled learner-login request, the login screen reached the friendly error “We couldn’t sign you in right now. Please try again.” within the bounded recovery window, and the submit/retry control was enabled. The phone-landscape layout remained usable.

System Admin recovery also passed with one scoped HTTP 503 for the Overview request: the System Admin shell remained visible, the message “The dashboard API is unavailable.” appeared, and the Retry button remained available without destroying the admin session.

## 10. Responsive Verification

PASS. Landing and recovery states were checked at 1440×900, 768×1024, 390×844, and 844×390. Learner and Admin checks had no horizontal overflow; `scrollWidth` equaled `clientWidth` at each tested viewport.

## 11. System Admin Regression

PASS. Using the provided staging account (reported here only as **Staging System Admin**), login returned HTTP 200 and reached `/staff/system-admin`. “System overview” and the “System totals” region were visible. The observed metrics rendered as Total schools 3, Total teachers 3, Total learners 21, and Sandbox attempts 0. Cards/Circle charts navigation worked, and no Admin API error was observed during the normal flow.

## 12. Security Regression

PASS for normal authorized flows tested:

- Logged-out Diagnostic access was denied and returned to learner login.
- An authenticated learner attempting `/staff/system-admin` was redirected to `/staff/login`.
- The System Admin account reached its protected Overview normally.
- No credentials, cookies, bearer values, or authorization headers were recorded.

## 13. Console / Network Findings

- No uncaught application page errors were observed.
- No Phase A–C authentication or CORS regression was observed.
- The learner flow emitted three HTTP 409 responses for `/api/learners/tts/activity-manifest`; this is the documented/out-of-scope TTS catalog baseline and did not block Diagnostic access.
- Headless Chromium reported `net::ERR_BLOCKED_BY_ORB` for an external `/css2` font request. The application still rendered, loaded its own assets, and had no overflow; this was not treated as a Respondent 2 remediation failure.
- Cloudflare RUM requests were aborted by the browser harness; these were telemetry requests, not application failures.
- Requests intentionally stalled or aborted by the scoped recovery tests are expected evidence, not staging server failures.

## 14. Academic Sequence Open Conflict

OPEN SPECIFICATION CONFLICT. The manuscript describes Diagnostic → Lesson 1 → Lesson 2 → Lesson 3 → Lesson 4 → Lesson 5 → Lesson 6 → Final, while the current implementation historically permits Lessons 1–6 independently after Diagnostic and Final after all six. This was not changed or used to fail the Respondent 2 remediation.

## 15. Known Out-of-Scope Baseline Findings

- TTS activity-manifest/catalog HTTP 409 responses noted above.
- Headless-browser external font ORB blocking noted above.
- The supplied learner’s completed Diagnostic state prevented a fresh academic start mutation from being safely re-created.
- No pilot environment was tested.

## 16. Respondent 2 Staging Re-Evaluation

| Original low area | Staging result | Evidence | Provisional staging rating | Confidence |
| --- | --- | --- | --- | --- |
| Authenticated diagnostic transport | Passed | Learner login HTTP 200; protected Diagnostic route usable; zero Diagnostic 401s | Re-evaluated upward; remediation appears effective | High |
| Guest exposure / unsupported flow | Passed | Safe Guest unavailable message, login action, no Guest API request | Re-evaluated upward; remediation appears effective | High |
| Loading and error recovery | Passed | Clara static fallback and bounded learner/Admin retry states | Re-evaluated upward; remediation appears effective | High |
| Session and security preservation | Passed | Reload restore, logout denial, learner-to-Admin denial, Admin access | Re-evaluated upward; no regression observed | High |

## 17. Remaining Pilot Requirements

- Pilot verification remains pending; `pilot.readirect.org` was not accessed.
- Repeat the Diagnostic start/resume check with an explicitly provisioned staging learner whose Diagnostic is in `required` or `in_progress` state, without fabricating academic responses.
- Resolve the academic sequence specification conflict before treating progression as an authoritative acceptance criterion.
- Review the known TTS catalog 409 baseline separately from Respondent 2 remediation.

## 18. Final Staging Verdict

**CONDITIONALLY PASS — RESPONDENT 2 STAGING REMEDIATION PASSED; PILOT VERIFICATION PENDING.**

All actionable Phase A–C staging checks exercised here passed, including the original valid-learner Diagnostic 401 retest, Guest unavailability, bounded recovery, session/logout security, responsive states, and System Admin Overview. The conditional classification records the existing completed state of the supplied learner (fresh Diagnostic start was not forced) and the documented out-of-scope TTS catalog 409 baseline. No claim is made about pilot readiness.
