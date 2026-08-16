# ReaDirect Pilot QA Bugs

All evidence below is redacted. No passwords, tokens, cookies, reset codes, learner codes, real learner data, or raw audio are included.

## BUG-001 — Frontend security response headers are incomplete

- Severity: Medium
- Test ID: QA-DEP-03
- Environment: Pilot
- Frontend URL: `https://pilot.readirect.org`
- API URL: `https://api-pilot.readirect.org`
- Branch: Not exposed by deployment
- Commit: Not exposed; reference `2d8bd40` not confirmed
- Date/time and timezone: 2026-08-15 21:47 +08:00 (Asia/Manila)
- Browser/device and version: Windows 11 Pro, Playwright Chromium 149.0.7827.55, headless
- Test account alias and role: Anonymous
- Reproducibility: Always during this run

### Preconditions

Access to the public pilot frontend.

### Steps to reproduce

1. Request `https://pilot.readirect.org` and inspect response headers.
2. Compare with the API `/up` response headers.

### Expected result

The HTTPS frontend should provide a sensible safe framing policy and HSTS; CSP should be reviewed or present where appropriate.

### Actual result

The frontend returned `X-Content-Type-Options: nosniff` and a safe referrer policy, but no HSTS, `X-Frame-Options`, or CSP was observed. The API response did include `X-Frame-Options: DENY`, HSTS, and CSP.

### Endpoint and status code

`GET https://pilot.readirect.org/` → `200`.

### Redacted evidence

Header inspection showed the frontend omission described above; no secret or private response content was observed.

### Cleanup performed

None required; read-only request only.

### Security note

No exploit was attempted. This is a defense-in-depth/clickjacking and transport-header finding, not evidence of account compromise.

## BUG-002 — Root route remains on loading state for logged-out users

- Severity: Medium
- Test ID: Supplemental role-aware landing check
- Environment: Pilot
- Frontend URL: `https://pilot.readirect.org/`
- API URL: `https://api-pilot.readirect.org`
- Branch: Not exposed by deployment
- Commit: Not exposed; reference `2d8bd40` not confirmed
- Date/time and timezone: 2026-08-15 21:47 +08:00 (Asia/Manila)
- Browser/device and version: Windows 11 Pro, Playwright Chromium 149.0.7827.55, headless
- Test account alias and role: Anonymous
- Reproducibility: Always during this run

### Preconditions

Fresh private browser context with no stored auth state.

### Steps to reproduce

1. Open `https://pilot.readirect.org/`.
2. Wait 10 seconds after the page and API settings requests settle.

### Expected result

The logged-out landing experience should expose the public reader and staff-login actions.

### Actual result

The root route still displayed `Loading... Loading Ma'am Clara` after 10 seconds. Direct `/home` did show the public actions, so the issue is specific to the root route/startup state.

### Endpoint and status code

`GET https://pilot.readirect.org/` → `200`; no runtime console error or page exception was observed.

### Redacted evidence

Visible text remained `ReaDirect Loading... Loading Ma'am Clara`; no private data was shown.

### Cleanup performed

Closed the private browser context.

### Security note

No security bypass was observed. This is a functional/auth-bootstrap usability blocker.

## BUG-003 — Staff login throttling was not observed

- Severity: Medium
- Test ID: QA-AUTH-03
- Environment: Pilot
- Frontend URL: `https://pilot.readirect.org/staff/login`
- API URL: `https://api-pilot.readirect.org`
- Branch: Not exposed by deployment
- Commit: Not exposed; reference `2d8bd40` not confirmed
- Date/time and timezone: 2026-08-15 21:47 +08:00 (Asia/Manila)
- Browser/device and version: Windows 11 Pro, Playwright Chromium 149.0.7827.55, headless
- Test account alias and role: `SYS-ADMIN-QA-RATE-LIMIT-CHECK` placeholder alias; no real account used
- Reproducibility: Once in this run

### Preconditions

Logged-out private browser context; one bounded sequence of 11 incorrect attempts, within the guide limit.

### Steps to reproduce

1. Open the staff login page.
2. Submit the same fictional username and incorrect password 11 times.
3. Stop after the 11th attempt.

### Expected result

Repeated failures should produce a throttling response, normally `429`.

### Actual result

All observed login responses were `422` credential failures; no `429` response was observed.

### Endpoint and status code

`POST /api/staff/login` → eleven observed `422` responses.

### Redacted evidence

Only the status sequence and generic credential failure were retained.

### Cleanup performed

