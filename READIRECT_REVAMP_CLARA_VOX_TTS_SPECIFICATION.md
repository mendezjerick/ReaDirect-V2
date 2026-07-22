# ReaDirect Ma'am Clara Vox TTS Specification

## Status and Purpose

This document is the source of truth for Ma'am Clara's runtime text-to-speech
system in ReaDirect V2. It defines the approved Vox engine, voice references,
runtime request path, audio conditioning, caching, installation, operation,
failure handling, and extension rules.

This specification covers speech synthesis only. Learner speech recognition,
content scoring, and general interface composition are governed by their own
standards.

Implementation status: published catalog delivery is active for Lesson Intro,
all 32 fixed Part 1 assessment lines, and all 14 fixed Part 2 and assessment
completion lines. PostgreSQL holds one published `clara-sh-v1` voice version
and 47 speech metadata rows; Laravel verifies and returns their private WAVs
without calling VoxCPM2. Dynamic final-transcript feedback remains a future
implementation.

## Approved Runtime Stack

| Concern | Approved implementation |
| --- | --- |
| Speech engine | VoxCPM2 |
| Model repository | `openbmb/VoxCPM2` |
| Python package | `voxcpm==2.0.3` |
| Python version | `>=3.11,<3.12` |
| Service framework | FastAPI with Uvicorn |
| Audio I/O | SoundFile and NumPy |
| Inference runtime | PyTorch and TorchAudio `2.11.0` |
| PyTorch package index | CUDA 12.6 wheel index |
| Local service port | `8002` by default |
| Service directory | `services/tts/` |
| Service environment | `services/tts/.venv/` |
| Local model cache | `services/tts/.cache/models/openbmb--VoxCPM2/` |

Dependencies are locked by `services/tts/uv.lock`. ReaDirect must use its local
TTS virtual environment and must not depend on globally installed Python
libraries at runtime.

An NVIDIA GPU is preferred for responsive generation. The adapter automatically
uses CUDA when PyTorch reports it as available and otherwise falls back to CPU.
CPU execution is supported by the code but can make first-time and uncached
generation substantially slower.

## Hybrid Delivery Model

ReaDirect uses two distinct delivery paths. The speech router must classify a
line before requesting audio; it must not send every line to VoxCPM2 by default.

| Delivery class | Used for | Audio source |
| --- | --- | --- |
| Published speech | General, fixed, finite, and reusable Clara lines | Pre-generated, human-approved WAV referenced by the speech catalog |
| Dynamic speech | Learner-specific or otherwise unpredictable text | Runtime VoxCPM2 generation with a private dynamic cache |

This hybrid model is a hard rule. Runtime-only behavior for fixed speech is
prohibited by the published catalog route and its no-fallback tests.

### Published speech

Published speech includes:

- Introductions and greetings
- Activity instructions
- Fixed questions
- Ordinal item cues
- Neutral transitions
- Retry and error messages
- Praise and encouragement
- Fixed results and completion messages
- Any other line whose complete text is known during content publication

These lines are generated before the learner session, listened to by a human
reviewer, and marked `published`. Learner requests perform a database catalog
lookup and stream the approved WAV. They do not invoke VoxCPM2.

### Dynamic speech

Dynamic speech is reserved for text that cannot be fully known before the
learner responds. Its primary use is personalized lesson feedback, such as:

```text
You said A.
You said huyaj.
```

The variable portion must come from the saved final transcription. The raw Mu
transcription, expected answer, or browser-submitted replacement text must
never be used as a shortcut.

### Runtime ownership and request boundaries

The browser does not submit arbitrary text or private audio paths to Vox.
Published speech follows this boundary:

```text
Browser requests an approved speech key
        |
        v
Laravel authenticates the learner session
        |
        v
Laravel reads the published speech-catalog row
        |
        v
Laravel streams the catalogued private WAV
```

Dynamic feedback follows this boundary:

```text
Learner response is processed and committed
        |
        v
Laravel reads the saved final transcription
        |
        v
Laravel resolves a controlled feedback template and reference role
        |
        v
Dynamic cache hit? ---- yes ----> stream cached private WAV
        |
        no
        v
Laravel sends controlled text + role to the private Vox service
        |
        v
VoxCPM2 generates, caches, and returns the WAV
```

