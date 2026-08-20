# 1. Executive Summary

ReaDirect is a multi-service application, not a single static site. The current repository contains a React/Vite single-page application, a Laravel API, PostgreSQL-oriented relational persistence, a database queue worker, a Laravel Reverb WebSocket server, an ASR FastAPI service, and a VoxCPM2 TTS FastAPI service. The three active games execute in the browser, but their authoritative learner profile and save state are stored by Laravel in the relational database.

The repository is sufficiently understood to plan a deployment, but it is **not deployable as-is**. Current hosting configuration is a developer-operated Windows launcher exposed through a Cloudflare named tunnel at `staging.readirect.org`. There is no checked-in Vercel project, Render Blueprint, Railway configuration, production reverse proxy, frontend SPA rewrite, or CI/CD deployment workflow.

The principal pre-deployment blockers are:

- the ASR and TTS images require local model directories that `.dockerignore` excludes, with no image-build or startup model provisioning path;
- learner speech uploads must remain transient across the browser, Laravel request, and ASR scratch-file boundary; only derived transcripts, scores, and instructional evidence may persist;
- the Laravel image starts `php artisan serve`, and no production process definitions exist for the API, Reverb, or the required broadcast queue worker;
- the PostgreSQL schema, complete migration chain, backup/restore procedure, and production connection settings have not been rehearsed against a clean production-like PostgreSQL database;
- a production frontend/API/realtime origin topology and its SPA routing, trusted-host, proxy, CORS, TLS, and health-check configuration have not been selected;
- ASR/TTS memory, CPU latency, concurrency, cold-start, and end-to-end timeout budgets have not been measured on the intended instance class.

No deployment, provider resource creation, DNS change, secret change, migration, commit, push, or application-code change was performed.

# 2. Current Repository State

- Branch: `development/post-pilot-updates-v2`
- Commit: `380bda1a0c4065cfec37495b787e26428d40da3d`
- Worktree at audit start: dirty with ten pre-existing Game One Phase E-R files. They were preserved.
- Protected files: `apps/api/database/database.sqlite` and `apps/web/src/features/learn-with-clara/learn-with-clara-practice.css` were not modified.
- Audit change: this document only.

The checked-in SQLite database is development state, not a deployment artifact. The source configuration defaults to PostgreSQL, while the local untracked API environment currently selects SQLite. Running source takes precedence over older analysis documents that described earlier game-persistence gaps; the current Phase F evidence confirms all three canonical games are active and database-backed.

# 3. Current Runtime Architecture

```text
Browser / Capacitor WebView
  -> Vite development server or static frontend
       -> /api -> Laravel API
       -> /app -> Laravel Reverb WebSocket server

Laravel API
  -> PostgreSQL-oriented relational database
  -> private Laravel filesystem (learner audio and published TTS catalog)
  -> private ASR HTTP service (Bearer service token)
  -> private TTS HTTP service (Bearer service token)
  -> database queue -> broadcast worker -> Reverb

Browser games
  -> shared Laravel game profile/save API
```

`start.ps1` currently starts Vite on 5174, Laravel on 8000, ASR on 8001, TTS on 8002, Reverb on 8080, and a database queue worker. `cstart.ps1` exposes only Vite through Cloudflare; Vite proxies API and WebSocket traffic to the other local processes. PostgreSQL, ASR, TTS, and Reverb are intentionally not public in that staging topology.

**CURRENTLY CONFIGURED:** local Windows processes plus a Cloudflare staging tunnel. Dockerfiles exist for Laravel, ASR, and TTS, but there is no provider resource definition tying them together.

**TECHNICALLY RECOMMENDED:** a static frontend plus long-running container services, managed PostgreSQL, private inter-service networking, and release-bundled approved TTS catalog assets. Durable object storage is not required for learner speech in V1.

# 4. Service Inventory

| Service | Source/runtime | Build | Start/port | Health | State/storage | Process requirements | Serverless compatibility | Expected hostname |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Web SPA and browser games | `apps/web`, `apps/games`; Node 22+, React 19, Vite 8 | `corepack pnpm --filter @readirect/web build` | Static files from `apps/web/dist`; Vite 5174 is development only | Static `/` plus an external synthetic check | No server filesystem or DB; browser caches/preferences only | No long-running app process when statically hosted; no worker/scheduler | **Yes**, as static assets. Requires SPA fallback and API/realtime routing | Current staging: `staging.readirect.org`; production not selected |
| Laravel API | `apps/api`; PHP 8.3, Laravel 13 | Dockerfile: Composer production install and authoritative autoload | Current image: `php artisan serve --host=0.0.0.0 --port=${PORT:-10000}` | `/up` | PostgreSQL required for production; approved TTS catalog is release data; writable ephemeral `bootstrap/cache` and `storage` | Long-running web process; queue worker and Reverb are separate; no scheduler found | **No** for the current application/image. Large requests, long speech calls, queue/realtime, and PHP process model do not fit a simple function conversion | Public API hostname, not selected |
| PostgreSQL | External managed service; config in `apps/api/config/database.php` | Provision schema, then Laravel migrations | Provider-managed 5432/private endpoint | Provider DB health plus an application DB readiness probe | Durable relational state, backups, SSL, constrained JSONB game saves | Long-running managed database | Not a function; external managed DB is compatible with serverless clients only with pooling | Private database hostname |
| Queue worker | Laravel database queue | Same image as API | `php artisan queue:work database --queue=broadcasts ...` as evidenced by `start.ps1` | Process/liveness plus queue-depth/oldest-job metrics | Uses PostgreSQL `jobs`/`failed_jobs`; no local persistence | Long-running background worker; required for queued broadcasts | **No** | Private process, no public hostname |
| Reverb | Laravel Reverb in `apps/api` | Same Composer artifact as API | `php artisan reverb:start --host=<bind> --port=<port>`; local 8080 | Existing API realtime-health service can inspect it, but no standalone public liveness route was found | No durable local files; relies on app key/secret and queue | Long-running WebSocket server | **No** | Public WSS endpoint through API/reverse proxy, or a dedicated realtime hostname |
| ASR | `services/asr`; Python 3.11, FastAPI, faster-whisper/base.en, Mu/Nu resolver | `uv` lock/install; Dockerfile installs CPU PyTorch and dependencies | `uvicorn main:app --host=0.0.0.0 --port=${PORT:-10000}` | `/live` liveness; `/ready` model/token/queue readiness | Temporary request files are deleted; model/cache is recreatable but must be provisioned | Long-running model-resident process; one configured inference slot; no scheduler/worker | **No** for current service. Model size, warm residency, 25 MB uploads, and long inference conflict with ordinary functions | Private/internal only |
| TTS | `services/tts`; Python 3.11, FastAPI, VoxCPM2 2.0.3 | `uv` lock/install; Dockerfile installs CPU PyTorch and dependencies | `uvicorn main:app --host=0.0.0.0 --port=${PORT:-10000}` | `/health` model/token/queue readiness | Model cache and generated/reference WAV caches; generated cache is recreatable | Long-running model-resident process; one inference slot; startup warm-up | **No** for current service. Multi-GB model, warm-up, generated files, and requests up to the API's 300-second budget require a persistent process | Private/internal only |

