export { GameTwoRoutePage } from "./GameTwoRoutePage";
export type {
  GameTwoGameProfile,
  GameTwoHostAdapter,
  GameTwoRemoteSave,
  GameTwoSaveRequest,
} from "./host/GameTwoHostAdapter";
export {
  GAME_TWO_CHECKPOINT_PREFIX,
  GAME_TWO_KEY,
  GAME_TWO_RULESET_VERSION,
  GAME_TWO_SAVE_SCHEMA_VERSION,
  GAME_TWO_STAGE_IDS,
  createGameTwoCheckpoint,
  createGameTwoSaveState,
  createInitialGameTwoProgress,
  gameTwoStatesEqual,
  hydrateGameTwoSave,
  isGameTwoSaveState,
  mergeGameTwoCompletion,
} from "./game/persistence/gameTwoSaveContract";

export const GAME_SLOT = "game-two" as const;