Hard rules:

1. Browser code requests stable speech keys or server-owned response feedback;
   it does not submit filesystem paths or unrestricted synthesis text.
2. Browser code must not choose an arbitrary reference recording.
3. Laravel owns the published catalog, dynamic templates, final-transcription
   lookup, and reference-role selection.
4. The TTS service owns reference-path resolution, conditioning, and dynamic
   synthesis.
5. Private reference recordings and generated WAV paths must never be copied
   into a public web folder or exposed in an API response.
6. The service must synthesize from local model files after installation; it
   must not download model weights during an ordinary learner request.
7. A published line must never fall through to runtime generation merely
   because its catalogued audio is missing. Missing published audio is a
   deployment/content error and must return a safe failure.

## Speech Catalog and Audio Storage

PostgreSQL is the authority for published speech metadata. The WAV bytes must
live in private file or object storage rather than a PostgreSQL binary column.
This keeps database reads small and allows efficient audio streaming.

The target catalog requires at least these records:

### Voice version

```text
tts_voice_versions
- id
- stable_key
- engine
- model_identifier
- reference_set
- conditioning_version
- synthesis_config
- status
- created_at
- published_at
```

### Published speech line

```text
tts_speech_lines
- id
- speech_key (unique within a voice version)
- text
- reference_role
- voice_version_id
- audio_storage_disk
- audio_storage_path
- audio_sha256
- duration_ms
- status: draft | review | published | retired
- generated_at
- approved_at
- created_at
- updated_at
```

Local development may use a private Laravel storage disk rooted at:

```text
apps/api/storage/app/private/tts/catalog/
```

The current `clara-sh-v1` catalog is grouped by learner-flow responsibility so
human reviewers do not need to inspect one flat audio directory:

```text
sh/
|-- lesson-intro/
|-- part-1/
|   |-- orientation/
|   |-- task-1a/
|   |-- task-2a/
|   |-- task-2b/
|   \-- results/
|-- part-2/
|   |-- story-choice/
|   |-- passage/
|   |-- comprehension/
|   \-- results/
\-- completion/
```

`sh/part-2/REVIEW.md` is the listening-review manifest for the Part 2 files.
Paths in configuration and seed data must preserve this hierarchy.

A deployment may map the same storage-disk contract to private object storage.
The database continues to store the disk name, private object path, checksum,
and metadata rather than the audio body.

Only `published` rows are playable in learner flows. A catalog row whose file
is missing, whose checksum fails, or whose voice version is retired must not be
served.

## Final-Transcription Authority

Dynamic learner feedback must use one immutable, server-saved
`final_transcript` value associated with the committed response.

```text
Mu raw output
    -> normalization and resolver/equivalence processing
    -> final transcription
    -> response commit
    -> scoring
    -> dynamic TTS template
```

The spoken feedback and scoring evidence must refer to the same committed final
transcription. VoxCPM2 does not run recognition, reinterpret the recording, or
choose between raw and resolved text.

Required behavior:

| Saved final outcome | Speech behavior |
| --- | --- |
| Normal resolved text | Render the controlled dynamic template, for example `You said {final_transcript}.` |
| `SILENCE` | Play a published line such as `I did not hear an answer.` |
| `UNKNOWN` | Play a published line such as `I could not understand that answer.` |
| Empty or unavailable value | Do not synthesize an incomplete `You said...` line; return the approved safe fallback |

The final transcription must be loaded by response identifier on the server.
The browser must not be trusted to post a replacement transcript for Clara to
speak.

Before dynamic synthesis, Laravel must apply speech-output safety normalization
without changing the response's saved evidence:

- Trim surrounding whitespace.
- Enforce the Vox request length limit.
- Remove control characters and unsupported markup.
- Reject a value containing no speakable characters.
- Keep ordinary resolved letters, words, phrases, and sentences intact.

Safety normalization creates a speakable rendering of the committed value; it
must not silently substitute the expected answer.

## Ma'am Clara Reference Library

The active runtime voice references are stored under:

```text
assets/audio/voice-references/sh/
```

The `sh` directory is Ma'am Clara's approved runtime reference set. It contains
separate delivery examples so VoxCPM2 can select a fitting speaking style for
the requested line.

