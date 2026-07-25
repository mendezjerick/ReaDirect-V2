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
all 32 fixed Part 1 assessment lines, 15 unique fixed Part 2 and completion
lines (14 required by each assessment type), 51 fixed Lesson 1 lines, 19 fixed
Lesson 2 lines, 33 fixed Lesson 3 lines, 33 fixed Lesson 4 lines, 9 fixed
Lesson 5 lines, 47 fixed Lesson 6 lines, and 13 published
`Learn with Ma'am Clara` lines. PostgreSQL holds one published
`clara-sh-v1` voice version and 253 speech metadata rows; Laravel verifies and
returns their private WAVs without calling VoxCPM2. Response-owned dynamic
final-transcript feedback is active for Lessons 1 through 4. Lesson 2 also
uses a response-owned target-word demonstration. Lesson 3 instead uses one of
20 finite published phrase demonstrations selected from the locked run
snapshot, and Lesson 4 uses the corresponding finite set of 20 sentence
demonstrations. Lesson 5 instead uses one of six finite passage-review
responses selected from committed accuracy evidence. All are ordered by the
server-authored support presentation.

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

Profile preparation uses the disposable sentence `Ma'am Clara is ready to
help.` with Vox bad-case retry enabled. A one-word probe is prohibited because
VoxCPM2 can fail before producing a latent sample for very short probes.

Dependencies are locked by `services/tts/uv.lock`. ReaDirect must use its local
TTS virtual environment and must not depend on globally installed Python
libraries at runtime.

An NVIDIA GPU is preferred for responsive generation. The adapter automatically
uses CUDA when PyTorch reports it as available and otherwise falls back to CPU.
CPU execution is supported by the code but can make first-time and uncached
generation substantially slower.

## Stable Punctuation Rule

Exclamation marks are prohibited in every line synthesized for Ma'am Clara.
This applies equally to published lines, runtime feedback, demonstrations,
greetings, results, and future speech features. Use a period for an affirmative
or celebratory sentence and a question mark only for a genuine question.

