# Android Production Network and APK Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship ReaDirect Android 1.0.1 with reliable production API access, browser-based staff access, a signed AAB and APK, and a landing-page button that downloads the APK directly from the latest GitHub Release.

**Architecture:** The Capacitor learner app resolves all `/api` traffic to `https://api.readirect.org`; Render remains the only public API and continues owning Supabase access plus ASR/TTS proxying. The native app never receives database or speech-service secrets. Android staff entry opens `https://app.readirect.org/staff/login` through the system browser, while browser behavior remains unchanged. The public APK is attached to GitHub Release `v1.0.1` under the stable asset name `ReaDirect.apk`; the Play AAB remains private.

**Tech Stack:** React 19, TypeScript, Vite, Vitest/Testing Library, Capacitor 8, Laravel/PHPUnit, Render Blueprint, Gradle, PowerShell, GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-08-22-android-production-network-and-apk-release-design.md`

## Global Constraints

- Work test-first: add each failing regression test, run it and observe the intended failure, implement the smallest production change, then rerun the focused test.
- Preserve the native intro, learner flows, and Offline Practice. Do not turn the Android app into a remote web wrapper.
- Preserve current web navigation except for the explicitly requested landing-page APK CTA.
- Android API traffic must use only `https://api.readirect.org`; the app must never call Supabase, ASR, or TTS directly.
- Never put `APP_KEY`, database credentials, ASR/TTS service tokens, keystore passwords, or keystore files in source, Gradle files, built web assets, logs, commits, or GitHub Releases.
- Keep the existing Android application ID `com.readirect.app` and signing identity. Increment to `versionCode 2` and `versionName "1.0.1"`.
- Preserve the dirty files in `C:\Users\Lost\Documents\ReaDirect-V2-android-release`; do not reset, discard, or overwrite them. Reconcile them explicitly before release building.
- Publish only the signed APK to GitHub Releases. Do not attach the AAB, keystore, password material, source maps, or private runtime files.
- The direct-download asset name is case-sensitive and must be exactly `ReaDirect.apk`.
- Do not modify the landing-page layout or styling beyond replacing the duplicate `Use in Browser` CTA's label and destination.

---

## Task 1: Make native API-origin selection explicit and testable

**Files:**

- Modify: `apps/web/src/lib/apiUrl.ts`
- Modify: `apps/web/tests/apiUrl.test.ts`

- [ ] **Step 1: Add failing native-origin regression tests**

Add `runtimeApiOrigin` to the test import and add these cases:

```ts
describe("runtimeApiOrigin", () => {
  it("uses the production API for a native Capacitor runtime", () => {
    expect(
      runtimeApiOrigin({
        configuredOrigin: "",
        hostname: "localhost",
        native: true,
      }),
    ).toBe("https://api.readirect.org");
  });

  it("keeps an explicit build origin ahead of runtime defaults", () => {
    expect(
      runtimeApiOrigin({
        configuredOrigin: "https://staging.readirect.org/",
        hostname: "localhost",
        native: true,
      }),
    ).toBe("https://staging.readirect.org");
  });

  it("preserves same-origin local browser requests", () => {
    expect(
      runtimeApiOrigin({
        configuredOrigin: "",
        hostname: "localhost",
        native: false,
      }),
    ).toBe("");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
corepack pnpm --filter @readirect/web test -- apiUrl.test.ts
```

Expected: FAIL because `runtimeApiOrigin` is not exported.

- [ ] **Step 3: Implement the runtime selector**

Import Capacitor and the production origin constant, then add a pure selector:

```ts
import { Capacitor } from "@capacitor/core";
import {
  PRODUCTION_API_ORIGIN,
  productionApiOriginForHostname,
} from "../deployment/productionDomains";

interface RuntimeApiOriginInput {
  configuredOrigin: string;
  hostname: string;
  native: boolean;
}

export function runtimeApiOrigin({
  configuredOrigin,
  hostname,
  native,
}: RuntimeApiOriginInput): string {
  const configured = normalizeOrigin(configuredOrigin);
  if (configured) return configured;
  if (native) return PRODUCTION_API_ORIGIN;
  return productionApiOriginForHostname(hostname);
}
```