| Role | Source file | Intended use | Authored format |
| --- | --- | --- | --- |
| `introduce` | `introduce.wav` | Welcoming and introductory lines | 48 kHz, stereo, PCM 16-bit, about 5.50 s |
| `instruction` | `instruction.wav` | Clear activity directions and neutral item cues | 48 kHz, stereo, PCM 16-bit, about 9.39 s |
| `question` | `question.wav` | Questions and choice prompts | 48 kHz, stereo, PCM 16-bit, about 2.86 s |
| `result` | `result.wav` | Results, milestones, and completion summaries | 48 kHz, stereo, PCM 16-bit, about 3.88 s |

The role must match the intended delivery. A question should not use the
instruction sample merely because both contain clear speech, and result should
not be used for neutral assessment cues that could imply whether a response was
correct.

The source recordings are authoritative and remain unchanged. Runtime
conditioning always operates on private generated copies.

## Reference Audio Conditioning

Before a reference is passed to VoxCPM2, `services/tts/main.py` creates a
conditioned working copy under:

```text
services/tts/storage/reference-cache/
```

The current conditioning version is:

```text
mono-peak-minus-6db-v1
```

The conditioning process must:

1. Read the complete source recording as 32-bit floating-point samples.
2. Preserve the source sample rate.
3. Downmix every channel to mono by averaging the channels.
4. Reject empty audio, non-finite samples, and silent references.
5. Measure the absolute peak.
6. Attenuate only when the peak exceeds `-6 dBFS`.
7. Never boost a quiet reference.
8. Write the working copy as PCM 16-bit WAV.
9. Write through a temporary file and replace atomically.

The reference-cache fingerprint contains the resolved source path, source file
size, source modification time, and conditioning version. Editing a source
reference or changing the conditioning version therefore produces a new
working copy without overwriting the authored recording.

## VoxCPM2 Runtime Configuration

ReaDirect owns one lazily loaded VoxCPM2 instance per TTS service process.
Concurrent warm-up calls share the same instance through a load lock. Speech
generation is serialized through a separate generation lock because the model
is treated as non-reentrant.

The approved load configuration is:

```text
local_files_only = true
load_denoiser    = false
optimize         = true only when CUDA is active
device           = CUDA when available, otherwise CPU
```

The approved synthesis configuration is:

```text
cfg_value                  = 2.0
inference_timesteps        = 10
normalize                  = true
denoise                    = false
retry_badcase              = true
retry_badcase_max_times    = 3
retry_badcase_ratio_threshold = 6.0
```

Generated audio is written as PCM 16-bit WAV at the output sample rate reported
by the loaded VoxCPM2 model. Output writes use a temporary file followed by an
atomic replacement so an interrupted generation cannot leave a partial cache
entry that looks complete.

Changing the model, package version, reference conditioning, or synthesis
settings is a versioned runtime change. Its generated-speech cache identity
must also change so audio produced under old settings is not silently reused.

## Service API

### `GET /health`

Returns service availability and runtime state:

```json
{
  "service": "tts",
  "status": "ready",
  "runtime_ready": false,
  "device": null
}
```

`status: ready` means the FastAPI process is accepting requests.
`runtime_ready: false` means the VoxCPM2 model has not yet been loaded. After a
successful warm-up, `runtime_ready` becomes `true` and `device` reports `cuda`
or `cpu`.

### `POST /warmup`

Loads the local VoxCPM2 model without synthesizing a line.

Successful response:

```json
{
  "ready": true,
  "device": "cuda"
}
```

A missing model cache or runtime load failure returns HTTP `503`.

### `POST /synthesize`

Private Vox service request for authoring published lines or generating dynamic
cache misses:

```json
{
  "text": "Read the word you see.",
  "reference": "instruction"
}
```

Rules:

- `text` is trimmed and must contain between 1 and 500 characters.
- `reference` must be one of `introduce`, `instruction`, `question`, or
  `result`.
- A missing reference file returns HTTP `503`.
- A successful response is an `audio/wav` file named `clara-speech.wav`.
- `X-ReaDirect-TTS-Cache` reports `hit` or `miss`.
- `Cache-Control: no-store` prevents intermediary or browser HTTP caching.

