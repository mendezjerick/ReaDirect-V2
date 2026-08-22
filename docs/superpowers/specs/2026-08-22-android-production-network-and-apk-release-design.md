# Android Production Network and APK Release Design

**Date:** 22 August 2026  
**Status:** Approved in conversation; pending implementation plan  
**Target release:** ReaDirect 1.0.1 (`versionCode 2`)

## Purpose

Correct the production Android build so every online learner feature reaches the stable ReaDirect API domain, keep Offline Practice available, move staff access to the production web application, and distribute a signed APK through a stable GitHub Release download URL.

The installed Android app is a bundled Capacitor application. It must not load the public landing page as its main application and must not depend on the browser hostname to discover its backend.

## Confirmed Failure

The current Play bundle was built without `VITE_API_ORIGIN`. In a browser, `app.readirect.org` maps automatically to `https://api.readirect.org`. In Capacitor, the bundled application runs from `https://localhost`, so the same fallback does not apply. Relative `/api/...` requests are therefore resolved against the local WebView, which can return the bundled `index.html`. Code expecting JSON then reports `Unexpected token '<'` when it encounters `<!doctype html>`.

Render also omits `https://localhost` from `CORS_ALLOWED_ORIGINS`. Even after correcting the destination URL, the API would reject Android WebView preflight requests until the exact native origin is allowed.

## Product Boundaries

The Android app is learner-focused and supports both online learning and Offline Practice.

- Learners and guests use the bundled Android experience.
- Offline Practice remains a selectable app feature and stores validated practice packs locally.
- Staff access from Android opens `https://app.readirect.org/staff/login` in a browser/custom tab.
- Staff dashboards remain part of the browser application and are not treated as a supported embedded Android workspace.
- The Android startup route remains the Clara intro page, not the public landing page.

## Service Architecture

```text
Android learner app (https://localhost)
  |-- online application requests --> https://api.readirect.org (Render)
  |                                      |-- PostgreSQL --> Supabase
  |                                      |-- ASR --> https://asr.readirect.org
  |                                      `-- TTS --> https://tts.readirect.org
  |-- offline practice -------------> encrypted/local Android storage
  `-- staff access -----------------> https://app.readirect.org/staff/login
```

`https://api.readirect.org` is the permanent public application boundary. Render may later be replaced without updating installed apps by changing the DNS and infrastructure behind that domain.

Supabase database credentials, ASR service tokens, and TTS service tokens remain server-side. Neither the APK nor AAB may contain those credentials or call Supabase, ASR, or TTS directly.

## API Origin Resolution

All application API requests continue through the shared web transport in `apps/web/src/lib/apiUrl.ts`.

Origin resolution follows this precedence:

1. A non-empty explicit `VITE_API_ORIGIN`, used for controlled development or alternate environments.
2. `https://api.readirect.org` when Capacitor reports a native platform.
3. The existing production-host mapping for `readirect.org`, `www.readirect.org`, and `app.readirect.org`.
4. A relative `/api/...` path for local browser development and the Vite proxy.

The native production fallback is deliberately present in source rather than relying only on a build-shell variable. This prevents a forgotten environment variable from silently creating another unusable release. The origin is public configuration, not a secret.

A production mobile build check must prove that the bundled output contains the approved API origin. It must also fail if a database credential or ASR/TTS service token is detected in the packaged web assets.

## CORS Policy

Render's `CORS_ALLOWED_ORIGINS` adds the exact Capacitor Android origin `https://localhost` while retaining the approved ReaDirect web origins.

The API must continue to:

- reject unapproved origins;
- allow the methods and headers required by learner and staff bearer-token requests;
- allow `Authorization`, `Content-Type`, and `X-ReaDirect-Device` headers;
- return credential headers only to explicitly allowed origins;
- avoid wildcard origins.

The deployment is verified with preflight requests for both `https://localhost` and `https://app.readirect.org`, plus a negative preflight from an unapproved origin.

## Authentication and Session Storage

Learner and guest authentication remains available inside Android. Native remembered sessions continue to use the existing Android Keystore-backed `SecureSession` plugin. Browser sessions retain their existing browser storage behavior.

The API continues to authenticate native sessions using bearer tokens. The Android app does not depend on cross-site Laravel session cookies for its primary authenticated requests.

Malformed or non-JSON responses at authentication boundaries must produce a user-facing connection message rather than exposing a JavaScript JSON parser error. Response validation must not interfere with audio, file, or Offline Practice responses that are intentionally non-JSON.

## Staff Browser Handoff

When running natively, staff entry actions open `https://app.readirect.org/staff/login` using Capacitor's supported browser integration. In ordinary browsers, the existing internal staff navigation remains unchanged.

The native handoff must not forward learner or staff tokens in the URL. The staff member signs in independently in the browser. Direct navigation to an embedded staff login route from Android should also hand off to the production browser page so the unsupported embedded flow is not accidentally reintroduced.

Privacy and other external policy links should use the same safe external-navigation helper where appropriate.

## Realtime Behavior

Production Render currently uses `BROADCAST_CONNECTION=log`, so staff realtime is disabled and is not required by the learner app. Moving staff access to the browser also prevents the Android WebView from incorrectly attempting a WebSocket connection to `localhost`.