The canonical speech catalog must contain no `!` characters. Its seeder and
generation script reject noncompliant published text. The Vox service also
converts any exclamation-mark run reaching the synthesis boundary into one
period, which protects dynamic lines containing unexpected punctuation from a
saved transcript. This boundary normalization is a safeguard, not permission
to author exclamation marks.

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
You said ei.
You said huyaj.
```

The variable portion must come from the saved final transcription. The raw Mu
transcription, expected answer, or browser-submitted replacement text must
never be used as a shortcut.

For isolated-letter feedback, the saved final transcript remains the canonical
letter, such as `A`. Laravel converts only the spoken rendering through
`READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md`, so Vox receives
`You said ei.` while scoring and persistence continue to use `A`.

For Lesson 2 word feedback, Laravel speaks the committed final resolved
transcript through `You said {final_transcript}.`. Accepted equivalences
therefore speak the canonical target; an incorrect but usable response speaks
what Mu and the equivalence resolver committed. Lesson 2 demonstration text
uses the server-owned hidden target from the immutable run snapshot:
`The word is {target}. Listen: {target}. Now you try.`. The browser cannot
supply either substitution.

For Lesson 3, correct phrase evidence still uses
`You said {final_transcript}.`. Clear incorrect evidence first uses the
server-persisted word-level alignment:

```text
missing_word       -> You missed the word {expected}.
extra_word         -> I heard an extra word, {actual}.
replaced_word      -> I heard {actual} instead of {expected}.
words_out_of_order -> The words {first} and {second} changed places.
```

Multiple differences produce one targeted first correction, never an
exhaustive list. The browser supplies neither the category nor any variable
word. Laravel loads the response-owned alignment evidence, resolves the
controlled template, and sends it with the `result` reference. This remains
runtime speech because the operation and committed actual token are determined
only after the learner responds.

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

ReaDirect owns one process-wide VoxCPM2 instance per TTS service process. The
service must begin preparing that instance when the TTS process starts rather
than waiting for the first learner-owned dynamic speech request. Concurrent
warm-up calls share the same instance through a load lock. Speech generation is
serialized through a separate generation lock because the model is treated as
non-reentrant.

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

## Runtime and Voice-Cloning Warm-Up Standard

### Purpose

Warm-up exists to remove cold model loading, reference encoding, and first-use
generation work only from activities that can reach approved dynamic speech.
It must not be treated as a universal lesson delay.

The AI-teacher strategy defined by
`READIRECT_REVAMP_AI_TEACHER_STANDARD.md` uses published and content-authored
speech for every line that can be known before the learner responds. Those
lines are fetched from the private speech catalog and do not require VoxCPM2
runtime readiness. Content-authored speech is an authoring category but still
uses the published delivery path during a learner session.

Fetching, validating, prefetching, or playing a published WAV does not warm
VoxCPM2 and must never be reported as live-runtime readiness. Mu and its
Mu-backed Nu isolated-letter mode belong to ASR and do not have TTS reference
profiles or a separate Vox warm-up requirement.

The following states are separate:

| State | Meaning |
| --- | --- |
| Service ready | FastAPI is accepting requests |
| Model ready | VoxCPM2 is loaded on the selected device |
| Reference profile ready | The conditioned reference has been encoded into an in-memory Vox prompt cache |
| Generation path ready | A disposable inference has initialized the actual reference-cloning and audio-decoding path |
| Published group ready | The required catalog metadata and private WAVs are available and valid |
| Activity speech ready | Required published groups are ready and every runtime profile declared by the activity manifest is ready |

`runtime_ready` must not become true merely because the FastAPI process is
running or a published speech line was delivered. Activity speech readiness is
resolved by Laravel from the destination activity manifest; it is not a global
claim that every voice profile has been prepared.

### Activity speech-profile manifest

Every assessment or lesson must declare its speech requirements through a
server-owned activity manifest.

Example:

```json
{
  "activity": "lesson-1",
  "runtime_profiles": ["result"],
  "published_groups": [
    "lesson-1-instructions",
    "technical-retries",
    "letter-demonstrations"
  ]
}
```

Manifest rules:

1. `published_groups` contains fixed general speech, approved scaffolds,
   demonstrations, transitions, and other content-authored lines that the
   activity may use.
2. `runtime_profiles` contains only reference roles that a controlled dynamic
   template can actually use in that activity.
3. A manifest may declare an empty `runtime_profiles` array. That activity must
   not wait for VoxCPM2 merely because it contains Clara speech.
4. Assessments declare no runtime profiles. Assessment speech is fixed,
   standardized, pre-generated, reviewed, and published.
5. A lesson profile is declared only when the bounded feedback strategy can
   reach text that was impossible to know before the learner response.
6. The current Lesson 1 manifest may declare `result` while it uses controlled
   final-transcript feedback. If that dynamic behavior is removed, its manifest
   must remove `result` rather than retaining unnecessary warm-up.
7. The browser must not add profiles, replace manifest groups, or decide that a
   line requires dynamic generation.
8. Manifest changes are version-controlled content/runtime changes and must be
   tested with portal, direct-route, refresh, and normal-progression entry.

Current implementation:

- `apps/api/config/speech.php` owns the published groups, supported reference
  profiles, activity manifests, and portal-target mapping.
- `ActivitySpeechManifestService` validates every referenced group, speech key,
  and runtime profile before returning a manifest.
- Normal learner sessions resolve the manifest from server-authoritative
  progression. Portal sessions resolve it from their active portal target.
- `GET /api/learners/tts/activity-manifest` returns the resolved destination
  manifest for the authenticated learner; it does not accept an activity,
  group, profile, or speech key from the browser.
- Part 1 and Part 2 currently declare no runtime profiles. Lesson 1 declares
  only `result` while final-transcript feedback remains dynamic.
- Lesson 2 declares `result` for final-transcript feedback and `instruction`
  for target-word demonstrations. Lesson Intro must prepare both before its
  Continue action becomes available.
- Lesson 3 declares only `result` for final-transcript feedback. Its mission
  instructions, ordinal cues, support, completion, and all 20 possible phrase
  demonstrations are published, so phrase demonstration never adds a runtime
  `instruction` warm-up.
- Lesson 4 follows the same published-demonstration contract and declares only
  `result`. Its instruction, four ordinal cues, support, completion, and all
  20 approved sentence demonstrations are fixed catalog speech.
- Lesson 5 declares no runtime profile. Its instruction, technical recovery,
  completion, and six possible passage-review responses are fixed catalog
  speech. It does not speak the transcript or demonstrate the passage.
- `Learn with Ma'am Clara` Lesson 1 declares the published-only
  `learn-with-clara-lesson-1-fixed` group and no runtime profiles. Its current
  Chapter 1 catalog contains three time-aware greetings, five letter-pair
  teaching lines, three authored story lines, one return-to-letters bridge,
  and one completion line.
