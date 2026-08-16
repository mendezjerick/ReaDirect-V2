# ReaDirect Respondent 2 Pilot Retest

## 1. Environment

- Target Pilot: `https://pilot.readirect.org`
- Browser: Playwright Chromium, headless; desktop, tablet, phone portrait, and phone landscape viewports.
- Test date: 2026-08-16 (Asia/Manila workstation time).
- Evidence screenshots: `.runtime/qa-pilot/` (credentials, tokens, cookies, and authorization values are not present).
- Deployed branch, commit, deployment identifier, and build timestamp: UNKNOWN from the public Pilot surface.
- This was a non-destructive browser QA run using only the authorized Pilot QA accounts. No database, learner progress, assessment answer, score, lesson, or Admin data was changed.

## 2. Deployment Readiness

PARTIAL / ENVIRONMENT BLOCKER. `https://pilot.readirect.org/` returned HTTP 200 and served the ReaDirect application shell and normal assets. The public intro eventually reached the approved static state: “Clara’s animation is unavailable, so a simple view is ready.” No deployment placeholder or uncaught page exception was observed.

The normal Pilot frontend requests the API origin `https://api-pilot.readirect.org`. Direct read-only checks returned HTTP 200 for `/api/experience/intro/settings` and HTTP 204 for the credentialed learner-login preflight. However, browser requests made by the application to the intro settings and login endpoints were aborted by the application’s normal request ceiling before the Pilot browser flows could authenticate.

## 3. Learner Authentication

BLOCKED. The Pilot QA Learner login form rendered correctly, but the normal browser login request was aborted and displayed the friendly retry state: “We couldn’t sign you in right now. Please try again.” The browser observed no successful login response for the UI flow and remained on `/learner/login`.

An independent direct API diagnostic (not used to claim UI login success) returned HTTP 200 from the Pilot learner-login endpoint after several seconds. The browser application’s request path still aborted before the authenticated route became available. This indicates a Pilot browser/API timing or deployment-path issue requiring investigation before authenticated Pilot acceptance can be completed.

## 4. Diagnostic 401 Final Retest

BLOCKED — AUTHENTICATED FLOW NOT REACHED. The valid normal browser login did not complete, so the authorized learner could not naturally reach the Diagnostic. No Diagnostic 401 was observed because no authenticated Diagnostic request was successfully reached in the normal UI flow.

## 5. Diagnostic Resume / Duplicate-Run Verification

NOT OBSERVED. The supplied learner’s authoritative Diagnostic state was not reached through the normal Pilot browser login. No attempt was started, resumed, reset, or fabricated. Fresh Diagnostic creation and duplicate-run behavior remain unverified in Pilot.

## 6. Session Restore / Logout

PARTIALLY VERIFIED. Logged-out direct navigation to `/learner/assessment/part-one` redirected to `/learner/login`, and logged-out direct navigation to `/staff/system-admin` redirected to `/staff/login`. Authenticated refresh, direct authenticated Diagnostic routing, and normal logout-after-login could not be safely exercised because normal Pilot authentication did not complete.

## 7. Guest Mode

PASS. A clean logged-out browser opened `/learner/games` and displayed the safe unavailable state: “Guest Mode is not available right now. Please sign in as a learner to continue.” The learner-login action and Back action were visible. No Guest API request, generated handle, fake setup, or infinite loading state was observed.

## 8. Clara / Loading Recovery

CONDITIONALLY PASS. Pilot startup initially remained in the Clara preparation state while the intro settings request exceeded the normal browser wait. It then reached the approved bundled/static fallback: “Clara’s animation is unavailable, so a simple view is ready.” No permanent loading lock or fatal page exception was observed. Approximate normal startup-to-fallback time was about 12 seconds in the clean browser runs.

## 9. Normal API Recovery

PASS for the learner login recovery state; Admin authenticated recovery NOT OBSERVED. With one scoped browser-only HTTP 503 interception on the learner login request, the form showed the friendly recoverable error and remained usable with the login control available. No Pilot server data was changed.

An authenticated System Admin recovery test could not be reached because normal System Admin login was blocked by the same Pilot browser/API timing behavior.

