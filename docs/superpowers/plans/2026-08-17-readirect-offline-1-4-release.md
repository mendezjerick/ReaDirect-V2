# ReaDirect Offline 1.4 Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release the offline Android application as upgrade-compatible version 1.4 with the installed name ReaDirect Offline.

**Architecture:** Keep `com.readirect.offline` and its signing lineage stable while changing Android resource labels and monotonically advancing the version. Make release filenames consume the Android version instead of leaving stale hard-coded 1.3 paths, then validate the packaged manifest and signed artifacts.

**Tech Stack:** Android Gradle Plugin, Capacitor, Node.js release scripts, Vitest, Android SDK build tools, Bundletool.

## Global Constraints

- The application ID remains exactly `com.readirect.offline`.
- The installed name is exactly `ReaDirect Offline`.
- Android version is exactly `versionCode 5` and `versionName "1.4"`.
- Existing app-signing and Play upload identities must be reused.
- Learner state schemas, permissions, models, lessons, and the main online application remain unchanged.

---

### Task 1: Protect the release identity contract

**Files:**
- Modify: `apps/web/capacitor.config.ts`
- Modify: `apps/web/tests/OfflineAndroidBoundary.test.ts`
- Modify: `apps/web/android-apk/app/build.gradle`
- Modify: `apps/web/android-apk/app/src/main/res/values/strings.xml`

**Interfaces:**
- Consumes: Android Gradle metadata and string resources.
- Produces: an upgrade-compatible Android package whose manifest resolves to the requested label and version.

- [ ] **Step 1: Write the failing boundary test**

Add assertions that the Android configuration specifies `applicationId "com.readirect.offline"`, `versionCode 5`, `versionName "1.4"`, and that both Android label resources equal `ReaDirect Offline`.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `corepack pnpm --dir apps/web test -- OfflineAndroidBoundary.test.ts`

Expected: FAIL because the current build still reports version 1.3 and the label `ReaDirect`.

- [ ] **Step 3: Implement the minimal Android metadata change**

Set Capacitor `appName`, `app_name`, and `title_activity_main` to `ReaDirect Offline`; set `versionCode 5` and `versionName "1.4"`; leave the package resources unchanged.

- [ ] **Step 4: Run the focused test again**

Run: `corepack pnpm --dir apps/web test -- OfflineAndroidBoundary.test.ts`

Expected: PASS.

### Task 2: Version release filenames consistently

**Files:**
- Create: `apps/web/scripts/offline-android-release.mjs`
- Create: `apps/web/scripts/offline-android-release.d.mts`
- Modify: `apps/web/scripts/sign-offline-android.mjs`
- Modify: `apps/web/scripts/verify-offline-distribution.mjs`
- Create: `apps/web/tests/OfflineAndroidReleaseMetadata.test.ts`

**Interfaces:**
- Consumes: Android `versionName` from `android-apk/app/build.gradle`.
- Produces: versioned `.apk`, `.aab`, and local-testing `.apks` paths for 1.4.

- [ ] **Step 1: Add a failing release-metadata behavior test**

Import `resolveOfflineAndroidRelease` from `scripts/offline-android-release.mjs`, pass a temporary Gradle file containing `versionName "1.4"`, and assert its returned paths end with exactly `ReaDirect-Offline-1.4.apk`, `ReaDirect-Offline-1.4.aab`, and `ReaDirect-Offline-1.4-local-testing.apks`. Add a malformed fixture assertion that rejects when no version name exists.

- [ ] **Step 2: Run the focused test and verify it fails on stale 1.3 paths**

Run: `corepack pnpm --dir apps/web test -- OfflineAndroidReleaseMetadata.test.ts`

Expected: FAIL because `scripts/offline-android-release.mjs` does not exist.

- [ ] **Step 3: Update the signing and Bundletool scripts**

Implement `resolveOfflineAndroidRelease({ gradlePath, outputDirectory })` to read `versionName`, validate it against `^[0-9]+(?:\.[0-9]+)*$`, and return the APK, AAB, and local-testing APKS paths. Import this helper from both release scripts.

- [ ] **Step 4: Run the focused test again**

Run: `corepack pnpm --dir apps/web test -- OfflineAndroidReleaseMetadata.test.ts`

Expected: PASS.

### Task 3: Build and verify release 1.4

**Files:**
- Modify after successful build: `docs/OFFLINE_APK_DISTRIBUTION.md`
- Generate: `output/releases/ReaDirect-Offline-1.4.apk`
- Generate: `output/releases/ReaDirect-Offline-1.4.aab`
- Generate: `output/releases/ReaDirect-Offline-1.4-local-testing.apks`
- Generate: `output/releases/SHA256SUMS.txt`

**Interfaces:**
- Consumes: compiled offline web assets, native ASR libraries, offline ASR/TTS assets, and existing signing material.
- Produces: signed and checksum-recorded 1.4 release artifacts.

- [ ] **Step 1: Run the complete web verification**

Run typecheck, lint, the full Vitest suite, and `build:apk`; require zero failures.

- [ ] **Step 2: Run the complete Android verification**

Run Android JVM tests, Java compilation, both production native builds, Android lint, and all offline asset checks; require `BUILD SUCCESSFUL`.

- [ ] **Step 3: Build and sign the release artifacts**

Run the repository Android release workflow so the APK and AAB use the existing signing material and the 1.4 filenames.

- [ ] **Step 4: Validate the produced artifacts**

Verify APK signature schemes, AAB JAR signature, Bundletool validation, local-testing splits, manifest label/package/version metadata, file sizes, and SHA-256 hashes.

- [ ] **Step 5: Update the distribution handoff**

Replace 1.3 artifact rows and evidence with the observed 1.4 filenames, byte sizes, hashes, and packaged app identity. Do not claim a physical-device test unless one was actually run.

- [ ] **Step 6: Review release scope**

Run `git diff --check`, inspect `git status --short`, and confirm that no signing secrets, credentials, model datasets, unrelated output reports, or user-owned changes were staged or removed.
