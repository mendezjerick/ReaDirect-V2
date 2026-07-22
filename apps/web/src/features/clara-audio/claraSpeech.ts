const speechRequests = new Map<string, Promise<Blob>>();
const SPEECH_DELIVERY_VERSION = "published-clara-sh-v1";
let audioContext: AudioContext | null = null;

type AssessmentItemOrdinal = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type AssessmentItemSpeechKey =
  `assessment-${"letters" | "rhymes" | "words"}-item-${AssessmentItemOrdinal}`;
type AssessmentComprehensionSpeechKey =
  `assessment-comprehension-${"lena" | "rosa"}-item-${1 | 2 | 3 | 4 | 5}`;

export type ClaraSpeechKey =
  | "lesson-intro"
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
  | AssessmentComprehensionSpeechKey;

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
