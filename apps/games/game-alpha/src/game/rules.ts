import type { DeathCause, EnemyKind, EnemyMode } from "./types";

export const INITIAL_HEARTS = 3;
export const EXTRA_HEART_INCREMENT = 30_000;
export const MINIMUM_HIGH_SCORE = 20_000;
export const CHALLENGE_TARGET_COUNT = 40;

export interface StageCursor {
  pattern: number;
  offset: number;
}

export interface ScoreResult {
  score: number;
  highScore: number;
  hearts: number;
  nextExtraHeartAt: number;
  extraHeartsAwarded: number;
}

export interface ShipDamageResult {
  hearts: number;
  dual: false;
  fullDeath: boolean;
}

export function isChallengeStage(pattern: number): boolean {
  return pattern === 3 || pattern === 7 || pattern === 11;
}

export function visibleStage(cursor: StageCursor): number {
  return cursor.pattern + cursor.offset;
}

export function nextStage(cursor: StageCursor): StageCursor {
  if (cursor.pattern === 11) {
    return { pattern: 4, offset: cursor.offset + 8 };
  }

  return { pattern: cursor.pattern + 1, offset: cursor.offset };
}

export function scoreForEnemy(
  kind: EnemyKind,
  mode: EnemyMode,
  escortCount = 0,
): number {
  const attacking = mode === "diving" || mode === "tractor";

  if (kind === "scout") return attacking ? 100 : 50;
  if (kind === "striker") return attacking ? 160 : 80;
  if (kind === "morph") return 160;
  if (!attacking) return 150;
  if (escortCount >= 2) return 1_600;
  if (escortCount === 1) return 800;
  return 400;
}

export function challengeBonus(hits: number): number {
  return hits === CHALLENGE_TARGET_COUNT ? 10_000 : hits * 100;
}

export function resolveShipDamage(
  hearts: number,
  dual: boolean,
  cause: DeathCause,
): ShipDamageResult {
  const fullDeath = !dual || cause === "alphabet" || cause === "capture";
  return {
    hearts: fullDeath ? Math.max(0, hearts - 1) : hearts,
    dual: false,
    fullDeath,
  };
}

export function addScore(
  current: Omit<ScoreResult, "extraHeartsAwarded">,
  points: number,
): ScoreResult {
  const score = current.score + Math.max(0, Math.trunc(points));
  let hearts = current.hearts;
  let nextExtraHeartAt = current.nextExtraHeartAt;
  let extraHeartsAwarded = 0;

  while (score >= nextExtraHeartAt) {
    hearts += 1;
    nextExtraHeartAt += EXTRA_HEART_INCREMENT;
    extraHeartsAwarded += 1;
  }

  return {
    score,
    highScore: Math.max(current.highScore, score),
    hearts,
    nextExtraHeartAt,
    extraHeartsAwarded,
  };
}
