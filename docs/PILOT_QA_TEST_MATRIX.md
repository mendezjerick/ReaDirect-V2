# ReaDirect Pilot QA and Security Test Matrix

Test date: 2026-08-15 (Asia/Manila)

Environment: `https://pilot.readirect.org` and `https://api-pilot.readirect.org`

Branch/commit: The deployed branch and commit were not exposed by the public deployment. The guide reference commit `2d8bd40` could not be confirmed.

Browser: Playwright Chromium 149.0.7827.55, headless, Windows 11 Pro. No physical device or APK was available.

| Test ID | Area | Result | Severity | Bug ID | Notes |
| --- | --- | --- | --- | --- | --- |
| QA-DEP-01 | Deployment | PASS | — | — | Frontend loaded over HTTPS, requests used the pilot API host, and `/up` returned `200` with “Application up” and no configuration details. |
| QA-DEP-02 | HTTP handling | PASS | — | — | Frontend and API HTTP requests redirected to HTTPS. |
| QA-DEP-03 | Security headers | FAIL | Medium | BUG-001 | API headers were strong; frontend response lacked HSTS, safe framing policy, and CSP. |
| QA-DEP-04 | Protected files | PASS | — | — | Protected-file probes returned the SPA shell or API `404`; no secrets, source, or credentials were exposed. |
| QA-DEP-05 | CORS | PASS | — | — | Allowed-origin preflight returned the exact pilot origin; an untrusted origin was not reflected. No credentialed wildcard was observed. |
| QA-DEP-06 | Anonymous access | PASS | — | — | Public settings/login behavior worked; protected API reads returned `401`; direct protected pages redirected or showed an authorization state. |
| QA-AUTH-01 | Staff authentication | BLOCKED | — | — | Invalid credentials were rejected with generic `422`; no disposable staff account was available to verify successful login, inactive accounts, case/space variants, or username-only behavior. |
| QA-AUTH-02 | Malicious login input | FAIL | Medium | BUG-005 | `admin'--` and script-shaped staff identifiers left the form in “Signing in” with no response observed after 20 seconds. No script, SQL text, or stack trace appeared. |
| QA-AUTH-03 | Staff rate limiting | FAIL | Medium | BUG-003 | Eleven bounded incorrect attempts all returned `422`; no `429` throttling response was observed. |
| QA-LRN-01 | Learner-code validation | BLOCKED | — | — | Invalid/malformed values were rejected cleanly, but no active/inactive disposable learner accounts were available for the complete matrix. |
| QA-LRN-02 | Learner rate limiting | FAIL | Medium | BUG-004 | Six bounded incorrect learner attempts did not produce `429`; invalid attempts returned `422`. |
| QA-RBAC-01 | Direct role routes | BLOCKED | — | — | Required teacher and school-admin accounts were unavailable. |
| QA-RBAC-02 | Client-side role tampering | BLOCKED | — | — | Required authenticated disposable staff account was unavailable. |
| QA-RBAC-03 | Staff-ID substitution | BLOCKED | — | — | Required two disposable staff identities were unavailable. |
| QA-IDOR-01 | Teacher against School B | BLOCKED | — | — | Required School A/School B teacher and object fixtures were unavailable. |
| QA-IDOR-02 | School admin against School B | BLOCKED | — | — | Required two school-admin accounts and school fixtures were unavailable. |
| QA-IDOR-03 | Learner A against Learner B | BLOCKED | — | — | Required two disposable learner accounts and owned objects were unavailable. |
| QA-IDOR-04 | Audio authorization | BLOCKED | — | — | No authorized disposable learner audio item was available. |
| QA-SES-01 | Logout invalidation | BLOCKED | — | — | Required authenticated account/session was unavailable. |
| QA-SES-02 | Non-remembered session | BLOCKED | — | — | Required authenticated account/session was unavailable. |
| QA-SES-03 | Remembered device | BLOCKED | — | — | Required authenticated account/session was unavailable. |
| QA-SES-04 | Password/reset invalidation | BLOCKED | — | — | Required two private authenticated profiles and disposable reset flow were unavailable. |
| QA-SES-05 | Learner credential reset | BLOCKED | — | — | Required learner and authorized staff accounts were unavailable. |
| QA-EMAIL-01 | Verification behavior | BLOCKED | — | — | No disposable pilot email/account infrastructure was available. |
| QA-EMAIL-02 | Password-change preconditions | BLOCKED | — | — | No disposable verified/unverified staff accounts were available. |
| QA-IN-01 | Stored/reflected scripts | BLOCKED | — | — | No disposable authenticated text-record workflow was available. |
| QA-IN-02 | SQL/malformed input | BLOCKED | — | — | No disposable write operation was available for safe malformed-object testing. |
| QA-IN-03 | Boundary lengths | BLOCKED | — | — | Required authenticated import/credential workflows and account fixtures were unavailable. |
| QA-IN-04 | CSV import | BLOCKED | — | — | Required disposable teacher/school scope and fictional import workflow were unavailable. |
| QA-DATA-01 | Duplicate submissions | BLOCKED | — | — | Required disposable create/import/reset/save records were unavailable. |
| QA-DATA-02 | Ownership/assignment | BLOCKED | — | — | Required assigned/unassigned staff fixtures were unavailable. |
| QA-DATA-03 | Reset consistency | BLOCKED | — | — | Required disposable credential-reset workflow was unavailable. |
| QA-DATA-04 | Locked/read-only features | BLOCKED | — | — | Authenticated write/read-only checks were unavailable. |
| QA-PILOT-01 | ASR disabled | BLOCKED | — | — | No authenticated diagnostic/final/lesson/speech-sandbox account was available. |
| QA-PILOT-02 | Published audio only | BLOCKED | — | — | No authenticated learner activity was available to play the published English/Filipino catalog. |
| QA-PILOT-03 | Word Rescue dependency | BLOCKED | — | — | The current public Clara Words route explicitly reports pilot unavailability, but a named Word Rescue dependency flow was not exposed. |
| QA-PILOT-04 | Realtime dependency | PASS | — | — | Core public routes and the anonymous game lobby loaded without WebSocket/Reverb requests. |
| QA-PILOT-05 | Cold start | BLOCKED | — | — | A controlled API sleep interval could not be established safely in this run. |
| QA-MOB-01 | Microphone permission | BLOCKED | — | — | No native APK or physical test device was available. |
| QA-MOB-02 | Offline recording privacy | BLOCKED | — | — | No native APK or physical test device was available. |
| QA-MOB-03 | Logout data removal | BLOCKED | — | — | No native APK or physical test device was available. |
| QA-AUD-01 | Useful audit trail | BLOCKED | — | — | Required authorized account and audit-view access were unavailable. |
| QA-AUD-02 | Secret redaction | BLOCKED | — | — | Permitted application-log access and disposable actions were unavailable. |
| QA-AUD-03 | Audit rendering | BLOCKED | — | — | Required disposable auditable display-name workflow was unavailable. |

## Supplemental required checks

| Check | Result | Bug ID | Notes |
| --- | --- | --- | --- |
| Logged-out role-aware landing | FAIL | BUG-002 | `/home` showed the expected public actions, but `/` remained on `Loading... Loading Ma'am Clara` after 10 seconds in a fresh context. |
| Open Games / Game One | BLOCKED | — | The Readscape path was present but redirected anonymous users to learner sign-in; no disposable learner account was available. |
| Open Games / Game Two | FAIL | BUG-006 | Game Two opened a nonblank route, but the deployed screen identified itself as a contributor placeholder and exposed no playable canvas. |
| Open Games back behavior | BLOCKED | — | The placeholder route exposed “Back to Lobby”, but end-to-end authenticated game navigation was not available. |
| Responsive smoke checks | PASS | — | No horizontal overflow was observed at 360×740, 390×844, 412×915, 768×1024, 1366×768, or 844×390 on reachable public routes. |
| Accessibility smoke checks | PASS | — | Reachable login forms had visible labels and named controls; no console/page errors were observed. This is not a WCAG certification. |
