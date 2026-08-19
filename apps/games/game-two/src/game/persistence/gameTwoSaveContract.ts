import type { GameTwoRemoteSave } from "../../host/GameTwoHostAdapter";

export const GAME_TWO_KEY = "ottertale" as const;
export const GAME_TWO_SAVE_SCHEMA_VERSION = 1 as const;
export const GAME_TWO_RULESET_VERSION = "v1" as const;
export const GAME_TWO_CHECKPOINT_PREFIX = "stage-" as const;
export const GAME_TWO_STAGE_IDS = [0, 1, 2, 3] as const;

const MAX_SCORE = 2_147_483_647;

export type GameTwoSaveState = {
  rulesetVersion: typeof GAME_TWO_RULESET_VERSION;
  completedStageIds: number[];
  bestScoresByStage: Record<string, number>;
};

export type GameTwoCompletedStage = {
  stageId: number;
  score: number;
};

export type HydratedGameTwoProgress = {
  state: GameTwoSaveState;
  revision: number;
};

export function createInitialGameTwoProgress(): HydratedGameTwoProgress {
  return {
    state: {
      rulesetVersion: GAME_TWO_RULESET_VERSION,
      completedStageIds: [],
      bestScoresByStage: {},
    },
    revision: 0,
  };
}

export function createGameTwoSaveState(
  state: GameTwoSaveState,
): Record<string, unknown> {
  return {
    rulesetVersion: state.rulesetVersion,
    completedStageIds: [...state.completedStageIds],
    bestScoresByStage: { ...state.bestScoresByStage },
  };
}

export function createGameTwoCheckpoint(stageId: number): string {
  assertStageId(stageId);
  return `${GAME_TWO_CHECKPOINT_PREFIX}${stageId}-complete`;
}

export function hydrateGameTwoSave(
  save: GameTwoRemoteSave | null,
): HydratedGameTwoProgress {
  if (save === null) return createInitialGameTwoProgress();
  if (
    !Number.isInteger(save.revision) ||
    save.revision < 0 ||
    !isGameTwoCheckpoint(save.checkpointKey)
  ) {
    throw new Error("This OtterTale save envelope is invalid.");
  }
  if (save.saveSchemaVersion !== GAME_TWO_SAVE_SCHEMA_VERSION) {
    throw new Error("This OtterTale save uses an unsupported schema version.");
  }
  if (!isGameTwoSaveState(save.state)) {
    throw new Error("This OtterTale save is invalid.");
  }
  return {
    state: normalizeGameTwoState(save.state),
    revision: save.revision,
  };
}

export function isGameTwoSaveState(value: unknown): value is GameTwoSaveState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  const keys = Object.keys(state).sort();
  if (keys.join("|") !== "bestScoresByStage|completedStageIds|rulesetVersion") {
    return false;
  }
  if (state.rulesetVersion !== GAME_TWO_RULESET_VERSION) return false;
  if (!Array.isArray(state.completedStageIds)) return false;

  const completedStageIds = state.completedStageIds;
  if (completedStageIds.length > GAME_TWO_STAGE_IDS.length) return false;
  const completed = new Set<number>();
  for (const stageId of completedStageIds) {
    if (!isStageId(stageId) || completed.has(stageId)) return false;
    completed.add(stageId);
  }

  if (
    !state.bestScoresByStage ||
    typeof state.bestScoresByStage !== "object" ||
    Array.isArray(state.bestScoresByStage)
  ) {
    return false;
  }
  const scores = state.bestScoresByStage as Record<string, unknown>;
  if (Object.keys(scores).length > GAME_TWO_STAGE_IDS.length) return false;
  for (const [stageIdText, score] of Object.entries(scores)) {
    const stageId = Number(stageIdText);
    if (
      !/^\d+$/.test(stageIdText) ||
      stageIdText !== String(stageId) ||
      !isStageId(stageId) ||
      !completed.has(stageId) ||
      !isBoundedInteger(score, 0, MAX_SCORE)
    ) {
      return false;
    }
  }
  return true;
}

export function mergeGameTwoCompletion(
  previous: GameTwoSaveState,
  completedStage: GameTwoCompletedStage,
): GameTwoSaveState {
  assertStageId(completedStage.stageId);
  const completedStageIds = Array.from(
    new Set([...previous.completedStageIds, completedStage.stageId]),
  ).sort((left, right) => left - right);
  const stageKey = String(completedStage.stageId);
  const score = clampScore(completedStage.score);
  const previousScore = previous.bestScoresByStage[stageKey];
  const bestScoresByStage = { ...previous.bestScoresByStage };
  if (previousScore === undefined || score > previousScore) {
    bestScoresByStage[stageKey] = score;
  }
  return normalizeGameTwoState({
    rulesetVersion: GAME_TWO_RULESET_VERSION,
    completedStageIds,
    bestScoresByStage,
  });
}

export function gameTwoStatesEqual(
  left: GameTwoSaveState,
  right: GameTwoSaveState,
): boolean {
  return (
    JSON.stringify(createGameTwoSaveState(normalizeGameTwoState(left))) ===
    JSON.stringify(createGameTwoSaveState(normalizeGameTwoState(right)))
  );
}

function normalizeGameTwoState(state: GameTwoSaveState): GameTwoSaveState {
  const completedStageIds = [...state.completedStageIds].sort(
    (left, right) => left - right,
  );
  const bestScoresByStage = Object.fromEntries(
    Object.entries(state.bestScoresByStage).sort(([left], [right]) =>
      left.localeCompare(right, undefined, { numeric: true }),
    ),
  );
  return { ...state, completedStageIds, bestScoresByStage };
}

function isGameTwoCheckpoint(value: string): boolean {
  return /^stage-[0-3]-complete$/.test(value);
}

function isStageId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (GAME_TWO_STAGE_IDS as readonly number[]).includes(value)
  );
}

function assertStageId(stageId: number): asserts stageId is number {
  if (!isStageId(stageId)) throw new Error("OtterTale stage is invalid.");
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

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, Math.trunc(score)));
}