## 10. Responsive Verification

PASS for the reachable Pilot states. Learner login and Guest-unavailable screens were checked at 1440×900, 768×1024, 390×844, and 844×390. In every checked viewport, `scrollWidth` equaled `clientWidth`; no horizontal overflow, clipped login control, or unreachable Guest action was observed. Authenticated dashboard and Diagnostic responsive states were not reachable.

## 11. System Admin Regression

BLOCKED. The Pilot System Admin login form rendered, but the normal browser login request was aborted and the UI remained on `/staff/login` with a recoverable connection message. Consequently, the authenticated Overview, metric cards, charts, navigation, and role-scoped Admin data could not be verified through the normal Pilot UI.

## 12. Security Regression

PARTIALLY VERIFIED. Logged-out protected learner and Admin routes were denied by redirecting to their respective login routes. No credentials, bearer values, cookies, or authorization headers were recorded. Learner-to-Admin denial and successful System Admin authorization were not safely testable because neither normal authenticated UI login completed.

## 13. Console / Network Findings

- Pilot application shell and assets returned HTTP 200.
- API origin observed from normal Pilot requests: `https://api-pilot.readirect.org`.
- Direct intro settings read: HTTP 200.
- Credentialed learner-login preflight: HTTP 204 with the Pilot origin and credentials permission.
- In browser UI flows, `/api/experience/intro/settings`, `/api/learners/login`, and `/api/staff/login` requests were aborted by the application before usable responses reached the page. This is classified as ENVIRONMENT / DEPLOYMENT timing behavior, not silently treated as a successful authentication.
- The learner request displayed its bounded friendly retry state. The Admin login request displayed its recoverable connection state.
- The external Google Fonts request reported headless-browser ORB blocking; this did not prevent the app shell, login, or Guest state from rendering and is classified PRE-EXISTING / OUT OF SCOPE.
- No uncaught application page errors were observed.
- No new Pilot 401/403/409/422/5xx response was observed in a completed authenticated application flow. Authenticated flow coverage was blocked before those routes.

## 14. Staging vs Pilot Comparison

Staging previously passed the Respondent 2 Phase A–C checks, including authenticated Diagnostic access, Guest unavailability, bounded recovery, session/logout protection, responsive states, and System Admin Overview. Pilot reached the same public shell, Guest-safe state, static Clara fallback, and responsive login/Guest states, but its browser-to-Pilot API timing prevented normal learner and Admin authentication. Staging numeric totals and Pilot data were not compared.

## 15. Academic Sequence Open Conflict

OPEN PRODUCT/ACADEMIC SPECIFICATION CONFLICT. The manuscript specifies Diagnostic → Lesson 1 → Lesson 2 → Lesson 3 → Lesson 4 → Lesson 5 → Lesson 6 → Final, while the documented historical implementation permits Lessons 1–6 independently after Diagnostic and requires all six before Final. Pilot progression was not exercised and this known conflict was not modified or used as an authentication failure.

## 16. Respondent 2 Final Re-Evaluation

| Area | Original status | Pilot evidence | Final remediation status | Confidence |
| --- | --- | --- | --- | --- |
| Authentication/session behavior | Respondent 2 low area | Login forms rendered, but normal browser auth timed out/aborted before authenticated route | BLOCKED — Pilot transport timing prevents final acceptance | High |
| Diagnostic accessibility/integration | Respondent 2 blocking concern | Authenticated Diagnostic was not naturally reachable; no Diagnostic 401 could be meaningfully retested | BLOCKED / PARTIALLY VERIFIED | High |
| Guest behavior | Respondent 2 low area | Safe unavailable Guest state, login and Back actions, no Guest API request | REMEDIATED for reachable Pilot public flow | High |
| Unavailable-service/error recovery | Respondent 2 low area | Learner scoped failure reached bounded friendly retry state; Admin authenticated recovery not reached | PARTIALLY VERIFIED | Medium |
| Page readiness | Deployment readiness pending | HTTP 200 app shell, assets loaded, static Clara fallback usable | PARTIALLY VERIFIED; API timing blocker remains | High |
| Repeated representative use | Not accepted previously | Authenticated repeated Diagnostic use not safely reachable | BLOCKED | High |
| Security/session protection | Respondent 2 low area | Logged-out protected routes denied; authenticated role checks not reachable | PARTIALLY VERIFIED | Medium |
| Admin quality/regression | Previously praised | Normal Admin login blocked before Overview | BLOCKED / PRESERVED LOCALLY ONLY | High |
| Overall technical acceptability | Do not accept at time of original evaluation | Pilot public states are usable, but authenticated acceptance cannot be established | BLOCKED pending Pilot browser/API timing investigation | High |