Change `apiUrl` to call the selector:

```ts
export function apiUrl(path: string): string {
  const runtimeOrigin = runtimeApiOrigin({
    configuredOrigin: import.meta.env.VITE_API_ORIGIN ?? "",
    hostname: globalThis.location?.hostname ?? "",
    native: Capacitor.isNativePlatform(),
  });

  return resolveApiUrl(path, runtimeOrigin);
}
```

This runtime fallback fixes packaged builds even if a developer forgets the environment variable. Release scripts will still set `VITE_API_ORIGIN` explicitly as defense in depth.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```powershell
corepack pnpm --filter @readirect/web test -- apiUrl.test.ts
```

Expected: PASS, including the existing timeout, guest interception, and path-preservation tests.

- [ ] **Step 5: Commit the API-origin fix**

```powershell
git add apps/web/src/lib/apiUrl.ts apps/web/tests/apiUrl.test.ts
git commit -m "fix(web): route native requests to production API"
```

---

## Task 2: Keep the Render CORS contract aligned with Capacitor

**Files:**

- Modify: `render.yaml`
- Create: `apps/api/tests/Feature/RenderBlueprintConfigurationTest.php`

- [ ] **Step 1: Add a failing deployment-contract test**

Create a test that reads the repository-root Blueprint and asserts the exact native origin is present without allowing arbitrary wildcard origins:

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;

final class RenderBlueprintConfigurationTest extends TestCase
{
    public function test_production_cors_includes_the_capacitor_android_origin(): void
    {
        $blueprint = file_get_contents(base_path('../../render.yaml'));

        self::assertIsString($blueprint);
        self::assertStringContainsString(
            'value: https://app.readirect.org,https://readirect.org,https://www.readirect.org,https://readirect-production.pages.dev,https://localhost',
            $blueprint,
        );
        self::assertStringNotContainsString('CORS_ALLOWED_ORIGINS' . PHP_EOL . '        value: *', $blueprint);
    }
}
```

- [ ] **Step 2: Run the focused API test and confirm RED**

Run:

```powershell
Push-Location apps/api
php artisan test --filter=RenderBlueprintConfigurationTest
Pop-Location
```

Expected: FAIL because the Render Blueprint currently omits `https://localhost`.

- [ ] **Step 3: Add the exact Capacitor origin**

Change only the `CORS_ALLOWED_ORIGINS` value in `render.yaml`:

```yaml
      - key: CORS_ALLOWED_ORIGINS
        value: https://app.readirect.org,https://readirect.org,https://www.readirect.org,https://readirect-production.pages.dev,https://localhost
```

Do not use `*`, do not add `http://localhost`, and do not expose ASR/TTS hostnames as browser origins.

- [ ] **Step 4: Run CORS tests and confirm GREEN**

Run:

```powershell
Push-Location apps/api
php artisan test --filter=CorsConfigurationTest
php artisan test --filter=RenderBlueprintConfigurationTest
Pop-Location
```

Expected: both suites PASS.

- [ ] **Step 5: Commit the deployment contract**

```powershell
git add render.yaml apps/api/tests/Feature/RenderBlueprintConfigurationTest.php
git commit -m "fix(api): allow production Android origin"
```

---

## Task 3: Send Android staff access to the system browser

**Files:**

- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/src/features/staff-auth/staffPortal.ts`
- Create: `apps/web/src/features/staff-auth/NativeStaffLoginRedirect.tsx`
- Create: `apps/web/tests/staffPortal.test.ts`
- Create: `apps/web/tests/NativeStaffLoginRedirect.test.tsx`
- Modify: `apps/web/src/features/home/HomePage.tsx`
- Modify: `apps/web/tests/HomePage.test.tsx`
- Modify: `apps/web/src/App.tsx`
- Generated by sync: `apps/web/android/capacitor.settings.gradle`
- Generated by sync: `apps/web/android/app/capacitor.build.gradle`

- [ ] **Step 1: Install the official Capacitor Browser plugin**

Run:

```powershell
corepack pnpm --filter @readirect/web add @capacitor/browser@8.0.4
```

Expected: package manifest and lockfile change; no application behavior changes yet.

- [ ] **Step 2: Add failing unit tests for the browser handoff**

Define the fixed URL and a small adapter that is easy to mock:

```ts
export const STAFF_PORTAL_URL = "https://app.readirect.org/staff/login";

