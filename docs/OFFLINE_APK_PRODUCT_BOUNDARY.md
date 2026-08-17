# Offline APK product boundary

The `apk/bundle` delivery is a separate, fully offline Android product target.
It is compiled through `pnpm build:apk` and must not reuse the normal web entry
or its role-aware provider tree.

## Included product surface

- One automatic local learner profile
- Initialization onboarding, Intro, and Link Start
- Learner lesson-journey dashboard
- Diagnostic/final assessment and Lessons 1–6
- Local achievements and resettable local progress
- On-device Low, Medium, or High ASR
- Pre-generated offline TTS
- Static or dynamic Clara selected independently by device capability

## Excluded product surface

- Learner and staff login
- Every staff, teacher, school-admin, and system-admin page
- Home role selection
- Games and their assets or packages
- Learn with Clara menus and activities
- Laravel/Pusher realtime clients, API calls, and production web sockets
- PWA/service-worker dependencies

Local packaged asset reads and calls through explicit Capacitor native plugins
are allowed. HTTP APIs and remote model/audio downloads are not.

## Enforcement

`apps/web/offline-apk-boundary.json` is the machine-readable contract. The Vite
offline build fails when its dependency graph, emitted filenames, or generated
JavaScript contains a forbidden module or runtime marker. A post-build verifier
then checks that the normal web entry is absent and scans the final artifact.

The first slice intentionally emits only a minimal offline shell. Later slices
replace that shell with the approved onboarding and learner journey without
weakening this boundary.
