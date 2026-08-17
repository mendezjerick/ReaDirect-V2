# ReaDirect Offline 1.4 Release Design

## Goal

Produce the next offline Android release as version 1.4 and show the installed application name as **ReaDirect Offline**.

## Release identity

- Keep the Android application ID `com.readirect.offline` unchanged.
- Keep the existing app-signing and Play upload identities unchanged.
- Advance Android `versionCode` from `4` to `5` and `versionName` from `1.3` to `1.4`.
- Change Capacitor's `appName` and both Android user-facing label resources, `app_name` and `title_activity_main`, from `ReaDirect` to `ReaDirect Offline`.

Keeping the application and signing identities stable makes 1.4 an upgrade over 1.3, preserving the app-scoped offline learner state. The separate online/main Android application can retain the name **ReaDirect**.

## Distribution artifacts

The release pipeline must emit and verify:

- `output/releases/ReaDirect-Offline-1.4.apk` for direct distribution;
- `output/releases/ReaDirect-Offline-1.4.aab` for Google Play;
- `output/releases/ReaDirect-Offline-1.4-local-testing.apks` for local Bundletool validation only;
- an updated `SHA256SUMS.txt` covering the distributable APK and AAB.

The release scripts must derive or consistently use version 1.4 so they cannot sign or validate stale 1.3 paths.

## Verification

- A regression check must inspect the built Android artifact rather than merely searching source text. It must confirm the displayed app label, package ID, `versionCode`, and `versionName`.
- Existing web, TypeScript, Android JVM/native, lint, asset-integrity, signing, and Bundletool checks must pass.
- The APK and AAB signatures must verify against the existing release identities.

## Scope

This release includes the already-implemented Clara playback and landscape diagnostic-skip fixes. It does not change learner data schemas, package identity, model assets, lesson content, permissions, or the main online app.