export interface StaffPortalRuntime {
  native: boolean;
  openNativeBrowser(url: string): Promise<void>;
  navigate(path: string): void;
}

export async function openStaffPortal(runtime: StaffPortalRuntime): Promise<void> {
  if (runtime.native) {
    await runtime.openNativeBrowser(STAFF_PORTAL_URL);
    return;
  }
  runtime.navigate("/staff/login");
}
```

In `staffPortal.test.ts`, assert native opens the exact HTTPS URL and never calls SPA navigation; assert web navigates to `/staff/login` and never opens the native browser.

- [ ] **Step 3: Run the helper test and confirm RED**

```powershell
corepack pnpm --filter @readirect/web test -- staffPortal.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 4: Implement the helper and native route redirect**

Implement `staffPortal.ts` with the interface above. In `NativeStaffLoginRedirect.tsx`, use `Capacitor.isNativePlatform()` and `Browser.open({ url: STAFF_PORTAL_URL })`; render `StaffLoginPage` unchanged for web. While the native browser is opening, render the existing route-loading treatment and return the native SPA to `/home` with `replace: true`, so Back does not reveal an embedded credential form.

The route wrapper must catch `Browser.open` rejection and present a concise actionable message with a Retry button instead of leaving a blank screen.

- [ ] **Step 5: Add failing component tests for both entry paths**

Update `HomePage.test.tsx` with mocked `@capacitor/core` and `@capacitor/browser` tests:

- native `Staff login` waits for `BUTTON_PRESS_COMMIT_MS`, calls `Browser.open` with `https://app.readirect.org/staff/login`, and does not render the internal route;
- web `Staff login` preserves the existing SPA navigation behavior.

Add `NativeStaffLoginRedirect.test.tsx` cases:

- native direct navigation opens the browser and returns to `/home`;
- web direct navigation renders the staff login page;
- browser-open rejection shows Retry and succeeds after a second attempt.

- [ ] **Step 6: Run the component tests and confirm RED**

```powershell
corepack pnpm --filter @readirect/web test -- HomePage.test.tsx NativeStaffLoginRedirect.test.tsx
```

Expected: new native cases FAIL before the components use the helper.

- [ ] **Step 7: Wire Home and the route to the helper**

In `HomePage.tsx`, have the button commit call `openStaffPortal` with the Capacitor runtime, `Browser.open`, and React Router `navigate`. In `App.tsx`, replace only this route:

```tsx
<Route path="/staff/login" element={<NativeStaffLoginRedirect />} />
```

All protected staff routes can keep redirecting to `/staff/login`; the wrapper ensures native clients hand off externally.

- [ ] **Step 8: Synchronize and verify the plugin**

Run:

```powershell
corepack pnpm --filter @readirect/web exec cap sync android
corepack pnpm --filter @readirect/web test -- staffPortal.test.ts HomePage.test.tsx NativeStaffLoginRedirect.test.tsx
corepack pnpm --filter @readirect/web typecheck
```

Expected: tests and typecheck PASS; generated Gradle files register `capacitor-browser` without removing the existing filesystem, file-transfer, network, app, or secure-session integrations.

- [ ] **Step 9: Commit the staff handoff**

```powershell
git add apps/web/package.json pnpm-lock.yaml apps/web/src/features/staff-auth/staffPortal.ts apps/web/src/features/staff-auth/NativeStaffLoginRedirect.tsx apps/web/src/features/home/HomePage.tsx apps/web/src/App.tsx apps/web/tests/staffPortal.test.ts apps/web/tests/NativeStaffLoginRedirect.test.tsx apps/web/tests/HomePage.test.tsx apps/web/android/capacitor.settings.gradle apps/web/android/app/capacitor.build.gradle
git commit -m "feat(web): open staff portal from Android"
```