- The companion class may prefetch its server-declared possible-next speech
  keys, but every fetched file must still pass catalog publication and
  integrity validation. A missing companion-class line fails closed and must
  never fall through to runtime synthesis.
- The TTS service begins model loading in the background, accepts requested
  profiles through `/warmup`, builds one process-memory Vox prompt cache per
  current reference fingerprint, and completes a disposable generation probe
  before reporting the profile in `profiles_ready`.
- Concurrent preparation for the same profile shares one in-flight task.
  Dynamic synthesis reuses the prepared prompt cache rather than encoding the
  reference again.
- `ActivitySpeechPreparationService` validates the destination's complete
  published group against one published voice version, including private-file
  existence and SHA-256 integrity, before requesting any runtime work.
- `POST /api/learners/tts/activity-readiness` resolves the authenticated
  learner's destination on the server. It accepts no browser-selected activity,
  group, speech key, or runtime profile.
- Assessment readiness returns without contacting Vox. Lesson 1 requests only
  its manifest-declared `result` profile. Published-catalog or Vox failures keep
  the activity unavailable with a learner-safe response.
- `apps/web/src/features/clara-audio/activitySpeechReadiness.ts` owns the
  authenticated browser client and one-minute, token-and-destination keyed
  single-flight request cache. Concurrent Dashboard, Lesson Intro, and
  destination-page callers reuse the same manifest and readiness promises.
- `useActivitySpeechPreparation.ts` owns the shared React lifecycle, retry
  invalidation, and the distinction between ordinary published-catalog
  validation and manifest-declared runtime warm-up.
- Dashboard entry prepares the progression-owned destination opportunistically
  without blocking navigation. Lesson Intro requires both its published line
  to finish and destination readiness before enabling `Continue`.
- Part 1, Part 2, and Lesson 1 repeat the readiness check on direct entry,
  refresh, and portal entry. Lesson 1 displays the shared cube loader while its
  declared runtime profile is pending; assessment catalog validation does not
  falsely display a Vox runtime loader.
- Completing Part 2 invalidates the prior browser readiness cache and begins
  the now-progression-owned Lesson 1 preparation before returning to the
  Dashboard.
- A rejected browser readiness promise is removed from the single-flight cache,
  and the shared retry action invalidates both manifest and readiness entries.
  Neither published playback nor a prior failed request is treated as proof
  that a runtime-required activity is ready.

### Service-start warm-up

When `start.ps1` launches the TTS service, the service must begin warm-up in the
background. It prepares the process-wide model immediately. It prepares only
explicitly configured startup profiles or profiles requested from an activity
manifest; it must not eagerly prepare all four reference roles.

For each requested profile it must:

1. Load the local VoxCPM2 model onto CUDA when available, otherwise CPU.
2. Produce or reuse the correctly conditioned private reference WAV.
3. Encode the reference into a process-memory prompt cache.
4. Run one disposable reference-conditioned generation with bad-case retries
   disabled.
5. Discard the disposable audio and mark the profile ready only after the full
   generation path succeeds.

The encoded prompt cache is process-local and is lost whenever the TTS process
restarts. A conditioned WAV or generated-speech cache entry on disk does not
replace process-memory prompt preparation.

### Shared prompt-cache rules

- `services/tts/main.py` must reuse one encoded prompt cache per reference
  fingerprint, conditioning version, model version, device, and runtime dtype.
- A dynamic cache miss must synthesize through the prepared prompt cache. It
  must not encode the same reference WAV again for every learner response.
- Concurrent requests for the same unprepared profile must share one
  single-flight preparation task.
- Reference preparation and speech generation must respect the existing model
  and generation locks.
- Editing a source reference, changing conditioning, changing the model, or
  changing an incompatible runtime setting invalidates the matching in-memory
  prompt cache.
- Prompt-cache readiness must never be inferred from the presence of a
  generated WAV.

### Learner-flow warm-up layers

Warm-up is service-owned and reinforced at multiple entry points. No single
page is the sole authority.

Normal progression flow:

```text
TTS service starts
    -> process-wide model preparation begins
    -> prior completion page resolves the next activity manifest
    -> its published groups may be prefetched
    -> its declared runtime profiles begin warming without blocking navigation
    -> Dashboard repeats the same idempotent destination preparation
    -> Lesson Intro plays its published introduction
    -> Lesson Intro waits only for runtime profiles declared by the destination
    -> destination activity performs a final manifest readiness check
```

Direct portal flow:

```text
System administrator launches an activity portal
    -> portal remains a direct activity route
    -> server resolves that activity's speech manifest
    -> required published groups are validated
    -> declared runtime profiles perform the same shared readiness check
    -> ready: activity opens
    -> runtime profile pending: the shared TTS warm-up loader remains
```

Rules:

1. A completion page may prepare only the actual next progression-owned
   activity and must not block its dashboard action.
2. Dashboard preparation is destination-aware and idempotent. It returns
   immediately when the destination manifest is already satisfied.
3. Lesson Intro may play its published line only after Clara is ready, but
   published playback alone is not Vox warm-up.
4. Lesson Intro enables `Continue` after its published line finishes and every
   runtime profile declared by the destination manifest is ready. When
   `runtime_profiles` is empty, it must not add a Vox warm-up wait.
5. Every activity that declares runtime profiles performs a mandatory final
   readiness check. This protects portal entry, direct URLs, refreshes, and TTS
   process restarts.
6. Portals must not be redirected through Lesson Intro merely to warm Vox.
7. Warm-up calls are idempotent, single-flight, and safe to repeat.
8. The pulse loader for Clara-model loading retains higher visual priority. The
   shared cube TTS loader appears only when Clara is ready but a manifest-
   declared runtime profile is not.
9. A published-group prefetch must not display the Vox warm-up loader. A
   missing or invalid published asset is a content/deployment failure, not a
   reason to generate an emergency replacement.
10. Fixed assessment lines, finite lesson feedback, authored scaffolds, and
    demonstrations remain published WAVs. Warm-up must not convert them back
    into runtime synthesis.
11. Warm-up may prepare a dynamic path in advance, but it must never generate
    learner-specific text before a response has been committed.

### Latency boundary

Warm-up removes cold-start work; it does not make uncached generation
instantaneous. A genuinely new dynamic line can still require several seconds.
The bounded AI-teacher loop must therefore publish all finite encouragement,
technical retries, clues, scaffold instructions, demonstrations, and
completion language. Runtime synthesis is reserved for the smallest
unpredictable portion, such as safely rendering a committed unexpected final
transcription.

