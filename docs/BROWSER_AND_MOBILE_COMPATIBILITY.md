# ReaDirect Browser and Mobile Compatibility

Status: current implementation map as of August 20, 2026

Mobile scope: Capacitor Android only

Source of truth: running code and configuration in `apps/web`, `apps/api`, and
`services`; older planning documents may describe superseded phases.

## 1. Purpose

This document explains what the ReaDirect browser application and Android
application contain, which behavior they share, where they intentionally
differ, and what must still be verified before claiming full compatibility.

The short verdict is:

- The online learner experience is architecturally compatible. Browser and
  Android use the same React application, Laravel API, database records,
  academic rules, assessment scoring, lesson progression, games, ASR, and TTS
  contracts.
- The online learner interfaces use the same route components and experience
  settings. Android still adds a native startup/mode screen, encrypted native
  session storage, lifecycle and Back-button handling, orientation control,
  connectivity feedback, and Offline Practice.
- Staff portals are supported by the browser application but are not currently
  mobile-compatible. Their API and realtime clients still assume a browser
  origin and relative `/api` paths.
- Offline Practice is a supported Android feature, not an offline copy of the
  online Reading Journey. It never changes canonical scores, achievements,
  assessment results, lesson completion, or progression.
- Real Android microphone, audio-focus, WebView, low-memory, and device-matrix
  certification is not demonstrated by the repository's current Android test
  suite. Architectural compatibility does not yet equal full device
  certification.

## 2. Shared architecture

Both surfaces use one frontend codebase:

```text
Browser tab                         Capacitor Android WebView
    |                                         |
    +----------- React/Vite application ------+
                          |
                    Laravel API
                          |
          +---------------+----------------+
          |               |                |
     PostgreSQL       ASR / Mu / Nu     TTS / Clara
          |
    academic runs, progress, reports, and game saves
```

The Android application packages the production Vite output from
`apps/web/dist` into the Capacitor WebView. It does not contain a separate copy
of assessment rules, lesson scoring, learner progression, or game persistence.

This shared server authority is the most important compatibility guarantee:
the same learner account and session can read the same server-owned progress
from either surface, and both surfaces submit to the same API contracts.

## 3. Compatibility matrix