---

## Task 4: Replace the duplicate landing CTA with the direct APK download

**Files:**

- Modify: `apps/web/src/features/landing/BrowserLandingPage.tsx`
- Modify: `apps/web/tests/BrowserLandingPage.test.tsx`

- [ ] **Step 1: Change the landing test first**

Replace the `Use in Browser` expectations with:

```ts
const apkLink = screen.getByRole("link", { name: "Download APK" });

expect(apkLink).toHaveAttribute(
  "href",
  "https://github.com/mendezjerick/ReaDirect-V2/releases/latest/download/ReaDirect.apk",
);
expect(apkLink).toHaveClass("landing-button--mist");
expect(apkLink).toHaveAttribute("target", "_blank");
expect(apkLink).toHaveAttribute("rel", "noreferrer");
expect(screen.queryByRole("link", { name: /use in browser/i })).not.toBeInTheDocument();
```

Retain the separate assertion that every Join link still targets `/?entry=tap`.

- [ ] **Step 2: Run the focused test and confirm RED**

```powershell
corepack pnpm --filter @readirect/web test -- BrowserLandingPage.test.tsx
```

Expected: FAIL because the old CTA still says `Use in Browser` and points to the web app.

- [ ] **Step 3: Replace only the duplicate CTA**

Add:

```ts
const APK_DOWNLOAD_URL =
  "https://github.com/mendezjerick/ReaDirect-V2/releases/latest/download/ReaDirect.apk";
```

Keep the existing `<a>` position, classes, `target`, and `rel`, changing only its `href` and text:

```tsx
<a
  className="landing-button landing-button--mist"
  href={APK_DOWNLOAD_URL}
  target="_blank"
  rel="noreferrer"
>
  Download APK
</a>
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

```powershell
corepack pnpm --filter @readirect/web test -- BrowserLandingPage.test.tsx
```

- [ ] **Step 5: Commit the landing change**

```powershell
git add apps/web/src/features/landing/BrowserLandingPage.tsx apps/web/tests/BrowserLandingPage.test.tsx
git commit -m "feat(web): link APK download to latest release"
```

---

## Task 5: Replace raw JSON parser failures at authentication boundaries

**Files:**

- Create: `apps/web/src/lib/apiResponse.ts`
- Create: `apps/web/tests/apiResponse.test.ts`
- Modify: `apps/web/src/features/learner-auth/learnerApi.ts`
- Modify: `apps/web/src/features/staff-auth/staffApi.ts`
- Modify: `apps/web/tests/LearnerLoginPage.test.tsx`
- Modify: `apps/web/tests/StaffLoginPage.test.tsx`

- [ ] **Step 1: Add failing response-parser tests**

Create a helper with this contract:

```ts
export const UNEXPECTED_API_RESPONSE_MESSAGE =
  "ReaDirect received an unexpected server response. Please try again.";

