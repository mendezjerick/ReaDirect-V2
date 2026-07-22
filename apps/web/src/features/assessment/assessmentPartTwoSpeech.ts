import type { ClaraSpeechKey } from "../clara-audio/claraSpeech";

import type { AssessmentPartTwoState } from "./assessmentPartTwoApi";

function storyVoiceKey(storyKey: string | null): "lena" | "rosa" {
  return storyKey?.includes("rosa") ? "rosa" : "lena";
}

export function getPartTwoSpeechKey(
  state: AssessmentPartTwoState,
): ClaraSpeechKey {
  if (state.stage === "story-selection") return "assessment-story-choice";
  if (state.stage === "task-3a") return "assessment-passage";
  if (state.stage === "part-2-results") return "assessment-part-two-result";
  if (state.stage === "assessment-complete") return "assessment-complete";

  const item = Math.min(5, Math.max(1, state.progress?.current ?? 1)) as
    | 1
    | 2
    | 3
    | 4
    | 5;
  return `assessment-comprehension-${storyVoiceKey(state.selected_story_key)}-item-${item}`;
}

export function getNextPartTwoSpeechKey(
  state: AssessmentPartTwoState,
): ClaraSpeechKey | null {
  if (state.stage === "task-3a") {
    return `assessment-comprehension-${storyVoiceKey(state.selected_story_key)}-item-1`;
  }

  if (
    state.stage !== "task-3b" ||
    !state.progress ||
    state.progress.current >= state.progress.total
  ) {
    return null;
  }

  const item = (state.progress.current + 1) as 2 | 3 | 4 | 5;
  return `assessment-comprehension-${storyVoiceKey(state.selected_story_key)}-item-${item}`;
}