If production realtime is enabled later, the browser application must receive an explicit public Reverb host from the API rather than deriving it from the page hostname. That future work is outside this hotfix unless testing reveals realtime is currently enabled.

## Offline Practice

Offline Practice remains available in the Play and direct-download builds.

- Pack metadata and assets are downloaded through `https://api.readirect.org` while the learner is online and authenticated.
- Existing path validation, staged downloads, integrity checks, and local commits remain unchanged.
- Already committed packs remain usable when Render, Supabase, ASR, or TTS is unavailable.
- The online/offline selector continues to report service availability without blocking Offline Practice.

## APK Download Button

The public landing page's duplicate `Use in Browser` CTA is replaced with `Download APK`. Its classes, position, and visual design remain unchanged.

The anchor points directly to:

```text
https://github.com/mendezjerick/ReaDirect-V2/releases/latest/download/ReaDirect.apk
```

The existing `Join ReaDirect` action continues to open the browser application. Play Store controls remain independent of the APK download.

The GitHub asset must be named exactly `ReaDirect.apk`, including capitalization. The link uses GitHub's stable latest-release redirect so future APK updates do not require a landing-page code change.

## Versioning and Artifacts

Because `versionCode 1` has already been uploaded to Play, the corrected release uses:

- application ID: `com.readirect.app`
- version name: `1.0.1`
- version code: `2`
- signing key: the existing ReaDirect production key

Two signed artifacts are generated from the same synchronized Android source:

- `ReaDirect.apk` for GitHub Releases and direct browser downloads;
- a versioned AAB for Play Console.

The AAB is not published as a public GitHub Release asset. Both artifacts receive SHA-256 checksums and signature verification. The previous artifacts remain archived rather than overwritten.

## Git and GitHub Release Flow

Source changes are committed to `deployment/playstore` and pushed before publishing artifacts. Render auto-deploys the CORS change from that branch.

After live API verification and signed artifact verification:

1. Create a release tag for `v1.0.1` at the verified source commit.
2. Create the GitHub Release with concise Android hotfix notes.
3. Upload the signed APK using the release asset name `ReaDirect.apk`.
4. Do not upload the keystore, passwords, signing configuration, AAB, or private runtime files.
5. Verify that the stable latest-release URL responds successfully and resolves to the exact uploaded APK.
6. Verify the downloaded file's SHA-256 against the locally signed artifact.

## Testing Strategy

### Unit and component tests

- Native API resolution returns `https://api.readirect.org` when no explicit origin is present.
- Explicit development origins still override the native default.
- Production browser hosts and local browser development preserve their existing behavior.
- Staff entry opens the external production staff URL on native platforms and preserves internal navigation on the web.
- The landing CTA retains its classes and points to the exact latest-release APK URL.
- Authentication presents a readable error for HTML or otherwise invalid API responses.

### API tests

- CORS accepts `https://localhost` for required methods and headers.
- CORS continues to accept approved ReaDirect browser origins.
- CORS rejects an unknown origin.
- An intentionally invalid staff and learner login returns JSON from `api.readirect.org`.

### Build and artifact checks

- Web type checking, focused tests, and the production web build pass.
- Capacitor sync copies the verified build into Android.
- Gradle produces signed release APK and AAB files with version code 2.
- `jarsigner` or the appropriate Android verification tool validates the bundle and APK signatures.
- Packaged assets contain `https://api.readirect.org`.
- Packaged assets do not contain database passwords, Supabase connection strings, ASR/TTS service tokens, or signing secrets.
- The GitHub latest-release URL downloads the same APK bytes as the local verified artifact.

### Device smoke tests

When an Android device or emulator is available, install the release APK and verify:

- Clara intro startup;
- learner login and session restoration;
- guest entry;
- one ordinary Render-backed learner request;
- ASR readiness and one recording submission when the tunnel is online;
- the expected service-unavailable warning when ASR/TTS is offline;
- TTS playback when available;
- Offline Practice pack download and later offline launch;
- staff browser handoff;
- Privacy Policy browser handoff.

If no device or emulator is available, that limitation must be reported explicitly rather than treating browser tests as native verification.

## Deployment Order

1. Implement and test API resolution, CORS, staff handoff, error handling, and the APK CTA.
2. Push the source changes to `deployment/playstore`.
3. Wait for Render to deploy and verify production CORS and JSON responses.
4. Build and synchronize Android version 1.0.1 (`versionCode 2`).
5. Generate and verify the signed APK and AAB with the existing production signing key.
6. Perform available native smoke tests.
7. Create the GitHub `v1.0.1` release and upload `ReaDirect.apk`.
8. Verify the stable download URL and checksum.
9. Rebuild the public web `dist` for the user's manual Cloudflare Pages upload.
10. Provide the updated AAB path, APK URL, checksums, and Play Console upload instructions.

## Out of Scope

- Moving Supabase, ASR, or TTS infrastructure.
- Publishing service credentials to Android.
- Enabling production Reverb realtime.
- Redesigning the landing page or its buttons.
- Removing Offline Practice.
- Publishing the AAB publicly.
- Modifying unrelated web features.
