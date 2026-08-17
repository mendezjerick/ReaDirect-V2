# Offline APK pre-generated speech

The offline Android target packages Ma'am Clara's fixed English and Filipino
SH voice lines as APK assets. Playback uses Android's local `MediaPlayer`; it
does not call the API, request a token, or require a network permission.

## Catalog boundary

- English WAVs: `apps/api/storage/app/private/tts/catalog/sh`
- Approved Filipino WAVs: `apps/api/storage/app/private/tts/staging/fil-PH-v1/sh-fil`
- Pinned catalogs: `services/tts/offline_catalog/artifacts.json` and
  `services/tts/offline_catalog/artifacts.fil-PH.json`
- Generated package: `services/tts/storage/offline-apk-package`
- Verified conversion cache: `services/tts/storage/offline-apk-vorbis-cache`
- Android asset paths: `tts/catalog.json`, `tts/audio/en/**`, and
  `tts/audio/fil-PH/**`
- Included: lesson intro, assessments, completion lines, and Lessons 1-6
- Excluded: all `learn-with-clara/**` lines because that feature is outside the
  offline APK product boundary

Each language contains the same 293 Journey-only keys. Together the approved
sources contain 586 mono, 48 kHz, 16-bit PCM WAVs totaling 252,989,624 bytes.
The release package converts them to mono, 32 kHz Ogg Vorbis at quality 3:
22,654,046 bytes, or 9.0% of the PCM source size. Every runtime entry pins its
language, logical speech key, source and release byte sizes, duration, encoding
parameters, and both source and release SHA-256 checksums. A key is unique
within its language, allowing the same cue to resolve independently in English
and Filipino.

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
`play`, `stop`, `getRuntimeState`, and `shutdown`. `play` receives both a speech
key and `en` or `fil-PH`, resolves after the line finishes, and is rejected with
`TTS_INTERRUPTED` when a new line or explicit stop replaces it. Unknown or
unsafe language/key pairs never reach the Android asset manager.

The APK-only TypeScript entry point is
`apps/web/src/apk/native/offlineTtsBridge.ts`. The offline Journey automatically
plays each pre-generated prompt in the language saved by the Journey switch.
The choice survives app restarts and Journey resets. Playback always stops when
recording begins, the app is backgrounded, or the activity is left.
