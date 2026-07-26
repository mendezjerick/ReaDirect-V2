import type { QuestionRound } from "../questions/questionRound";
import {
  createStoredMissionProgress,
  restoreMissionProgress
} from "../mission/missionPersistence";
import {
  createInitialExplorationProgress,
  restoreExplorationProgress,
  type ExplorationProgress
} from "../world/explorationPersistence";
import {
  createStoredTutorialProgress,
  restoreTutorialProgress,
  type TutorialState
} from "../tutorial/tutorialState";
import { CONTENT_VERSION_ID, type GameLanguage } from "../localization/language";
import type { GameOneRemoteSave } from "../../host/GameOneHostAdapter";
import { createInitialMissionState, type MissionState } from "../mission/missionState";

export const GAME_ONE_SAVE_SCHEMA_VERSION = 1;

export type HydratedGameOneProgress = {
  mission: MissionState;
  exploration: ExplorationProgress;
  tutorial: TutorialState;
  revision: number;
};

export function createInitialGameOneProgress(
  rounds: readonly QuestionRound[],
  language: GameLanguage
): HydratedGameOneProgress {
  return {
    mission: createInitialMissionState(rounds, language),
    exploration: createInitialExplorationProgress(),
    tutorial: restoreTutorialProgress(null),
    revision: 0
  };
}

export function hydrateGameOneProgress(
  save: GameOneRemoteSave | null,
  rounds: readonly QuestionRound[],
  language: GameLanguage
): HydratedGameOneProgress {
  if (save === null) return createInitialGameOneProgress(rounds, language);
  if (save.saveSchemaVersion !== GAME_ONE_SAVE_SCHEMA_VERSION) {
    throw new Error("This Game One save uses an unsupported schema version.");
  }
  if (!save.state || typeof save.state !== "object" || Array.isArray(save.state)) {
    throw new Error("The Game One save state is invalid.");
  }

  const state = save.state as Record<string, unknown>;
  if (state.contentVersionId !== CONTENT_VERSION_ID) {
    throw new Error("This Game One save belongs to a different content version.");
  }

  const mission = restoreMissionProgress(state.mission, rounds);
  const exploration = restoreExplorationProgress(state.exploration);
  if (!mission || !exploration) {
    throw new Error("The Game One save could not be restored safely.");
  }

  return {
    mission,
    exploration,
    tutorial: restoreTutorialProgress(state.tutorial),
    revision: save.revision
  };
}

export function createGameOneSaveState(
  mission: MissionState,
  exploration: ExplorationProgress,
  tutorial: TutorialState
): Record<string, unknown> {
  return {
    contentVersionId: CONTENT_VERSION_ID,
    mission: createStoredMissionProgress(mission),
    exploration,
    tutorial: createStoredTutorialProgress(tutorial)
  };
}

export function checkpointKeyForMission(mission: MissionState): string {
  return mission.activityCompleted
    ? "journey-complete"
    : `mission-${Math.max(1, mission.missionIndex + 1)}`;
}