Feedback design must not introduce a new blocking Vox generation after every
incorrect answer. Finite feedback sets that require deterministic immediate
playback are generated, reviewed, and published ahead of learner use. Warm-up
must not be presented as a substitute for the hybrid delivery rule.

## Service API

### `GET /health`

Returns service availability and runtime state:

```json
{
  "service": "tts",
  "status": "ready",
  "runtime_ready": false,
  "model_ready": false,
  "device": null,
  "warming": true,
  "profiles_ready": [],
  "profiles_warming": [],
  "profiles_failed": [],
  "model_error": null
}
```

`status: ready` means the FastAPI process is accepting requests.
`model_ready` reports only whether the process-wide model is resident.
`runtime_ready` is retained as a compatibility alias for `model_ready`; it must
not be used as activity readiness. `profiles_ready` lists reference roles whose
conditioned audio, encoded prompt cache, and disposable generation probe have
succeeded. `profiles_warming` and `profiles_failed` expose profile-level state,
while `model_error` reports a startup model-load failure. The `device` field
reports `cuda` or `cpu` after model loading.

### `POST /warmup`

Prepares the local VoxCPM2 model and only the requested reference profiles.
A missing request body or an empty `profiles` list performs model-only warm-up.

Example request:

```json
{
  "profiles": ["result"]
}
```

Successful response:

```json
{
  "ready": true,
  "device": "cuda",
  "profiles_ready": ["result"]
}
```

Repeated requests for an already-ready profile return immediately. Concurrent
requests for the same profile await the same preparation task. A missing model,
reference, conditioning failure, prompt-encoding failure, or generation-probe
failure returns HTTP `503`. Unknown or duplicate profile names fail request
validation and never begin model work.

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

### Laravel activity-readiness contract

The authenticated learner-facing preparation endpoint is:

```text
POST /api/learners/tts/activity-readiness
```

It accepts no destination fields. Laravel resolves the activity from
server-authoritative progression, the active assessment stage, or the active
portal target. It then:

1. Resolves and validates the activity speech manifest.
2. Selects one current published voice version.
3. Confirms that every required speech row is published.
4. Confirms each private WAV exists and matches its recorded SHA-256 checksum.
5. Skips Vox entirely when `runtime_profiles` is empty.
6. Sends only manifest-declared profiles to the private Vox `/warmup` endpoint.
7. Reports ready only when published speech and all requested profiles are
   ready.

Successful Lesson 1 response:

```json
{
  "activity": "lesson-1",
  "ready": true,
  "published_ready": true,
  "published_groups": ["lesson-1-fixed"],
  "voice_version": "clara-sh-v1",
  "unavailable_speech_keys": [],
  "runtime_required": true,
  "runtime_ready": true,
  "runtime_profiles": ["result"],
  "profiles_ready": ["result"],
  "device": "cuda"
}
```

Part 1 and Part 2 return `runtime_required: false`, an empty profile list, and
do not make a Vox request. Missing, modified, unpublished, or mixed-version
catalog content fails before runtime warm-up. A Vox failure or a response that
omits a requested profile returns HTTP `503` and keeps `ready: false`.

### Required published speech keys