export async function readApiJson(response: Response): Promise<unknown>;
```

Test that it:

- returns parsed data for `application/json` and `application/problem+json`;
- throws `UNEXPECTED_API_RESPONSE_MESSAGE` for HTML responses;
- throws the same message for malformed JSON even when the content type claims JSON.

- [ ] **Step 2: Run the parser test and confirm RED**

```powershell
corepack pnpm --filter @readirect/web test -- apiResponse.test.ts
```

Expected: FAIL because `apiResponse.ts` does not exist.

- [ ] **Step 3: Implement the defensive parser**

Implement content-type validation and a `try/catch` around `response.json()`. Do not include response HTML, URLs containing credentials, or server stack traces in user-visible errors.

- [ ] **Step 4: Add failing login-boundary tests**

In learner and staff login tests, mock a `200 text/html` response containing `<!doctype html>` and assert the UI displays `UNEXPECTED_API_RESPONSE_MESSAGE`, not `Unexpected token '<'` and not the HTML body.

Also retain existing tests for validation errors, network failures, valid sessions, Remember me, and button commit timing.

- [ ] **Step 5: Run the authentication tests and confirm RED**

```powershell
corepack pnpm --filter @readirect/web test -- LearnerLoginPage.test.tsx StaffLoginPage.test.tsx
```

Expected: new HTML-response cases FAIL with the raw JSON parser error.

- [ ] **Step 6: Apply the helper only at authentication/session boundaries**

Use `readApiJson` before Zod parsing in:

- `loginLearner`
- `restoreLearnerSession`
- `getLearnerSession`
- `loginStaff`
- `restoreStaffSession`
- `getCurrentStaffSession`

Keep `readApiError` for non-2xx error bodies. Do not perform a broad unrelated rewrite of every API call in this hotfix.

- [ ] **Step 7: Run focused and full web verification**

```powershell
corepack pnpm --filter @readirect/web test -- apiResponse.test.ts LearnerLoginPage.test.tsx StaffLoginPage.test.tsx
corepack pnpm --filter @readirect/web test
corepack pnpm --filter @readirect/web typecheck
corepack pnpm --filter @readirect/web lint
```

Expected: all commands PASS.

- [ ] **Step 8: Commit the response hardening**

```powershell
git add apps/web/src/lib/apiResponse.ts apps/web/tests/apiResponse.test.ts apps/web/src/features/learner-auth/learnerApi.ts apps/web/src/features/staff-auth/staffApi.ts apps/web/tests/LearnerLoginPage.test.tsx apps/web/tests/StaffLoginPage.test.tsx
git commit -m "fix(web): handle invalid authentication responses"
```

---

## Task 6: Make Android 1.0.1 release builds repeatable and secret-safe

**Files:**

- Modify: `apps/web/android/app/build.gradle`
- Create: `scripts/build-android-production-release.ps1`
- Create: `scripts/verify-android-production-release.ps1`
- Create: `apps/web/tests/androidReleaseConfiguration.test.ts`
- Verify only: `.gitignore`

- [ ] **Step 1: Add failing static release-configuration tests**

Create a Vitest test that reads `android/app/build.gradle` and the release script. Assert:

- `versionCode 2` and `versionName "1.0.1"`;
- signing values come from environment variables, not literals;
- a release task fails when `READIRECT_KEYSTORE_PATH`, `READIRECT_KEY_ALIAS`, `READIRECT_KEYSTORE_PASSWORD`, or `READIRECT_KEY_PASSWORD` is missing;
- the script fixes `VITE_API_ORIGIN` to `https://api.readirect.org`;
- outputs are `ReaDirect-1.0.1.aab` and `ReaDirect.apk`;
- the script never accepts or exports `APP_KEY`, `DB_PASSWORD`, `ASR_SERVICE_TOKEN`, or `TTS_SERVICE_TOKEN`.

- [ ] **Step 2: Run the static test and confirm RED**

```powershell
corepack pnpm --filter @readirect/web test -- androidReleaseConfiguration.test.ts
```

Expected: FAIL because the version remains 1/1.0 and the release scripts do not exist.

- [ ] **Step 3: Update Gradle version and signing configuration**

Set:

```groovy
versionCode 2
versionName "1.0.1"
```

Configure `signingConfigs.release` exclusively from the four `READIRECT_*` environment variables. Validate the resolved keystore file and all values only when a release Gradle task is requested. Never print password values. Attach the signing config only to `buildTypes.release`.

- [ ] **Step 4: Create the production release build script**

`scripts/build-android-production-release.ps1` must:

1. Require a validated absolute `-KeystorePath` and `-OutputDirectory`.
2. Default `-KeyAlias` to `readirect-release`.
3. prompt once with `Read-Host -AsSecureString` and safely marshal the password only for the child Gradle process;
4. set `VITE_API_ORIGIN=https://api.readirect.org` internally, not from arbitrary caller input;
5. run `corepack pnpm install --frozen-lockfile`, the web test/typecheck/build gates, `cap sync android`, and `gradlew.bat clean bundleRelease assembleRelease`;
6. copy the signed bundle to `ReaDirect-1.0.1.aab` and the signed universal APK to `ReaDirect.apk` in the explicit output directory;
7. call the verification script;
8. clear password and signing environment variables in a `finally` block.

