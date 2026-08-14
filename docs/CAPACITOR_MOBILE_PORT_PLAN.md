# ReaDirect Capacitor Android Port Plan

Status: analysis and implementation plan only  
Prepared: 2026-08-09  
Initial target: Android, online-only, learner experience  
Web status: the existing React/Vite application remains supported and deployable

## Executive summary

ReaDirect can be packaged as an Android application with Capacitor without rewriting the learner frontend. The recommended approach is to place Capacitor beside the existing Vite app in `apps/web`, use the existing `dist` output as Capacitor's `webDir`, and commit the generated Android project under `apps/web/android`.

The migration is feasible, but it is not only a packaging command. Three integration changes are required before the Android build can provide feature parity:

1. Replace browser-proxy-only API addressing with one shared API-origin adapter that works both on the web and in the packaged WebView.
2. add narrowly scoped API CORS support for the verified Capacitor local origin while retaining HTTPS, bearer-token authentication, and server-side ASR/TTS boundaries;
3. add a small native lifecycle/back-button bridge so recording, Clara playback, navigation, and interrupted submissions fail safely.

The first release should remain online-only. It should reuse WebView `MediaRecorder` and Web Audio before considering native recording or audio plugins. No backend academic logic, assessment scoring, Mu/Nu processing, lesson progression, or database schema should move into the Android application.

Two values must be confirmed before implementation begins:

- the production Android application ID/package name; `org.readirect.app` is only a candidate and must not be committed unless the project controls that identity;
- the production or staging HTTPS API origin reachable by Android devices.

## 1. Current architecture

### Repository and build

- The repository is a pnpm workspace.
- The learner/staff frontend is `apps/web`, built with React 19, TypeScript, Vite 8, and React Router.
- The root requires Node 22 or newer and uses pnpm 10.
- `apps/web` builds with `tsc -b && vite build`.
- Vite currently emits the deployable frontend to the default `apps/web/dist` directory.
- `apps/web/vite.config.ts` proxies `/api` to the Laravel API and `/app` to the Reverb WebSocket endpoint during local browser development.
- `apps/web/src/main.tsx` uses `BrowserRouter`.
- The HTML already includes `viewport-fit=cover`, and learner styles already contain safe-area and short-height/orientation handling in several places.
- No Capacitor packages, Capacitor configuration, or native projects currently exist.
- No active service-worker registration was found. The presence of PWA-related dependencies should not be treated as offline support.

### Runtime boundaries

```text
React/Vite learner UI
  |-- relative /api requests + bearer learner token
  |       |
  |       +--> Laravel API
  |               |-- authentication/session authority
  |               |-- assessments, scoring, progression, persistence
  |               |-- server-side ASR client --> Mu/Nu ASR service
  |               +-- server-side TTS client --> TTS service/catalog
  |
  |-- browser MediaRecorder/Web Audio
  |-- Clara Live2D assets bundled with the frontend
  +-- staff-only Echo/Reverb provider, inert without a staff session
```

The native application must preserve these boundaries. In particular, it must never expose the private ASR or TTS service ports directly to a device.

### Relevant frontend integration areas

The migration must inventory and route API requests from these areas through the shared API adapter:

- `src/features/assessment/assessmentApi.ts`
- `src/features/assessment/assessmentPartTwoApi.ts`
- `src/features/learner-auth/learnerApi.ts`
- `src/features/clara-audio/claraSpeech.ts`
- `src/features/clara-audio/activitySpeechReadiness.ts`
- `src/features/learn-with-clara/learnWithClaraLettersApi.ts`
- `src/features/game-one/gameOneHostAdapter.ts`
- `src/features/lesson/lessonApi.ts`
- `src/features/lesson/lessonSixApi.ts`

Staff API clients and direct staff dashboard fetches should either use the same adapter for web consistency or be explicitly excluded from the learner-only native build. Static asset fetches, such as those in `ClaraWebGLRenderer.ts`, must remain local asset URLs and must not be prefixed with the remote API origin.

## 2. Feasibility and recommended approach

### Feasibility verdict

The port is feasible with low architectural disruption and moderate integration/testing risk.