| Speech key | Text | Reference role |
| --- | --- | --- |
| `lesson-intro` | Hi. I am happy you are here. Let us get ready to read together. | `introduce` |
| `lesson-1-mission-1` | Look at the big letter and the small letter. Say their letter name. | `instruction` |
| `lesson-1-mission-2` | Find the first letter in the word. Say its letter name. | `instruction` |
| `lesson-1-mission-3` | Find the missing first letter. Say the letter that completes the word. | `instruction` |
| `lesson-1-complete` | Lesson one is complete. You are a Letter Leader. | `result` |
| `lesson-2-mission-1` | Read the word you see. Say the whole word. | `instruction` |
| `lesson-2-mission-2` | Look at the sentence. Find the highlighted word, then say that word. | `instruction` |
| `lesson-2-complete` | Lesson two is complete. You are a Word Wizard. | `result` |
| `assessment-orientation` | Let us check your microphone. Say ready, then listen to your recording. | `instruction` |
| `assessment-letters` | Say the letter you see. Listen to your voice before you submit. | `instruction` |
| `assessment-rhymes` | Look at both words. Choose yes if they rhyme, or no if they do not. | `question` |
| `assessment-words` | Read the word you see. Listen to your voice before you submit. | `instruction` |
| `assessment-part-one-result` | Part one is complete. You worked hard, and I am proud of you. | `result` |
| `assessment-story-choice` | Choose the story you want to read. You can pick Lena at the Park or Rosa in the Garden. | `question` |
| `assessment-passage` | Read the story aloud. You have one minute. You can submit when you finish. | `instruction` |
| `assessment-part-two-result` | Part two is complete. You finished reading and understanding the story. | `result` |
| `assessment-complete` | Assessment complete. Your first lesson is ready. | `result` |
| `assessment-final-complete` | You finished your Reading Journey. I am proud of how much you learned. | `result` |

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

Diagnostic and Final Assessment reuse every Part 1 and content-specific Part 2
line. Only their completion line differs. The Final Part 2 manifest replaces
`assessment-complete` with `assessment-final-complete`; both manifests remain
published-only and must never warm or call runtime Vox.

### Required published Lesson 1 item cues

The first item of each mission uses the full mission instruction. Positions 2
through 5 use the following published ordinal templates:

| Mission | Text template | Reference role |
| --- | --- | --- |
| Mission 1 | `Now, try the {ordinal} letter.` | `instruction` |
| Mission 2 | `Now, find the first letter in the {ordinal} word.` | `instruction` |
| Mission 3 | `Now, complete the {ordinal} word.` | `instruction` |

The supported Lesson 1 ordinal words are `second`, `third`, `fourth`, and
`fifth`. The server derives the key from the persisted mission and item index;
the browser must not choose or construct progression independently.

### Required published Lesson 1 support families

The fixed Lesson 1 support catalog contains:

- `lesson-1-technical-retry`
- `lesson-1-clue-mission-1` through `lesson-1-clue-mission-3`
- `lesson-1-letter-demo-A` through `lesson-1-letter-demo-Z`
- `lesson-1-feedback-independent`
- `lesson-1-feedback-supported`
- `lesson-1-feedback-demonstrated`
- `lesson-1-feedback-not-yet`
- `lesson-1-feedback-unscorable`

Letter demonstrations render their spoken letter name through the isolated
letter pronunciation source of truth. The independent-success line is
published with the exact text `That is correct. You found it by yourself.`;
the period is intentional because the exclamation-mark rendering produced an
unstable high-pitch candidate during review.

Every fixed key and family above is finite and known in advance. All must be
pre-generated, reviewed, and published; none qualifies for learner-session
generation. Only response-owned final-transcript rendering remains dynamic.

### Required published Lesson 2 speech

The first item of each Lesson 2 mission uses its full instruction. Positions 2
through 5 use the following published ordinal templates:

| Mission | Text template | Reference role |
| --- | --- | --- |
| Mission 1 | `Now, read the {ordinal} word.` | `instruction` |
| Mission 2 | `Now, find and read the {ordinal} highlighted word.` | `instruction` |

The fixed Lesson 2 support catalog contains:

- `lesson-2-technical-retry`
- `lesson-2-clue-mission-1` and `lesson-2-clue-mission-2`
- `lesson-2-feedback-independent`
- `lesson-2-feedback-supported`
- `lesson-2-feedback-demonstrated`
- `lesson-2-feedback-not-yet`
- `lesson-2-feedback-unscorable`

The 3 mission/completion lines, 8 ordinal cues, and 8 fixed support lines total
19 published Lesson 2 lines. The target-word demonstration is deliberately not
one of them because its selected target is run-specific.

### Required published Lesson 3 speech

