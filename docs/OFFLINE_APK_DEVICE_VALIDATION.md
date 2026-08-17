# Offline APK device validation

## Automated evidence

The device-validation suite covers the Android and web-runtime behaviors that can be reproduced without physical hardware:

| Scenario                      | Automated evidence                                                                                                                                                  | Result |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Airplane mode boundary        | The production APK manifest contains no Internet, network-state, or Wi-Fi permission; the offline Vite boundary rejects online modules and route tokens.            | Pass   |
| Cold start and app restart    | A second repository instance restores the same private local profile and checkpoint state. Corrupt primary state recovers from the last valid backup.               | Pass   |
| Interrupted initialization    | Failed initialization displays a retry action, and a successful retry resumes the independent ASR and Clara acknowledgements.                                       | Pass   |
| Low-storage write failure     | A simulated Android commit failure rejects the mutation and leaves the last committed learner revision unchanged.                                                   | Pass   |
| Rotation/configuration change | Android handles orientation and screen-size configuration changes without recreating the activity. Activity-runner unmount cleanup cancels recording and stops TTS. | Pass   |
| Recording failure             | A failed transcription displays an actionable error, saves no response, and restores the recorder button for another attempt.                                       | Pass   |
| Device tiers                  | Synthetic capability matrices cover Low, Medium, and High ASR, 32-bit fallback, Android low-RAM mode, available-memory and thermal limits, and Clara GPU limits.    | Pass   |
| Long passage recording        | Web and native layers both accept the required 60-second maximum.                                                                                                   | Pass   |
| Packaged runtime              | Gradle compiles both `arm64-v8a` and `armeabi-v7a`; the APK contains all three ASR models, 293 TTS Ogg files, and the offline web marker.                           | Pass   |

The rebuilt debug APK inspected during device validation was 904,604,664 bytes with SHA-256 `934D6C3861BD89B557D5549FF2FDF61D85C4B26373C187E717000116B120F836`. Its packaged permissions were `RECORD_AUDIO` plus AndroidX's app-scoped dynamic-receiver permission; it contained no network permission. APK Signature Scheme v2 verification also passed for its Android debug certificate. This artifact is retained as the pre-hardening baseline; later release-hardening artifacts are recorded in `OFFLINE_APK_RELEASE_HARDENING.md`.

## Browser visual simulator

Run the APK-only interface without rebuilding or installing Android artifacts:

```powershell
corepack pnpm --dir apps/web dev:apk:simulator
```

Open `http://127.0.0.1:4173`. The simulator uses the real offline APK React interface and a browser-only control panel. It provides Low, Medium, and High device profiles; Static and Dynamic Clara; correct, incorrect, permission-denied, and inference-failure recorder results; successful and failed TTS playback; adjustable operation delay; six progress entry points; persistent local progress; and a simulator reset. Progress presets use the ASR tier and Clara mode currently selected in the panel, so device acknowledgements remain consistent after jumping into the app.

The simulator is isolated from production APK builds. `build:apk` rejects simulator labels and storage keys if they enter the release bundle. It does not emulate native microphone capture, whisper.cpp inference, Android permission dialogs, ABI behavior, storage pressure, thermal pressure, signing, or installation. Those remain part of the real-device matrix below.

## Required real-device matrix

An API 35 x86_64 Automated Test Device was installed for the release slice. An opt-in validation ABI, excluded from production artifacts, verified installation, first-run initialization, the two independent capability acknowledgements, intro-to-dashboard navigation, airplane-mode cold launch, and local dashboard restoration. This also exposed and led to a fix for Capacitor's numeric revision conversion on the first native state write.

The 1.2 low-tier pass ran with Wi-Fi and mobile data disabled and the airplane-mode setting enabled. It selected Low ASR and Static Clara, held the intro at `Tap to continue` with Clara ready for five seconds without a reload, skipped the Diagnostic, displayed all six lessons as Ready, kept the final assessment locked, and restored the same dashboard after a force-stop and cold launch. The Android crash buffer remained empty. This run also exposed and fixed the native learner-store schema validator before release signing.

The production package remains ARM-only, so native ASR/TTS behavior and device-pressure scenarios still require real ARM hardware. The following checks remain hardware-gated and must not be reported as passed:

1. Install on representative Low, Medium, and High-tier phones.
2. Enable airplane mode before first launch; finish onboarding, the Diagnostic, one lesson, and an app restart.
3. Force-stop during ASR initialization, relaunch, and confirm recovery.
4. Rotate during onboarding, TTS playback, recording, ASR inference, and a saved lesson checkpoint.
5. Fill storage to Android's low-storage threshold; verify launch and model loading, then provoke a progress-write failure without losing the previous checkpoint.
6. Sustain passage transcription until the device reports thermal pressure; verify no corrupted checkpoint and record latency/temperature behavior.
7. Deny microphone permission, grant it later, interrupt capture with another audio app or call, and retry.
8. Force-stop after a saved item and after a completed milestone; verify exact local resume state and achievement state.

Record device model, Android version, RAM, ABI, selected ASR tier, selected Clara mode, free storage, test result, and observed ASR latency for every run. Release hardening should begin from these measurements, especially the APK size and thermal behavior.