| Area | Feasibility | Main concern |
|---|---|---|
| React/Vite packaging | High | Set `webDir` to `dist`; keep web build unchanged |
| Existing routes | High with testing | Nested-route reload and Android Back behavior |
| API requests | High after adapter | Relative `/api` cannot rely on the Vite proxy in a packaged WebView |
| Learner bearer auth | High | Decide whether cold-start re-login is acceptable |
| Assessment recording | Medium-high | WebView codec support, permission lifecycle, background interruption |
| Clara/TTS/Live2D | Medium-high | Audio unlock/focus and WebGL performance on real devices |
| Realtime | High for learner scope | Current staff provider derives its host from `window.location`; do not enable staff native realtime unchanged |
| Responsive learner UI | Medium-high | Short landscape, system bars, keyboard, dialogs, and fixed/hidden overflow |
| Offline support | Out of scope | Requires a separate data/conflict/content architecture |

### Recommended architecture

- Keep one React/Vite codebase for browser and native WebView rendering.
- Add a Capacitor shell to `apps/web`; do not create a second copied frontend.
- Keep web builds and deployments independent of Android builds.
- Use environment-based API configuration and a platform-neutral fetch adapter.
- Use Capacitor only for native capabilities that the browser cannot handle reliably: lifecycle, Android Back, and potentially later secure persistence or native audio if evidence requires them.
- Keep the first Android release online-only and learner-focused.
- Preserve all server-side business, academic, scoring, ASR, TTS, and persistence behavior.

## 3. Capacitor project location

Place the Capacitor configuration and native project inside `apps/web`:

```text
apps/web/
  capacitor.config.ts
  package.json
  dist/                    # generated Vite output; never hand-edit
  android/                 # committed native Android project
  src/
```

This location keeps `webDir: "dist"` relative and allows `pnpm --filter @readirect/web ...` workflows. Do not place `android` at the repository root, because the root is a workspace orchestrator and does not own the Vite output.

## 4. Dependency plan

Registry versions verified on 2026-08-09:

| Package | Planned version | Purpose |
|---|---:|---|
| `@capacitor/core` | `8.5.0` | Web/native runtime bridge |
| `@capacitor/cli` | `8.5.0` | Initialization, sync, copy, and native tooling |
| `@capacitor/android` | `8.5.0` | Android native platform |
| `@capacitor/app` | compatible Capacitor 8 release (`8.1.1` at review time) | Back-button and application lifecycle events |

Use exact versions for the three core Capacitor packages to prevent native/runtime drift. Keep all official plugins on the same supported major version. Confirm versions again immediately before installation and review the lockfile diff.

Do not add the following in Phase 1 unless device testing proves a requirement:

- a native audio-recorder package;
- a generic secure-storage package;
- `@capacitor/keyboard`, `@capacitor/status-bar`, or `@capacitor/splash-screen` merely for cosmetic control;
- `@capacitor/ios` before iOS work begins;
- an offline database, cache, or background-sync dependency.

