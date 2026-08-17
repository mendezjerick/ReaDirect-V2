# Offline APK journey activities

The Android-only journey runner contains a fixed, locally generated curriculum:

- a 36-item Diagnostic Assessment;
- Lessons 1–6 with 41 items in total; and
- a 36-item Final Assessment.

All 113 items are derived from the approved assessment and lesson CSV sources. `pnpm verify:apk:content` regenerates the content in memory and fails if it differs from the committed manifest or if any prompt or completion key is absent from the packaged Clara speech catalog.

## Offline runtime

Speech items record through the native `OfflineAsr` bridge and score the returned transcript on the device. Short answers use stricter word similarity thresholds; passage reading uses a more forgiving threshold. Recordings are not added to learner progress. Choice items are scored locally without ASR.

Every answer saves a compact checkpoint through `OfflineLearnerRepository` before the runner advances. Finishing an activity completes its milestone, unlocks the next journey step and connected achievement, and plays a pre-generated completion prompt through the native `OfflineTts` bridge. No activity requires an API call.

## Diagnostic choice

The Diagnostic remains the first and recommended journey activity. The dashboard also presents a prominent `Skip Diagnostic` action with a separate confirmation step. Confirming records the Diagnostic as skipped with a zero score, unlocks Lesson 1, and preserves the Diagnostic milestone in the journey history.

The rectangular recorder control is deliberately touch-sized and responsive. It changes label and visual state while native recording is active, and reduced-motion preferences disable its pulse animation.
