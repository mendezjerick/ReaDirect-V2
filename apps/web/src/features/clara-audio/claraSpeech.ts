import { apiFetchWithTimeout, SPEECH_API_TIMEOUT_MS } from "../../lib/apiUrl";

const speechRequests = new Map<string, Promise<Blob>>();
const SPEECH_DELIVERY_VERSION = "published-clara-sh-v1-catalog-20260728-11";
const LESSON_SIX_SPEECH_DELIVERY_VERSION = "lesson-6-content-alignment-v2";
let audioContext: AudioContext | null = null;
const activeSpeechStops = new Set<() => void>();

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
type LessonFourItemSpeechKey = `lesson-4-mission-1-item-${2 | 3 | 4 | 5}`;
type LessonFourDemonstrationSpeechKey = `lesson-4-demo-${string}`;
type LessonSixSpeechKey =
  | "lesson-6-mission-1"
  | "lesson-6-complete"
  | `lesson-6-clue-${"who" | "what" | "where" | "when" | "why"}`
  | `lesson-6-${"question" | "guided" | "demo" | "correct"}-${string}`;

export type ClaraSpeechKey =
  | "learn-with-clara-letters-parade-opening"
  | "learn-with-clara-letters-find-a"
  | "learn-with-clara-letters-find-b"
  | "learn-with-clara-letters-find-c"
  | "learn-with-clara-letters-find-d"
  | "learn-with-clara-letters-find-e"
  | "learn-with-clara-letters-parade-finale"
  | "learn-with-clara-words-rescue-opening"
  | "learn-with-clara-words-find-bat"
  | "learn-with-clara-words-find-can"
  | "learn-with-clara-words-find-dot"
  | "learn-with-clara-words-find-gap"
  | "learn-with-clara-words-find-hot"
  | "learn-with-clara-words-rescue-finale"
  | "lesson-intro"
  | "assessment-final-complete"
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
  | "lesson-4-mission-1"
  | "lesson-4-complete"
  | "lesson-4-technical-retry"
  | "lesson-4-clue-mission-1"
  | "lesson-4-feedback-independent"
  | "lesson-4-feedback-supported"
  | "lesson-4-feedback-demonstrated"
  | "lesson-4-feedback-not-yet"
  | "lesson-4-feedback-unscorable"
  | "lesson-5-mission-1"
  | "lesson-5-complete"
  | "lesson-5-technical-retry"
  | "lesson-5-performance-excellent"
  | "lesson-5-performance-strong"
  | "lesson-5-performance-growing"
  | "lesson-5-performance-beginning"
  | "lesson-5-performance-skipped"
  | "lesson-5-performance-unavailable"
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
  | LessonThreeDemonstrationSpeechKey
  | LessonFourItemSpeechKey
  | LessonFourDemonstrationSpeechKey
  | LessonSixSpeechKey;

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
  const deliveryVersion = speechKey.startsWith("lesson-6-")
    ? `${SPEECH_DELIVERY_VERSION}:${LESSON_SIX_SPEECH_DELIVERY_VERSION}`
    : SPEECH_DELIVERY_VERSION;
  const requestKey = `${deliveryVersion}:${token}:${speechKey}`;
  const existingRequest = speechRequests.get(requestKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = apiFetchWithTimeout(
    `/api/learners/tts/speech/${speechKey}`,
    {
      method: "POST",
      headers: {
        Accept: "audio/wav",
        Authorization: `Bearer ${token}`,
      },
    },
    SPEECH_API_TIMEOUT_MS,
  ).then(async (response) => {
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
  let stop: () => void = () => undefined;
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
    activeSpeechStops.delete(stop);
    resolveFinished?.();
  };

  source.addEventListener("ended", finish, { once: true });
  source.start();
  animationFrame = window.requestAnimationFrame(sampleLevel);
  stop = () => {
    if (stopped) {
      return;
    }

    stopped = true;
    source.stop();
  };
  activeSpeechStops.add(stop);

  return {
    finished,
    stop,
  };
}

export function clearPreparedClaraSpeech(): void {
  speechRequests.clear();
}

export function stopAllClaraSpeech(): void {
  for (const stop of [...activeSpeechStops]) {
    stop();
  }
}

/**
 * Plays a validated local Clara asset through the same stop registry used by
 * online Clara playback. The caller owns the source selection and supplies
 * only an already-local URI; this helper never fetches or generates speech.
 */
export async function playClaraAudioSource(
  sourceUri: string,
): Promise<ClaraSpeechPlayback> {
  const audio = new Audio(sourceUri);
  let stopped = false;
  let resolveFinished!: () => void;
  let rejectFinished!: (error: Error) => void;
  const finished = new Promise<void>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });

  let onEnded: () => void = () => undefined;
  const finish = (error?: Error) => {
    if (stopped) return;
    stopped = true;
    audio.removeEventListener("ended", onEnded);
    activeSpeechStops.delete(stop);
    if (error) rejectFinished(error);
    else resolveFinished();
  };
  onEnded = () => finish();
  const stop = () => {
    if (stopped) return;
    audio.pause();
    audio.currentTime = 0;
    finish();
  };

  audio.preload = "auto";
  audio.addEventListener("ended", onEnded, { once: true });
  audio.addEventListener(
    "error",
    () => finish(new Error("The local Clara audio asset could not be read.")),
    { once: true },
  );
  activeSpeechStops.add(stop);

  try {
    await audio.play();
  } catch (error) {
    stop();
    throw error;
  }

  return { finished, stop };
}
