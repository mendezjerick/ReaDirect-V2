# Offline APK journey activities

The Android-only journey runner contains a fixed, locally generated curriculum:

- a 36-item Diagnostic Assessment;
- Lessons 1–6 with 41 items in total; and
- a 36-item Final Assessment.

All 113 items are derived from the approved assessment and lesson CSV sources. `pnpm verify:apk:content` regenerates the content in memory and fails if it differs from the committed manifest or if any prompt or completion key is absent from the packaged Clara speech catalog.

## Offline runtime

Speech items follow the main learner flow through the native `OfflineAsr` bridge: record, stop, play or retry, then submit. Submit becomes available only after playback and starts on-device transcription; no learner progress is saved before that submission. Short answers use stricter word similarity thresholds, while passage reading uses a more forgiving threshold. The temporary PCM capture remains native and is cleared after the item instead of being added to learner progress. Choice items are scored locally without ASR.

Every answer saves a compact checkpoint through `OfflineLearnerRepository` before the runner advances. Finishing an activity completes its milestone, unlocks the next journey step and connected achievement, and plays a pre-generated completion prompt through the native `OfflineTts` bridge. No activity requires an API call.

## Diagnostic choice

The Diagnostic remains the first and recommended journey activity. Main's
Journey page presents a prominent `Skip Diagnostic` action with a separate
confirmation step at the bottom of the Journey. Confirming records the Diagnostic as skipped with a zero
score, unlocks all six lessons, and preserves the Diagnostic milestone in the
journey history. Learners may then open any lesson directly; each lesson
retains its own item-level checkpoint.

Activities reuse main's `LearnerActivityShell`, progress rail, action dock,
result view, Clara placement, and `AssessmentRecorder` presentation. The
rectangular recorder therefore keeps main's existing mobile, orientation,
short-height, and reduced-motion responsiveness while its actions call the
offline native ASR bridge. The offline adapter gives the production portrait
dock a definite height so its two actions cannot collapse the prompt row on
tall phones. Clara automatically plays the current prompt from the packaged
English or Filipino catalog; recording stops any active prompt first.
