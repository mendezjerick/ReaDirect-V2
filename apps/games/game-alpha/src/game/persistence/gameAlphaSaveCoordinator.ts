import type { GameAlphaHostAdapter } from "../../host/GameAlphaHostAdapter";

import {
  GAME_ALPHA_CHECKPOINT_KEY,
  GAME_ALPHA_SAVE_SCHEMA_VERSION,
  createGameAlphaSaveState,
  gameAlphaStatesEqual,
  hydrateGameAlphaSave,
  mergeGameAlphaRun,
  type GameAlphaCompletedRun,
  type GameAlphaSaveState,
  type HydratedGameAlphaProgress,
} from "./gameAlphaSaveContract";

/**
 * Persists one completed run with a single bounded conflict reconciliation.
 * A failed write never changes the caller's in-memory result.
 */
export async function persistGameAlphaRun(
  host: GameAlphaHostAdapter,
  current: HydratedGameAlphaProgress,
  completedRun: GameAlphaCompletedRun,
): Promise<HydratedGameAlphaProgress> {
  const target = mergeGameAlphaRun(current.state, completedRun);
  if (gameAlphaStatesEqual(target, current.state)) return current;

  try {
    return hydrateGameAlphaSave(
      await host.save({
        checkpointKey: GAME_ALPHA_CHECKPOINT_KEY,
        saveSchemaVersion: GAME_ALPHA_SAVE_SCHEMA_VERSION,
        state: createGameAlphaSaveState(target),
        expectedRevision: current.revision,
      }),
    );
  } catch (writeError) {
    const remote = hydrateGameAlphaSave(await host.load());
    const reconciled = mergeGameAlphaRun(remote.state, completedRun);

    // A timeout or conflict may have committed this run already. Accept the
    // server's equal/better state without issuing another write.
    if (gameAlphaStatesEqual(reconciled, remote.state)) return remote;

    try {
      return hydrateGameAlphaSave(
        await host.save({
          checkpointKey: GAME_ALPHA_CHECKPOINT_KEY,
          saveSchemaVersion: GAME_ALPHA_SAVE_SCHEMA_VERSION,
          state: createGameAlphaSaveState(reconciled),
          expectedRevision: remote.revision,
        }),
      );
    } catch {
      throw writeError;
    }
  }
}

export function gameAlphaProgressFromState(
  state: GameAlphaSaveState,
  revision: number,
): HydratedGameAlphaProgress {
  return { state, revision };
}
