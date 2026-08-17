# Offline APK release hardening

This slice hardens the offline Android target without changing its product
boundary. It still has no login, server dependency, games, or Learning with
Clara route. The Diagnostic, Lessons 1-6, final assessment, achievements, reset
flow, three user-facing ASR tiers, and Static/Dynamic Clara capability decision
remain local to the device.

## Package and download size

| Artifact                    |       Bytes | Purpose                                           |
| --------------------------- | ----------: | ------------------------------------------------- |
| Pre-hardening debug APK     | 904,604,664 | Device-validation baseline                        |
| Hardened direct debug APK   | 803,614,944 | Debug-only inspection build                       |
| Hardened direct release APK | 797,056,672 | Pre-signing website candidate                     |
| Play release AAB            | 741,826,266 | Pre-signing Play candidate with install-time pack |

Final signed artifact sizes and checksums are recorded in
`OFFLINE_APK_DISTRIBUTION.md`.
R8 code shrinking and Android resource shrinking are enabled for release builds.

The largest remaining payload is the required ASR set: Low 59,721,011 bytes,
Medium 133,047,977 bytes, and High 574,041,195 bytes. Direct APK builds include
all three in the base package. The Play AAB moves them to the `offline_models`
install-time asset pack, while its base module is approximately 22.2 MB of
compressed entries. Install-time delivery preserves the requirement that all
models are present before the app starts and remain usable offline afterward.

The 293 approved TTS WAV sources total 110,881,372 bytes. Their release package
is mono 32 kHz Ogg Vorbis totaling 9,887,949 bytes (8.9% of the PCM source).
Source and encoded checksums are pinned and checked independently by the
preparation script and Android Gradle build.

## Runtime resilience

- TTS preparation, ASR initialization, and Clara inspection begin concurrently
  after capability selection to reduce avoidable startup serialization.
- Available-memory and Android thermal signals can downgrade ASR or lock Clara
  to Static before expensive initialization begins.
- Backgrounding cancels a recording, stops TTS, and returns the activity to an
  explicit retry state. No captured audio is written to disk.
- Native plugins also stop/cancel active audio from their Android lifecycle
  hooks, covering WebView suspension independently of React cleanup.
- Learner state now uses schema version 2 and migrates version 1 state locally
  through the repository's atomic write path.

## Privacy, permissions, and accessibility

The inspected release manifest contains `RECORD_AUDIO` and AndroidX's
app-scoped dynamic-receiver permission only. It has no Internet, network-state,
or Wi-Fi permission. Cleartext traffic remains disabled.

The lesson runner exposes determinate progress semantics, recording state via
`aria-pressed`, status announcements for feedback, reduced-motion behavior, and
large touch targets inherited from the offline design system.

## Reproducible commands

```powershell
pnpm verify:apk:native
pnpm build:apk:debug
pnpm build:apk:release
pnpm build:aab:play
pnpm release:android
```

Windows build helpers normalize a `JAVA_HOME` ending in `bin` and discover the
conventional Android SDK under `%LOCALAPPDATA%\Android\Sdk` when `ANDROID_HOME`
is not already set.

## Verification completed

- TypeScript typecheck: pass.
- Offline web tests: 59 pass across 15 files.
- ESLint: zero errors; two pre-existing Fast Refresh warnings outside the APK
  implementation.
- Android JVM tests, Java compilation, both native ABIs, and Android lint: pass.
- Direct release APK: three exact-size ASR models, 293 Ogg cues totaling
  9,887,949 bytes, zero WAV cues, and no network permission.
- Play AAB: base module contains no ASR model; the install-time asset pack
  contains all three models; 293 Ogg cues remain in the base runtime.

## Remaining release gates

The final signed APK and upload-signed AAB are generated and binary-verified.
An x86_64 validation build completed onboarding, the intro, dashboard, airplane-
mode cold restart, and local state restoration on an API 35 emulator. Physical
Low/Medium/High ARM device inference, recording, listening QA, low-storage,
sustained thermal, rotation, permission recovery, and interruption cases remain
hardware-gated as described in `OFFLINE_APK_DEVICE_VALIDATION.md`. Play Console
enrollment and internal-track delivery also require the owner's Play account.
