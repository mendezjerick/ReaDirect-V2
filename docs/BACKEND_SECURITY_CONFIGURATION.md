# Backend Security Configuration

ReaDirect services bind to `127.0.0.1` by default. Keep the Laravel API,
Reverb, ASR, TTS, PostgreSQL, recordings, and model runtimes on a private host
network. Only the approved HTTPS gateway or web proxy should accept public
traffic.

## Production environment

Production startup fails closed unless the following baseline is satisfied:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://readirect.example.gov.ph
APP_KEY=base64:replace-with-a-generated-production-key
APP_FORCE_HTTPS=true
TRUSTED_HOSTS=readirect.example.gov.ph
TRUSTED_PROXIES=127.0.0.1,::1
SECURITY_HSTS_ENABLED=true
SECURITY_HSTS_MAX_AGE=31536000
SECURITY_HSTS_INCLUDE_SUBDOMAINS=false
REVERB_SERVER_HOST=127.0.0.1
ASR_SERVICE_TOKEN=replace-with-a-distinct-random-secret-of-at-least-32-characters
TTS_SERVICE_TOKEN=replace-with-another-random-secret-of-at-least-32-characters
ASR_MAX_HTTP_REQUEST_BYTES=27262976
TTS_MAX_HTTP_REQUEST_BYTES=16384
```

Replace `TRUSTED_PROXIES` with the explicit IP addresses or CIDR ranges of the
approved reverse proxies. Wildcard proxies are rejected in production because
they let clients forge forwarding information. List every approved hostname in
`TRUSTED_HOSTS`, separated by commas.

The application rejects plain HTTP requests when `APP_FORCE_HTTPS=true` rather
than redirecting request bodies. The gateway must forward the original scheme,
and only configured proxies are trusted to supply that information.

HSTS is emitted only for requests Laravel recognizes as HTTPS. Enable it after
the production hostname has a working certificate. Set
`SECURITY_HSTS_INCLUDE_SUBDOMAINS=true` only when every affected subdomain is
HTTPS-capable.

The ASR and TTS credentials authenticate Laravel to the private speech
services. Use distinct random values with at least 32 characters, deliver them
only through process environment or a secrets manager, and never put them in
URLs, logs, or source control. Production startup rejects missing or short
values. The speech services expose only minimal liveness/readiness responses
without authentication; model status and all inference routes require the
matching bearer token.

During local development, `start.ps1` writes its generated TTS token to the
ignored `.runtime/tts-service-token` file with access restricted to the current
Windows user. The published-speech generation script reads that short-lived
file only when `TTS_SERVICE_TOKEN` is not present in its process environment.
The launcher removes the file when it stops. Never copy this file into source
control or include its contents in a bug report.

## Learner authentication

Learner login is protected by independent per-IP and per-learner-code limits.
The learner-code limiter uses a one-way digest as its cache key, so learner
identifiers are not stored in rate-limit metadata. Missing, inactive, invalid,
and corrupt credentials all use the same external error and perform a password
hash check to reduce account-enumeration timing differences.

```dotenv
LEARNER_LOGIN_IP_ATTEMPTS_PER_MINUTE=60
LEARNER_LOGIN_IDENTIFIER_ATTEMPTS_PER_MINUTE=5
LEARNER_SESSION_LIFETIME_HOURS=12
LEARNER_SESSION_IDLE_TIMEOUT_MINUTES=60
LEARNER_SESSION_TOUCH_INTERVAL_SECONDS=60
LEARNER_MAX_ACTIVE_SESSIONS=5
```

Every learner route except login is guarded centrally. Sessions have both an
absolute lifetime and an inactivity timeout, activity writes are coalesced by
the touch interval, and excess older standard sessions are revoked. Learner
responses are marked private and non-cacheable. Portal sessions retain their
shorter portal-controlled absolute expiry but use the same central guard.

Learner login accepts the optional `remember_me` flag. Without it, the
browser-authentication and signed-in marker cookies are session cookies and
the frontend keeps only a tab-scoped session record. When it is enabled, the
cookies and frontend record may survive a browser restart, but the existing
learner absolute lifetime and inactivity timeout still apply; this option does
not extend server-side authorization.

## Remembered staff devices

Staff login may request `remember_me`. Normal sessions remain browser-tab
sessions with the configured hourly lifetime; remembered sessions may persist
for `STAFF_REMEMBERED_SESSION_LIFETIME_DAYS` (30 by default). The browser
creates a random device identifier. Laravel stores only an HMAC of that value,
and every remembered-session request must present the matching device header.
A missing or mismatched binding immediately revokes the session. Raw hardware,
browser fingerprint, and device identifiers are not stored server-side.

All non-remembered staff sessions also use a short browser lease. The browser
renews that lease every `STAFF_SESSION_HEARTBEAT_INTERVAL_SECONDS` (30 seconds
by default). If the browser closes, crashes, or loses its session storage, the
backend rejects and releases the session after
`STAFF_NON_REMEMBERED_SESSION_LEASE_SECONDS` (120 seconds by default). The
lease must remain at least three heartbeat intervals. Remembered sessions are
intentionally exempt because they are already bound to their remembered device.

## Staff email binding and password changes

Staff email addresses are not bound until a six-digit authentication code sent
to the proposed address is confirmed. Codes expire after
`STAFF_VERIFICATION_CODE_EXPIRY_MINUTES` (10 by default), are single-use, and
are stored only as an application-keyed HMAC. A database-backed resend cooldown,
per-account route throttles, and `STAFF_VERIFICATION_CODE_MAX_ATTEMPTS` prevent
unbounded delivery and guessing. Replaced and expired codes cannot be reused.

A password change requires the current password, an already verified email,
and a fresh password-change code sent to that verified address. A pending email
binding does not qualify. Successful changes revoke every other active session,
consume remaining codes, and clear the temporary-credential advisory state.
Requests, successes, and failed code checks are recorded without storing codes
or full email addresses in audit metadata.

`requires_credential_setup` is an advisory state only. It is never an
authorization condition and does not restrict dashboards, staff tools, or
normal session use. Staff may keep their issued temporary password; the account
security page recommends an upgrade and explains the verified-email requirement
without forcing a redirect or deadline.

`MAIL_MAILER=log` is suitable only for local development. Production startup
requires the exact Gmail STARTTLS profile, a Google App Password, and a sender
address matching the authenticated account. Authentication codes therefore
cannot be logged, silently discarded, downgraded to plaintext SMTP, or sent
through a placeholder configuration.

Configure the ignored `apps/api/.env` file or deployment secret store with:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_REQUIRE_TLS=true
MAIL_USERNAME=the-complete-gmail-or-workspace-address
GMAIL_APP_PASSWORD=the-16-character-app-password-without-spaces
MAIL_FROM_ADDRESS=the-same-address-as-MAIL_USERNAME
MAIL_FROM_NAME=ReaDirect
```

