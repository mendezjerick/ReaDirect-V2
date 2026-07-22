import type { ClaraSpeechKey } from "../clara-audio/claraSpeech";
import type { AssessmentState } from "./assessmentApi";

const stageSpeechKeys: Record<AssessmentState["stage"], ClaraSpeechKey> = {
  orientation: "assessment-orientation",
  "task-1a": "assessment-letters",
  "task-2a": "assessment-rhymes",
  "task-2b": "assessment-words",
  "part-1-results": "assessment-part-one-result",
};

const itemSpeechSegments = {
  "task-1a": "letters",
  "task-2a": "rhymes",
  "task-2b": "words",
} as const;

type ItemSpeechStage = keyof typeof itemSpeechSegments;

function isItemSpeechStage(
  stage: AssessmentState["stage"],
): stage is ItemSpeechStage {
  return stage in itemSpeechSegments;
}

function createItemSpeechKey(
  stage: ItemSpeechStage,
  position: number,
): ClaraSpeechKey | null {
  if (!Number.isInteger(position) || position < 2 || position > 10) {
    return null;
  }

  return `assessment-${itemSpeechSegments[stage]}-item-${position}` as ClaraSpeechKey;
}

export function getAssessmentSpeechKey(
  stage: AssessmentState["stage"],
  position?: number,
): ClaraSpeechKey {
  if (position && isItemSpeechStage(stage)) {
    return createItemSpeechKey(stage, position) ?? stageSpeechKeys[stage];
  }

  return stageSpeechKeys[stage];
}

export function getNextAssessmentSpeechKey(
  stage: AssessmentState["stage"],
  current?: number,
  total?: number,
): ClaraSpeechKey | null {
  if (
    !current ||
    !total ||
    current >= total ||
    !isItemSpeechStage(stage)
  ) {
    return null;
  }

  return createItemSpeechKey(stage, current + 1);
}
