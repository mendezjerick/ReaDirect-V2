# Offline APK native ASR bridge

The dedicated Capacitor Android project lives at `apps/web/android-apk`. It is
separate from the regular web target and from the pre-existing generated
`apps/web/android` cache directory.

## Native contract

The `OfflineAsr` Capacitor plugin provides:

- `getDeviceCapabilities()` for physical/available RAM, Android's low-RAM
  signal, heap classes, logical cores, ABIs, ARM64 support, SDK version, and
  Android thermal status where the platform exposes it.
- `initialize({ tier })` to load the packaged Low, Medium, or High model and
  return real load timing and runtime information.
- `startRecording({ maxDurationMs })` to request microphone permission and
  capture 16 kHz, mono, signed 16-bit PCM with Android `AudioRecord`.
- `stopAndTranscribe()` to run local `whisper.cpp` inference and return the
  transcript plus audio/inference timing.
- `cancelRecording()`, `getRuntimeState()`, and `shutdown()` for lifecycle and
  failure recovery.

Inference and model lifecycle operations share one native executor because a
Whisper context must not be used concurrently. Recordings are held only in
memory and capped at 60 seconds. They are cancelled if the activity is
backgrounded, are never sent over a network, and are never persisted.

## Offline enforcement

The Android manifest deliberately omits the Internet permission and disallows
cleartext traffic. It requests only microphone access. The pinned `whisper.cpp`
CPU source is vendored under the native project, and Gradle reads the
checksum-verified model package prepared by `pnpm prepare:apk:asr`.
Both ARM64 and 32-bit ARM native libraries are built: ARM64 devices can select
any qualified tier, while 32-bit ARM devices are restricted to Low.

Direct APK builds keep the three checksum-pinned models in the base APK. Play
Store AAB builds put the same model set in an install-time asset pack, keeping
it available through Android's `AssetManager` at first launch and after the
installation has gone offline.

Run `pnpm verify:apk:native` from the repository root to stage the models, build
and sync the offline web shell, compile the Java/JNI bridge, and run its local
unit tests. Device-level microphone and inference validation remains a release
gate until representative Low, Medium, and High hardware is available.
