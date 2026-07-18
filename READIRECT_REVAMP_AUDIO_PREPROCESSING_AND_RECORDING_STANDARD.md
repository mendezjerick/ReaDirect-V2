# ReaDirect Revamp Audio Preprocessing and Recording Standard

This document defines the required audio preprocessing, recording, playback, and turn-taking behavior for ReaDirect-V2.

## Core Principles

ReaDirect must:

- Follow Whisper-compatible audio preprocessing.
- Start learner recording immediately with no hidden waiting period.
- Preserve speech that begins slightly before the visible listening state.
- Prevent VoxCPM2 audio from entering learner recordings.
- Mute or stop VoxCPM2 whenever learner recording or learner-audio playback is active.
- Use the same preprocessing rules during training, validation, testing, and live inference.

## Model Audio Input Standard

All audio passed to Nu or Mu must use:

```text
Sample rate: 16,000 Hz
Channels: Mono
Waveform type: float32
Amplitude range: approximately -1.0 to +1.0
```

Processed audio stored temporarily may use:

```text
WAV
16-bit PCM
16,000 Hz
Mono
```

## Required Preprocessing Flow

```text
Recorded or uploaded audio
        ->
Decode supported audio format
        ->
Convert to mono
        ->
Resample to 16,000 Hz
        ->
Convert waveform to float32
        ->
Remove material DC offset
        ->
Conservative speech-boundary trimming
        ->
Preserve pre-speech and post-speech padding
        ->
Perform audio-quality checks
        ->
Run model-specific Whisper-compatible feature extraction
        ->
Nu or Mu model input
```

## Resampling

Audio captured by browsers and devices may use:

```text
44,100 Hz
48,000 Hz
```

The ASR service must perform the final conversion to:

```text
16,000 Hz
```

The browser must not be trusted to always provide true 16 kHz audio.

## Mono Conversion

Stereo recordings must be converted to mono before model input.

The conversion must preserve speech intelligibility and must not introduce clipping.

## Waveform Conversion

The decoded waveform must be converted to `float32` before being passed to the Whisper feature extractor.

## Waveform Normalization

Aggressive peak normalization is prohibited.

Do not automatically maximize every recording because this may amplify:

- Classroom noise
- Fan noise
- Microphone hiss
- Quiet breathing
- Background conversations

Whisper waveform normalization must remain configurable during model evaluation.

Required configurations to compare:

```text
Configuration A
16 kHz mono
No waveform normalization

Configuration B
16 kHz mono
Whisper waveform normalization enabled
```

The selected configuration must be based on validation results.

## Silence Trimming

Silence trimming must be conservative.

The system must not trim exactly at the detected speech boundary.

Required initial padding ranges:

```text
Before detected speech: 150-250 ms
After detected speech: 200-300 ms
```

These values must be calibrated using the ReaDirect validation recordings.

The system must preserve short consonant information at the beginning and end of responses.

## Audio-Quality Checks

Before model inference, evaluate:

- Whether speech is present
- Recording duration
- Excessive silence
- Very low volume
- Clipping
- Multiple speech segments
- Abnormally long recordings
- Empty or corrupted audio
- Unsupported audio format

Possible quality results:

```text
USABLE
SILENCE
TOO_QUIET
CLIPPED
MULTIPLE_RESPONSES
TOO_LONG
CORRUPTED
UNUSABLE_AUDIO
```

The system must not force unusable audio through the scoring model.

## Immediate Recording Behavior

The previous hidden one-second waiting period must be removed.

The learner-facing recording delay must be:

```text
0 seconds
```

The system must not use:

```text
Press or activate recording
        ->
Wait one second
        ->
Begin capturing audio
```

The required behavior is:

```text
Learner turn begins
        ->
Recording becomes active immediately
        ->
Listening indicator appears
        ->
Learner speaks naturally
```

## Microphone Initialization

The microphone must be initialized before the learner is expected to speak.

Recommended initialization points:

- During the microphone-check screen
- During the tutorial
- At the beginning of the learner session

The microphone stream may remain prepared between activities, but learner audio must only be evaluated during an active listening state.

## Pre-Roll Buffer

The system must preserve a short rolling audio buffer before the official listening state.

Required initial pre-roll range:

```text
300-500 ms
```

When learner recording begins, the pre-roll audio must be included at the start of the captured response.

This prevents early speech and initial consonants from being cut off.

## Recording State Flow

```text
READY
   ->
LISTENING
   ->
SPEECH_DETECTED
   ->
ENDPOINT_PENDING
   ->
PROCESSING
   ->
RESULT
```

### READY

- Microphone is initialized.
- Learner audio is not yet scored.
- VoxCPM2 may speak only when recording and learner playback are inactive.

### LISTENING

- Learner recording begins immediately.
- Pre-roll is preserved.
- VoxCPM2 must be muted or stopped.
- The Live2D character enters its listening state.
- The microphone indicator must be visibly active.

### SPEECH_DETECTED

- Learner speech has been detected.
- Recording continues until endpoint conditions are satisfied.

### ENDPOINT_PENDING

