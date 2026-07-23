import type { ClaraLookTarget } from "./ClaraInteractionTracker";

export const CLARA_EMOTIONS = [
  "default",
  "happy",
  "thinking",
  "confused",
] as const;

export const CLARA_TEACHING_BEHAVIORS = [
  "neutral",
  "listening",
  "encouraging",
  "gentle_correction",
  "demonstrating",
  "celebrating",
] as const;

export const CLARA_PRESENTATION_CUES = [
  "none",
  "question_mark",
  "blush",
] as const;

export type ClaraEmotion = (typeof CLARA_EMOTIONS)[number];
export type ClaraTeachingBehavior = (typeof CLARA_TEACHING_BEHAVIORS)[number];
export type ClaraPresentationCue = (typeof CLARA_PRESENTATION_CUES)[number];

export interface ClaraPresentationState {
  emotion: ClaraEmotion;
  behavior: ClaraTeachingBehavior;
  cue: ClaraPresentationCue;
  speaking: boolean;
  speechLevel?: number;
}

export const DEFAULT_CLARA_PRESENTATION: ClaraPresentationState = {
  emotion: "default",
  behavior: "neutral",
  cue: "none",
  speaking: false,
};

const DEMONSTRATION_LOOK_TARGET: ClaraLookTarget = Object.freeze({
  active: true,
  x: 0.58,
  y: 0.62,
});

export function resolveClaraPresentationLookTarget(
  presentation: ClaraPresentationState,
  interactionTarget: ClaraLookTarget,
): ClaraLookTarget {
  return presentation.behavior === "demonstrating"
    ? DEMONSTRATION_LOOK_TARGET
    : interactionTarget;
}
