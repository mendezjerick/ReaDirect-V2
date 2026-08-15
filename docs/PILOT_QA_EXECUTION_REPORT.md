# ReaDirect Pilot QA and Security Execution Report

## 1. Executive Summary

This was a read-only black-box evaluation of the deployed ReaDirect pilot. The public surface loaded over HTTPS and anonymous protected API reads were denied. No Critical or High security issue was demonstrated. Coverage was materially limited because no disposable pilot accounts, pilot email infrastructure, APK, or physical device were supplied.

- Total guide tests: 44
- Pass: 6
- Fail: 4
- Blocked: 34
- Critical findings: 0
- High findings: 0
- Medium findings: 5, including two supplemental functional findings
- Low findings: 1

Decision: **CONDITIONALLY READY**

This decision is limited to the observed public deployment. It is not a claim that ReaDirect is completely secure or ready for unrestricted production use. The unresolved Medium findings and blocked account/device coverage should be addressed before final IT approval.

## 2. Environment

- Frontend: `https://pilot.readirect.org`
- API: `https://api-pilot.readirect.org`
- Expected branch: `pilot/cloud-deployment`
- Reference commit: `2d8bd40`
- Actual deployed branch: Not exposed by the public deployment
- Actual deployed commit: Not exposed; reference commit could not be confirmed
- Test date/time: 2026-08-15, Asia/Manila; observations ran through approximately 21:47 +08:00
- Browser/device: Playwright Chromium 149.0.7827.55, headless, Windows 11 Pro
- Physical device: None
- Test accounts: No real accounts used. Fictional placeholder aliases were used only for bounded invalid-login/rate-limit checks.

The repository was inspected for route and contract context only. The worktree was already substantially modified, including application files and the local SQLite database, before this evaluation. No application source, dependency, configuration, database, or deployment files were changed by this run.

## 3. Critical / High Findings

None demonstrated.

The required cross-account, role-escalation, learner-audio, reset-takeover, stored-script, and private-file tests were blocked by unavailable disposable fixtures. They must not be interpreted as passed.

## 4. Deployment / HTTPS / Exposure

The frontend loaded over HTTPS and used `api-pilot.readirect.org` for observed API calls. HTTP requests redirected to HTTPS. `/up` returned `200` with a branded “Application up” health page and no configuration details. Protected file probes did not expose source, logs, environment values, or credentials. API preflight returned the exact pilot origin for both the expected and an untrusted origin, rather than reflecting the untrusted origin.

The frontend response provided MIME-sniffing protection and a strict referrer policy, but no HSTS, `X-Frame-Options`, or CSP was observed. See BUG-001.

## 5. Staff Authentication

Valid-looking invalid credentials returned a controlled generic `422` response. Malicious-looking identifiers did not expose SQL, stack traces, scripts, or server paths, but one input-dependent path remained pending for 20 seconds. See BUG-005.

The bounded 11-attempt staff check did not observe a `429` response. See BUG-003. A successful disposable staff login, inactive-account behavior, username-only behavior, and case/space variants were blocked because no pilot account was supplied.

## 6. Learner Authentication

Invalid learner credentials returned a controlled generic `422` response, and client-side format handling was visible for malformed values. The bounded six-attempt learner check did not observe throttling. See BUG-004. Active/inactive account and successful-login cases were blocked.

## 7. RBAC / Authorization

Blocked: teacher, school administrator, system administrator, and staff-ID substitution fixtures were unavailable. Anonymous protected reads returned `401`, and direct staff-protected routes redirected to staff login without protected content appearing.

## 8. Cross-School / IDOR

Blocked: the required School A/School B and Learner A/Learner B disposable accounts and owned objects were unavailable. No cross-school enumeration or exploitation was attempted.

## 9. Sessions / Persistent Device / Logout

Blocked: no disposable authenticated staff or learner session was available for logout, remembered-device, password invalidation, or credential-reset testing. No persistent token or secret was recorded.

## 10. Email / Recovery

Blocked: disposable pilot email and verified/unverified account infrastructure were unavailable. No verification or reset code was requested or recorded.

## 11. Validation / XSS / CSV

The public login surface did not render script-shaped input, and no SQL/debug details appeared. Stored-field, import, boundary-length, formula-injection, and authenticated malformed-object tests were blocked because no disposable write workflow was available. The pending malformed staff-input behavior is BUG-005.

## 12. Data Integrity