Do not use or store the normal Google account password. Google requires
2-Step Verification before an App Password can be created, and some managed or
Advanced Protection accounts do not expose App Passwords. See Google's
[App Password guidance](https://support.google.com/accounts/answer/185833)
and [Gmail SMTP configuration](https://support.google.com/a/answer/176600).
After saving the ignored environment values and clearing cached configuration,
send a non-secret message to the configured account:

```powershell
php artisan config:clear
php artisan readirect:mail-test
```

The diagnostic masks the address in console output, never prints credentials,
and sends only to `MAIL_USERNAME`.

## Local and staging launchers

`start.ps1` uses loopback bindings by default. `cstart.ps1` retains this secure
default and exposes only the web port through its generated Cloudflare tunnel.
When credentials are not already supplied, `start.ps1` creates separate random
ASR and TTS credentials for the lifetime of the process and passes them to
Laravel and the matching speech service without printing them.
The launcher also forces CPU speech execution for the local/staging workstation:
Mu uses the cached `faster-whisper-base.en` checkpoint with `int8` compute, and
VoxCPM2 honors `READIRECT_TTS_DEVICE=cpu`. GPU coordination is disabled for
that launcher session so a CUDA-capable Python installation cannot silently
switch the services back to GPU execution.
Do not add API, Reverb, ASR, TTS, database, recording, model, or credential
ports to the tunnel configuration.