If the key password differs from the store password, support a second secure prompt via `-PromptForSeparateKeyPassword`; otherwise use the one entered password for both without storing it.

- [ ] **Step 5: Create the artifact verifier**

`scripts/verify-android-production-release.ps1` must:

- require existing AAB and APK paths under the explicit output directory;
- run `apksigner verify --verbose --print-certs` on the APK;
- run `jarsigner -verify -strict -certs` on the AAB;
- inspect the APK with `apkanalyzer manifest version-code`, `version-name`, and `application-id`;
- inspect packaged web assets and assert `https://api.readirect.org` is present;
- assert the packaged web assets do not contain the literal configuration names `APP_KEY`, `DB_PASSWORD`, `ASR_SERVICE_TOKEN`, `TTS_SERVICE_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, or direct `https://asr.readirect.org` / `https://tts.readirect.org` URLs;
- print SHA-256 hashes, file sizes, package ID, version code/name, and certificate digest, but no secret inputs.

- [ ] **Step 6: Run static tests and a non-secret build gate**

```powershell
corepack pnpm --filter @readirect/web test -- androidReleaseConfiguration.test.ts
corepack pnpm --filter @readirect/web typecheck
corepack pnpm --filter @readirect/web build
```

Expected: PASS.

- [ ] **Step 7: Verify ignore rules**

Run:

```powershell
Test-Path -LiteralPath 'C:\Users\Lost\Documents\ReaDirect-Private\android-signing\readirect-production.jks'
git status --short
```

The first command must confirm the expected keystore exists outside the repository, and it must not appear in Git status. Confirm generated local secrets such as `local.properties` and private runtime files remain ignored. Do not add an ignore rule that hides release source/configuration files.

- [ ] **Step 8: Commit the release configuration**

```powershell
git add apps/web/android/app/build.gradle scripts/build-android-production-release.ps1 scripts/verify-android-production-release.ps1 apps/web/tests/androidReleaseConfiguration.test.ts
git commit -m "build(android): prepare signed 1.0.1 release"
```

---

## Task 7: Integrate safely with the existing Android release worktree

**Worktrees:**

- Source branch: `C:\Users\Lost\Documents\ReaDirect-V2` on `deployment/playstore`
- Build worktree: `C:\Users\Lost\Documents\ReaDirect-V2-android-release` on `build/android-1.0-beta`

- [ ] **Step 1: Inspect both worktrees before modifying the build worktree**

```powershell
git -C C:\Users\Lost\Documents\ReaDirect-V2 status --short
git -C C:\Users\Lost\Documents\ReaDirect-V2-android-release status --short
git -C C:\Users\Lost\Documents\ReaDirect-V2-android-release diff -- apps/web/android/app/build.gradle apps/web/android/app/capacitor.build.gradle apps/web/android/capacitor.settings.gradle
```

Expected build-worktree changes are the prior environment-backed signing configuration and generated Capacitor Gradle registration. If any unrelated edits appear, stop before integration and preserve them separately.

- [ ] **Step 2: Preserve the prior build-worktree changes as a commit**

Only after confirming they match the expected signing/generated changes:

```powershell
git -C C:\Users\Lost\Documents\ReaDirect-V2-android-release add apps/web/android/app/build.gradle apps/web/android/app/capacitor.build.gradle apps/web/android/capacitor.settings.gradle
git -C C:\Users\Lost\Documents\ReaDirect-V2-android-release commit -m "build(android): preserve release signing setup"
```

- [ ] **Step 3: Push the tested production branch**

```powershell
git -C C:\Users\Lost\Documents\ReaDirect-V2 push origin deployment/playstore
```

This push triggers Render Blueprint deployment, including the exact native CORS origin.

- [ ] **Step 4: Integrate production into the build branch without discarding history**

```powershell
git -C C:\Users\Lost\Documents\ReaDirect-V2-android-release fetch origin
git -C C:\Users\Lost\Documents\ReaDirect-V2-android-release merge --no-ff origin/deployment/playstore
```

