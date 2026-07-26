import { MISSION_IDS } from "../content/missions";
import type { QuestionRound } from "../questions/questionRound";
import { READING_HEARTS_TOTAL, type MissionState } from "./missionState";
import { CONTENT_VERSION_ID, isGameLanguage, MINIGAME_ID, type GameLanguage } from "../localization/language";

export const MISSION_PROGRESS_KEY = "readirect-rpg:mission-progress:v1";

export type StoredMissionProgress = {
  version: 1;
  minigameId?: typeof MINIGAME_ID;
  contentVersionId?: typeof CONTENT_VERSION_ID;
  language?: GameLanguage;
  state: MissionState;
};

export function createStoredMissionProgress(state: MissionState): StoredMissionProgress {
  return {
    version: 1,
    minigameId: MINIGAME_ID,
    contentVersionId: CONTENT_VERSION_ID,
    language: state.language,
    state: { ...state, availableInteraction: null, helpOpen: false }
  };
}

export function restoreMissionProgress(
  value: unknown,
  fallbackRounds: readonly QuestionRound[]
): MissionState | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Partial<StoredMissionProgress>;
  if (stored.version !== 1 || !isMissionState(stored.state)) return null;
  if (!sameRoundCatalog(stored.state.rounds, fallbackRounds)) return null;
  const restoredStage = restoreSafeStage(stored.state);
  return {
    ...stored.state,
    stage: restoredStage,
    language: isGameLanguage(stored.state.language) ? stored.state.language : "en",
    readingPageIndex: Number.isInteger(stored.state.readingPageIndex) ? stored.state.readingPageIndex : 0,
    incorrectSubmissionsByQuestion: stored.state.incorrectSubmissionsByQuestion ?? {},
    readingHeartsRemaining: loadReadingHearts(stored.state),
    recoveredQuestionIds: stored.state.recoveredQuestionIds ?? [],
    passageRereadCount: Number.isInteger(stored.state.passageRereadCount) ? stored.state.passageRereadCount : 0,
    comprehensionRestartCount: Number.isInteger(stored.state.comprehensionRestartCount)
      ? Math.max(0, stored.state.comprehensionRestartCount)
      : 0,
    availableInteraction: null,
    helpOpen: false,
    activeDialogue: stored.state.activeDialogue ?? null
  };
}

function restoreSafeStage(state: MissionState): MissionState["stage"] {
  if (state.stage === "deferredResume" || state.stage === "questionsRemaining") return "missionInProgress";
  if (state.stage === "deferredConfirmation") return "questionRound";
  return state.stage;
}

function loadReadingHearts(state: MissionState) {
  if (Number.isInteger(state.readingHeartsRemaining)) {
    return Math.min(READING_HEARTS_TOTAL, Math.max(0, state.readingHeartsRemaining));
  }
  const legacy = state as MissionState & { heartsByQuestion?: Record<string, number> };
  const legacyValues = Object.values(legacy.heartsByQuestion ?? {}).filter(Number.isFinite);
  return legacyValues.length > 0
    ? Math.min(READING_HEARTS_TOTAL, Math.max(0, Math.min(...legacyValues)))
    : READING_HEARTS_TOTAL;
}

function isMissionState(value: unknown): value is MissionState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<MissionState>;
  return (
    typeof state.missionId === "string" &&
    MISSION_IDS.includes(state.missionId as (typeof MISSION_IDS)[number]) &&
    typeof state.missionIndex === "number" &&
    typeof state.stage === "string" &&
    Array.isArray(state.rounds) &&
    Array.isArray(state.completedQuestionIds) &&
    Array.isArray(state.savedQuestionIds) &&
    Array.isArray(state.completedMissionIds)
  );
}

function sameRoundCatalog(saved: readonly QuestionRound[], fallback: readonly QuestionRound[]) {
  return saved.length === fallback.length && saved.every((round, index) => round.missionId === fallback[index].missionId);
}