Lesson 3 has one five-item phrase mission. The first item uses the full mission
instruction and positions 2 through 5 use `Now, read the {ordinal} phrase.`

The fixed Lesson 3 support catalog contains:

- `lesson-3-technical-retry`
- `lesson-3-clue-mission-1`
- `lesson-3-feedback-independent`
- `lesson-3-feedback-supported`
- `lesson-3-feedback-demonstrated`
- `lesson-3-feedback-not-yet`
- `lesson-3-feedback-unscorable`

Every one of the 20 active Version 1 phrase rows also owns a published
`lesson-3-demo-{phrase-slug}` line using the instruction reference. The mission
line, completion line, four ordinal cues, seven support lines, and 20
demonstrations total 33 published Lesson 3 lines. Only the response-owned
final-transcript or targeted alignment feedback uses runtime synthesis and the
`result` profile.

### Required published Lesson 4 speech

Lesson 4 has one five-item sentence mission. The first item uses the full
mission instruction and positions 2 through 5 use
`Now, read the {ordinal} sentence.`

Its fixed support family is:

- `lesson-4-technical-retry`
- `lesson-4-clue-mission-1`
- `lesson-4-feedback-independent`
- `lesson-4-feedback-supported`
- `lesson-4-feedback-demonstrated`
- `lesson-4-feedback-not-yet`
- `lesson-4-feedback-unscorable`

Every active Version 1 sentence row owns
`lesson-4-demo-{sentence-slug}` using the instruction reference. The mission
line, completion line, four ordinal cues, seven support lines, and 20
demonstrations total 33 published Lesson 4 lines. Only response-owned
final-transcript or targeted alignment feedback uses runtime synthesis and the
`result` profile.

### Required published Lesson 5 speech

Lesson 5 has one single-item passage mission. The locked item uses the full
mission instruction.

Its fixed review family is:

- `lesson-5-technical-retry`
- `lesson-5-performance-excellent`
- `lesson-5-performance-strong`
- `lesson-5-performance-growing`
- `lesson-5-performance-beginning`
- `lesson-5-performance-skipped`
- `lesson-5-performance-unavailable`

The mission line, completion line, one technical-retry line, and six review
responses total nine published Lesson 5 lines. Accuracy selects the performance
line; speed does not affect the band. The selected line plays on Passage Review
and must finish before `Next` becomes available. Lesson 5 has no dynamic
feedback request or runtime Vox warm-up.

### Required published Lesson 6 speech

Lesson 6 is fully published choice comprehension. Its catalog contains the
mission instruction, five position-aware question families for every active
content variant, five question-family reminders, authored guided clues,
authored demonstrations, authored correct-feedback lines, and the all-lessons
completion line.

Every Lesson 6 line is known from the locked content snapshot. Lesson 6 has no
runtime Vox profile, no learner-transcript speech, and no TTS warm-up. Wrong
choices select a published support key deterministically from the server-owned
attempt and scaffold state.

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

Before entering an activity, Laravel resolves its server-owned speech-profile
manifest. Required published groups are validated or prefetched through the
private catalog. Only the manifest's `runtime_profiles` are sent to VoxCPM2 for
warm-up.

Lesson Intro plays its published introduction WAV immediately while any
declared runtime profiles warm in parallel. When the destination can require
dynamic speech, Continue remains unavailable until the published line has
finished and every declared profile reports ready. When the destination
declares no runtime profiles, Continue depends on the published introduction
and ordinary page readiness, not on VoxCPM2.

Published assessment instructions and ordinal cues may be fetched one item
ahead as ordinary private audio. This operation is file prefetching, not speech
generation. It must not request every remaining cue or speculate across a
score-dependent boundary.

Published lesson scaffolds, demonstrations, and bounded feedback variants may
also be prefetched for the current teaching state. Prefetch must follow the
approved strategy and must not expose or prematurely play a later scaffold.