Product browsers never call this endpoint directly. The endpoint still loads
and verifies the process-wide VoxCPM2 runtime on a generated-audio cache hit.
This is intentional: receiving a cached WAV must not falsely indicate that the
inference runtime is ready for the next uncached line.

## Dynamic Generated-Speech Cache

Generated WAV files are stored under:

```text
services/tts/storage/cache/
```

This cache is for runtime-generated variable speech. It is not the published
speech catalog and a cache entry does not become published merely because it
has been reused.

The required cache identity includes:

- Engine identifier
- Model and voice version
- Controlled feedback template version
- Semantic reference role
- Safely normalized final transcript and complete rendered text
- Reference file size
- Reference file modification time
- Reference-conditioning version
- CFG value
- Inference step count

The current service hash already includes the engine, role, rendered text,
reference fingerprint, conditioning version, CFG value, and step count. It must
be extended with explicit model, voice, and template versions as part of the
hybrid implementation.

The dynamic cache is private, server-local, and Git-ignored. Its filenames must
be opaque hashes rather than learner text. It must have a bounded retention or
size policy because unexpected final transcripts can create an unbounded set of
files. Dynamic cache entries must not store learner identifiers and must not be
listed through a learner-facing endpoint.

Browser requests are separately deduplicated in memory by the server-owned
speech request identity so two consumers sharing an in-flight request do not
start duplicate generation. Failed requests are removed from that map so a
retry can make a fresh request.

Deleting `services/tts/storage/cache/` forces speech regeneration. Deleting
`services/tts/storage/reference-cache/` forces reference reconditioning. Stop
the service before manually clearing either directory.

## Laravel Speech Delivery

Laravel exposes the authenticated route:

```text
POST /api/learners/tts/speech/{speechKey}
```

Under the hybrid implementation, the route:

1. Resolves and validates the learner session.
2. Rejects unknown speech keys with HTTP `404`.
3. Loads a `published` catalog row and validates its private WAV.
4. Streams that WAV without calling VoxCPM2.
5. Returns the WAV with the original speech key in
   `X-ReaDirect-Clara-Speech`.
6. Returns a learner-safe unavailable response if the row or its audio fails
   validation; it does not generate an emergency replacement at runtime.
7. Identifies successful catalog delivery with
   `X-ReaDirect-TTS-Source: published` and the selected voice version with
   `X-ReaDirect-TTS-Voice`.

The fixed-line controller contains no call to `/synthesize`. A missing file or
SHA-256 mismatch returns HTTP `503` and never falls through to VoxCPM2.

Dynamic response feedback requires a separate authenticated server-owned
contract, conceptually:

```text
POST /api/learners/tts/responses/{response}/feedback
```

That endpoint must confirm that the response belongs to the active learner,
load its committed `final_transcript`, select the controlled feedback template,
serve a private dynamic-cache hit, or request Vox generation on a miss. It must
not accept a transcript field from the browser.

The current service configuration is:

```dotenv
TTS_SERVICE_URL=http://127.0.0.1:8002
TTS_CONNECT_TIMEOUT_SECONDS=3
TTS_REQUEST_TIMEOUT_SECONDS=300
```

These Vox connection settings apply to controlled authoring and future dynamic
speech generation. Published speech requests do not use them.

### Required published speech keys

| Speech key | Text | Reference role |
| --- | --- | --- |
| `lesson-intro` | Hi! I am happy you are here. Let us get ready to read together! | `introduce` |
| `assessment-orientation` | Let us check your microphone. Say ready, then listen to your recording. | `instruction` |
| `assessment-letters` | Say the letter you see. Listen to your voice before you submit. | `instruction` |
| `assessment-rhymes` | Look at both words. Choose yes if they rhyme, or no if they do not. | `question` |
| `assessment-words` | Read the word you see. Listen to your voice before you submit. | `instruction` |
| `assessment-part-one-result` | Part one is complete. You worked hard, and I am proud of you! | `result` |
| `assessment-story-choice` | Choose the story you want to read. You can pick Lena at the Park or Rosa in the Garden. | `question` |
| `assessment-passage` | Read the story aloud. You have one minute. You can submit when you finish. | `instruction` |
| `assessment-part-two-result` | Part two is complete. You finished reading and understanding the story. | `result` |
| `assessment-complete` | Assessment complete! Your first lesson is ready. | `result` |