| Capability                        | Browser application                                                                                                            | Capacitor Android application                                                                                           | Compatibility verdict                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Public entry                      | `/` redirects to `/landing`; public pages and docs are available                                                               | `/` opens a native splash, tap entry, and Online/Offline mode chooser                                                   | Compatible content, intentionally different entry UX                        |
| Learner login                     | Supported through the browser API origin and browser session model                                                             | Supported through an explicit HTTPS API origin and encrypted native session store                                       | Compatible when Android API origin and CORS are correct                     |
| Learner dashboard                 | Full online dashboard                                                                                                          | Same dashboard plus an Offline Practice download card                                                                   | Compatible; Android has an additional feature                               |
| Diagnostic assessment             | Same React pages and Laravel assessment API                                                                                    | Same pages and API inside the WebView                                                                                   | Architecturally compatible; real-device recording still needs certification |
| Final assessment                  | Same server access rule, scoring, persistence, and result pages                                                                | Same                                                                                                                    | Compatible subject to microphone/WebView verification                       |
| Lessons 1-6                       | Same content snapshots, retries, scoring, and completion APIs                                                                  | Same                                                                                                                    | Compatible subject to microphone/audio verification for spoken lessons      |
| Learn With Clara                  | Uses the configured Live2D/static and speech modes                                                                              | Uses the same configured modes after entering Online Learning; startup and Offline Practice use bundled static Clara     | Compatible online; startup/offline presentation is intentionally native     |
| Fixed and dynamic Clara speech    | Uses the Laravel TTS boundary                                                                                                  | Uses the same Laravel TTS boundary through the configured API origin                                                    | Compatible only while online                                                |
| Games                             | Space Letter, Readscape, and Ottertale use shared profile/save APIs                                                            | Same game bundles and save APIs                                                                                         | Compatible; Android orientation policy differs by game                      |
| Game saves                        | Database-backed, schema-validated, revision-controlled                                                                         | Same                                                                                                                    | Compatible and cross-surface by design                                      |
| Offline Practice                  | Routes can render in browser tests, but it is not exposed as the supported browser product flow and there is no service worker | Supported mode with downloaded, validated packs stored on the device                                                    | Not feature-parity; Android-specific supported capability                   |
| Browser PWA install/offline shell | Not implemented; PWA/Workbox packages are not wired into Vite or startup                                                       | Not applicable; Capacitor supplies the installed shell                                                                  | Not compatible as a web PWA because no web PWA exists                       |
| Connectivity handling             | Uses browser online/offline events and API reachability checks                                                                 | Adds Capacitor Network events, pause/resume handling, and a native connectivity banner                                  | Compatible outcome with different platform adapters                         |
| Session storage                   | Browser uses HttpOnly server cookies plus a tab/persistent signed-in marker and browser snapshot                               | Learner token/session snapshot is encrypted with AES-GCM using Android Keystore                                         | Compatible server session; different local security implementation          |
| Android Back button               | Browser history/navigation only                                                                                                | State-aware native Back handling, route fallbacks, and application exit behavior                                        | Intentionally Android-only                                                  |
| Orientation                       | Browser follows the viewport/device                                                                                            | Android locks ordinary routes to portrait; Game One and Game Two unlock sensor orientation; Game Alpha remains portrait | Compatible content, different presentation policy                           |
| Microphone recording              | `getUserMedia` and `MediaRecorder` in a secure browser context                                                                 | Same web APIs in Android WebView, with native audio permissions and pause interruption handling                         | Contract-compatible, device behavior not fully certified                    |
| Staff portals                     | Teacher, school administrator, and system administrator portals are supported                                                  | Routes are packaged, but staff fetch/realtime addressing is still browser-origin-dependent                              | Not currently supported on mobile                                           |
| Staff realtime                    | Laravel Echo/Reverb derives connection information from the browser location                                                   | Local WebView location does not describe the remote Reverb endpoint                                                     | Incompatible until explicit native realtime configuration is added          |
| iOS                               | Browser may run on iOS browsers subject to browser support                                                                     | No Capacitor iOS project exists                                                                                         | Native iOS is not implemented                                               |

## 4. Features shared by browser and Android

### 4.1 Canonical learner data

The following data remains server-owned and is therefore shared across
browser and Android:

- learner identity and active sessions;
- diagnostic and final assessment runs and responses;
- lesson runs, item attempts, retry evidence, and completion;
- reading-path and achievement state;
- Learn With Clara Letters listening checkpoints;
- preferred speech language;
- game profile and revision-controlled game saves; and
- teacher-visible reports and audio-review source records.

Refreshing the browser, recreating an Android activity, or signing in on
another supported surface must not recreate completed academic work. The
Laravel run and ownership services remain authoritative.

### 4.2 Academic behavior

Both surfaces use the same rules:

1. Complete or skip the Diagnostic Assessment.
2. Open any of Lessons 1-6; numbered lesson order is not enforced after the
   diagnostic gate.
3. Complete all six distinct lessons to unlock the Final Assessment.
4. Submit spoken work through Laravel to the private ASR service.
5. Let Laravel apply Nu/equivalence/alignment and persist the result.

The Android application must never reproduce these rules locally.

### 4.3 API request behavior

Shared learner clients route application API paths through
`apps/web/src/lib/apiUrl.ts`.

- Browser development and same-origin deployments normally leave
  `VITE_API_ORIGIN` empty and use relative `/api/...` requests.
- Android builds must embed an approved HTTPS Laravel origin through
  `VITE_API_ORIGIN`.
- Static frontend assets remain local to the web bundle and must not be
  prefixed with the API origin.
- Ordinary API requests use a 12-second client timeout. Speech requests use a
  longer explicit budget.

The Android API will fail even when the browser works if any of these are
wrong:

- `VITE_API_ORIGIN` is empty or points at the wrong host;
- the certificate is invalid on the Android device;
- Laravel CORS does not allow the verified Capacitor origin;
- credentialed requests or `Authorization` headers are removed by a proxy; or
- the API, ASR, or TTS service is unavailable behind the public origin.

## 5. Intentional platform differences

### 5.1 Startup and navigation

The browser starts at the public landing page. Android starts with a five-second
native splash followed by a tap-to-continue screen and a choice between Online
Learning and Offline Mode.

Android also listens for application pause, resume, and hardware/gesture Back
events. Pausing stops Clara audio and interrupts active recording safely.
Browser navigation does not use this native lifecycle registry.

### 5.2 Session storage

Browser learner and staff sessions use server cookies for authorization. A
small browser snapshot/marker is stored in `sessionStorage` or `localStorage`
depending on the remember-me choice; the browser snapshot does not contain the
real cookie credential.

Android learner sessions use the `SecureSession` plugin:

- JSON is encrypted with AES-GCM;
- the encryption key is generated and retained by Android Keystore;
- ciphertext is stored in application-private SharedPreferences;
- secure-session and WebView data are excluded from Android cloud backup and
  device transfer; and
- startup revalidates a restored session with Laravel before rendering the
  signed-in application.

The native code is learner-ready. Staff sessions should not be treated as
mobile-ready because staff API requests and realtime configuration have not
been normalized to the Android API origin.

### 5.3 Clara rendering

The browser and Android Online Learning routes resolve the same learner
experience settings from Laravel, so display mode, dialogue, and speech
contracts stay aligned. Android uses a bundled static Clara portrait only for
the native startup/mode chooser and Offline Practice, before an online learner
route is active.

An existing local display override can still select static or Live2D on either
surface. Live2D on Android must be tested on representative low-, mid-, and
high-range devices before it is advertised as broadly supported.

### 5.4 Orientation

The Android manifest begins in portrait. The native orientation bridge applies
these rules:

- public, learner, assessment, lesson, Offline Practice, and Game Alpha routes:
  portrait;
- Game One/Readscape and Game Two/Ottertale: orientation unlocked so the sensor
  and device preference can select portrait or landscape.

Browser layouts respond to the current viewport and contain safe-area,
coarse/fine pointer, reduced-motion, portrait, landscape, and short-height CSS.

### 5.5 Offline Practice

Offline Practice downloads an authenticated, versioned pack while online. The
client validates path safety, schema, byte counts, and SHA-256 hashes before
atomically activating it under Capacitor `Directory.Data`.

After installation it may use:

- approved local reading prompts;
- approved fixed Clara WAV files;
- local practice-only session state; and
- in-memory record-and-playback where the activity permits it.

It does not use or later synchronize:

- ASR, Mu, or Nu decisions;
- dynamic TTS;
- assessment responses or scores;
- lesson completion or progression;
- achievements or mastery; or
- delayed background uploads.

The browser has no registered service worker, so it cannot be described as a
reliable offline-installed web application. A browser test can open the
Offline Practice route, but this does not guarantee that the complete browser
application can cold-start with no network.

## 6. Mobile support boundary

The current Android project declares:

- application ID `com.readirect.app`;
- minimum Android API 24;
- target/compile API 36;
- Internet, microphone, and audio-settings permissions;
- mixed content disabled;
- WebView debugging disabled by Capacitor configuration;
- bundled web assets from `apps/web/dist`; and
- no production `server.url`, broad navigation allowlist, or cleartext HTTP.

The current permission policy contains one unresolved mismatch:
`AndroidManifest.xml` requests `MODIFY_AUDIO_SETTINGS`, while
`OfflinePracticeAndroidBackup.test.ts` currently classifies that permission as
forbidden. The product/security owner must decide whether the permission is
actually required for ReaDirect audio behavior, then align the manifest and
test. This mismatch does not by itself prove a runtime compatibility failure,
but it prevents the focused mobile privacy suite from being green.

An API 24 minimum in Gradle means the APK can be installed on Android 7.0 and
newer. It does not prove that every API 24 device has sufficient memory,
performance, codec support, or an acceptable Android System WebView version for
all ReaDirect features.

