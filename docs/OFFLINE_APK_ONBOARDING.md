# Offline APK onboarding and warm-up

The APK runs a cream-background warm-up screen before the intro. Its progress
bar is adapted from the supplied pulse animation and uses the default ReaDirect
surface, text, action, and sun-accent tokens.

Progress is operation-based, not timer-based. The percentage advances only
after these real device operations complete:

1. load or recover the local learner profile;
2. inspect Android memory, CPU, RAM class, and ABI support;
3. open and validate Clara's packaged offline voice catalog;
4. initialize the selected whisper.cpp ASR model;
5. evaluate Clara display capability.

Model initialization does not expose byte-level progress, so the bar remains
at its current checkpoint while that native work runs. The pulsing edge shows
that work is active without displaying invented progress.

## Required acknowledgements

After initialization reaches 100%, two independent modal acknowledgements are
shown in a fixed order:

1. **Speech recognition** — the selected user-facing model is named only Low,
   Medium, or High, with its device-specific accuracy explanation.
2. **Clara display** — Static or Dynamic, including a clear warning when
   Dynamic Clara is locked for the device.

Each modal requires an explicit **I understand** action. The ASR selection is
persisted first. Clara cannot be acknowledged before ASR, and onboarding is not
complete until both writes succeed. On later launches, the warm-up still runs
because native models must be loaded into the new process, but matching saved
acknowledgements are not shown again.

Static Clara is selected when Android reports a low-RAM device, lacks ARM64,
has less than 4 GB of RAM, has fewer than six logical CPU cores, lacks WebGL,
or cannot hold Clara's 8192-pixel texture. The saved lock is enforced again by
the offline Clara renderer before any Dynamic assets load.

Initialization errors remain on the cream surface and provide a local retry;
there is no network fallback.
