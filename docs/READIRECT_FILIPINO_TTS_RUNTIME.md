# ReaDirect Filipino TTS Runtime

## Slice 10 launch status

The complete `clara-sh-fil-v1` catalog is published with 300 fixed WAVs. All
four live roles use the approved general reference, and the learner language
contract now exposes Filipino as available. The lesson-intro switch can select
and persist `fil-PH`; fixed playback, readiness, live templates, Vox warm-up,
and synthesis remain language-scoped.

## Slice 3 status

The runtime now carries the ReaDirect language code through Laravel and the
private VoxCPM2 service. Filipino uses `fil-PH`; the model service does not
expose `tl` to learner-facing code.

Slice 3 established the runtime contract without publishing audio. Slice 10 has
now published all 300 fixed lines and satisfied the learner-switch availability
gate.

## Runtime request contract

Both private VoxCPM2 endpoints accept a language:

```json
{
  "language": "fil-PH",
  "profiles": ["instruction"]
}
```

```json
{
  "language": "fil-PH",
  "reference": "instruction",
  "text": "Ang salita ay cat. Makinig: cat. Ngayon, ikaw naman."
}
```

English remains the default for backward compatibility. Cache keys include the
language, and synthesis responses report `X-ReaDirect-TTS-Language`. Laravel
will not accept an English or unlabelled runtime response for a Filipino
learner.

## Reference coverage

The runtime reference keys are language-qualified. The implementation mapping
is currently:

| Language | Role | Recording | Runtime state |
| --- | --- | --- | --- |
| English | `introduce` | `sh/introduce.wav` | Available |
| English | `instruction` | `sh/instruction.wav` | Available |
| English | `question` | `sh/question.wav` | Available |
| English | `result` | `sh/result.wav` | Available |
| Filipino | `introduce` | `sh-fil/general.wav` | Approved shared general reference |
| Filipino | `instruction` | `sh-fil/general.wav` | Approved shared general reference |
| Filipino | `question` | `sh-fil/general.wav` | Approved shared general reference |
| Filipino | `result` | `sh-fil/general.wav` | Approved shared general reference |

The live lesson contract requires `instruction` and `result`, and both use the
approved general reference. The published fixed catalog now makes Filipino
selectable.

## Template safety

The 23 live formats are source-controlled in
`apps/api/config/tts_runtime_templates.php` and tested against
`content/tts/v1/fil-PH/runtime-templates.csv`. Browsers cannot provide template
text. Runtime placeholders are exact, empty values are rejected, and `unit`
can resolve only to phrase/sentence or parirala/pangungusap.

## Real VoxCPM2 probe

On 2026-08-08, the locally pinned `voxcpm==2.0.3` model generated the
code-switched Filipino instruction below using the normalized Filipino
reference on CUDA:

```text
Ang salita ay cat. Makinig: cat. Ngayon, ikaw naman.
```

The result was a valid 48 kHz mono WAV, 6.560 seconds long, with SHA-256
`669ec0557581b47de09ae2aac3bd5e1e04db5e2c91f8b77b3246670f96a0f168`.
It is retained only in the ignored TTS runtime cache as a capability probe and
is not published learner audio. The successful generation verifies model and
pipeline capability. The product owner approved this capability probe and the
general reference after a listening review on 2026-08-08, then explicitly
directed all four Filipino delivery roles to use that reference.