After a learner response is committed, a dynamic feedback request may begin
only if the controlled teaching strategy selects a template that contains
unpredictable learner-owned text. A dynamic cache hit can play immediately. A
miss uses the prepared profile while Vox generates the controlled rendering,
such as `You said {final_transcript}.` Fixed acknowledgement, clue,
demonstration, retry, and completion lines continue to use published speech.
The learner must not be permitted to begin recording while any feedback is
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

Model only:

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8002/warmup
```

Model plus the current Lesson 1 runtime profile:

```powershell
$warmupRequest = @{
    profiles = @('result')
} | ConvertTo-Json

Invoke-RestMethod `
    -Method Post `
    -Uri http://127.0.0.1:8002/warmup `
    -ContentType 'application/json' `
    -Body $warmupRequest
```

The first model warm-up may take noticeably longer because it loads the local
model onto the selected device. The first request for a profile then conditions
and encodes its reference and runs one disposable generation probe.

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
2. Generate a candidate WAV through the controlled publication tool. For
   configured prefix families, run
   `php scripts/generate-published-tts-lines.php <prefix> --force` from
   `apps/api/`. The current Lesson 2 family uses the prefix `lesson-2-`.
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

Confirm that all four approved WAV files exist under
`assets/audio/voice-references/sh/` and that their names exactly match the
reference map. Do not substitute a different voice recording automatically.

### First dynamic generation is slow

Check `/health` for `runtime_ready`, `warming`, `profiles_ready`, and `device`.
`runtime_ready: true` is insufficient when the activity's semantic reference
role is absent from `profiles_ready`. Confirm that the activity requested the
correct profile and that its mandatory readiness gate completed.

If the model is resident but the profile is not ready, inspect timing for
reference conditioning, prompt encoding, the disposable generation probe, and
any bad-case retries separately. Do not describe a published WAV fetch as
successful runtime warm-up. CPU generation is expected to be slower than CUDA.
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
- [ ] Service-start warm-up begins without waiting for a learner response.
- [ ] `/health` distinguishes service, model, profile, and generation-path
      readiness.
- [ ] `/warmup` returns `ready: true`, the expected device, and every requested
      profile in `profiles_ready`.
- [ ] Every activity has a server-owned speech-profile manifest.
- [ ] Assessments declare no runtime profiles and never wait for VoxCPM2.
- [ ] Published groups and runtime profiles remain separate readiness concerns.
- [ ] Only manifest-declared runtime profiles are conditioned, prompt-encoded,
      and generation-probed.
- [ ] Lesson 1 declares `result` only while its controlled strategy can reach
      dynamic final-transcript feedback.
- [ ] Dynamic cache misses reuse the process-memory prompt cache instead of
      re-encoding the reference WAV.
- [ ] Concurrent warm-up calls for one profile share a single-flight task.
- [ ] Completion and Dashboard preparation resolve the actual next activity
      manifest opportunistically without blocking navigation.
- [ ] Lesson Intro requires destination-profile readiness before enabling
      `Continue` only when the destination declares runtime profiles.
- [ ] Activities with empty `runtime_profiles` do not show a Vox warm-up wait.
- [ ] Runtime-TTS activity pages enforce their manifest readiness gate for
      portal, direct-route, refresh, and service-restart entry.
- [ ] Portal routes remain direct and do not require Lesson Intro.
- [ ] All four `sh` semantic reference WAV files exist.
- [ ] References are downmixed to mono and only attenuated above `-6 dBFS`.
- [ ] Runtime synthesis uses the approved VoxCPM2 parameters.
- [ ] Concurrent generations are serialized.
- [ ] PostgreSQL stores published speech metadata, not WAV binary bodies.
- [ ] Every finite/general line is pre-generated, reviewed, and catalogued.
- [ ] Finite AI-teacher clues, scaffold instructions, demonstrations, and
      encouragement are pre-generated, reviewed, and catalogued.
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
