# ReaDirect offline Android ASR models

The offline Android product packages three English ASR tiers through the pinned
`whisper.cpp` runtime. Their only user-facing names are **Low**, **Medium**, and
**High**.

| Tier   | Packaged model                    | Role                         | Minimum capability               |
| ------ | --------------------------------- | ---------------------------- | -------------------------------- |
| Low    | Whisper Base English Q5_1         | Very-low-end fallback        | 1 logical core                   |
| Medium | Distil-Whisper Small English Q5_1 | Standard default             | 3 GB RAM, 4 logical cores, ARM64 |
| High   | Whisper Large V3 Turbo Q5_0       | Best-quality high-end option | 6 GB RAM, 8 logical cores, ARM64 |

Android's low-RAM signal always selects Low. A missing ARM64 capability also
selects Low. Otherwise, the selector chooses the highest tier whose minimums
are met. These thresholds are deliberately less restrictive than Clara's and
must be calibrated with representative-device measurements in Slice 11.

The large binaries live under the ignored
`services/asr/model_artifacts/mobile/` directory. `artifacts.json` records their
reproducible sources, paths, sizes, checksums, package filenames, and smoke-test
result. Run `pnpm prepare:apk:asr` to validate all three artifacts and stage a
strict package layout for the Android bridge. Only the quantized deployment
files are staged; the Medium source artifact and server Faster-Whisper snapshot
are never packaged.

These are upstream Whisper-family baselines. They must not be represented as
the unavailable historical Mu weights. Child-speech and isolated-letter
adaptation plus the locked Mu/Nu evaluation remain release requirements.
