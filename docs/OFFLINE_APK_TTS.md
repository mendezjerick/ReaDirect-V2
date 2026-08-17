# Offline APK pre-generated speech

The offline Android target packages Ma'am Clara's fixed SH voice lines as APK
assets. Playback uses Android's local `MediaPlayer`; it does not call the API,
request a token, or require a network permission.

## Catalog boundary

- Source WAVs: `apps/api/storage/app/private/tts/catalog/sh`
- Pinned catalog: `services/tts/offline_catalog/artifacts.json`
- Generated package: `services/tts/storage/offline-apk-package`
- Verified conversion cache: `services/tts/storage/offline-apk-vorbis-cache`
- Android asset paths: `tts/catalog.json` and `tts/audio/**`
- Included: lesson intro, assessments, completion lines, and Lessons 1-6
- Excluded: all `learn-with-clara/**` lines because that feature is outside the
  offline APK product boundary

The approved source catalog contains 293 mono, 48 kHz, 16-bit PCM WAVs totaling
110,881,372 bytes. The release package converts them to mono, 32 kHz Ogg Vorbis
at quality 3: 9,887,949 bytes, or 8.9% of the PCM source size. Every runtime
entry pins its logical speech key, source and release byte sizes, duration,
encoding parameters, and both source and release SHA-256 checksums. Filenames
are globally unique and become the runtime speech keys.

## Commands

```powershell
pnpm prepare:apk:tts
pnpm verify:apk:tts
pnpm verify:apk:native
```

`prepare:apk:tts` verifies the tracked source against the pinned catalog,
converts changed sources with FFmpeg, verifies the conversion cache, and stages
the generated release package. Both generated directories are ignored by Git.
Android's Gradle pre-build independently verifies every packaged Ogg file and
its checksum. Ogg assets remain uncompressed in the Android package so native
playback can open them by file descriptor without extracting them to storage.

When an approved source WAV changes, review it first and explicitly refresh the
pin set:

```powershell
node services/tts/offline_catalog/prepare-package.mjs --refresh-manifest
```

## Native contract

The Capacitor plugin is registered as `OfflineTts` and exposes `prepare`,
`play`, `stop`, `getRuntimeState`, and `shutdown`. `play` resolves after the line
finishes and is rejected with `TTS_INTERRUPTED` when a new line or explicit stop
replaces it. Unknown or unsafe keys never reach the Android asset manager.

The APK-only TypeScript entry point is
`apps/web/src/apk/native/offlineTtsBridge.ts`. The offline journey uses this
bridge for its pre-generated prompts and always stops playback when the app is
backgrounded or the activity is left.
