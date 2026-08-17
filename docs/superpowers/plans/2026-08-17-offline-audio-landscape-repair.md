# Offline Audio and Landscape Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Clara audibly play the packaged bilingual cues in the browser simulator and Android APK, while keeping Skip Diagnostic visible in short landscape viewports.

**Architecture:** The simulator will stream the existing generated OGG package through a development-only Vite route and use a real `HTMLAudioElement`; the production APK will continue using its native catalog but route speech through Android's media stream. The offline Journey footer will remain at the document bottom in portrait and become a safe-area-aware fixed action in short landscape mode.

**Tech Stack:** React, TypeScript, Vite, Vitest, CSS, Capacitor, Android Java `MediaPlayer`.

## Global Constraints

- Do not add TTS files to the web production bundle or duplicate the generated offline package.
- Keep both `en` and `fil-PH` catalog routing.
- Restrict landscape footer behavior to the offline APK Journey.
- Preserve the existing portrait footer position and confirmation dialog.
- Do not generate, sign, commit, or publish an APK in this task.

---

### Task 1: Audible simulator Clara playback

**Files:**
- Modify: `apps/web/tests/OfflineSimulatorRuntime.test.ts`
- Modify: `apps/web/src/apk/simulator/simulatorRuntime.ts`
- Modify: `apps/web/vite.config.ts`

- [ ] Add a failing test proving simulator playback creates the packaged cue URL and resolves only after the audio `ended` event.
- [ ] Run the focused simulator test and confirm it fails because playback is timer-only.
- [ ] Add a development-only Vite route backed by the generated TTS catalog and package directory.
- [ ] Replace simulated-success timing with real `HTMLAudioElement` playback while preserving forced-error and cancellation controls.
- [ ] Run the focused simulator tests and confirm they pass.

### Task 2: Android speech routing

**Files:**
- Modify: `apps/web/tests/OfflineAndroidBoundary.test.ts`
- Modify: `apps/web/android-apk/app/src/main/java/com/readirect/offline/tts/OfflineTtsPlugin.java`

- [ ] Add a failing source-boundary test requiring `USAGE_MEDIA`, full player volume, and no accessibility usage.
- [ ] Run the test and confirm the current accessibility routing fails it.
- [ ] Route Clara through media audio attributes and explicitly set both channels to full volume.
- [ ] Run web boundary tests and Android compile/unit checks.

### Task 3: Landscape Skip Diagnostic visibility

**Files:**
- Modify: `apps/web/tests/OfflineJourneyMenu.test.tsx`
- Modify: `apps/web/src/apk/dashboard/OfflineJourneyMenu.tsx`
- Modify: `apps/web/src/apk/offline-apk.css`

- [ ] Add a failing test requiring an offline-only landscape footer state marker while Diagnostic is unresolved.
- [ ] Run the Journey test and confirm it fails.
- [ ] Add the marker and a short-landscape fixed footer with safe-area spacing and compensating shell padding.
- [ ] Run the focused Journey tests.
- [ ] Verify 852x393 landscape and portrait phone layouts in the visual browser.

### Task 4: Regression verification

**Files:**
- Verify only; no release artifacts.

- [ ] Run focused offline simulator, Journey, TTS, and Android boundary tests.
- [ ] Run the full web test suite, typecheck, lint, and APK boundary build.
- [ ] Run Android unit tests, native compile, Java compile, and lint.
- [ ] Verify the TTS package and run `git diff --check`.
