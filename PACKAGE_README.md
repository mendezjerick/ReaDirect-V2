# ReaDirect Runtime Assets Handoff

Extract the contents of `ReaDirect-Runtime-Assets-Handoff/` into the ReaDirect
repository root while preserving the included directory structure.

## Included

- `services/tts/.cache/models/openbmb--VoxCPM2/`
  - Local VoxCPM2 model required for dynamic Ma'am Clara speech generation.
- `services/tts/storage/reference-cache/`
  - Conditioned Clara reference profiles used during TTS startup and inference.
- `apps/api/storage/app/private/tts/catalog/sh/`
  - The 260 published, seeded WAV files used by diagnostic assessments,
    lessons, and other fixed speech activities.
- `apps/web/vendor/live2d/`
  - Cubism Web Framework build sources/output and the locally licensed Cubism
    Core files required by the ReaDirect frontend.
- `apps/web/public/assets/live2d/core/live2dcubismcore.min.js`
  - Browser runtime file loaded directly by `apps/web/index.html`.

## Intentionally Excluded

- Mu ASR model files, because they are already included in the separate
  `ReaDirect-Mu-Historical-Handoff.zip`.
- Dynamic TTS cache WAVs under `services/tts/storage/cache/`. These are
  regenerable and may contain learner-specific generated feedback.
- The unpublished WAV under the catalog's `unresolved/` directory.
- Learner recordings, retired audio, logs, secrets, environment files, runtime
  manifests, dependency installations, virtual environments, compiled web
  output, and nested Git metadata.

## License Note

The Live2D Cubism files remain subject to their accompanying license terms.
Keep this handoff within the authorized project team and preserve the included
license and redistributable-files notices.