Task 3B has ten additional published keys, five for each selectable story:
`assessment-comprehension-lena-item-1` through `-5` and
`assessment-comprehension-rosa-item-1` through `-5`. Item 1 includes the full
choice instruction and its Who question. Items 2 through 5 speak the linked
What, Where, When, and Why questions exactly as authored in the active
assessment CSV. These keys are fixed assessment content and must never fall
through to runtime synthesis.

### Required published assessment item cues

Items 2 through 10 use controlled ordinal words from `second` through `tenth`.

| Task | Text template | Reference role |
| --- | --- | --- |
| Letters | `Now, try the {ordinal} letter.` | `instruction` |
| Rhyme check | `Now, check the {ordinal} pair.` | `question` |
| Words | `Now, read the {ordinal} word.` | `instruction` |

Assessment cues must remain neutral. They must not disclose a score or imply
that the preceding response was correct or incorrect.

Every row in both tables above is finite and known in advance. All of them must
be pre-generated and published; none qualifies for learner-session generation.

## Published-Speech Generation Lifecycle

Published audio uses VoxCPM2 during development or controlled content
publication, not during the learner request.

```text
Author defines speech key + exact text + reference role
        |
        v
Approved voice version generates a candidate WAV
        |
        v
Automated format, duration, silence, and checksum validation
        |
        v
Human listening review
        |
        v
WAV copied to private catalog storage
        |
        v
Database row marked published
```

Failed or unsuitable candidates remain `draft` or `review`. Regeneration must
produce a new candidate without overwriting an already published version.

A reviewer must confirm:

- Exact spoken wording
- Intelligibility for the intended learner age
- Correct pronunciation
- Suitable pace and delivery role
- No clipping, corruption, long accidental silence, or unrelated speech
- Consistency with the selected Ma'am Clara voice version

Publication must be atomic from the learner's perspective: a catalog row is not
marked `published` until the private WAV exists and its checksum and metadata
have been committed.

## Runtime Preparation and Prefetch

Lesson Intro plays its published introduction WAV immediately while Laravel
warms VoxCPM2 in parallel for later dynamic lesson feedback. When the
destination can require dynamic speech, Continue remains unavailable until the
published line has finished and the private Vox runtime reports ready. This
preserves runtime readiness without delaying the introduction on synthesis.

Published assessment instructions and ordinal cues may be fetched one item
ahead as ordinary private audio. This operation is file prefetching, not speech
generation. It must not request every remaining cue or speculate across a
score-dependent boundary.

After a learner response is committed, its dynamic feedback request may begin.
A dynamic cache hit can play immediately. A miss uses the shared
voice-preparation state while Vox generates `You said {final_transcript}.` The
learner must not be permitted to begin recording while that feedback is
audible.

The first request for a unique dynamic text is expected to be the slowest.
Later requests using the same voice, template, final transcript, reference, and
generation configuration can reuse its private dynamic WAV.

## Playback and Recording Safety

Ma'am Clara's TTS and learner audio are turn-based. VoxCPM2 output must not be
captured as though it were the learner's response.

VoxCPM2 must never speak while:

- The learner recorder is listening.
- Learner speech is being captured.
- Learner-recorded audio is being replayed.
- Uploaded learner audio is being previewed.
- A recording is being reviewed for scoring.
- Microphone-check playback is active.

When recording or learner playback begins, active TTS must stop or mute and new
TTS playback must remain blocked until that learner-audio operation has fully
ended. Preparing a WAV in the background is allowed; audible overlap is not.

Playback priority is:

```text
1. Learner-recorded audio
2. Validated instructional phoneme audio
3. VoxCPM2 speech
4. Background music
5. Sound effects
```

## Download and Installation

### Prerequisites

- Windows PowerShell
- Python 3.11 available through the `python` launcher
- Internet access for the initial package and model download
- Sufficient storage for Python packages and model weights
- An NVIDIA GPU with a compatible driver is recommended but not mandatory

The model snapshot currently occupies approximately 4.62 GiB in this checkout.
Allow additional space for PyTorch, the virtual environment, reference working
copies, and generated WAV files.