Blocked: disposable learner, import, reset, assessment, and game-save records were unavailable. No duplicate or destructive operation was attempted.

## 13. Pilot ASR / TTS

Authenticated ASR, published English/Filipino audio, and administrator speech sandbox checks were blocked. The public Clara Words route truthfully displayed that the activity was unavailable during pilot testing because its new voice lines were not in the approved published catalog. No runtime TTS token or unauthorized audio was observed.

## 14. Open Games

The anonymous game lobby loaded and displayed four game cards. The Readscape path redirected to learner sign-in, so a full Game One launch was blocked by the missing learner account. Game Two opened a nonblank route with a Back to Lobby control, but the page explicitly identified itself as a contributor placeholder and had no playable canvas. See BUG-006.

## 15. Learn with Ma'am Clara

The anonymous Clara menu paths redirected to learner sign-in. The public Words route safely reported its pilot unavailability instead of silently attempting runtime voice generation. Full letters/audio navigation was blocked without a learner account.

## 16. Mobile / Offline / Privacy

Blocked: no native APK, Android device, microphone permission flow, offline recording flow, or offline logout/reopen test environment was available. Browser viewport checks are not a substitute for native-device results.

## 17. Audit Logs

Blocked: authorized audit-view access and disposable auditable actions were unavailable. No logs containing credentials, tokens, reset codes, or audio were collected.

## 18. Functional / Responsive / Accessibility

The reachable public routes had no console errors, page exceptions, failed requests, or horizontal overflow at 360×740, 390×844, 412×915, 768×1024, 1366×768, or 844×390. Login inputs had visible labels and controls had accessible names. This was an accessibility smoke check, not a WCAG audit.

The root route remained on `Loading... Loading Ma'am Clara` for more than 10 seconds in a fresh logged-out context, while `/home` showed the expected public actions. See BUG-002.

## 19. Admin / Page Portal

Blocked: no system-admin account was available for Admin Overview, Page Portal, chart/data-integrity, or special-origin return-path testing.

## 20. Blocked Tests

The principal blockers were:

- No disposable system-admin, school-admin A/B, teacher A/B, learner A/B, inactive, or verified/unverified staff accounts.
- No disposable pilot email/testing inbox.
- No native APK or physical device.
- No authorized audit-log access.
- No controlled API cold-start/sleep window.

Blocked means not tested; it does not mean passed.

## 21. Full Test Matrix Summary

The complete 44-test matrix is in [PILOT_QA_TEST_MATRIX.md](PILOT_QA_TEST_MATRIX.md). Every guide test has exactly one result, and every failed guide test has a bug ID.

## 22. Security Readiness Decision

**CONDITIONALLY READY**

No unresolved Critical or High finding was demonstrated. However, the pilot should not be considered fully security-ready until the Medium findings are investigated and the blocked account-boundary, reset, audio, audit, native, and offline coverage is completed with authorized disposable fixtures.

## Google Form Evaluation

- Form URL: `https://forms.gle/MATCd8uv8VEYSrSA9`
- Form opened: YES
- Resolved form title: `ReaDirect IT Expert Technical Quality Evaluation Tool`
- Intended audience: Ten IT experts with software engineering, information systems, QA, cybersecurity, HCI, or related experience
- Suitable for automated QA response: NO
- Questions reviewed: Form introduction and Page 2 respondent-information fields were reviewed; navigation was blocked by required human respondent fields
- Questions answered: 0
- Questions skipped: All substantive evaluation questions
- Questions blocked: All substantive evaluation questions, because they require human-expert identity and judgment after guided system use
- Identity used: None; no respondent identity was entered
- Submission status: **NOT SUBMITTED**
- Reason for non-submission: The form explicitly collects human IT-expert research responses and requires respondent information. Submitting would impersonate a human research respondent and contaminate the research data.
- The form was not used to impersonate a learner, teacher, parent, school administrator, researcher, thesis respondent, or real person.
- No sensitive data was entered.

## Integrity Statement

- No application source code was changed by this evaluation.
- No real learner or school data was intentionally used.
- No passwords, tokens, cookies, reset codes, API secrets, database strings, or raw audio were written into reports.
- Findings reflect observed pilot behavior and explicitly identify blocked coverage.
- No unresolved Critical or High issue was hidden; none was demonstrated, while required high-impact tests remained blocked.
- The pilot was not claimed fully secure beyond the evidence collected.

