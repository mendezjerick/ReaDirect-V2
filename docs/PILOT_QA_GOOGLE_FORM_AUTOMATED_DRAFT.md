# ReaDirect Google Form — Automated QA Draft

Status: **Draft only — not submitted**

Evaluator identity: **Automated Codex QA Tester**

This draft is based only on the observed pilot QA run documented in [PILOT_QA_EXECUTION_REPORT.md](PILOT_QA_EXECUTION_REPORT.md). It is not a human IT-expert response and must not be submitted as one without researcher authorization.

## Part I — Respondent Information

| Form field | Draft answer |
| --- | --- |
| Name | Automated Codex QA Tester |
| Institution / organization | ReaDirect Pilot QA |
| Position | Automated QA and Security Evaluator |
| Highest educational attainment | N/A — automated evaluator |
| Area of expertise | QA / Testing; Cybersecurity |
| Other area of expertise | Black-box web QA, usability smoke testing, and security-boundary testing |
| Years of professional experience | N/A — automated evaluator |
| Build / environment evaluated | ReaDirect pilot cloud deployment: `https://pilot.readirect.org` and `https://api-pilot.readirect.org` |
| Performance-threshold document reviewed | No |

## Rating guidance

Use the form’s `N/O — Not observed` option whenever the criterion requires an account, private record, native device, audit access, or evidence that was unavailable. Do not convert blocked coverage into a score.

## Part II — Instructions and Rating Scale

No response required. The supplied evidence was evaluated using the form’s 5-to-1 scale and `N/O` option.

## Part III — System Evaluation

### Functionality

| Criterion area | Draft rating | Basis |
| --- | --- | --- |
| Sign-in, sign-out, and expired-session recovery | N/O | Invalid credential handling was observed, but no disposable valid staff/learner account was available for the complete flow. |
| Role-specific routes, functions, and data | N/O | Cross-role account fixtures were unavailable. Anonymous protected reads returned `401`. |
| Diagnostic, Lessons 1–6, and Final Assessment sequence | N/O | Authenticated learner account unavailable. |
| Assessment scoring, skip, resume, and completion persistence | N/O | Authenticated learner account and disposable records unavailable. |
| Teacher and Administrator server-authoritative functions | N/O | Staff accounts and admin fixtures unavailable. |

### Integration and data integrity

Recommended rating: **N/O** for account-bound integration, assessment persistence, duplicate prevention, reset consistency, ownership, school assignment, and audit-integrity criteria. Those workflows were not safely testable without disposable pilot accounts and records.

### Compatibility and responsiveness

| Criterion area | Draft rating | Basis |
| --- | --- | --- |
| Browser responsiveness on reachable public routes | 4 — Mostly meets | No horizontal overflow was observed at 360×740, 390×844, 412×915, 768×1024, 1366×768, or 844×390. |
| Native mobile compatibility | N/O | No APK or physical device was available. |
| Open Games experience | 3 — Partly meets | The lobby loaded; Readscape required learner sign-in and Game Two displayed a contributor placeholder rather than a playable canvas. |

### Accessibility

| Criterion area | Draft rating | Basis |
| --- | --- | --- |
| Basic labels and accessible control names | 4 — Mostly meets | Reachable login forms had visible labels and named controls. |
| Full accessibility, native permission, and assistive-technology behavior | N/O | Only a smoke check was performed; no formal WCAG audit or native-device test was completed. |

### Performance and reliability

| Criterion area | Draft rating | Basis |
| --- | --- | --- |
| Public route loading and network stability | 3 — Partly meets | Public routes generally loaded without console/page errors, but the root route remained on `Loading... Loading Ma'am Clara` for more than 10 seconds. |
| Free-host cold-start recovery | N/O | A controlled API sleep interval could not be established safely. |
| Offline recovery and privacy | N/O | Native APK/device unavailable. |

### Security and privacy

| Criterion area | Draft rating | Basis |
| --- | --- | --- |
| Anonymous endpoint protection | 4 — Mostly meets | Protected API reads returned `401`; protected files did not expose secrets or source. |
| Authentication abuse resistance | 3 — Partly meets | Invalid credentials were rejected, but bounded staff and learner attempts did not produce observable `429` throttling. |
| Security headers | 3 — Partly meets | API headers were strong, but the frontend lacked observed HSTS, safe framing policy, and CSP. |
| RBAC, IDOR, audio authorization, reset takeover, and audit secrecy | N/O | Required disposable accounts, records, audio, and authorized audit access were unavailable. |

## Part IV — Reproducible Failures and Limitations

Use the following summary for failure/limitation fields:

> Automated QA observed incomplete frontend security headers, no observable rate limiting within the guide’s bounded login attempts, a malformed staff identifier that left the login request pending for the observation window, and a logged-out root route that remained on a loading state. Game Two opened a nonblank contributor placeholder rather than a playable canvas. Account-bound authorization, reset, audio, audit, native-device, and offline checks were blocked because disposable pilot accounts, pilot email infrastructure, authorized audit access, and a physical device were unavailable.

## Part V — Overall Assessment

Recommended overall rating: **3 — Partly meets**

Reason: The reachable public deployment and basic anonymous protections worked, but several Medium findings remain and most high-value account-bound security and privacy coverage was blocked.

## Comments / Suggestions field

> Automated QA evaluation of the ReaDirect pilot: the frontend loaded over HTTPS and protected anonymous API requests returned 401. No Critical or High issue was demonstrated. Medium findings included incomplete frontend security headers, unobserved login throttling, a pending malformed-input login state, and a root-route loading issue. Game Two displayed a contributor placeholder. Account-bound authorization, reset, audio, audit, native-device, and offline tests were blocked because disposable pilot accounts and a physical device were unavailable. Further IT review is recommended after these gaps are addressed.

## Submission note

This file is a local answer draft only. No Google Form response was submitted.