## 7. Compatibility verdict by audience

### Learners using Online Learning

**Compatible by architecture, conditionally compatible in deployment.**

Browser and Android share the same learner components and authoritative
backend. Android requires the correct HTTPS API origin, CORS configuration,
working microphone permission, supported WebView recording format, and an
online path to ASR/TTS.

### Learners using Offline Practice

**Supported on Android; not equivalent to browser Online Learning.**

Downloaded practice is intentionally local and non-canonical. It should be
presented as additional practice, never as an offline assessment or lesson
completion system.

### Teachers and administrators

**Browser-supported; Android unsupported.**

Do not distribute the Android application as a staff portal until all staff API
clients use the shared API-origin adapter and Reverb receives an explicit WSS
origin/configuration for the native build.

### iPhone and iPad users

**Browser only.**

There is no `apps/web/ios` Capacitor project. Native iOS compatibility, signing,
permissions, storage, audio, lifecycle, and App Store behavior are unverified.

## 8. Current verification evidence

Repository automation covers parts of the shared boundary:

- API URL resolution for relative browser and explicit native origins;
- native navigation destinations and lifecycle handler ordering;
- connectivity status and API reachability behavior;
- Offline Practice schema, path safety, download, integrity, repository,
  profile isolation, backup exclusions, and UI behavior;
- browser viewport checks for Offline Practice;
- learner browser entry and selected game integration; and
- Laravel ownership, assessment, lesson, TTS, and game persistence contracts.

The repository does not currently contain meaningful ReaDirect Android
instrumentation tests. The Android `androidTest` and `test` folders contain only
generated example tests. Existing browser/JS tests cannot certify:

- real Android permission prompts;
- Android WebView `MediaRecorder` MIME output across versions;
- microphone interruption from calls, notifications, or app backgrounding;
- audio focus between Clara, recorded playback, and other applications;
- WebGL context loss and Live2D memory pressure;
- process death and activity recreation during an assessment or lesson;
- offline cold start after device reboot;
- low-storage and interrupted-download recovery on a physical device; or
- release signing, update, rollback, and store delivery.

A focused compatibility run on August 20, 2026 executed 30 assertions across
API-origin, native lifecycle/navigation, connectivity, Offline Practice
boundaries, Android backup policy, and local repository behavior. Twenty-nine
passed. The single failure was the `MODIFY_AUDIO_SETTINGS` manifest/test policy
mismatch described in Section 6. No application behavior was changed as part
of this documentation work.

Therefore, the current defensible statement is **code-compatible, not yet fully
device-certified**.

## 9. Required compatibility test matrix

Before declaring browser and Android fully compatible, record the following for
each Android test: device model, Android version, Android System WebView/Chrome
version, selected recorder MIME type, network type, API environment, and build
commit.

| Scenario                     | Browser check                        | Android check                                  | Pass condition                                               |
| ---------------------------- | ------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------ |
| Fresh learner login          | Secure desktop/mobile browser        | Physical phone on approved HTTPS origin        | Same learner and reading path load                           |
| Remembered/restarted session | Close/reopen browser as configured   | Kill/relaunch app                              | Server-valid session restores; expired session signs out     |
| Diagnostic recording         | Chrome plus another approved browser | At least two physical Android/WebView versions | Audio uploads and receives the same server decision contract |
| Spoken Lessons 1-5           | Complete representative attempts     | Complete the same attempts                     | No platform-only scoring or progression rule                 |
| Lesson 6 and choices         | Complete all choice interactions     | Complete all choice interactions               | Same persisted completion behavior                           |
| Final assessment             | Complete an authorized final run     | Complete an authorized final run               | Same server-owned result/profile contract                    |
| Clara speech                 | Fixed and dynamic prompts            | Speaker and headphones                         | No overlapping speech/recording; cancellation works          |
| Live2D/static Clara          | Dynamic and static browser modes     | Same configured mode online; static startup/offline fallback | No blocked learning flow if Live2D fails                     |
| Game saves                   | Save and resume all three games      | Resume the same profile on Android             | Same checkpoint and revision; no data reset                  |
| Orientation/resize           | Phone, tablet, desktop, zoom         | Rotation, split screen, navigation bars        | No clipped controls or lost active state                     |
| Android Back                 | Browser Back regression              | Gesture and three-button navigation            | Guarded activities do not lose/advance state                 |
| Offline download             | Browser route regression only        | Download, interrupt, update, delete, reboot    | Only fully validated packs activate                          |
| Offline activity             | Not a browser parity requirement     | Airplane mode and cold reopen                  | Practice resumes locally and never updates academic progress |
| Connectivity recovery        | Toggle browser network               | Wi-Fi/mobile data/offline transitions          | Online mode recovers without duplicate submissions           |
| Logout                       | Browser logout and cookie removal    | App logout and secure-store removal            | Server session revoked and local state cleared               |