- The system preserves post-speech padding.
- The system checks for additional speech before stopping.

### PROCESSING

- Recording stops.
- Audio is preprocessed.
- VoxCPM2 remains muted.
- The captured learner audio may be replayed only when requested or required.

### RESULT

- The system displays or speaks feedback.
- VoxCPM2 may resume only after learner recording and learner-audio playback are fully stopped.

## VoxCPM2 Audio Rules

VoxCPM2 must never speak while:

- The learner recorder is listening
- Learner speech is being captured
- Learner-recorded audio is being replayed
- Uploaded learner audio is being previewed
- A recording is being reviewed for scoring
- The microphone-check playback is active

Required rule:

```text
If recorder state is LISTENING:
    VoxCPM2 output must be muted or stopped.

If learner audio playback is active:
    VoxCPM2 output must be muted or stopped.
```

## VoxCPM2 Interruption Behavior

When the learner recorder begins:

1. Stop any active VoxCPM2 audio.
2. Clear or pause queued VoxCPM2 playback.
3. Confirm that agent audio has ended.
4. Start or continue the pre-roll buffer.
5. Enter the active listening state.
6. Prevent new VoxCPM2 playback until listening ends.

When learner-audio playback begins:

1. Stop any active VoxCPM2 audio.
2. Block new VoxCPM2 playback.
3. Play the learner audio.
4. Restore VoxCPM2 eligibility only after playback ends.

## Playback Priority

Audio playback priority must be:

```text
1. Learner-recorded audio
2. Validated instructional phoneme audio
3. VoxCPM2 feedback audio
4. Background music
5. Sound effects
```

Higher-priority playback must suppress conflicting lower-priority playback when necessary.

## Background Music Behavior

Background music must:

- Lower in volume during agent speech
- Lower further or pause during learner recording
- Lower or pause during learner-audio playback
- Never interfere with ASR capture
- Resume gradually after recording or playback ends

## Sound-Effect Behavior

Sound effects must not play while the recorder is actively listening unless they are silent visual effects.

Do not play:

- Button sounds
- Countdown sounds
- Reward sounds
- Transition sounds

during learner speech capture.

## Turn-Taking Rules

The required turn-taking flow is:

```text
VoxCPM2 instruction
        ->
VoxCPM2 stops
        ->
Recorder becomes active immediately
        ->
Learner speaks
        ->
Recorder stops after endpoint detection
        ->
Learner audio is processed
        ->
Optional learner-audio playback
        ->
VoxCPM2 feedback
```

VoxCPM2 and learner recording must not operate as competing audio sources.

## Timing Defaults

### Isolated Letters

```text
Pre-roll: 300-500 ms
Pre-speech preservation: 150-250 ms
Post-speech padding: 200-300 ms
Maximum response duration: approximately 3 seconds
```

### Words and Short Phrases

```text
Pre-roll: 300-500 ms
Post-speech padding: 300-500 ms
Maximum response duration: approximately 5-8 seconds
```

### Sentences and Passages

Sentences and passages must use a separate endpoint strategy designed for longer continuous speech.

## Recording Interface Rules

When listening begins:

- The microphone control must visibly activate.
- The Live2D character must stop speaking.
- The character must enter a listening expression or pose.
- The learner must receive a clear visual cue such as "Your turn."
- No countdown is required.
- No invisible delay is allowed.
- The recorder must already be capturing audio.

## Uploaded Audio

Uploaded recordings must use the same preprocessing and quality checks as microphone recordings.

The system must not expose local dataset paths or server file paths through the frontend.

## Training and Inference Consistency

The preprocessing pipeline must be identical across:

- Training
- Validation
- Testing
- System Administrator model testing
- Learner-facing inference

The following must remain consistent:

- Mono conversion
- 16 kHz resampling
- Waveform type
- Trimming behavior
- Padding values
- Normalization setting
- Model-specific Whisper-compatible feature extraction
- Model-specific attention-mask handling where applicable

## Logging

Log:

- Original sample rate
- Original channel count
- Processed sample rate
- Processed duration
- Speech-detection result
- Quality result
- Clipping result
- Pre-roll duration
- Post-speech padding
- Preprocessing duration
- Inference duration
- Recorder start and stop timestamps
- VoxCPM2 interruption events

Do not place identifiable learner audio paths in public-facing logs.

## Acceptance Criteria

The audio system is acceptable when:

1. Recording starts with no hidden one-second delay.
2. Early learner speech is preserved through pre-roll buffering.
3. Initial consonants are not consistently clipped.
4. All Nu/Mu model input is mono, 16 kHz, and float32.
5. Training and live inference use the same preprocessing.
6. VoxCPM2 stops or mutes whenever the recorder is listening.
7. VoxCPM2 stops or mutes during learner-audio playback.
8. Background music and sound effects do not contaminate recordings.
9. Unusable audio is rejected before model scoring.
10. The system returns clear quality results for silence, clipping, and low-volume input.
11. Temporary learner audio is handled according to the approved retention policy.
12. The complete turn-taking flow works on supported mobile and desktop browsers.