Stopped at the guide limit; no account or record was created.

### Security note

No brute force or flooding was performed. This is limited evidence that throttling was not observable from this client; deployment configuration should be confirmed before treating it as a complete rate-limit assessment.

## BUG-004 — Learner login throttling was not observed

- Severity: Medium
- Test ID: QA-LRN-02
- Environment: Pilot
- Frontend URL: `https://pilot.readirect.org/learner/login`
- API URL: `https://api-pilot.readirect.org`
- Branch: Not exposed by deployment
- Commit: Not exposed; reference `2d8bd40` not confirmed
- Date/time and timezone: 2026-08-15 21:47 +08:00 (Asia/Manila)
- Browser/device and version: Windows 11 Pro, Playwright Chromium 149.0.7827.55, headless
- Test account alias and role: `LEARNER-A-QA-RATE-LIMIT-CHECK` placeholder alias; no real account used
- Reproducibility: Once in this run

### Preconditions

Logged-out private browser context; one bounded sequence of up to six incorrect attempts.

### Steps to reproduce

1. Open the learner login page.
2. Submit the same fictional learner code and incorrect password six times.
3. Stop at the guide limit.

### Expected result

Repeated failures should be rate-limited without revealing account existence.

### Actual result

The observed invalid attempts returned `422`; no `429` response was observed.

### Endpoint and status code

`POST /api/learners/login` → observed invalid attempts returned `422`.

### Redacted evidence

Only status codes and generic credential failure text were retained.

### Cleanup performed

Stopped at the guide limit; no learner record was created.

### Security note

No brute force or flooding was performed. Confirm effective edge/application throttling with deployment owners.

## BUG-005 — Malicious-looking staff identifier can leave login pending

- Severity: Medium
- Test ID: QA-AUTH-02
- Environment: Pilot
- Frontend URL: `https://pilot.readirect.org/staff/login`
- API URL: `https://api-pilot.readirect.org`
- Branch: Not exposed by deployment
- Commit: Not exposed; reference `2d8bd40` not confirmed
- Date/time and timezone: 2026-08-15 21:47 +08:00 (Asia/Manila)
- Browser/device and version: Windows 11 Pro, Playwright Chromium 149.0.7827.55, headless
- Test account alias and role: Anonymous
- Reproducibility: Once in this run

### Preconditions

Logged-out private browser context.

### Steps to reproduce

1. Enter `admin'--` as the staff identifier and a fictional incorrect password.
2. Submit once.
3. Wait 20 seconds.

### Expected result

Authentication should fail normally with a controlled generic error.

### Actual result

The form remained on `Signing in`; no login response was observed within 20 seconds. No script, SQL text, stack trace, or server path appeared.

### Endpoint and status code

`POST /api/staff/login` was observed in Network as pending for the observation window.

### Redacted evidence

Only the harmless payload category, pending state, and timing were recorded; the literal input was not copied into evidence files.

### Cleanup performed

Closed the private browser context without retrying or escalating the input.

### Security note

The affected path was stopped after the minimum observation. This does not demonstrate SQL injection or account compromise; it demonstrates an input-dependent pending state that requires investigation.

## BUG-006 — Game Two is a contributor placeholder rather than a playable game

- Severity: Low
- Test ID: Supplemental Open Games check
- Environment: Pilot
- Frontend URL: `https://pilot.readirect.org/learner/games/game-two`
- API URL: `https://api-pilot.readirect.org`
- Branch: Not exposed by deployment
- Commit: Not exposed; reference `2d8bd40` not confirmed
- Date/time and timezone: 2026-08-15 21:47 +08:00 (Asia/Manila)
- Browser/device and version: Windows 11 Pro, Playwright Chromium 149.0.7827.55, headless
- Test account alias and role: Anonymous game-lobby placeholder `Reader7`; no learner account used
- Reproducibility: Always during this run

### Preconditions

Open Games lobby was entered with a fictional local game handle.

### Steps to reproduce

1. Open `/learner/games`.
2. Enter the fictional local handle and enter the lobby.
3. Select `Open Game Two`.

### Expected result

The deployed Game Two should launch with its required game experience and remain navigable.

### Actual result

The route loaded a nonblank page that says the screen is a contributor placeholder. No game canvas or playable game was present.

### Endpoint and status code

Frontend route loaded with `200`; no protected API call was required for this placeholder route.

### Redacted evidence

Only public UI text and the absence of a canvas were recorded.

### Cleanup performed

Closed the private browser context.

### Security note

No private data or backend mutation was involved.
