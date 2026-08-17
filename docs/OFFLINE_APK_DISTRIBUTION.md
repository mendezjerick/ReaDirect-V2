# Offline APK distribution handoff

## Final artifacts

| Artifact                    |       Bytes | SHA-256                                                            | Distribution            |
| --------------------------- | ----------: | ------------------------------------------------------------------ | ----------------------- |
| `ReaDirect-Offline-1.4.apk` | 830,532,386 | `8BC3BCC043CB1F8372845EAA835D0A695B2E8B24842770D139BB9DA3E54A2E17` | Direct website download |
| `ReaDirect-Offline-1.4.aab` | 775,145,372 | `6C9B8F1CB624A3FF2604BB0B48D47A93609241AB7B842699DA04A22BF4C33CF4` | Google Play upload      |

The files and matching `SHA256SUMS.txt` are generated under
`output/releases/`. `ReaDirect-Offline-1.4-local-testing.apks` is a Bundletool
test archive and must not be distributed to learners.

## Signing identity and custody

Two 4096-bit RSA identities were generated under the Git-ignored directory
`apps/api/storage/app/private/offline-apk-release/`:

- the app-signing identity signs the website APK;
- the independent Play upload identity signs the AAB submitted to Play.

The app-signing certificate SHA-256 fingerprint is
`97:9D:CD:67:A9:4B:60:CE:1D:EA:92:D2:56:4E:BD:05:8C:4C:D1:53:8F:84:61:F9:75:40:08:8B:EA:00:77:6C`.
The Play upload certificate SHA-256 fingerprint is
`13:93:23:17:FB:75:7A:A3:BD:54:14:5E:73:A1:D2:78:59:8B:82:8B:24:2F:34:35:E8:97:A2:2B:E0:F5:9F:49`.

Back up the entire private signing directory immediately in an encrypted,
access-controlled vault. Its `signing-secrets.json` contains recovery passwords
in plain text for portability and is deliberately ignored by Git. Losing the
app-signing key prevents updates to direct APK installations.

For the first Play Console setup, enroll in Play App Signing by importing the
existing app-signing key, then register the separate upload certificate. This
keeps Play-installed and website-installed copies under the same Android update
identity. The Play Console's PEPK export/import step requires the owner's Play
account and is not performed by the local build.

## Reproducible release

```powershell
pnpm release:android
```

This command:

1. creates or safely reuses signing identities without overwriting keys;
2. verifies and packages ASR, TTS, Clara, lesson, and assessment assets;
3. builds the optimized ARM APK and Play install-time asset-pack AAB;
4. zip-aligns and signs the APK and signs the AAB;
5. verifies both signatures and writes SHA-256 checksums;
6. downloads checksum-pinned Bundletool 1.18.3 when needed;
7. validates the AAB and produces a locally testable APK set.

## Verification evidence

- APK Signature Schemes v2 and v3: pass; one ReaDirect app-signing certificate.
- AAB JAR signature: pass; one ReaDirect Play upload certificate.
- Bundletool validation and local-testing split generation: pass.
- Play split set contains `base` and `offline_models` install-time assets.
- Direct APK contains Low, Medium, and High ASR models at their pinned sizes.
- Play base module contains no ASR model; its install-time pack contains all
  three pinned models.
- Both formats contain 586 English/Filipino Ogg TTS cues totaling 22,654,046
  bytes and no WAVs.
- Production native libraries: `arm64-v8a` and `armeabi-v7a`.
- Manifest: microphone permission only, apart from AndroidX's app-scoped
  dynamic-receiver permission; no Internet, network-state, or Wi-Fi permission.
- TypeScript typecheck, 324 web tests, Java compilation, Android JVM tests,
  both production native builds, Android lint, R8, and resource shrinking: pass.
- Dynamic Clara readiness remains stable across the intro's parent rerender;
  the Live2D renderer no longer tears down and restarts after reporting ready.
- After the Diagnostic is completed or skipped, all six lessons are selectable.
  Each lesson stores independent item checkpoints and an interrupted lesson is
  resumable from the Journey page.
- Version 1.4 is installed as **ReaDirect Offline** (`com.readirect.offline`,
  `versionCode` 5) while retaining the existing signing and upgrade identity.
  It reuses main's responsive intro, dashboard, Journey, assessment,
  lesson, recorder, theme, and language-control presentation. APK-only code
  supplies local data and removes login, games, Learn with Clara, and online
  actions.
- All three theme backgrounds, all main learner fonts, the Journey book icon,
  and themed Static Clara stills are integrity-pinned and packaged locally.

## Installed offline smoke test

The x64 workstation cannot emulate an ARM image, so an opt-in x86_64 validation
ABI was built without changing the production artifacts. On an API 35 Automated
Test Device it passed:

- streamed APK installation and cold launch;
- real initialization to 100%;
- Low ASR and Static Clara independent acknowledgements;
- intro and link transition to the main learner dashboard;
- Wi-Fi disabled plus airplane-mode setting enabled;
- force-stop, cold relaunch, and restored dashboard state;
- zero crash-buffer entries during both cold launches.

This smoke test found and fixed the first native learner-state write incorrectly
rejecting JSON revision `0`. Production ARM release artifacts were rebuilt after
the fix.

Physical Low/Medium/High ARM devices are still required for microphone capture,
Whisper inference quality/latency, audible TTS review, Dynamic Clara rendering,
thermal pressure, low storage, rotation, and interruption testing. Play Console
upload/internal-track delivery also remains an external account step.
