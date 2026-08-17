# Offline APK Browser Simulator Design

## Goal

Provide a development-only browser simulator for the offline APK so its real
onboarding, intro, dashboard, Journey, lessons, assessments, themes, Clara
states, and recorder states can be visually debugged without rebuilding or
reinstalling Android artifacts.

The simulator must never be included in the signed APK or Play Store bundle.
The Android application remains the authority for real microphone capture,
Whisper inference, device measurements, TTS playback, and private storage.

## Architecture

Use a dedicated Vite simulator mode and entry point. The simulator entry mounts
the real `OfflineApkApp` plus a browser-only developer control panel. It injects
simulated implementations through the same interfaces already used by the
native learner store, ASR, TTS, Clara capability selection, onboarding, intro,
and activity components.

The production `offline-apk` entry imports only native runtime dependencies.
The simulator entry and its modules are reachable only from the simulator mode.
The existing offline release-boundary test must prove that no simulator labels,
storage keys, control-panel code, or simulator module paths occur in
`dist-apk`.

## Runtime Composition

Refactor `OfflineApkApp` to accept one runtime dependency object while retaining
the current native runtime as its production default. The dependency object
contains:

- the learner repository used by onboarding, intro, dashboard, Journey, and
  activities;
- the initialization function used by onboarding;
- the ASR operations used by activities;
- the TTS operations used by activities; and
- a simulator-state subscription or app remount key used only by the simulator
  shell.

The real app remains behaviorally unchanged when no dependency object is
provided.

## Browser Persistence

Implement a revision-aware browser persistence adapter matching
`OfflineLearnerStoreNativePlugin`. It stores the primary and backup snapshots in
`localStorage`, preserves progress across refreshes, and enforces the same
expected-revision stale-write contract as Android. Corrupt or missing data is
handled by the existing `OfflineLearnerRepository` recovery path.

The simulator control panel provides an explicit destructive reset for the
simulated state only. It never touches Android storage or unrelated browser
storage.

## Device and Clara Simulation

Provide three device profiles whose capability values deterministically select
the existing user-facing ASR tiers:

- Low: lightweight ASR and Static Clara;
- Medium: medium ASR with configurable Static or Dynamic Clara; and
- High: High ASR and Dynamic Clara.

The control panel may override Clara between Static and Dynamic where useful for
visual testing. Changing a profile remounts the APK app and reruns onboarding
initialization, while preserving learner progress unless Reset is selected.
Initialization progress uses short deterministic delays so the progress screen
can be observed without slowing routine debugging.

## ASR and Recorder Simulation

The control panel provides four next-recording outcomes:

- correct transcript;
- incorrect transcript;
- microphone permission failure; and
- ASR/inference failure.

Correct and incorrect outcomes return structurally complete
`OfflineAsrTranscription` objects using the active tier. The transcript is
derived from the current activity target only through an explicit simulator
request contract; production scoring remains real and unchanged. Failure modes
reject at the same operation boundary as their Android counterparts so the real
error UI is exercised.

The panel also exposes recording and transcription delay controls with sensible
defaults. The chosen outcome applies to the next recording and remains selected
for repeated debugging until changed.

## TTS Simulation

TTS preparation returns the real offline catalog summary shape. Playback uses a
short cancellable timer, reports the requested speech key, and can be switched
between success and playback failure. No network request or browser speech API
is used, keeping tests deterministic and avoiding misleading voice behavior.

## Progress Presets

The control panel provides focused presets that write valid learner state
through the repository:

- Fresh install;
- Intro ready;
- Dashboard ready;
- Diagnostic completed with all lessons unlocked;
- Mid-lesson progress; and
- Journey completed with achievements.

Presets use the production learner-state schema and state-transition functions.
They remount the app after saving so developers immediately see the requested
screen state.

## Control Panel UI

The panel is a compact, collapsible development overlay that stays visually
separate from the ReaDirect interface. It contains device profile, Clara mode,
next recorder outcome, TTS outcome, delay, progress presets, and reset controls.
It identifies itself clearly as a simulator and is keyboard accessible.

On narrow viewports it collapses to a single floating button so it does not hide
the mobile layout under test. Its open/closed state and simulator settings are
stored separately from learner progress.

## Build and Launch

Add scripts that launch the simulator directly in Vite development mode for
fast refresh and optionally preview its production-like simulator build. The
visual browser uses the development URL, while the signed APK continues to use
the existing `build:apk` command and `dist-apk` output.

## Error Handling

Simulator failures use explicit error codes and messages corresponding to the
operation being exercised. Invalid local simulator settings fall back to the
High/Dynamic/success defaults. Invalid persisted learner state is recovered by
the production repository rather than silently bypassing validation.

## Testing

Implementation follows test-driven development:

1. A failing persistence-adapter test proves refresh persistence, backup
   behavior, and stale-write enforcement.
2. Failing runtime tests prove device-tier selection, Clara selection, ASR
   outcomes, TTS outcomes, and cancellation.
3. Failing integration tests prove the real APK flow reaches onboarding and the
   dashboard under simulator injection.
4. A failing boundary test proves simulator code cannot enter `dist-apk`.
5. Existing offline tests, type checking, lint, and `build:apk` must remain
   green.
6. The in-app visual browser verifies onboarding, intro, dashboard, Journey,
   lesson/assessment recorder states, all themes, and representative mobile
   viewports.

Native microphone quality, Whisper accuracy, thermal behavior, and memory use
remain physical-device or emulator validation responsibilities.

## Success Criteria

- The complete APK UI is navigable at a local browser URL without Android.
- Progress persists through refresh and can be reset safely.
- Low, Medium, and High device paths and Static/Dynamic Clara are selectable.
- Correct, incorrect, permission-error, and ASR-error recorder states are
  reproducible.
- Simulator settings never appear in signed APK/AAB output.
- No APK rebuild or reinstall is required for ordinary visual UI debugging.