No evaluator rating was invented or re-submitted by inference. Criteria not directly observable in Pilot are marked blocked or not observed.

## 17. Remaining Known Issues

- Investigate why the Pilot browser’s normal API requests are aborted by the application’s approximately 12-second normal JSON ceiling while direct API diagnostics can return successfully after several seconds.
- Re-run normal Pilot learner and System Admin login after the Pilot API timing/deployment path is corrected.
- Re-run the original authenticated Diagnostic 401, refresh/direct-route, and duplicate-run checks without fabricating academic responses.
- Verify authenticated Admin Overview and authenticated Admin recovery after normal Admin login works.
- Review the known TTS activity-manifest 409 baseline if it appears in a completed Pilot learner flow.
- Preserve the open fixed academic-sequence specification conflict for separate product resolution.

## 18. Final Verdict

> **Superseded by Section 20:** the initial cold-start-only verdict was revisited in a controlled follow-up. The current evidence supports a conditional Pilot pass, with cold-start API timing still requiring correction and retest.

**BLOCKED — PILOT BROWSER/API TIMING PREVENTED MEANINGFUL AUTHENTICATED RESPONDENT 2 VERIFICATION.**

Pilot deployment is publicly reachable and its Guest-safe, Clara-fallback, recovery, and responsive public states were observed. The decisive authenticated learner and Admin flows could not complete normally because the Pilot browser requests were aborted before the application received usable login responses. This report does not classify the blocked authenticated checks as a remediation pass or invent Diagnostic/Admin outcomes.

## 19. IT Expert Evaluation Form Submission

- Submitted: YES (one submission)
- Automated identity: AI QA Agent; ReaDirect Pilot QA; Automated QA and Security Evaluator; QA / Testing; years of professional experience recorded as `0` because the form required a numeric value.
- Pilot environment evaluated: `pilot.readirect.org`.
- Evidence basis: this non-destructive Pilot browser/API QA report. Criteria not directly observable through the authenticated Pilot UI were marked N/O in the form; no credentials, tokens, cookies, authorization headers, learner answers, scores, or fabricated academic outcomes were submitted.
- Overall recommendation submitted: **Do not accept at this time**.
- Limitations recorded: normal Pilot learner and System Admin browser authentication was blocked by request timing/aborts; authenticated Diagnostic, session restore/logout, Admin Overview, and representative progression were therefore not accepted as verified. The academic sequence conflict remains open.
- Confirmation evidence: `.runtime/qa-pilot/google-form-confirmation.png`.

## 20. Controlled Authenticated Follow-up

This follow-up was performed after the single form submission and supersedes the initial cold-start-only limitation in Sections 3–12 and the original Section 18 wording.

- Learner login: the first cold request displayed the bounded retry state; a normal UI retry returned HTTP 200 and reached `/learner/dashboard`.
- Diagnostic: Reading Journey opened; `/learner/assessment/part-one` reached Part 1 with HTTP 200 and no Diagnostic 401. No academic answers were submitted.
- Session behavior: refresh and direct navigation remained on Part 1. Sign-out cleared access, and direct protected navigation returned to learner login.
- Admin: a normal retry reached `/staff/system-admin`; Overview rendered authoritative Pilot totals and health cards.
- Role boundary: an authenticated learner navigating to `/staff/system-admin` was redirected to `/staff/login`.
- Remaining issue: a cold first API connection can exceed the deployed 12-second normal JSON ceiling. Normal retries complete the affected learner and Admin flows. This supports a **CONDITIONALLY PASS** Pilot remediation result pending cold-start timing correction and retest.
