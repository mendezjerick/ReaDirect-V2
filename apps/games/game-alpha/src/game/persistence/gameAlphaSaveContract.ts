import type { GameAlphaRemoteSave } from "../../host/GameAlphaHostAdapter";

export const GAME_ALPHA_SAVE_SCHEMA_VERSION = 1 as const;
export const GAME_ALPHA_RULESET_VERSION = "game-alpha-score-v1" as const;
export const GAME_ALPHA_CHECKPOINT_KEY = "run-complete" as const;
export const GAME_ALPHA_INITIAL_STAGE = 1;

const MAX_SCORE = 2_147_483_647;
const MAX_STAGE = 10_000;

export type GameAlphaSaveState = {
  rulesetVersion: typeof GAME_ALPHA_RULESET_VERSION;
  personalBestScore: number;
  highestStageReached: number;
};

export type GameAlphaCompletedRun = {
  score: number;
  highestStageReached: number;
};

export type HydratedGameAlphaProgress = {
  state: GameAlphaSaveState;
  revision: number;
};

export function createInitialGameAlphaProgress(): HydratedGameAlphaProgress {
  return {
    state: {
      rulesetVersion: GAME_ALPHA_RULESET_VERSION,
      personalBestScore: 0,
      highestStageReached: GAME_ALPHA_INITIAL_STAGE,
    },
    revision: 0,
  };
}

export function createGameAlphaSaveState(
  state: GameAlphaSaveState,
): Record<string, unknown> {
  return {
    rulesetVersion: state.rulesetVersion,
    personalBestScore: state.personalBestScore,
    highestStageReached: state.highestStageReached,
  };
}

export function hydrateGameAlphaSave(
  save: GameAlphaRemoteSave | null,
): HydratedGameAlphaProgress {
  if (save === null) return createInitialGameAlphaProgress();
  if (
    save.checkpointKey !== GAME_ALPHA_CHECKPOINT_KEY ||
    !Number.isInteger(save.revision) ||
    save.revision < 0
  ) {
    throw new Error("This Alphabet Defender save envelope is invalid.");
  }
  if (save.saveSchemaVersion !== GAME_ALPHA_SAVE_SCHEMA_VERSION) {
    throw new Error(
      "This Alphabet Defender save uses an unsupported schema version.",
    );
  }
  if (!isGameAlphaSaveState(save.state)) {
    throw new Error("This Alphabet Defender save is invalid.");
  }
  return { state: save.state, revision: save.revision };
}

export function isGameAlphaSaveState(
  value: unknown,
): value is GameAlphaSaveState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  const keys = Object.keys(state).sort();
  if (
    keys.join("|") !== "highestStageReached|personalBestScore|rulesetVersion"
  ) {
    return false;
  }
  return (
    state.rulesetVersion === GAME_ALPHA_RULESET_VERSION &&
    isBoundedInteger(state.personalBestScore, 0, MAX_SCORE) &&
    isBoundedInteger(
      state.highestStageReached,
      GAME_ALPHA_INITIAL_STAGE,
      MAX_STAGE,
    )
  );
}

export function mergeGameAlphaRun(
  previous: GameAlphaSaveState,
  completedRun: GameAlphaCompletedRun,
): GameAlphaSaveState {
  const score = clampInteger(completedRun.score, 0, MAX_SCORE);
  const stage = clampInteger(
    completedRun.highestStageReached,
    GAME_ALPHA_INITIAL_STAGE,
    MAX_STAGE,
  );
  return {
    rulesetVersion: GAME_ALPHA_RULESET_VERSION,
    personalBestScore: Math.max(previous.personalBestScore, score),
    highestStageReached: Math.max(previous.highestStageReached, stage),
  };
}

export function gameAlphaStatesEqual(
  left: GameAlphaSaveState,
  right: GameAlphaSaveState,
): boolean {
  return (
    left.rulesetVersion === right.rulesetVersion &&
    left.personalBestScore === right.personalBestScore &&
    left.highestStageReached === right.highestStageReached
  );
}

function isBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.min(
    maximum,
    Math.max(minimum, Math.trunc(Number.isFinite(value) ? value : minimum)),
  );
}
