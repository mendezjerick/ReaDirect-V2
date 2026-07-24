const speechRequests = new Map<string, Promise<Blob>>();
const SPEECH_DELIVERY_VERSION = "published-clara-sh-v1-catalog-20260724-7";
let audioContext: AudioContext | null = null;

type AssessmentItemOrdinal = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type AssessmentItemSpeechKey =
  `assessment-${"letters" | "rhymes" | "words"}-item-${AssessmentItemOrdinal}`;
type AssessmentComprehensionSpeechKey =
  `assessment-comprehension-${"lena" | "rosa"}-item-${1 | 2 | 3 | 4 | 5}`;
type UppercaseLetter =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";
type LessonOneDemonstrationSpeechKey =
  `lesson-1-letter-demo-${UppercaseLetter}`;
type LessonOneItemSpeechKey =
  `lesson-1-${"mission-1" | "mission-2" | "mission-3"}-item-${2 | 3 | 4 | 5}`;
type LessonTwoItemSpeechKey =
  `lesson-2-${"mission-1" | "mission-2"}-item-${2 | 3 | 4 | 5}`;
type LessonThreeItemSpeechKey = `lesson-3-mission-1-item-${2 | 3 | 4 | 5}`;
type LessonThreeDemonstrationSpeechKey = `lesson-3-demo-${string}`;

export type ClaraSpeechKey =
  | "learn-with-clara-lesson-1-greeting-morning"
  | "learn-with-clara-lesson-1-greeting-afternoon"
  | "learn-with-clara-lesson-1-greeting-evening"
  | "learn-with-clara-lesson-1-pair-a"
  | "learn-with-clara-lesson-1-pair-b"
  | "learn-with-clara-lesson-1-pair-c"
  | "learn-with-clara-lesson-1-pair-d"
  | "learn-with-clara-lesson-1-pair-e"
  | "learn-with-clara-lesson-1-story-name-opening"
  | "learn-with-clara-lesson-1-story-name-detail"
  | "learn-with-clara-lesson-1-story-name-close"
  | "learn-with-clara-lesson-1-story-name-return"
  | "learn-with-clara-lesson-1-chapter-1-complete"
  | "lesson-intro"
  | "lesson-1-mission-1"
  | "lesson-1-mission-2"
  | "lesson-1-mission-3"
  | "lesson-1-complete"
  | "lesson-1-technical-retry"
  | "lesson-1-clue-mission-1"
  | "lesson-1-clue-mission-2"
  | "lesson-1-clue-mission-3"
  | "lesson-1-feedback-independent"
  | "lesson-1-feedback-supported"
  | "lesson-1-feedback-demonstrated"
  | "lesson-1-feedback-not-yet"
  | "lesson-1-feedback-unscorable"
  | "lesson-2-mission-1"
  | "lesson-2-mission-2"
  | "lesson-2-complete"
  | "lesson-2-technical-retry"
  | "lesson-2-clue-mission-1"
  | "lesson-2-clue-mission-2"
  | "lesson-2-feedback-independent"
  | "lesson-2-feedback-supported"
  | "lesson-2-feedback-demonstrated"
  | "lesson-2-feedback-not-yet"
  | "lesson-2-feedback-unscorable"
  | "lesson-3-mission-1"
  | "lesson-3-complete"
  | "lesson-3-technical-retry"
  | "lesson-3-clue-mission-1"
  | "lesson-3-feedback-independent"
  | "lesson-3-feedback-supported"
  | "lesson-3-feedback-demonstrated"
  | "lesson-3-feedback-not-yet"
  | "lesson-3-feedback-unscorable"
  | "assessment-orientation"
  | "assessment-letters"
  | "assessment-rhymes"
  | "assessment-words"
  | "assessment-part-one-result"
  | "assessment-story-choice"
  | "assessment-passage"
  | "assessment-part-two-result"
  | "assessment-complete"
  | AssessmentItemSpeechKey
  | AssessmentComprehensionSpeechKey
  | LessonOneDemonstrationSpeechKey
  | LessonOneItemSpeechKey
  | LessonTwoItemSpeechKey
  | LessonThreeItemSpeechKey
  | LessonThreeDemonstrationSpeechKey;

export interface ClaraSpeechPlayback {
  finished: Promise<void>;
  stop: () => void;
}

export interface ClaraSpeechPlaybackOptions {
  modelState: "loading" | "ready" | "error";
}

function getAudioContext(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
}

async function readSpeechError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);

  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  return "Ma'am Clara could not get her voice ready. Please try again.";
}

export function unlockClaraAudio(): void {
  const context = getAudioContext();

  if (context.state === "suspended") {
    void context.resume();
  }
}

export function prepareClaraSpeech(
  speechKey: ClaraSpeechKey,
  token: string,
): Promise<Blob> {
  const requestKey = `${SPEECH_DELIVERY_VERSION}:${token}:${speechKey}`;
  const existingRequest = speechRequests.get(requestKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = fetch(`/api/learners/tts/speech/${speechKey}`, {
    method: "POST",
    headers: {
      Accept: "audio/wav",
      Authorization: `Bearer ${token}`,
    },
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await readSpeechError(response));
    }

    return response.blob();
  });

  speechRequests.set(requestKey, request);
  void request.catch(() => speechRequests.delete(requestKey));
  return request;
}

export async function playClaraSpeech(
  speech: Blob,
  onLevel: (level: number) => void,
  options: ClaraSpeechPlaybackOptions,
): Promise<ClaraSpeechPlayback> {
  if (options.modelState !== "ready") {
    throw new Error("Ma'am Clara must finish loading before speech playback.");
  }

  const context = getAudioContext();

  if (context.state === "suspended") {
    await context.resume();
  }

  const audioBuffer = await context.decodeAudioData(await speech.arrayBuffer());
  const source = context.createBufferSource();
  const analyser = context.createAnalyser();
  let animationFrame = 0;
  let stopped = false;
  let resolveFinished: (() => void) | undefined;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });

  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.68;
  const samples = new Uint8Array(analyser.fftSize);
  source.buffer = audioBuffer;
  source.connect(analyser);
  analyser.connect(context.destination);

  const sampleLevel = () => {
    analyser.getByteTimeDomainData(samples);
    let sum = 0;

    for (const sample of samples) {
      const centered = (sample - 128) / 128;
      sum += centered * centered;
    }

    const rms = Math.sqrt(sum / samples.length);
    onLevel(Math.min(1, rms * 7));
    animationFrame = window.requestAnimationFrame(sampleLevel);
  };

  const finish = () => {
    stopped = true;
    window.cancelAnimationFrame(animationFrame);
    onLevel(0);
    source.disconnect();
    analyser.disconnect();
    resolveFinished?.();
  };

  source.addEventListener("ended", finish, { once: true });
  source.start();
  animationFrame = window.requestAnimationFrame(sampleLevel);

  return {
    finished,
    stop: () => {
      if (stopped) {
        return;
      }

      stopped = true;
      source.stop();
    },
  };
}

export function clearPreparedClaraSpeech(): void {
  speechRequests.clear();
}
