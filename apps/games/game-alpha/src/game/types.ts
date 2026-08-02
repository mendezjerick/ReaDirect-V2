export const STAGE_WIDTH = 270;
export const STAGE_HEIGHT = 480;

export type GamePhase =
  "wave-intro" | "active" | "player-death" | "wave-clear" | "game-over";

export type EnemyKind = "scout" | "striker" | "commander" | "morph";
export type EnemyMode =
  "entering" | "formation" | "diving" | "tractor" | "challenge";

export type DeathCause = "enemy" | "projectile" | "alphabet" | "capture";

export type AudioCue =
  | "player-shot"
  | "basic-enemy-destroyed"
  | "strong-enemy-hit"
  | "strong-enemy-destroyed"
  | "special-enemy-destroyed"
  | "enemy-dive"
  | "enemy-projectile"
  | "special-charge"
  | "ship-explosion"
  | "ally-hit-warning"
  | "formation-pulse"
  | "enemy-morph"
  | "tractor-start"
  | "tractor-loop-start"
  | "tractor-loop-stop"
  | "tractor-capture-complete"
  | "player-captured"
  | "fighter-rescued"
  | "captured-fighter-destroyed"
  | "menu-select"
  | "menu-cancel"
  | "extra-life"
  | "low-heart-warning";

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  dual: boolean;
  invulnerableMs: number;
}

export interface EnemyState {
  id: number;
  kind: EnemyKind;
  mode: EnemyMode;
  x: number;
  y: number;
  width: number;
  height: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  active: boolean;
  capturedFighter: boolean;
  escortLeaderId: number | null;
  escortCount: number;
  diveProgress: number;
  diveOriginX: number;
  hasFired: boolean;
  challengeDelayMs: number;
}

export interface AlphabetAllyState {
  id: number;
  letter: string;
  x: number;
  y: number;
  width: number;
  height: number;
  homeX: number;
  homeY: number;
  active: boolean;
  escaped: boolean;
  challengeDelayMs: number;
}

export interface ProjectileState {
  id: number;
  owner: "player" | "enemy";
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  active: boolean;
  charged: boolean;
}

export interface GameSnapshot {
  phase: GamePhase;
  paused: boolean;
  stage: number;
  score: number;
  highScore: number;
  hearts: number;
  nextExtraHeartAt: number;
  challenge: boolean;
  challengeHits: number;
  protectedLetter: string;
  player: Readonly<PlayerState>;
  enemies: readonly Readonly<EnemyState>[];
  ally: Readonly<AlphabetAllyState>;
  projectiles: readonly Readonly<ProjectileState>[];
}