If `apps/web/android/app/build.gradle` conflicts, resolve it to retain environment-backed signing plus `versionCode 2` and `versionName "1.0.1"`. Regenerate Capacitor plugin files with `cap sync android`; do not hand-merge generated plugin lists.

- [ ] **Step 5: Re-run the build-branch verification**

```powershell
Push-Location C:\Users\Lost\Documents\ReaDirect-V2-android-release
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @readirect/web test
corepack pnpm --filter @readirect/web typecheck
$env:VITE_API_ORIGIN = 'https://api.readirect.org'
corepack pnpm --filter @readirect/web exec cap sync android
Remove-Item Env:\VITE_API_ORIGIN -ErrorAction SilentlyContinue
Pop-Location
```

Expected: PASS; the Browser plugin appears in the generated Android project and Offline Practice plugins remain registered.

---

## Task 8: Verify Render before creating immutable mobile artifacts

**Remote service:** `https://api.readirect.org`

- [ ] **Step 1: Wait for the pushed Render deployment to become live**

Use the Render dashboard/logs and wait for the new commit to report a healthy service. Do not build a release against an unverified backend contract.

- [ ] **Step 2: Verify API JSON and exact CORS behavior**

```powershell
$headers = @{
  Origin = 'https://localhost'
  'Access-Control-Request-Method' = 'POST'
  'Access-Control-Request-Headers' = 'Authorization, Content-Type'
}
$cors = Invoke-WebRequest -Method Options -Uri 'https://api.readirect.org/api/learners/login' -Headers $headers
$intro = Invoke-WebRequest -Uri 'https://api.readirect.org/api/experience/intro/settings' -Headers @{ Accept = 'application/json' }
$cors.Headers['Access-Control-Allow-Origin']
$intro.Headers['Content-Type']
```

Expected:

- CORS response allows exactly `https://localhost`;
- intro endpoint returns JSON, not HTML;
- no redirect to the landing site;
- `https://untrusted.example.test` still receives no allow-origin header.

- [ ] **Step 3: Verify the stable API boundary**

Confirm browser-accessible API requests go to `api.readirect.org`, while ASR/TTS service addresses and Supabase credentials are visible only in Render server configuration. This proves future migration from the PC tunnel to a VM can happen behind Render without rebuilding the Android app.

---

## Task 9: Build, sign, and smoke-test Android 1.0.1

**Artifact directory:** `C:\Users\Lost\Documents\ReaDirect-Releases\android\1.0.1`

- [ ] **Step 1: Run the signed release builder from the build worktree**

```powershell
Push-Location C:\Users\Lost\Documents\ReaDirect-V2-android-release
.\scripts\build-android-production-release.ps1 `
  -KeystorePath 'C:\Users\Lost\Documents\ReaDirect-Private\android-signing\readirect-production.jks' `
  -OutputDirectory 'C:\Users\Lost\Documents\ReaDirect-Releases\android\1.0.1'
Pop-Location
```

Enter the signing password only at the secure prompt. Expected outputs:

- `ReaDirect-1.0.1.aab`
- `ReaDirect.apk`
- printed SHA-256 values and verified package metadata.

- [ ] **Step 2: Confirm upgrade compatibility before Play upload**

Compare the new certificate SHA-256 with the previously accepted 1.0 artifact. It must be the same signing identity. Confirm package ID `com.readirect.app`, version code `2`, and version name `1.0.1`.

- [ ] **Step 3: Install the release APK on a physical Android device**

```powershell
adb install -r C:\Users\Lost\Documents\ReaDirect-Releases\android\1.0.1\ReaDirect.apk
```

Expected: upgrades the Play-installed/test build rather than reporting a signature mismatch.

- [ ] **Step 4: Execute the Android smoke-test matrix**

On the device, verify:

1. cold launch opens the Clara intro, not the landing page;
2. Tap to continue reaches Home;
3. learner login succeeds and no JSON/HTML parser text appears;
4. guest entry works;
5. assessment and lesson readiness correctly report the ASR/TTS tunnel state;
6. a recording submits when ASR is online and presents a usable unavailable state when it is offline;
7. Clara speech plays when TTS is online and reports unavailable when it is offline;
8. Offline Practice remains selectable and works after its pack is downloaded;
9. Staff login opens the external browser at `https://app.readirect.org/staff/login` and the native app does not render the staff credential form;
10. Back and resume behavior does not strand the app on a blank route.