Memory minima are not declared or benchmarked in the repository. Local caches observed during the audit were approximately 1.70 GB for ASR artifacts and 4.96 GB for the TTS model cache; runtime memory will be additional. CPU is supported by both Dockerfiles. CUDA is optional in code, not a production requirement, but acceptable CPU latency has not been demonstrated on a target host.

# 5. Frontend Hosting Requirements

- Framework: React/Vite SPA, not SSR.
- Build: Node 22+ and pnpm 10.34.5; output is `apps/web/dist`.
- Audit build: passed; 351 files, approximately 65.8 MB total. The largest built file was approximately 13.3 MB.
- Production runtime: static hosting/CDN is sufficient.
- Routing: all React Router paths must rewrite to `index.html` without rewriting `/api` or the WebSocket endpoint when those are same-origin proxies.
- Configuration: `VITE_API_ORIGIN` is public build-time configuration. Empty means same-origin `/api`; a separate API origin must be an approved HTTPS origin. `VITE_FORCE_STATIC_CLARA` is an optional build-time delivery switch.
- Transport: shared `apiFetch` uses `credentials: include`. Browser requests may use a server-set HttpOnly cookie; remembered staff sessions also send `X-ReaDirect-Device`.
- Timeouts: ordinary API calls are 12 seconds; speech is 90 seconds.
- Assets: games, Live2D, audio, and other assets are emitted into the static build. No server-side game runtime is required.
- Realtime: production must provide the browser with a WSS route compatible with the current Reverb/Echo configuration. The development-only Vite `/app` proxy does not exist on a static host.

Vercel, Render Static Site, Netlify, Cloudflare Pages, or an equivalent static host can serve the frontend **conditionally**, after build root/output, SPA fallback, API origin, realtime endpoint, and cache rules are configured. No such provider configuration is currently checked in.

# 6. Laravel Hosting Requirements

- PHP: `^8.3`.
- Required image extensions: bcmath, intl, mbstring, pcntl, PDO PostgreSQL, sockets, and zip. The API Dockerfile installs them.
- Dependency build: `composer install --no-dev --prefer-dist`, then authoritative autoload and package discovery.
- Content: the image copies repository `content` to `/var/content`; production must preserve that relative content contract.
- Writable paths: `bootstrap/cache`, `storage/framework/*`, `storage/logs`, and private audio/TTS storage.
- Web serving: the checked-in Docker `CMD` uses Laravel's development server. Select and verify a production process such as Octane/RoadRunner (dependencies already exist) or a conventional Nginx/PHP-FPM arrangement before deployment.
- Port: the image honors `PORT` and defaults to 10000.
- Migrations: use a one-off/pre-deploy release command after PostgreSQL and its schema exist. Do not run migrations concurrently in every web instance.
- Cache/config: production may run Laravel cache commands only after all environment values are final; no checked-in release script currently owns this.
- Database sessions: learner and staff sessions are custom database records. `SESSION_DRIVER=array` is not their durable session mechanism.
- Queue: database queue is active for broadcast events. A dedicated `broadcasts` worker is required when Reverb is enabled.
- Scheduler: no recurring scheduled application job was found; do not deploy a scheduler without a new evidenced requirement.
- Health: `/up` proves framework liveness, but it does not prove PostgreSQL, writable private storage, ASR/TTS, queue, or Reverb readiness.
- Security: configure exact `APP_URL`, HTTPS enforcement, HSTS, trusted hosts/proxies, explicit CORS origins, secure secret values, and stderr logging.

Render Web Service, Railway, DigitalOcean App Platform/container hosting, or a VPS/container platform are viable **conditionally**. The current API is not appropriate for Vercel Functions without a material runtime redesign that is outside this audit.

# 7. Production Database Requirements

**Development database:** the local environment currently selects SQLite and the repository contains a tracked `apps/api/database/database.sqlite` file.

**Recommended production database:** managed PostgreSQL. `apps/api/config/database.php` defaults to `pgsql`, the production example names a `readirect_v2` schema, the API image includes `pdo_pgsql`, and `game_saves.state` is declared with `jsonb`. PostgreSQL is therefore the authoritative production target unless the schema and complete test suite are intentionally ported and revalidated for another engine.

Requirements:

- provision a durable managed database in the same region/private network as Laravel;
- create or explicitly select `DB_SCHEMA` before migrations; the migrations do not create `readirect_v2`;
- configure `DB_URL` or individual host/port/database/user/password values, not conflicting mixtures;
- require TLS with a provider-appropriate `DB_SSLMODE` (normally `require` or stricter validation rather than the example's `prefer`);
- use least-privilege application and migration roles where the provider permits;
- enable automated backups and point-in-time recovery, and test restoration;
- rehearse the full migration chain against a fresh PostgreSQL database and a copy of representative data;
- size connection limits and add pooling if horizontally scaling Laravel or workers.

No minimum PostgreSQL version is pinned in the repository. Select a currently supported managed version compatible with Laravel 13 and rehearse it explicitly.

# 8. Game Persistence Production Requirements

Production must preserve the existing database-backed invariants:

- `game_profiles` has one shared profile per learner and a unique normalized username/discriminator;
- `game_saves` has one row per profile/game, a JSONB state payload, schema/ruleset versions, optimistic `revision`, and `saved_at`;
- `game_catalog` is authoritative for active games and contract metadata;
- foreign keys and unique constraints enforce ownership and cross-game isolation;
- save updates and resets use database transactions and optimistic-revision checks;
- Guest mode creates no profile or save;
- game persistence is independent of Diagnostic, lessons, Final, reading profile, CRLA, achievements, and academic progression.

All three canonical games—`game-alpha`, `chronicles-of-the-lost-kingdom`, and `ottertale`—are active. `game-zero` remains excluded. Game persistence must never be moved to an instance-local filesystem, browser-only storage, or an ephemeral SQLite file.

# 9. ASR Hosting Requirements

- Runtime: Python `>=3.11,<3.12`, FastAPI/Uvicorn, ffmpeg, libsndfile, faster-whisper, CTranslate2, PyTorch, Torchaudio, Mu, and the isolated-letter resolver.
- Model: repository code identifies `openai/whisper-base.en`; production Docker defaults to CPU/int8, `MU_ALLOW_DOWNLOAD=false`, and `/opt/readirect/services/asr/model_artifacts/mu`.
- Model delivery blocker: `.dockerignore` excludes `**/model_artifacts`, and the Dockerfile does not download or mount a model. A built image will not contain the local cache.
- Storage: uploaded audio is capped at 25 MB, written to an OS temporary file, and deleted after queued inference. Temp disk is safe and ephemeral. Model artifacts are recreatable but must be versioned/provisioned and locally readable at startup.
- Security: only `/live` and `/ready` are public within the service boundary. Inference/status endpoints require a 32+ character bearer service token.
- Capacity: default inference concurrency 1, wait queue 8, queue wait timeout 90 seconds. Memory and CPU latency are unmeasured on a target instance.
- GPU: optional. Code auto-detects CUDA, but current production-oriented Dockerfile intentionally installs CPU PyTorch. If GPU is selected later, image/runtime compatibility and the shared GPU lock mechanism must be separately validated.
- Health: use `/live` for liveness and `/ready` for readiness. A platform health check must treat a JSON `not_ready` response carefully because the current handler still returns HTTP 200.

Compatibility: Vercel serverless **NO**; Render private/web container **CONDITIONAL**; Railway private container **CONDITIONAL**; dedicated container/VPS **CONDITIONAL/SUPPORTED** after model delivery, resource sizing, private networking, and timeout tests.

# 10. TTS Hosting Requirements

- Runtime: Python `>=3.11,<3.12`, FastAPI/Uvicorn, VoxCPM2 2.0.3, ffmpeg, libsndfile, PyTorch, Torchaudio, and checked-in Clara reference audio.
- Model: `services/tts/.cache/models/openbmb--VoxCPM2`, loaded with `local_files_only=True`.
- Model delivery blocker: `.dockerignore` excludes `**/.cache`; the Dockerfile neither downloads nor mounts the model. The observed local model cache is approximately 4.96 GB and will not enter the image.
- Device: CPU, CUDA, or auto is supported. The Dockerfile does not force CPU but installs CPU PyTorch; production must set `READIRECT_TTS_DEVICE=cpu` unless a separate GPU image is built.
- Startup: optional warm-up defaults on and loads the model asynchronously. Readiness remains false until the model is resident.
- Capacity: one inference slot, default wait queue 4, wait timeout 60 seconds. Laravel allows a TTS request to run for 300 seconds, but the web speech budget is 90 seconds.
- Storage: generated WAVs and conditioned references are recreatable caches. A persistent model/cache volume reduces cold-start cost but cannot replace an explicit versioned model-provisioning process. Reference WAVs are checked in and copied by the Dockerfile.
- Health/security: `/health` is public within the service boundary; synthesis, warm-up, and internal status require the service token. As with ASR, readiness currently reports HTTP 200 with a `not_ready` body.

Compatibility: Vercel serverless **NO**; Render private/web container **CONDITIONAL**; Railway private container **CONDITIONAL**; dedicated CPU/GPU container or VPS **CONDITIONAL/SUPPORTED** after model delivery and measured latency/memory.

# 11. Persistent Storage Requirements

| Write | Classification | Production requirement |
| --- | --- | --- |
| PostgreSQL tables, including game saves, sessions, runs, reviews, jobs, and catalog metadata | **PERSISTENT** | Managed PostgreSQL with backups; never ephemeral SQLite |
| Learner assessment and lesson audio | **TRANSIENT ONLY** | Request/temp storage only; successful, failed, rejected, timed-out, and cancelled processing must leave no durable voice file |
| Published TTS catalog under `storage/app/private/tts/catalog` | **PERSISTENT/RELEASE DATA** | The 601 tracked catalog files are copied into the API image, but any runtime publication must use durable shared storage and an intentional release workflow |
| TTS staging/archive | **PERSISTENT OPERATIONAL DATA** if used | Durable private storage; do not depend on an instance filesystem |
| Laravel framework cache/views/logs | **TEMPORARY/CACHE** | Writable ephemeral storage is acceptable; logs should go to stderr/external aggregation |
| ASR uploaded temp files | **TEMPORARY — SAFE** | Ephemeral temp space with capacity limits; code deletes after inference |
| ASR model files | **CACHE/RECREATABLE BUT REQUIRED AT STARTUP** | Versioned image layer, startup fetch to durable volume, or immutable mounted artifact |
| TTS generated/reference cache | **CACHE — RECREATABLE** | Ephemeral is functionally safe but causes expensive regeneration; persistent cache is operationally preferable |
| TTS model files | **CACHE/RECREATABLE BUT REQUIRED AT STARTUP** | Versioned image layer, startup fetch to durable volume, or immutable mounted artifact |
| Frontend build assets | **IMMUTABLE RELEASE DATA** | Static host/CDN |

The current filesystem configuration defines local Laravel disks. Learner speech no longer depends on them. Shared object storage is needed only if a future release adds durable runtime publication, uploads, or other cross-instance file state.

# 12. Audio/File Lifecycle Requirements

The browser records speech in memory and uploads it to Laravel with credentialed requests. Laravel forwards the request upload to ASR without copying it into application storage. ASR uses a bounded scratch file and deletes it after success, failure, rejection, timeout, or cancellation. The browser revokes its object URL and releases the Blob after each upload attempt. Database rows keep derived transcripts, decisions, scores, and instructional evidence only.

The V1 policy is therefore zero durable learner-audio retention. A deployment does not need R2 or another object store for learner recordings. Production still requires TLS, bounded request/temp space, cleanup tests and monitoring, log redaction, and an explicit future review before any feature is allowed to retain voice data.

# 13. Networking Topology

Actual application flow is:

```text
Public browser -> HTTPS frontend
Public browser -> HTTPS Laravel API (same origin or approved API subdomain)
Public browser -> WSS Reverb endpoint when realtime is enabled
Laravel -> private PostgreSQL
Laravel -> private HTTP ASR with bearer token
Laravel -> private HTTP TTS with bearer token
Queue worker -> private PostgreSQL and Reverb
```

ASR, TTS, PostgreSQL, and the worker must not be publicly exposed. Reverb is public only through an authenticated WSS route needed by browsers. The current Cloudflare tunnel satisfies this boundary for staging by exposing Vite alone; it is not an immutable production topology.

# 14. Authentication / Cookie / CORS Requirements

- Production is HTTPS-only. `APP_ENV=production` makes learner/staff auth cookies `Secure`; they are HttpOnly, path `/`, host-only, and `SameSite=Lax`.
- The frontend sends `credentials: include`. CORS must enumerate exact trusted frontend/Capacitor origins and keep `supports_credentials=true`; wildcard origins are invalid.
- Keep frontend and API under the same registrable site (for example, `app.readirect.org` and `api.readirect.org`) so Lax cookie semantics remain reliable. A different top-level site would require an intentional cookie/CSRF redesign.
- Host-only cookies set by the API are appropriate for API requests; do not broaden the cookie domain without a demonstrated need.
- Remembered staff sessions require the matching `X-ReaDirect-Device` header. The header is already in the allowed CORS list.
- Learner/staff resolvers support bearer tokens for native clients and HttpOnly cookies for browsers. Browser storage uses a sentinel rather than persisting the real token.
- Configure `TRUSTED_HOSTS` for API and platform health-check hostnames, and `TRUSTED_PROXIES` for the exact load balancer/reverse-proxy boundary. Do not trust all proxies blindly.
- Configure `APP_FORCE_HTTPS=true`, HSTS after TLS is verified, and `APP_URL` to the public API origin.
- Laravel's custom token endpoints are not a conventional Sanctum CSRF-cookie flow; state-changing routes rely on the custom session token/cookie and CORS boundary. Preserve the current XSS, CORS, and origin protections.

# 15. Environment Variable Inventory

Secret values were not read into this report. “Required” means required for the corresponding enabled production component.

| Variable name(s) | Service/class | Required | Purpose | Secret | Must configure | Safe default |
| --- | --- | --- | --- | --- | --- | --- |
| `VITE_API_ORIGIN` | Web / public build-time | Conditional | HTTPS API origin; empty means same-origin | No | Yes for split origin | Empty only for a real same-origin proxy |
| `VITE_FORCE_STATIC_CLARA` | Web / public build-time | Optional | Force bundled static Clara | No | Only by product decision | `false` |
| `APP_NAME` | API / optional | No | Display name | No | No | `ReaDirect` |
| `APP_ENV`, `APP_DEBUG` | API / server | Yes | Production mode and debug behavior | No | Yes | No; must be `production`/`false` |
| `APP_KEY` | API / server secret | Yes | Encryption and HMAC root | **Yes** | Yes | None |
| `APP_URL`, `APP_FORCE_HTTPS` | API / server | Yes | Canonical URL and HTTPS enforcement | No | Yes | Local defaults unsafe |
| `TRUSTED_HOSTS`, `TRUSTED_PROXIES` | API / security | Yes | Host-header and proxy boundary | No | Yes | Loopback defaults unsafe behind a host |
| `CORS_ALLOWED_ORIGINS` | API / security | Yes for split/native access | Exact credentialed origins | No | Yes | Empty denies cross-origin requests safely |
| `SECURITY_HSTS_ENABLED`, `SECURITY_HSTS_MAX_AGE`, `SECURITY_HSTS_INCLUDE_SUBDOMAINS` | API / security | Yes after TLS validation | HSTS policy | No | Yes | Conservative defaults; include-subdomains needs review |
| `LOG_CHANNEL`, `LOG_LEVEL`, `MAIL_LOG_CHANNEL` | API / operations | Yes/optional | stderr/external logging and mail logging | No | Yes | `stderr` is safe; debug level is not |
| `DB_URL` | API / database | Conditional alternative | Complete DB connection URL | **Yes** | Yes if selected | None |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | API / database | Yes unless `DB_URL` supplies them | PostgreSQL connection | Password is secret | Yes | Local defaults unsafe |
| `DB_SCHEMA`, `DB_SSLMODE` | API / database | Yes | Search path and TLS mode | No | Yes | Schema default requires pre-creation; `prefer` is too weak for production |
| `DB_FOREIGN_KEYS` | API / SQLite only | Not production | SQLite test/development integrity | No | No | Irrelevant under PostgreSQL |
| `CACHE_STORE` | API / optional | No | Laravel cache | No | Only if changed | `array` works but is per-process/non-durable |
| `SESSION_DRIVER` | API / optional/legacy framework setting | No for custom auth | Laravel framework session driver | No | No | `array`; learner/staff sessions use DB models |
| `FILESYSTEM_DISK` | API / storage | Optional/incomplete | Default Laravel disk | No | Insufficient by itself | `local`; named audio/TTS disks remain local |
| `QUEUE_CONNECTION` | API/worker | Yes with realtime | Queue driver | No | Yes | `database` matches schema |
| `DB_QUEUE_CONNECTION`, `DB_QUEUE_TABLE`, `DB_QUEUE`, `DB_QUEUE_RETRY_AFTER`, `QUEUE_FAILED_DRIVER` | Worker / optional tuning | Conditional | Database queue routing/retry/failures | No | Review | Repository defaults are coherent |
| `BROADCAST_CONNECTION` | API/realtime | Yes with realtime | Broadcast backend | No | Yes | `reverb` |
| `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` | API/Reverb | Yes with realtime | Reverb app identity/signing | Secret is **yes** | Yes | Local fallback secret is unsafe |
| `REVERB_HOST`, `REVERB_PORT`, `REVERB_SCHEME`, `REVERB_SERVER_HOST`, `REVERB_SERVER_PORT`, `REVERB_SERVER_PATH` | API/Reverb | Yes with realtime | Public and bind endpoints | No | Yes | Loopback/HTTP defaults are local only |
| `REVERB_ALLOWED_ORIGINS` | Reverb/security | Yes | Browser origins/hosts | No | Yes | Staging-oriented default is not production-complete |
| `REVERB_APP_MAX_CONNECTIONS`, `REVERB_APP_MAX_MESSAGE_SIZE`, `REVERB_APP_RATE_LIMIT_MAX_ATTEMPTS`, `REVERB_APP_RATE_LIMIT_DECAY_SECONDS`, `REVERB_APP_RATE_LIMIT_TERMINATE`, `REVERB_APP_PING_INTERVAL`, `REVERB_APP_ACTIVITY_TIMEOUT`, `REVERB_MAX_REQUEST_SIZE` | Reverb/tuning | Optional but review | Limits and abuse control | No | Review against capacity | Defaults are bounded |
| `REVERB_QUEUE_WARNING_DEPTH`, `REVERB_OLDEST_JOB_WARNING_SECONDS`, `REVERB_HEALTH_CONNECT_TIMEOUT_SECONDS` | API/monitoring | Optional | Realtime health thresholds | No | Review | Safe bounded defaults |
| `ASR_SERVICE_URL`, `ASR_SERVICE_TOKEN`, `ASR_CONNECT_TIMEOUT_SECONDS`, `ASR_REQUEST_TIMEOUT_SECONDS` | API/internal service | Yes | Private ASR URL, auth, timeouts | Token is **yes** | Yes | Loopback/blank token unsafe; 3/90 seconds are starting values |
| `TTS_SERVICE_URL`, `TTS_SERVICE_TOKEN`, `TTS_CONNECT_TIMEOUT_SECONDS`, `TTS_REQUEST_TIMEOUT_SECONDS` | API/internal service | Yes for runtime TTS | Private TTS URL, auth, timeouts | Token is **yes** | Yes | Loopback/blank token unsafe; 3/300 seconds need alignment |
| `ASR_MAX_HTTP_REQUEST_BYTES`, `ASR_INFERENCE_CONCURRENCY`, `ASR_QUEUE_MAX_WAITING`, `ASR_QUEUE_WAIT_TIMEOUT_SECONDS`, `ASR_QUEUE_RETRY_AFTER_SECONDS` | ASR/tuning | Yes/review | Upload and capacity limits | No | Review | Bounded defaults exist |
| `MU_MODEL_PATH`, `MU_DEVICE`, `MU_COMPUTE_TYPE`, `MU_LANGUAGE`, `MU_ALLOW_DOWNLOAD` | ASR/model | Yes | Model artifact/device policy | No | Yes | Docker CPU/int8/no-download is safe only with a mounted model |
| `ASR_HOST`, `ASR_PORT` | ASR / deprecated or launcher-only | No in current Python code | Listed in example but Uvicorn command owns binding | No | Prefer platform `PORT` | Currently unused by `main.py` |
| `READIRECT_TTS_STARTUP_WARMUP`, `READIRECT_TTS_DEVICE` | TTS/model | Yes/review | Warm-up and CPU/CUDA selection | No | Yes | Warm-up on; device must match installed PyTorch |
| `TTS_MAX_HTTP_REQUEST_BYTES`, `TTS_QUEUE_MAX_WAITING`, `TTS_QUEUE_WAIT_TIMEOUT_SECONDS`, `TTS_QUEUE_RETRY_AFTER_SECONDS` | TTS/tuning | Yes/review | Request and capacity limits | No | Review | Bounded defaults exist |
| `READIRECT_GPU_COORDINATION_ENABLED`, `READIRECT_GPU_RESOURCE_KEY`, `READIRECT_GPU_LOCK_DIRECTORY`, `READIRECT_GPU_PERMIT_TIMEOUT_SECONDS` | ASR/TTS / optional | Only for shared CUDA | Cross-process GPU locking | No | Only for GPU topology | CPU disables effective GPU coordination |
| `MAIL_MAILER`, `MAIL_SCHEME`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_REQUIRE_TLS`, `MAIL_USERNAME`, `GMAIL_APP_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | API/mail | Required for staff verification/recovery mail | SMTP delivery | Username/password are sensitive; password is **secret** | Yes if feature enabled | Log/local defaults do not deliver production mail |
| `STAFF_SESSION_LIFETIME_HOURS`, `STAFF_SESSION_HEARTBEAT_INTERVAL_SECONDS`, `STAFF_NON_REMEMBERED_SESSION_LEASE_SECONDS`, `STAFF_REMEMBERED_SESSION_LIFETIME_DAYS` | API/auth | Yes/review | Staff session policy | No | Review | Security defaults exist |
| `STAFF_VERIFICATION_CODE_EXPIRY_MINUTES`, `STAFF_VERIFICATION_CODE_RESEND_SECONDS`, `STAFF_VERIFICATION_CODE_MAX_ATTEMPTS`, `STAFF_CODE_REQUESTS_PER_TEN_MINUTES`, `STAFF_CODE_ATTEMPTS_PER_TEN_MINUTES` | API/auth | Yes/review | Verification throttles | No | Review | Bounded defaults exist |
| `LEARNER_LOGIN_IP_ATTEMPTS_PER_MINUTE`, `LEARNER_LOGIN_IDENTIFIER_ATTEMPTS_PER_MINUTE`, `LEARNER_SESSION_LIFETIME_HOURS`, `LEARNER_SESSION_IDLE_TIMEOUT_MINUTES`, `LEARNER_SESSION_TOUCH_INTERVAL_SECONDS`, `LEARNER_MAX_ACTIVE_SESSIONS` | API/auth | Yes/review | Learner auth/session policy | No | Review | Bounded defaults exist |
| `DEV_SYSTEM_ADMIN_USERNAME`, `DEV_SYSTEM_ADMIN_PASSWORD` | API/development-only | **No in production** | Development seeder bootstrap | Password is **secret** | Leave unset in production | Empty is safe |

Provider-injected `PORT` is consumed by all three Docker commands even though it is not listed in the service `.env.example` files.

# 16. Secret / Repository Safety Findings

- Safe filename-only scanning found no tracked private-key marker, common cloud access-key prefix, GitHub token prefix, Slack token prefix, or OpenAI key prefix.
- Only `.env.example` templates are tracked; the real service/API `.env` files are ignored. No secret value is reproduced here.
- Cloudflare credentials and the owner tunnel configuration are external to the repository; generated `.runtime/cloudflare-config.yml` is ignored.
- **Finding:** `apps/api/database/database.sqlite` is tracked despite a matching ignore rule. Its table names include learners, learner/staff sessions, verification codes, audit logs, game saves, and speech attempts. Its values were not printed. Before any public repository release or external build-context transfer, an authorized owner must assess the data, remove it from current/history as appropriate, and rotate any affected credentials/tokens. The API Docker context excludes `apps/api/database/*.sqlite`, so it should not enter that image.
- Checked-in Clara voice reference and published catalog audio are application assets, not secrets, but their licensing and approved publication status must be confirmed before production distribution.

# 17. Health Check Requirements

| Component | Existing check | Production use/gap |
| --- | --- | --- |
| Frontend | Static `/` | CDN origin check plus a representative SPA deep-link check |
| Laravel | `/up` | Liveness only. Add the smallest authenticated/internal or sanitized readiness check for PostgreSQL, required private storage, queue policy, and optionally speech dependencies |
| ASR | `/live`, `/ready` | Use `/live` for liveness and `/ready` for readiness; change/read platform policy because not-ready currently returns HTTP 200 |
| TTS | `/health` | Readiness includes model/token/queue, but not-ready currently returns HTTP 200; platform needs status-aware handling or a future status-code adjustment |
| Reverb | No standalone route confirmed | TCP/WebSocket liveness plus API realtime-health and queue-lag monitoring |
| Queue worker | No HTTP route | Process supervisor, failed-job count, queue depth, oldest pending job, and restart monitoring |
| PostgreSQL | Provider health | Connection/readiness from Laravel plus backups/replication/storage monitoring |

# 18. Timeout / Long-Running Request Requirements

- Web ordinary timeout: 12 seconds.
- Web speech timeout: 90 seconds.
- Laravel ASR connect/request: 3/90 seconds.
- ASR queue wait: 90 seconds before inference, with one concurrent inference slot.
- Laravel TTS connect/request: 3/300 seconds.
- TTS queue wait: 60 seconds, with one concurrent inference slot.
- No production reverse-proxy/load-balancer timeout is configured in the repository.

The budgets are not aligned: TTS can legitimately occupy Laravel for up to 300 seconds while the browser abandons the request after 90 seconds. A Vercel external rewrite is also subject to a current 120-second proxied-request limit, and Vercel Functions have a 4.5 MB request/response payload limit—well below ReaDirect's 25 MB and 50 MB speech uploads. The mismatch is **blocking for a Vercel API/proxy design** and **should be resolved before any other provider deployment** through measurement and one coherent client/API/proxy/service budget. Do not simply raise all limits without capacity and abuse testing.

# 19. Process / Worker Requirements

Required when all current features are enabled:

1. production PHP API web process;
2. Laravel database queue worker for `broadcasts`;
3. Laravel Reverb WebSocket process;
4. ASR Uvicorn process;
5. TTS Uvicorn process;
6. managed PostgreSQL.

No Laravel scheduler task was found. Do not add a scheduler solely because Laravel supports one. Reverb and the queue worker may use the same API image but must run as separately supervised process roles. ASR/TTS must each be single-worker by default unless model memory and concurrency behavior are measured; multiple Uvicorn workers would duplicate model memory.

# 20. Migration Readiness

The migration chain is ordered and includes:

- additive `game_catalog`, `game_profiles`, and `game_saves` tables;
- unique ownership and revision-supporting fields;
- Game One activation;
- additive Alpha/OtterTale registration and non-destructive activation migrations;
- non-destructive `down()` methods for the latest activation rows so saves/operator choices are not erased.

`php artisan migrate --force` is the correct Laravel production command **only after** a clean PostgreSQL rehearsal, backups, exclusive release ownership, and `DB_SCHEMA` creation are complete. The audit did not run migrations against production or a clean PostgreSQL instance. Current automated tests primarily build an in-memory SQLite schema rather than executing the full PostgreSQL migration chain. Several historical migrations use column changes and the game schema uses JSONB, so a clean and upgrade PostgreSQL rehearsal is a pre-deployment requirement.

# 21. Seeder / Production Reference Data Requirements

Do not run unqualified `php artisan db:seed` in production. `DatabaseSeeder` also creates a development system administrator and portal-system learner and seeds broader reference/catalog data.

Production reference data should be handled explicitly:

- `game_catalog`: migrations register/activate the three canonical games, so full seeding is not required merely to activate them. `GameCatalogSeeder` is idempotent for metadata and preserves existing operator activation, but should still run only as an intentional reference-data task.
- letter/CVC equivalence rules: required only if the production database is new and the application contract expects those defaults; rehearse the specific seeders.
- TTS speech catalog: database metadata and the 601 checked-in published WAV files must correspond. Use the dedicated catalog seed/publication workflow, not an ad hoc full seed.
- system administrator and portal-system learner seeders: development/demo bootstrap, not automatic production deployment steps.

# 22. Vercel Compatibility

- **Frontend:** supported conditionally as a Vite static deployment. Configure monorepo root/build/output, Node 22, pnpm, `VITE_API_ORIGIN`, SPA fallback, and any WSS endpoint. No Vercel project/config is currently present.
- **Laravel API:** not appropriate in its current form. It is a long-running PHP/container application with private file writes, large speech uploads, database queue/realtime, and requests up to 300 seconds.
- **ASR/TTS:** not appropriate. Observed model caches are far above ordinary function bundles, model residency is long-lived, and ASR upload limits exceed Vercel Functions' current 4.5 MB payload limit.
- **Reverb/worker:** not appropriate for request-scoped functions.
- **PostgreSQL:** an external managed PostgreSQL service can be used from a Vercel-hosted frontend/API elsewhere; Vercel would not own ReaDirect's whole stack.

Vercel is therefore suitable **for the frontend only**, not the complete ReaDirect system. Official Vercel documentation consulted during the audit defines the current [function bundle, memory, duration, and 4.5 MB payload limits](https://vercel.com/docs/functions/limitations) and [120-second external rewrite timeout](https://vercel.com/docs/limits).

# 23. Render Compatibility

- **Frontend:** Render Static Site is supported conditionally with `apps/web/dist`, pnpm/Node 22, build-time variables, and SPA rewrites.
- **Laravel:** a Docker Web Service is supported conditionally. The Dockerfile already honors `PORT`, but replace/validate the development server, define `/up` plus readiness, configure PostgreSQL and object storage, and add a pre-deploy migration command.
- **Queue:** background worker supported using the API image and a queue command.
- **Reverb:** Web Service or private/public architecture is conditional; browsers need a public WSS endpoint even if the process otherwise uses the private network.
- **ASR/TTS:** private services are a strong boundary fit, conditional on model delivery, paid resource sizing, health semantics, startup time, and timeout/load tests.
- **PostgreSQL:** managed Render PostgreSQL is supported; select backups/PITR, TLS, region, and capacity.
- **Persistent disk:** technically available, but [Render documents](https://render.com/docs/disks) that a disk is single-service and prevents multi-instance scaling. Shared private object storage is preferable for learner audio. A disk is useful for a single ASR/TTS model cache after a secure provisioning process.

There is no `render.yaml`, service linkage, branch selection, environment configuration, disk, health path, or account evidence in the repository. Render is a compatible option, not the detected deployed provider.

# 24. Other Hosting Compatibility

**Railway:** conditionally compatible for API, worker, Reverb, PostgreSQL, and private ASR/TTS containers. It provides [private service DNS](https://docs.railway.com/networking/private-networking) and [persistent volumes](https://docs.railway.com/volumes/reference), but the Docker commands bind IPv4 `0.0.0.0`; private-network behavior and [health-check host restrictions](https://docs.railway.com/deployments/healthchecks) must be tested for the selected environment. Volumes can hold models/caches, while shared object storage remains preferable for API audio.

**DigitalOcean/App Platform:** conditionally compatible with containers and managed PostgreSQL. Verify private networking, worker/WebSocket support, request timeouts, GPU/CPU instance availability, persistent/object storage, and health-check semantics before selection.

**VPS/container host:** compatible with the greatest control and operational burden. It can run the current process mix behind Caddy/Nginx, but requires patching, TLS, firewalling, process supervision, backups, monitoring, log rotation, model provisioning, disk encryption, and disaster recovery. Managed PostgreSQL and object storage are still recommended.

**Cloudflare:** the detected usage is Tunnel/CDN for local staging. Cloudflare Pages could host the SPA conditionally. The current Laravel/ASR/TTS stack is not an edge-only application and should remain on long-running origins.

# 25. Provider Compatibility Matrix

| Component | Vercel | Render | Railway | VPS/Container |
| --- | --- | --- | --- | --- |
| React/Vite SPA + games | **SUPPORTED** conditionally | **SUPPORTED** conditionally | **SUPPORTED** conditionally | **SUPPORTED** conditionally |
| Laravel API | **NOT APPROPRIATE** | **CONDITIONAL** | **CONDITIONAL** | **CONDITIONAL** |
| Managed PostgreSQL | External/conditional | **SUPPORTED** | **SUPPORTED** | **CONDITIONAL** (managed preferred) |
| Database queue worker | **NOT APPROPRIATE** | **SUPPORTED** conditionally | **SUPPORTED** conditionally | **SUPPORTED** conditionally |
| Reverb WebSocket server | **NOT APPROPRIATE** | **CONDITIONAL** | **CONDITIONAL** | **SUPPORTED** conditionally |
| ASR/base.en | **NOT APPROPRIATE** | **CONDITIONAL** | **CONDITIONAL** | **SUPPORTED** conditionally |
| TTS/VoxCPM2 | **NOT APPROPRIATE** | **CONDITIONAL** | **CONDITIONAL** | **SUPPORTED** conditionally |
| Durable learner audio on local disk | **NOT APPROPRIATE** | **CONDITIONAL** single-instance disk; object storage preferred | **CONDITIONAL** volume; object storage preferred | **CONDITIONAL** backed-up disk; object storage preferred |
| Private ASR/TTS networking | **NOT APPROPRIATE** for current services | **SUPPORTED** | **SUPPORTED** | **SUPPORTED** with firewall/network design |

# 26. Recommended Production Architecture

The smallest maintainable provider-neutral architecture is:

1. static/CDN frontend;
2. production Laravel container as the only public API;
3. managed PostgreSQL in the API's region/private network;
4. approved TTS catalog audio bundled as immutable release data, with ephemeral scratch/cache space for request processing;
5. a queue-worker process using the Laravel image;
6. a Reverb process behind an authenticated public WSS route if realtime remains enabled;
7. private ASR and TTS containers, each with explicit versioned model provisioning and one model-resident worker initially;
8. centralized logs, metrics, uptime checks, backups, and secret management.

This is a hybrid of static hosting, managed state, and long-running containers. It does not require multiple vendors if one container platform supports all roles and private networking. Render and Railway are both plausible after the blockers are resolved. A frontend-only Vercel deployment paired with containers elsewhere is also viable, but adds a second provider and cross-origin/realtime configuration without eliminating the backend requirements.

# 27. Recommended Domain / Origin Layout

Preserve current domain ownership and use the smallest public surface:

- frontend: `https://readirect.org` or an owner-selected application subdomain;
- API: `https://api.readirect.org` if split-origin, or same-origin `/api` through a production reverse proxy;
- realtime: same API host under `/app` where practical, otherwise an owner-selected `wss://realtime.readirect.org`;
- ASR/TTS/PostgreSQL/worker: private internal DNS only, no public DNS.

Staging can retain `staging.readirect.org`, but the developer tunnel is not a production release. Pilot URLs documented elsewhere do not prove current provider linkage.

Configure exact frontend origins in CORS/Reverb, host-only secure cookies on the API, `VITE_API_ORIGIN` for split origin, trusted API/realtime hosts, trusted load-balancer proxies, TLS everywhere public, and HTTP/private TLS according to the provider's protected internal network. No DNS change was made.

# 28. Pre-Deployment Blockers

| Severity | Blocker | Required resolution |
| --- | --- | --- |
| **BLOCKER** | ASR/TTS Docker builds exclude required models and provide no fetch/mount procedure | Select immutable model versions and implement a secure image-layer, startup-fetch, or persistent-volume provisioning workflow; verify licenses, hashes, readiness, and rollback |
| **BLOCKER** | Production API/process topology is undefined; current image uses `artisan serve`, with no deploy definitions for Reverb/worker | Select provider and production PHP server, define separately supervised API/worker/Reverb roles, ports, health paths, and restart behavior |
| **BLOCKER** | Clean PostgreSQL migration and restore rehearsal is absent; named schema creation is external | Provision a disposable production-like PostgreSQL instance, create schema, run full migrations and targeted tests, test upgrade/backup/restore, and record rollback steps |
| **BLOCKER** | Production public/private network, SPA rewrite, WSS route, CORS, trusted-host/proxy, and secret configuration is absent | Select the topology and verify HTTPS login/session restore, uploads, WSS, and private speech calls end to end |
| **BLOCKER** | ML resource and timeout fit is unknown | Benchmark cold/warm startup, memory, CPU latency, queue behavior, request sizes, and concurrency on the chosen instance; align client/API/proxy/service budgets |

# 29. Should-Fix Items

- Assess and remove the tracked SQLite database from deployable/current/history scope as authorized; rotate affected credentials if real data is found.
- Verify the zero-retention learner-audio policy with browser, Laravel, ASR temp-file, log, and database cleanup tests.
- Make ASR/TTS readiness return a failing HTTP status when not ready, or configure a provider-specific status-aware probe.
- Add a dependency/container vulnerability scan and software bill of materials to CI; no deployment workflow currently exists.
- Pin/document the production PostgreSQL major version and database pooling/connection budget.
- Decide whether Reverb is required for the first production release. If enabled, deploy and monitor it; if intentionally disabled, document graceful UI behavior and do not run unnecessary processes.
- Replace the staging-oriented Reverb allowed-origin default with explicit environment configuration.
- Verify SMTP delivery, sender identity, and rate limits without using development seed credentials.
- Reconcile Laravel TTS 300-second and browser 90-second budgets after measurement.
- Add deployment integration checks proving learner audio never reaches durable application or object storage.
- Confirm licensing/distribution permission for game, Live2D, model, and voice-reference assets.

# 30. Non-Blocking Warnings

- Game Alpha issues two initial idempotent save GET requests under React StrictMode; no duplicate writes were observed.
- Game One produces an existing Vite chunk warning; the audit build still passed.
- Broader web tests have unrelated failures, including an `@pixi/react`/`react-reconciler` harness issue and historical TTS baseline failures. Focused persistence suites and production build passed.
- Destructive browser reset was intentionally not repeated against meaningful QA data; automated reset-isolation tests passed.
- A separate second manual browser context and manual System Admin game UI were not exercised in Phase F; API/session and backend System Admin tests passed.
- One existing React exhaustive-deps warning remains.
- The local host PHP lacks some image-required extensions, but the API Dockerfile explicitly installs them; the image itself was not built because Docker was unavailable.

# 31. Exact Deployment Prerequisites

1. Select the hosting provider(s), region, environment, release branch/commit, ownership, budget, and rollback authority.
2. Provision disposable production-like PostgreSQL, create `DB_SCHEMA`, run the full migration chain, targeted tests, backup, and restore rehearsal.
3. Package the approved TTS catalog with the API release and verify bounded ephemeral request/cache storage plus learner-audio cleanup.
4. Define a production PHP server and separate API, queue, and Reverb process roles.
5. Define versioned ASR/TTS model delivery; verify hashes/licenses, startup readiness, CPU/GPU policy, and cache/mount paths.
6. Measure ASR/TTS startup, memory, CPU latency, queueing, concurrency, upload sizes, and end-to-end timeouts on the selected compute.
7. Define frontend build root/output, SPA fallback, public API origin, WSS path, and immutable asset caching.
8. Configure secret-manager values for API key, DB, speech tokens, Reverb, mail, and provider integrations; do not copy development values.
9. Configure HTTPS, exact CORS/Reverb origins, trusted hosts/proxies, HSTS, secure cookie behavior, and private service DNS.
10. Add provider health checks, process supervision, logs/metrics/alerts, database backups, and capacity alarms.
11. Run dependency/container security scans and resolve blocking findings.
12. Run the production build, focused/backend suites, clean PostgreSQL integration tests, and an authorized browser smoke suite in a preview environment.
13. Review the final Git diff and ensure the tracked SQLite database, `.env` files, model caches, runtime files, logs, and credentials are excluded.
14. Obtain explicit deployment authorization. Passing this audit is not authorization.

# 32. Proposed Deployment Order

1. Freeze and identify the release commit; back up existing state.
2. Provision private networking, secret manager, object storage, monitoring, and managed PostgreSQL.
3. Create the PostgreSQL schema; run rehearsed `php artisan migrate --force`; load only approved reference data.
4. Provision model artifacts/volumes and deploy private ASR and TTS; wait for real readiness.
5. Deploy Laravel API with production server and durable storage configuration; verify `/up`, DB, storage, and private speech calls.
6. Deploy the broadcast queue worker and Reverb; verify WSS authentication and queue lag.
7. Build/deploy the static frontend with final API/WSS origins and SPA rewrites.
8. Run the production smoke plan, security header/origin checks, observability checks, and backup verification.
9. Promote traffic only after explicit approval; retain the previous frontend/image/database backup for rollback.

# 33. Rollback Considerations

- Record the exact previous frontend artifact and container image digests; redeploy those rather than rebuilding an old branch.
- Take a verified PostgreSQL backup before migrations. The latest game activation migrations intentionally have non-destructive `down()` methods and will not deactivate/delete rows; rollback may therefore mean forward-fixing application compatibility rather than `migrate:rollback`.
- Do not roll back by deleting `game_profiles`, `game_saves`, audio objects, or catalog rows.
- Version API/game save contracts so the previous application can read data written during the attempted release; if it cannot, stop promotion before learner writes occur.
- Keep model versions immutable and retain the previous ASR/TTS model/image pair.
- Object-storage changes require versioning/backup and a database/object consistency plan.
- Reverting a service with an attached single-instance disk may cause downtime; provider rollback behavior must be rehearsed.
- Revoke/rotate secrets only through a coordinated plan that updates every dependent service.

# 34. Production Smoke-Test Plan

Use disposable authorized accounts and non-destructive fixtures unless a reset-specific fixture is explicitly provisioned.

1. Verify HTTPS redirects, HSTS/security headers, frontend `/`, and deep-link SPA fallback.
2. Verify `/up`, DB readiness, private storage write/read/delete probe, ASR `/ready`, TTS `/health`, queue worker, and Reverb/WSS.
3. Learner login: normal and remembered session, refresh/tab close restoration, logout, and protected-route denial.
4. Shared game profile: create/load once, refresh, and confirm the same profile across all three games.
5. Game Alpha: load, make meaningful progress, save, reload, revision conflict handling, and isolation from other games.
6. Game One: load/save/reload a safe checkpoint; confirm server state wins and no cross-learner leakage.
7. OtterTale: load/save/reload meaningful progress and verify independent state.
8. Guest: confirm no profile/save API write and no authenticated save inheritance.
9. Cross-device/session: load one learner's committed save from a second authorized context; confirm ownership and optimistic revision behavior.
10. Academic isolation: verify game writes do not change Diagnostic, lesson, Final, reading profile, CRLA, achievements, or progression.
11. Speech: upload bounded test audio through Laravel, verify private ASR, confirm derived evidence persists, and confirm no browser, API, ASR-temp, or database audio artifact remains.
12. TTS: verify published English/Filipino lines and one authorized runtime synthesis within the chosen timeout budget.
13. Staff roles: System Admin overview/games, teacher ownership boundaries and evidence views, school isolation, remembered-device enforcement, and logout.
14. Realtime: trigger an authorized staff update and verify one queued broadcast reaches the correct channel without leakage.
15. Failure recovery: stop/recover one private speech service, worker, and Reverb independently; verify bounded UI errors and session preservation.
16. Confirm logs/metrics contain no credentials, bearer tokens, cookies, raw passwords, transcripts, or learner audio.

# 35. Final Hosting Readiness Verdict

**CONDITIONALLY READY FOR DEPLOYMENT PLANNING**

The repository has a coherent, buildable architecture and enough evidence to select and plan a provider. It is **not ready for deployment execution** until every Section 28 blocker is resolved and the selected platform is verified with production-like PostgreSQL, durable private audio storage, versioned ML model provisioning, production process definitions, measured resource/timeouts, and end-to-end auth/origin/realtime tests.

Deployment status: **NOT DEPLOYED**.
