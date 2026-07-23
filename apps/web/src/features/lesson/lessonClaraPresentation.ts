import type {
  ClaraEmotion,
  ClaraPresentationCue,
  ClaraTeachingBehavior,
} from "../intro/live2d/ClaraPresentation";

interface LessonClaraPresentationInput {
  completed: boolean;
  processing: boolean;
  guidePreparing: boolean;
  speaking: boolean;
  teachingState?: string;
  outcome?: string | null;
}

export interface LessonClaraPresentation {
  emotion: ClaraEmotion;
  behavior: ClaraTeachingBehavior;
  cue: ClaraPresentationCue;
}

export function resolveLessonClaraPresentation({
  completed,
  processing,
  guidePreparing,
  speaking,
  teachingState,
  outcome,
}: LessonClaraPresentationInput): LessonClaraPresentation {
  if (completed) {
    return {
      emotion: "happy",
      behavior: "celebrating",
      cue: "blush",
    };
  }

  if (processing) {
    return {
      emotion: "thinking",
      behavior: "neutral",
      cue: "none",
    };
  }

  if (
    outcome === "INDEPENDENT_CORRECT" ||
    outcome === "SUPPORTED_CORRECT" ||
    outcome === "DEMONSTRATED"
  ) {
    return {
      emotion: "default",
      behavior: "encouraging",
      cue: "none",
    };
  }

  if (
    teachingState === "GIVING_CLUE" ||
    outcome === "NOT_YET_CORRECT" ||
    outcome === "UNSCORABLE_AUDIO"
  ) {
    return {
      emotion: "default",
      behavior: "gentle_correction",
      cue: "none",
    };
  }

  if (
    teachingState === "DEMONSTRATING" ||
    guidePreparing ||
    speaking
  ) {
    return {
      emotion: "default",
      behavior: "demonstrating",
      cue: "none",
    };
  }

  return {
    emotion: "default",
    behavior: "listening",
    cue: "none",
  };
}