## 10. Build and configuration references

### Browser development

```powershell
corepack pnpm --filter @readirect/web dev
```

The local Vite server proxies `/api` to Laravel and `/app` to Reverb.

### Browser production build

```powershell
corepack pnpm --filter @readirect/web build
```

A production host must provide an SPA fallback and route `/api` and realtime
traffic to the selected backend topology.

### Android staging debug build

```powershell
.\scripts\mobile-cloudflare-build.ps1 `
  -ApiOrigin "https://staging.readirect.org" `
  -SkipInstall
```

The script verifies that the selected origin returns a JSON ReaDirect API
response, embeds it as `VITE_API_ORIGIN`, builds the web application, runs
Capacitor sync, and produces a debug APK. This command is not a production
release/signing workflow.

### Critical source files

| Concern                          | Source                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Shared routes and platform entry | `apps/web/src/App.tsx`                                                          |
| Shared providers                 | `apps/web/src/app/AppProviders.tsx`                                             |
| API-origin adapter and timeouts  | `apps/web/src/lib/apiUrl.ts`                                                    |
| Native startup/mode selection    | `apps/web/src/features/offline-practice/NativeLearnerEntryPage.tsx`             |
| Connectivity adapter             | `apps/web/src/features/connectivity/ConnectivityProvider.tsx`                   |
| Android lifecycle and Back       | `apps/web/src/app/NativeAppLifecycleProvider.tsx`                               |
| Android orientation policy       | `apps/web/src/app/nativeOrientation.ts`                                         |
| Native secure-session bridge     | `apps/web/src/app/nativeSecureSession.ts`                                       |
| Android encrypted implementation | `apps/web/android/app/src/main/java/com/readirect/app/SecureSessionPlugin.java` |
| Recorder compatibility           | `apps/web/src/features/assessment/useAudioRecorder.ts`                          |
| Learner session behavior         | `apps/web/src/features/learner-auth/learnerApi.ts`                              |
| Clara platform defaults          | `apps/web/src/features/learner-auth/LearnerExperienceProvider.tsx`              |
| Offline Practice boundary        | `apps/web/src/features/offline-practice/README.md`                              |
| Offline pack repository          | `apps/web/src/features/offline-practice/offlinePracticeRepository.ts`           |
| Capacitor configuration          | `apps/web/capacitor.config.ts`                                                  |
| Android permissions              | `apps/web/android/app/src/main/AndroidManifest.xml`                             |
| Android SDK support              | `apps/web/android/variables.gradle`                                             |
| Laravel CORS                     | `apps/api/config/cors.php`                                                      |

## 11. Final compatibility statement

Use this wording in project reports until real-device certification is
complete:

> ReaDirect's browser and Capacitor Android learner applications use one shared
> frontend and the same server-authoritative academic, speech, and persistence
> services. Core online learner routes, experience settings, data, and outcomes
> are compatible across both surfaces. Android intentionally adds native
> startup/navigation, secure storage, connectivity handling, orientation
> control, and non-canonical Offline Practice. Staff
> portals, native iOS, web-PWA offline installation, and full physical-device
> Android certification are outside the currently verified compatibility
> boundary.