- [ ] **Step 5: Record final artifact facts**

Record the APK/AAB SHA-256 values, sizes, app ID, version, and certificate SHA-256 in the handoff message. Never record signing passwords.

---

## Task 10: Publish the APK and deploy the updated landing dist

**GitHub repository:** `mendezjerick/ReaDirect-V2`

- [ ] **Step 1: Create the GitHub Release with only the public APK**

```powershell
gh release create v1.0.1 `
  'C:\Users\Lost\Documents\ReaDirect-Releases\android\1.0.1\ReaDirect.apk' `
  --repo mendezjerick/ReaDirect-V2 `
  --target deployment/playstore `
  --title 'ReaDirect 1.0.1' `
  --notes "ReaDirect Android 1.0.1 fixes production API connectivity, opens staff access in the browser, and retains online learning plus Offline Practice."
```

Do not upload `ReaDirect-1.0.1.aab`.

- [ ] **Step 2: Verify the stable download URL on desktop and Android**

```powershell
$response = Invoke-WebRequest -Method Head -MaximumRedirection 10 -Uri 'https://github.com/mendezjerick/ReaDirect-V2/releases/latest/download/ReaDirect.apk'
$response.StatusCode
$response.Headers['Content-Type']
```

Expected: final status `200` and an APK/binary content type. On Android Chrome, click the landing button and confirm the download begins without showing the GitHub repository page.

- [ ] **Step 3: Build the production web dist from the same tested commit**

```powershell
Push-Location C:\Users\Lost\Documents\ReaDirect-V2
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @readirect/web test
corepack pnpm --filter @readirect/web build
Pop-Location
```

Expected: `apps/web/dist` contains the updated landing CTA and the web app still uses `https://api.readirect.org` on production hostnames.

- [ ] **Step 4: Upload the contents of `apps/web/dist` to the existing Cloudflare Pages project**

Use the same manual Direct Upload flow already proven for `readirect-production.pages.dev`. Upload the contents produced by the final tested commit. Do not upload a parent directory that would serve `/dist/index.html` instead of `/index.html`.

- [ ] **Step 5: Verify public web behavior**

Check:

- `https://readirect.org` loads the informational landing page;
- `Download APK` resolves through the exact GitHub latest-release asset URL and downloads `ReaDirect.apk`;
- `Join ReaDirect` still opens `https://app.readirect.org/?entry=tap`;
- `https://app.readirect.org` still opens the Clara intro/web app;
- browser staff login still renders inside the browser;
- live learner login and an ASR/TTS readiness check reach `https://api.readirect.org`.

- [ ] **Step 6: Supply the AAB privately for Play Console**

Send `ReaDirect-1.0.1.aab` plus its SHA-256 to the coworker through a private file-transfer channel. Instruct them to upload it as the next closed-testing release. Do not send the keystore or password unless ownership transfer is explicitly required and a separate secure credential channel is used.

---

## Final Verification Gate

- [ ] Run the complete automated gate:

```powershell
corepack pnpm --filter @readirect/web test
corepack pnpm --filter @readirect/web typecheck
corepack pnpm --filter @readirect/web lint
corepack pnpm --filter @readirect/web build
Push-Location apps/api
php artisan test
Pop-Location
git status --short
```

- [ ] Confirm `git status --short` contains no unexpected source or secret files.
- [ ] Confirm all implementation commits are pushed to `origin/deployment/playstore`.
- [ ] Confirm Render is healthy on the pushed commit and accepts `Origin: https://localhost`.
- [ ] Confirm the GitHub Release exposes only `ReaDirect.apk` and the stable latest-download URL works.
- [ ] Confirm the AAB and APK share package ID, version, and signing identity, and record both SHA-256 values.
- [ ] Confirm physical-device smoke tests cover online learner login, ASR, TTS, Offline Practice, external staff access, Back/resume behavior, and upgrade installation.