### Install uv if necessary

From PowerShell:

```powershell
python -m pip install --upgrade uv
```

`uv` is a machine-level package manager only. Project dependencies still go
into the repository-local TTS environment.

### Create the local environment and install locked dependencies

From the repository root:

```powershell
python -m uv sync --project services/tts --python 3.11 --locked
```

This creates or updates:

```text
services/tts/.venv/
```

### Download VoxCPM2

From the repository root:

```powershell
& services/tts/.venv/Scripts/python.exe services/tts/scripts/cache-models.py
```

The script downloads the `openbmb/VoxCPM2` snapshot through Hugging Face Hub
into:

```text
services/tts/.cache/models/openbmb--VoxCPM2/
```

The model cache is local and Git-ignored. Run this download once per fresh
checkout or machine, and again only when the approved model snapshot is
intentionally refreshed.

### One-command repository bootstrap

The repository bootstrap can install the locked TTS environment and download
approved speech models together:

```powershell
.\scripts\bootstrap.ps1 -CacheModels
```

Use the TTS-only commands above when the rest of the repository has already
been bootstrapped or when diagnosing Vox independently.

## Running VoxCPM2

### Run with the complete local system

From the repository root:

```powershell
.\start.ps1
```

The launcher starts the TTS service at `http://localhost:8002` by default and
writes process information and logs under `.runtime/`. Stop managed services
with:

```powershell
.\stop.ps1
```

To choose another TTS port:

```powershell
.\start.ps1 -TtsPort 8012
```

When changing the port, update Laravel's `TTS_SERVICE_URL` to the same address.

### Run only the TTS service

From the repository root:

```powershell
Push-Location services/tts
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload
Pop-Location
```

Leave that terminal open. Stop the direct process with `Ctrl+C` or use the root
stop script when the process was started by the managed launcher.

### Verify service health

```powershell
Invoke-RestMethod http://127.0.0.1:8002/health
```

### Warm the runtime manually

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8002/warmup
```

The first warm-up may take noticeably longer because it loads the local model
onto the selected device.

### Generate a direct test WAV

```powershell
$voxRequest = @{
    text = 'Let us read together.'
    reference = 'instruction'
} | ConvertTo-Json

Invoke-WebRequest `
    -Method Post `
    -Uri http://127.0.0.1:8002/synthesize `
    -ContentType 'application/json' `
    -Body $voxRequest `
    -OutFile .runtime/clara-tts-check.wav