Capacitor 8 requires Node 22+, which matches this repository. Current Capacitor Android guidance requires a current Android Studio toolchain and supports Android API 24 and newer. Use the generated Gradle/plugin defaults unless a documented project requirement demands an override. See the official [environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), [Android guide](https://capacitorjs.com/docs/android), and [Capacitor releases](https://github.com/ionic-team/capacitor/releases).

## 5. Capacitor configuration

Create `apps/web/capacitor.config.ts` only after the application ID is confirmed. The intended shape is:

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "CONFIRM_BEFORE_IMPLEMENTATION",
  appName: "ReaDirect",
  webDir: "dist",
  loggingBehavior: "debug",
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
```

Configuration rules:

- Do not commit the placeholder application ID.
- Keep Capacitor's secure local hostname/scheme defaults. Capacitor recommends retaining `localhost` because secure-context browser APIs such as `getUserMedia` depend on it.
- Do not set production `server.url` to the deployed website. Production should load the bundled `dist` assets.
- Do not enable `cleartext`, broad `allowNavigation`, mixed content, or release WebView debugging.
- If local Android testing temporarily needs a LAN development server, isolate that behavior to a non-release workflow and never merge permissive production settings.
- Treat `VITE_*` values as public build configuration, never secrets.

Relevant official configuration guidance: [Capacitor configuration](https://capacitorjs.com/docs/config).

## 6. Android native project structure

Generate, then commit, `apps/web/android`. Expected source-controlled areas include:

```text
android/
  app/
    build.gradle
    src/main/
      AndroidManifest.xml
      java/.../MainActivity.*
      res/
        drawable*/
        mipmap*/
        values/strings.xml
  build.gradle
  gradle.properties
  settings.gradle
  variables.gradle
  gradle/wrapper/
```

Implementation policy:

- Generate with the matching Capacitor CLI instead of hand-authoring Gradle files.
- Commit native source/configuration and Gradle wrapper files.
- Do not commit Android build outputs, IDE state, signing stores, local SDK paths, or generated copied web assets when the template marks them generated.
- Add repository ignore rules for `android/.gradle`, `android/local.properties`, `android/**/build`, signing files, and other generated native outputs after examining the generated template.
- Keep `MainActivity` minimal. Native behavior should use official plugins and shared TypeScript bridge code where possible.
- Add application icons/splash assets only as a separate reviewed visual task.
- Store release signing credentials outside Git and CI logs.

## 7. Build and synchronization workflow

Planned scripts in `apps/web/package.json`:

```text
mobile:sync       build the Vite app, then capacitor sync android
mobile:copy       build the Vite app, then capacitor copy android
mobile:open       open the Android project in Android Studio
mobile:run        run the Android target for development
```

The exact commands should use the workspace's package manager and locally installed CLI, for example `pnpm exec cap ...`; do not require a global Capacitor install.

Build invariant:

```text
TypeScript/Vite build succeeds
  -> fresh dist exists
  -> Capacitor copy/sync succeeds
  -> Android Gradle build succeeds
```

The browser build and browser test commands must continue to work without Android Studio.

## 8. API and environment strategy

### Current problem

Browser development works because Vite proxies relative `/api` requests. A packaged Capacitor app loads from its own local WebView origin, so `/api/...` would target the bundled app host instead of Laravel.

### Shared API-origin adapter

Add a small platform-neutral module, proposed as `apps/web/src/lib/apiClient.ts` or `apps/web/src/lib/apiUrl.ts`, that:

- reads `VITE_API_ORIGIN` once;
- strips a trailing slash;
- leaves requests relative when the variable is empty, preserving Vite proxy behavior;
- prefixes only application API paths when an origin is supplied;
- preserves request options, `FormData`, bearer headers, abort signals, and response bodies;
- does not rewrite local images, models, shaders, fonts, audio blobs, or other bundled assets.

Environment policy:

| Environment | `VITE_API_ORIGIN` | Expected behavior |
|---|---|---|
| Browser local development | empty | Vite proxies `/api` |
| Browser production | empty or same-origin HTTPS | Existing same-origin deployment |
| Android emulator/device against staging | explicit HTTPS origin | Direct request from WebView to Laravel |
| Android release | approved production HTTPS origin | Direct request from WebView to Laravel |

Never embed ASR/TTS service origins, database credentials, signing secrets, API service tokens, or Laravel secrets in `VITE_*` variables.

### Backend CORS

Laravel must explicitly allow the verified native WebView origin for API routes. Implementation must:

- inspect the actual generated Android request `Origin` on a device before finalizing the list;
- allow only the required Capacitor origin(s) and approved browser origins;
- allow the methods used by the API and the `Authorization`, `Content-Type`, and `Accept` headers;
- avoid wildcard origins, especially if credentials are ever enabled;
- retain bearer-token validation and all existing auth middleware;
- include CORS preflight tests for multipart audio requests and authorized JSON requests.

The preferred production architecture remains one public HTTPS API domain. Development-only cleartext LAN access must not leak into release manifests or network-security configuration.

## 9. Authentication and token storage

### Current behavior

- Learner login returns a random opaque bearer token.
- The API stores only a hash of the token and enforces expiry, idle timeout, revocation, and active-session limits.
- The learner frontend stores its session in `sessionStorage` under `readirect.learner-session`.
- Logout calls the API and clears the local session.

### Phase 1 decision

Preserve `sessionStorage` initially. It is closer to the current browser-tab security semantics and avoids copying a bearer token into plain preferences or `localStorage`.

The product owner must explicitly accept that Android process death or a cold restart can require learner login again. Test this behavior; do not assume WebView storage lifetime.

If durable native login later becomes a requirement:

- treat it as a separately approved security change;
- use Android Keystore-backed storage through a well-maintained plugin after a dependency/security audit;
- store only the opaque session token and minimum session metadata;
- keep server expiry/revocation authoritative;
- never store credentials or unhashed passwords;
- define migration and logout deletion behavior.

Regardless of storage choice, centralize `401` handling so an invalid/expired learner session is cleared once and the learner returns to login without repeated failing requests. Do not infer authentication from local state alone.

## 10. Routing and deep links

Keep `BrowserRouter` for the first implementation. Do not switch the whole application to hash routing without a reproduced failure.

Verify:

- initial app launch at `/`;
- login-to-dashboard navigation;
- all learner routes;
- WebView reload while on a nested route;
- process recreation and route restoration;
- browser refresh/direct URL behavior remains unchanged.

If nested-route reload fails inside the bundled app, first implement a narrow startup-route restoration strategy. Consider `HashRouter` only if route restoration cannot be made reliable and after checking every route, redirect, link, test, and analytics assumption.

External HTTP links should open in the system browser rather than inside an unrestricted WebView. Phase 1 should not add custom deep links. If links are later required, use verified Android App Links, allowlisted routes, and never place bearer tokens in URLs.

## 11. Recorder and MediaRecorder strategy

### Current behavior to preserve

`useAudioRecorder.ts` requests microphone audio with `getUserMedia`, records through `MediaRecorder`, produces a Blob/object URL, supports playback, and uploads multipart audio to the Laravel API. Assessment logic and server-side ASR consume the uploaded file.

### Phase 1 approach

Use WebView `getUserMedia` and `MediaRecorder` first. Add compatibility handling only where required:

- detect `navigator.mediaDevices`, `getUserMedia`, and `MediaRecorder` before showing an enabled recorder;
- request microphone permission at the moment the learner starts recording, with a child-friendly denial message;
- choose a MIME type from `MediaRecorder.isTypeSupported` when available, preferring a format accepted by the current server/ASR pipeline;
- preserve the actual Blob MIME type and a matching upload filename extension;
- keep the current duration, state, playback, retry, and upload behavior;
- release all media tracks on stop, cancellation, route exit, unmount, and app pause;
- stop Clara/audio playback before microphone capture to avoid feedback and recognition contamination;
- prevent duplicate start/stop actions during transitions.

Do not introduce a native recorder plugin unless testing across the supported Android WebView/device matrix demonstrates a concrete blocker that cannot be solved through standards APIs. A native recorder would add codec, URI/file access, cleanup, permission, and test complexity.

### Android permissions

The generated application will need:

- `android.permission.INTERNET` for online use;
- `android.permission.RECORD_AUDIO` for assessments and speaking activities.

No broad storage permission is needed for in-memory recording/upload. Decide whether to declare the microphone hardware feature as required based on the distribution policy; core learner activities currently depend on it.

Permission verification must include first grant, deny, deny-and-do-not-ask-again, system-settings re-enable, app restart, and permission revocation while the app is installed.

## 12. Clara, TTS, and Live2D

Preserve the current pipeline:

```text
selected learner language/current dialogue
  -> Laravel fixed or dynamic speech endpoint
  -> server-side TTS/catalog selection
  -> audio Blob returned to frontend
  -> Web Audio decode/analyser/playback
  -> Live2D speaking animation + synchronized speech bubble
```

Requirements for native compatibility:

- route Clara API calls through the shared API adapter;
- keep bundled Live2D models, shaders, runtime, and other static assets local;
- preserve the user-gesture audio unlock path and test `AudioContext.resume()` on real devices;
- stop Clara playback and animation on route exit, app pause, dialogue cancellation, and before recording;
- resume only through deliberate application state, not by replaying stale dialogue automatically;
- preserve English/Filipino server-selected speech and ensure the bubble uses the same authoritative dialogue value;
- test fixed catalog audio, generated dynamic TTS, missing-audio fallback, cancellation, rapid language switching, and slow networks;
- test WebGL context loss, low-memory recreation, and representative low/mid/high Android devices.

Do not bundle TTS credentials or call the private TTS service from Android.

## 13. Realtime behavior

The existing realtime provider is staff-focused and is inactive without a staff session. Learner Phase 1 does not require a native Reverb connection, so no realtime architecture change is required for feature parity in the learner scope.

Do not enable staff realtime in Android unchanged. It currently derives host, port, and TLS behavior from `window.location`; inside Capacitor that location is the local bundled app origin. If staff native support is later approved, add explicit `VITE_REALTIME_*` configuration, use WSS in production, audit authentication/channel authorization, and test background/reconnect behavior.

## 14. Responsive layout and safe areas

Keep the current visual design. Perform a native responsive correction pass rather than a redesign.

Audit these patterns across learner routes:

- `100vh`/`100svh` behavior with Android status/navigation bars;
- safe-area padding on all four edges in portrait and landscape;
- fixed headers, footers, modals, speech bubbles, mascot overlays, recorder controls, Submit/Skip controls, and toasts;
- `overflow: hidden` containers that can clip content when browser chrome is replaced by native system bars;
- keyboard opening on login and any form/dialog;
- browser text scaling, 200% zoom-equivalent accessibility settings, and long Filipino strings;
- short-height phone landscape layouts;
- tablet and foldable resize/multi-window transitions;
- gesture-navigation and three-button-navigation insets.

Prefer CSS safe-area variables, modern viewport units, intrinsic layout, `clamp()`, and localized media/container queries. Avoid JavaScript device-name branching or duplicated native-only page layouts.

## 15. Android Back behavior

Install one `@capacitor/app` back listener only when running natively. Registering a listener replaces Capacitor's default behavior, so it must implement the full policy.

Back priority should be:

1. close the topmost open modal, menu, confirmation, or non-route overlay;
2. if audio is recording, processing, or uploading, require explicit cancellation/confirmation and safely release resources;
3. if a lesson or assessment has an existing guarded exit flow, invoke that flow rather than bypassing it with raw history navigation;
4. on ordinary learner pages, navigate to the expected previous or parent route;
5. on the learner dashboard/root, use a deliberate exit/minimize policy, preferably double-back or a confirmation rather than accidental termination.

Do not globally call `window.history.back()` without checking application state. Browser behavior must remain untouched. See the official [Capacitor App API](https://capacitorjs.com/docs/apis/app).

## 16. Application lifecycle

Add a small native lifecycle coordinator, ideally in a provider mounted near `AppProviders`, using `@capacitor/app` only when native.

On `pause`/inactive/background:

- stop active microphone capture and release tracks;
- stop recorded-audio playback and Clara/TTS playback;
- cancel visual speaking/recording animation;
- abort nonessential client requests where supported;
- do not mark an item complete or advance a lesson merely because the app paused.

On resume:

- re-check learner session validity as needed;
- restore only safe UI state;
- re-fetch authoritative current assessment/lesson state when interruption could make local state stale;
- show retry/recovery UI for uncommitted audio rather than silently submitting it;
- prevent duplicate submission if a response was committed before connectivity or process interruption.

No background recording, TTS playback, or lesson progression is planned.

## 17. Security model

Follow Capacitor's [security guidance](https://capacitorjs.com/docs/guides/security) and retain the server as the trust boundary.

Required controls:

- production API and any future realtime endpoint use HTTPS/WSS only;
- no mixed content or production cleartext traffic;
- no remote production `server.url`;
- no unrestricted in-WebView navigation;
- release WebView debugging disabled;
- bearer tokens excluded from URLs, logs, crash metadata, and analytics;
- Laravel secrets, ASR/TTS service credentials, and signing keys never enter frontend source or Vite environment files;
- narrowly scoped CORS with tested preflight behavior;
- server-side authorization, expiry, idle timeout, revocation, validation, scoring, and progression remain authoritative;
- release builds are signed through protected local/CI secret storage;
- logs are reviewed so API responses, dialogue, recordings, and tokens are not emitted in production.

Add or strengthen an HTML Content Security Policy only after testing all Live2D/WebGL/Web Audio requirements. A target policy should start from `default-src 'self'` and explicitly allow only required API/WSS connections plus `blob:`/`data:` media or images. Do not deploy an untested policy that breaks the Live2D runtime.

## 18. Files likely to be added or modified

### Add

- `apps/web/capacitor.config.ts`
- `apps/web/android/**` generated native source/configuration
- `apps/web/src/lib/apiClient.ts` (final location/name to follow current conventions)
- `apps/web/src/app/NativeAppLifecycleProvider.tsx` or equivalent small native bridge
- focused unit/integration tests for API URL resolution, lifecycle, Back, and recorder compatibility
- Android instrumented/manual verification documentation if the repository adopts it

### Modify

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `.gitignore` for generated Android/local/signing artifacts
- `.env.example` or a frontend environment example documenting `VITE_API_ORIGIN`
- `apps/web/src/app/AppProviders.tsx`
- frontend API modules listed in Section 1
- `apps/web/src/features/assessment/useAudioRecorder.ts` only for proven compatibility/lifecycle hooks, not behavior redesign
- Clara speech readiness/playback modules for API-origin and lifecycle integration
- Laravel CORS configuration/middleware and tests
- relevant frontend and API tests
- setup/deployment documentation affected by native builds and API origin/CORS

### Modify only if testing proves necessary

- `apps/web/src/main.tsx` or routing configuration
- learner responsive CSS files
- `apps/web/index.html` for a tested CSP
- recorder UI components
- Android native activity code

## 19. Files and behavior to avoid changing

- generated `apps/web/dist/**` files;
- learner academic content and lesson definitions;
- assessment scoring, pass/fail rules, attempts, item order, and progression;
- Mu/Nu/ASR algorithms or service contracts except accepting a WebView-supported audio MIME if compatibility testing proves it necessary;
- TTS voice/catalog selection and dialogue authority;
- database schema and production learner records;
- unrelated staff dashboards and administration UX;
- unrelated game logic;
- existing recorder visual design unless a native-only defect is reproduced;
- existing user working-tree changes unrelated to the port;
- `start.ps1`, `stop.ps1`, package lockfiles outside the intentional pnpm dependency update, Corepack files, and TTS precache scripts unless separately requested.

## 20. Implementation sequence

Each phase has its own exit gate. Do not continue if the gate fails.

### Phase 0 — Confirm decisions and baseline

1. Confirm the Android `appId` and ownership.
2. Confirm the public HTTPS staging/production API origin.
3. Confirm Android minimum-version/product support policy.
4. Confirm learner-only native scope and whether cold-start re-login is acceptable.
5. Record clean web build, tests, and representative learner flow results.

Exit gate: decisions are recorded and the browser baseline is green.

### Phase 1 — Normalize network configuration

1. Add the shared API-origin resolver/fetch adapter.
2. Migrate learner API calls, preserving payloads and error behavior.
3. Keep static asset URLs local.
4. Add frontend URL/headers/FormData/abort tests.
5. Configure narrowly scoped Laravel CORS and preflight tests.
6. Verify browser local proxy and browser production behavior.

Exit gate: web behavior is unchanged and direct HTTPS API requests pass from a browser-origin test harness.

### Phase 2 — Add Capacitor shell

1. Install reviewed Capacitor 8 dependencies.
2. Add the confirmed config with `webDir: "dist"`.
3. Generate Android using the local CLI.
4. review all generated files and ignore rules.
5. Add build/sync/open scripts.
6. Perform a debug Gradle build and launch the app.

Exit gate: the app launches bundled assets without `server.url`; web build still works independently.

### Phase 3 — Authentication and basic navigation

1. Verify login/logout, token headers, expiry, and 401 handling.
2. Verify all learner routes and nested-route restoration.
3. Implement native Back policy without changing browser routing.
4. Verify external-link handling.

Exit gate: authentication and navigation work through restart, expiry, logout, and Back scenarios.

### Phase 4 — Audio, Clara, and assessment integration

1. Add microphone permission and capability/error handling.
2. verify supported MediaRecorder MIME types and server acceptance.
3. Verify record/stop/play/re-record/upload/ASR/submit flows.
4. Verify Clara fixed and dynamic TTS, Live2D animation, dialogue bubble, and language switching.
5. Add lifecycle cleanup and interruption recovery.

Exit gate: the real-device audio matrix passes without leaked microphone tracks, duplicate submissions, or dialogue desynchronization.

### Phase 5 — Responsive/native polish

1. Run the full device/viewport matrix.
2. Apply only localized safe-area, keyboard, short-height, overflow, and touch corrections.
3. Verify accessibility, text scaling, orientation, and foldable/multi-window resizing.
4. Add approved app icon/splash assets if in release scope.

Exit gate: no critical clipping, overlap, inaccessible control, or layout regression remains.

### Phase 6 — Security and release readiness

1. Audit manifest, network security, CORS, URLs, logs, permissions, dependencies, and signing configuration.
2. Build a release variant with WebView debugging disabled.
3. Run automated web/API tests and Android smoke/regression tests.
4. Test against production-like HTTPS services.
5. Document build, signing, deployment, rollback, and support steps.

Exit gate: Definition of Done is met and release artifacts contain no secrets or debug-only network allowances.

### Phase 7 — iOS readiness boundary

Do not create an iOS project during the Android implementation. Keep shared API/lifecycle code platform-neutral and avoid Android-specific logic outside the native adapter. When iOS begins, install a matching Capacitor 8 `@capacitor/ios`, generate `apps/web/ios`, and perform a separate permissions, audio, safe-area, lifecycle, signing, and App Store review.

## 21. Test strategy and matrix

Automated coverage should use existing Vitest/React Testing Library, Playwright, Laravel tests, and Gradle tooling. Browser automation cannot replace real Android microphone, audio focus, WebView lifecycle, or system-permission testing.

| # | Area/scenario | Android verification | Web regression/pass criterion |
|---:|---|---|---|
| 1 | Fresh install and launch | Bundled app opens without remote `server.url` | Web entry still loads |
| 2 | API environment | Release targets approved HTTPS API; debug config cannot leak | Vite `/api` proxy still works |
| 3 | Learner login success/failure | Correct messages and bearer header | Existing login behavior unchanged |
| 4 | Logout | Server token revoked and local session removed | Same in browser |
| 5 | Expired/revoked session | Single redirect to login; no retry loop | Central 401 behavior passes |
| 6 | Cold start/process death | Accepted re-login or approved restoration behavior | Browser session semantics documented |
| 7 | Route navigation | All learner routes reachable | Existing route tests pass |
| 8 | Nested-route reload/restore | No blank/404 screen after recreation | Direct browser URLs still work |
| 9 | Android Back with overlay | Closes only topmost overlay | Browser Back unaffected |
| 10 | Android Back during lesson/assessment | Guarded exit; no accidental progress loss | Existing exit flows pass |
| 11 | Root Back | Deliberate exit/minimize behavior | Not applicable to browser |
| 12 | Microphone first grant | Prompt appears at use and recording starts | Browser permission path works |
| 13 | Microphone denial/settings recovery | Friendly recovery, no crash/stuck UI | Browser denial remains handled |
| 14 | Record/Stop/Play/Re-record | State, timer, centered controls, cleanup correct | Existing recorder tests pass |
| 15 | Codec/MIME | Uploaded format accepted on supported devices | Desktop formats remain accepted |
| 16 | ASR Mu/Nu and scoring | Same server result and progression as web | Golden API/assessment tests match |
| 17 | Audio upload interruption | Retry available; no duplicate item/attempt | Network failure tests pass |
| 18 | App pause during recording | Recording stops, tracks release, no auto-submit | Hook cleanup tests pass |
| 19 | App pause during playback/TTS | Audio and speaking animation stop safely | Route/unmount cleanup passes |
| 20 | Clara fixed speech | Audio, bubble, and model stay synchronized | English/Filipino web tests pass |
| 21 | Clara dynamic TTS | Same authoritative dialogue rendered/spoken | Cancellation/error tests pass |
| 22 | Language switching | No stale previous-language audio/bubble | Existing language flow passes |
| 23 | Realtime provider | Learner app makes no incorrect localhost WS connection | Staff web realtime remains green |
| 24 | Responsive portrait | Small/large phones, tablets, text scaling | Playwright viewport snapshots/checks |
| 25 | Short landscape | No clipping/overlap; recorder and controls reachable | Existing landscape layout preserved |
| 26 | System UI and keyboard | Insets, gesture nav, three-button nav, keyboard safe | Browser mobile viewport remains usable |
| 27 | Foldable/multi-window/orientation | Resize without stale measurements or lost state | Responsive browser resize passes |
| 28 | Security/release build | No cleartext, secrets, debug WebView, broad navigation | HTTPS/CORS/auth security tests pass |

Recommended physical coverage:

- one current low- or mid-range Android phone;
- one current flagship/high-density phone;
- one small or older supported Android device if the product supports API 24-era hardware;
- one tablet;
- emulator profiles for short landscape, foldable, and multiple Android/API/WebView versions.

Test both gesture and three-button navigation. Record OS, device, Android System WebView/Chrome version, codec selected, and API environment for every audio defect.

## 22. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Relative `/api` resolves to WebView localhost | App cannot authenticate or load data | Shared origin adapter plus integration tests |
| Broad CORS added as a shortcut | Unauthorized cross-origin exposure | Exact allowlist and preflight/security tests |
| Wrong/unowned app ID | Store/signing identity conflict | Product-owner confirmation before generation |
| HTTP staging used in release | Cleartext exposure and store/security failure | HTTPS environment; debug-only exception if unavoidable |
| Session disappears after process death | Unexpected re-login | Explicit product decision and lifecycle tests; secure storage only as separate change |
| Android WebView MediaRecorder differences | Recording/upload/ASR failure | Runtime capability/MIME probe and real-device matrix |
| Mic track survives backgrounding | Privacy/battery defect | Lifecycle coordinator and track assertions |
| Clara audio and recording overlap | Poor ASR and confusing UX | Mutual exclusion and pause/cancel handling |
| BrowserRouter restore fails | Blank screen on recreation | Test early; narrow route restoration before router replacement |
| Back bypasses assessment guards | Lost/incorrect progress | State-aware Back policy using existing exit flows |
| `window.location` configures Reverb as localhost | Native WS errors | Keep staff realtime out of Phase 1; explicit config later |
| Fixed layouts clip under system bars | Inaccessible controls | Safe-area/short-height/mobile matrix and localized fixes |
| Duplicate submissions on interruption | Incorrect attempts/progression | Server authority, idempotent checks where available, recovery UI |
| Live2D/WebGL pressure on lower-end devices | Animation loss/crashes | Device performance tests, context-loss handling, graceful fallback |
| Native dependency drift | Build/runtime incompatibility | Exact core versions, same plugin major, lockfile review |
| Secrets included in APK or logs | Credential/data compromise | Build artifact inspection, secret scanning, logging review |
| Scope expands into offline rewrite | Delayed/unsafe release | Enforce online Phase 1 boundary |

## 23. Definition of Done

The Android-first online port is complete only when all of the following are true:

- the Android application ID and signing ownership are approved;
- Capacitor uses bundled `apps/web/dist` assets with no production `server.url`;
- browser build, tests, deployment, routes, and learner behavior remain supported;
- all learner API requests use the correct environment-specific HTTPS API origin;
- CORS is least-privilege and covered by authorized and preflight tests;
- login, expiry, revocation, logout, and cold-start behavior are correct and documented;
- all learner routes and state-aware Android Back behavior pass;
- recording, stop, playback, re-record, upload, Mu/Nu ASR, scoring, and progression match the web app;
- microphone permission denial/recovery and app pause/resume are safe;
- Clara fixed/dynamic TTS, Live2D, current dialogue, bubble visibility, cancellation, and language switching remain synchronized;
- the learner app does not attempt an invalid native Reverb connection;
- portrait, tablet, short landscape, keyboard, safe-area, text-scaling, foldable/multi-window, and orientation tests pass;
- no critical clipping, overlap, crash, leaked audio track, stale dialogue, or duplicate submission remains;
- release builds disable WebView debugging and contain no cleartext allowances, secrets, service credentials, or signing material;
- Android build/sign/release/rollback instructions and supported device/API policy are documented;
- the final Git diff contains only intentional mobile-port changes and no academic, recorder-behavior, backend-logic, or database regressions.

## 24. Future offline boundary

Offline support is explicitly excluded from this port. Capacitor packaging does not make ReaDirect's server-driven lessons, authentication, speech generation, ASR, scoring, or progression safely offline.

A future offline project would require separate decisions for:

- offline identity and session trust;
- encrypted local learner data;
- downloadable/versioned lesson and TTS assets;
- recording queues and storage limits;
- on-device versus deferred ASR;
- conflict resolution and idempotent synchronization;
- authoritative progression/scoring reconciliation;
- revocation, logout, and shared-device privacy;
- cache invalidation and content updates;
- background-network and battery policies;
- offline UX, observability, recovery, and support.

Do not add a service worker, local database, background upload queue, cached bearer token, or silent replay as part of the online Android port. Those changes need their own threat model, data model, API contracts, implementation plan, and acceptance tests.

## Open decisions before implementation

1. What exact Android application ID is owned and approved?
2. What HTTPS API origin will staging and production Android builds use?
3. Is learner-only routing required in the APK, or may staff routes remain bundled but inaccessible without staff authentication?
4. Is re-login after Android process death acceptable for Phase 1?
5. What minimum Android OS/API level does the product promise, within Capacitor 8's supported range?
6. Is microphone hardware mandatory for Play Store device filtering?
7. What is the approved dashboard/root Android Back exit behavior?

Implementation must pause at any decision that changes identity, security posture, supported devices, or session persistence rather than guessing.
