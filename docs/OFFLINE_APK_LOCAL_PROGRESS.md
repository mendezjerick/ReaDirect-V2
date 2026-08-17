# Offline APK local learner progress

The offline Android app has one device-local learner profile and no login,
token, school, staff, or server identity. The default display name is `Reader`;
it can be personalized later without creating an account.

## Storage contract

Android stores the serialized state in private `SharedPreferences` through the
`OfflineLearnerStore` Capacitor plugin. Each write:

1. validates schema version and the next revision;
2. rejects a stale expected revision;
3. copies the current record to a last-known-good backup; and
4. synchronously commits the new state and revision.

The current learner-state schema is version 4. Version 1-3 records are migrated
locally before validation and atomically rewritten as version 4; no network or
account is needed for migration.

The TypeScript repository serializes in-process updates and retries a stale
write up to three times. At startup it validates the primary record. If that
record is damaged, it restores the valid backup at a new revision; if neither
record is valid, it creates a fresh local profile.

State is private to the Android application sandbox. Clearing the app's data or
uninstalling it removes the profile and its progress. There is no cloud sync or
cross-device recovery in the offline product.

The dashboard reset is narrower than clearing Android app data. It atomically
replaces only the journey record, preserving the reader profile, ASR and Clara
selections, Clara's English/Filipino speech language, onboarding
acknowledgement, and completed intro.

## Persisted data

- local profile ID, display name, and timestamps;
- onboarding/intro completion, selected ASR/Clara capability fields, and
  Clara's offline speech language;
- diagnostic and final-assessment checkpoints, compact responses, and scores;
- ordered checkpoints and completion for Lessons 1–6;
- the eight Reading Journey achievement unlocks and seen state.

Only compact answer evidence is retained. Microphone recordings and model
buffers are never written into learner progress storage.

## Journey invariants

- the diagnostic starts available;
- a confirmed diagnostic skip records a zero score and unlocks all six
  lessons;
- all lessons remain locked until the diagnostic is complete;
- all six lessons become available after the diagnostic is completed or
  skipped, and each lesson keeps independent in-progress checkpoints;
- the final assessment unlocks only after Lesson 6;
- achievements must exactly match completed journey activities;
- assessment scores cannot exceed their maximums.

The APK initializes this repository during root startup. Onboarding, the intro,
the dashboard, and the journey activity runner all consume the same repository.