```

Direct synthesis is a developer diagnostic. Product pages must use Laravel's
authenticated published-speech or response-feedback endpoints.

## Validation Commands

Run TTS tests from the repository root:

```powershell
Push-Location services/tts
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check .
Pop-Location
```

The test suite should cover reference validation, conditioning, cache identity,
health, warm-up, successful synthesis, and safe failure responses without
requiring production pages to know reference paths.

## Adding or Changing Speech

### Add a published line using an existing reference role

1. Create or update a draft catalog record with a stable speech key, exact text,
   approved reference role, and voice version. Configuration or seed data may
   supply the authoring definition, but the published database row is the
   runtime authority.
2. Generate a candidate WAV through the controlled publication tool.
3. Run automated audio validation and complete human listening review.
4. Copy the approved WAV to the private catalog storage disk and record its
   checksum and duration.
5. Atomically mark the catalog row `published`.
6. Add the key to the frontend's `ClaraSpeechKey` type in
   `apps/web/src/features/clara-audio/claraSpeech.ts`.
7. Request the semantic key from the relevant activity flow.
8. Add an API test asserting that the published private WAV is streamed without
   invoking `/synthesize`.
9. Add a frontend test confirming request deduplication and playback gating.

Do not add a browser option that submits arbitrary synthesis text.

### Add a dynamic feedback template

1. Give the template a stable, versioned key such as
   `response-echo-v1: You said {final_transcript}.`.
2. Select an approved semantic reference role.
3. Allow substitutions only from server-owned committed fields.
4. Define safe behavior for `SILENCE`, `UNKNOWN`, empty, and over-limit values.
5. Include the template version in the dynamic cache key.
6. Test that raw transcription and browser-submitted replacement text cannot
   enter synthesis.
7. Test cache hit, cache miss, failure, authorization, and response ownership.
8. Human-review representative correct, incorrect, short, and unusual final
   transcriptions.

### Add a new semantic reference role

1. Record and approve a clean reference WAV with the intended delivery.
2. Store it under `assets/audio/voice-references/sh/` with a semantic filename.
3. Add the role and path to `REFERENCE_FILES` in `services/tts/main.py`.
4. Add the role to `SynthesisRequest.reference` so request validation permits
   it.
5. Add service tests for missing, invalid, conditioned, and successful use.
6. Update this document's reference table.
7. Review every new line that uses the role.

Do not replace one reference file silently. A changed source timestamp and size
will invalidate the current caches, but the change still requires listening
review and documentation.

## Troubleshooting

### Port 8002 is already in use

Run the managed stop script:

```powershell
.\stop.ps1
```

Then verify the port before restarting:

```powershell
Get-NetTCPConnection -LocalPort 8002 -State Listen -ErrorAction SilentlyContinue
```

### Health works but synthesis reports a missing model

`GET /health` can report that the service process is ready before the model is
resident. Download the local snapshot:

```powershell
& services/tts/.venv/Scripts/python.exe services/tts/scripts/cache-models.py
```

Then call `/warmup` and inspect the service log.

### A reference role is unavailable

Confirm that all five approved WAV files exist under
`assets/audio/voice-references/sh/` and that their names exactly match the
reference map. Do not substitute a different voice recording automatically.

### First dynamic generation is slow

Check `/health` for `runtime_ready` and `device`. A cold runtime must load the
model before synthesis. CPU generation is expected to be slower than CUDA.
Warm the service before entering latency-sensitive learner activities.
Published lines should not exhibit this delay because they stream approved
files without invoking VoxCPM2.

### A previously generated line does not reflect a setting change

Stop the service and clear the generated-speech cache after confirming the
exact target directory:

```text
services/tts/storage/cache/
```

More importantly, update the cache-key version whenever a generation parameter
or model behavior changes. Manual clearing alone is not a durable versioning
strategy.

### Generated speech is unclear or has unsuitable delivery

Check, in order:

1. Whether the semantic reference role matches the line.
2. Whether the source reference is clean, intelligible, and undistorted.
3. Whether the conditioned copy is mono and capped without unintended silence.
4. Whether punctuation and wording encourage the intended delivery.
5. Whether the result is a random poor generation that succeeds on retry.
6. Whether a synthesis-setting change is justified and properly versioned.

Do not solve a poor result by exposing reference selection to the learner or by
modifying the authored source recording at runtime.

## Acceptance Checklist

- [ ] Python 3.11 local environment installs from the locked project.
- [ ] The approved `openbmb/VoxCPM2` snapshot exists locally.
- [ ] `/health` responds on the configured TTS port.
- [ ] `/warmup` returns `ready: true` and the expected device.
- [ ] All five `sh` semantic reference WAV files exist.
- [ ] References are downmixed to mono and only attenuated above `-6 dBFS`.
- [ ] Runtime synthesis uses the approved VoxCPM2 parameters.
- [ ] Concurrent generations are serialized.
- [ ] PostgreSQL stores published speech metadata, not WAV binary bodies.
- [ ] Every finite/general line is pre-generated, reviewed, and catalogued.
- [ ] Published speech streams without invoking VoxCPM2.
- [ ] Dynamic speech uses the committed final transcription, never raw Mu text.
- [ ] `SILENCE`, `UNKNOWN`, and empty outcomes use approved published fallbacks.
- [ ] Dynamic cache identity includes voice, template, transcript, reference,
      conditioning, model, and synthesis versions.
- [ ] A dynamic cache hit still requires a resident runtime when the upcoming
      flow can produce uncached dynamic speech.
- [ ] Browser calls use authenticated semantic speech keys or response-owned
      feedback endpoints.
- [ ] Private reference and generated-audio paths never appear in browser
      requests or responses.
- [ ] TTS never overlaps learner recording or learner-audio playback.
- [ ] New lines have API, frontend, and human-listening validation.
- [ ] Runtime, reference, or synthesis changes invalidate the appropriate cache.
