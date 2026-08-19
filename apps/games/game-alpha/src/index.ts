export { GameAlphaRoutePage } from "./GameAlphaRoutePage";
export type {
  GameAlphaGameProfile,
  GameAlphaHostAdapter,
  GameAlphaRemoteSave,
  GameAlphaSaveRequest,
} from "./host/GameAlphaHostAdapter";
export {
  GAME_ALPHA_CHECKPOINT_KEY,
  GAME_ALPHA_INITIAL_STAGE,
  GAME_ALPHA_RULESET_VERSION,
  GAME_ALPHA_SAVE_SCHEMA_VERSION,
  createGameAlphaSaveState,
  createInitialGameAlphaProgress,
  gameAlphaStatesEqual,
  hydrateGameAlphaSave,
  isGameAlphaSaveState,
  mergeGameAlphaRun,
} from "./game/persistence/gameAlphaSaveContract";

export const GAME_SLOT = "game-alpha" as const;
