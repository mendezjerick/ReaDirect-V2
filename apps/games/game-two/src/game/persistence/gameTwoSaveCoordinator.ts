import type { GameTwoHostAdapter } from "../../host/GameTwoHostAdapter";

import {
  createGameTwoCheckpoint,
  createGameTwoSaveState,
  gameTwoStatesEqual,
  hydrateGameTwoSave,
  mergeGameTwoCompletion,
  GAME_TWO_SAVE_SCHEMA_VERSION,
  type GameTwoCompletedStage,
  type HydratedGameTwoProgress,
} from "./gameTwoSaveContract";

export async function persistGameTwoCompletion(
  host: GameTwoHostAdapter,
  current: HydratedGameTwoProgress,
  completedStage: GameTwoCompletedStage,
): Promise<HydratedGameTwoProgress> {
  const target = mergeGameTwoCompletion(current.state, completedStage);
  if (gameTwoStatesEqual(target, current.state)) return current;

  try {
    return hydrateGameTwoSave(
      await host.save({
        checkpointKey: createGameTwoCheckpoint(completedStage.stageId),
        saveSchemaVersion: GAME_TWO_SAVE_SCHEMA_VERSION,
        state: createGameTwoSaveState(target),
        expectedRevision: current.revision,
      }),
    );
  } catch (writeError) {
    const remote = hydrateGameTwoSave(await host.load());
    const reconciled = mergeGameTwoCompletion(remote.state, completedStage);

    if (gameTwoStatesEqual(reconciled, remote.state)) return remote;

    try {
      return hydrateGameTwoSave(
        await host.save({
          checkpointKey: createGameTwoCheckpoint(completedStage.stageId),
          saveSchemaVersion: GAME_TWO_SAVE_SCHEMA_VERSION,
          state: createGameTwoSaveState(reconciled),
          expectedRevision: remote.revision,
        }),
      );
    } catch {
      throw writeError;
    }
  }
}
