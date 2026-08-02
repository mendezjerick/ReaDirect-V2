import { describe, expect, it } from "vitest";

import {
  addScore,
  challengeBonus,
  CHALLENGE_TARGET_COUNT,
  EXTRA_HEART_INCREMENT,
  isChallengeStage,
  MINIMUM_HIGH_SCORE,
  nextStage,
  resolveShipDamage,
  scoreForEnemy,
  visibleStage,
} from "../../src/game/rules";
import { GameAlphaModel } from "../../src/game/GameAlphaModel";

describe("Game Alpha scoring rules", () => {
  it("retains formation and diving values for every enemy class", () => {
    expect(scoreForEnemy("scout", "formation")).toBe(50);
    expect(scoreForEnemy("scout", "diving")).toBe(100);
    expect(scoreForEnemy("striker", "formation")).toBe(80);
    expect(scoreForEnemy("striker", "diving")).toBe(160);
    expect(scoreForEnemy("commander", "formation")).toBe(150);
    expect(scoreForEnemy("commander", "diving")).toBe(400);
    expect(scoreForEnemy("commander", "diving", 1)).toBe(800);
    expect(scoreForEnemy("commander", "diving", 2)).toBe(1_600);
    expect(scoreForEnemy("morph", "formation")).toBe(160);
  });

  it("uses the retained challenge-stage bonus", () => {
    expect(challengeBonus(17)).toBe(1_700);
    expect(challengeBonus(CHALLENGE_TARGET_COUNT)).toBe(10_000);
  });

  it("awards one heart at every 30,000-point boundary", () => {
    const result = addScore(
      {
        score: 29_900,
        highScore: MINIMUM_HIGH_SCORE,
        hearts: 2,
        nextExtraHeartAt: EXTRA_HEART_INCREMENT,
      },
      30_200,
    );

    expect(result.score).toBe(60_100);
    expect(result.hearts).toBe(4);
    expect(result.extraHeartsAwarded).toBe(2);
    expect(result.nextExtraHeartAt).toBe(90_000);
    expect(result.highScore).toBe(60_100);
  });
});

describe("Game Alpha stage progression", () => {
  it("marks stages 3, 7, and 11 as challenges", () => {
    expect(isChallengeStage(3)).toBe(true);
    expect(isChallengeStage(7)).toBe(true);
    expect(isChallengeStage(11)).toBe(true);
    expect(isChallengeStage(6)).toBe(false);
  });

  it("loops the later pattern set while increasing the visible stage", () => {
    const next = nextStage({ pattern: 11, offset: 0 });
    expect(next).toEqual({ pattern: 4, offset: 8 });
    expect(visibleStage(next)).toBe(12);
  });
});

describe("Game Alpha death rules", () => {
  it("uses a complete ship death for alphabet friendly fire even when doubled", () => {
    expect(resolveShipDamage(3, true, "alphabet")).toEqual({
      hearts: 2,
      dual: false,
      fullDeath: true,
    });
  });

  it("allows an ordinary hit to remove only one half of a double ship", () => {
    expect(resolveShipDamage(3, true, "projectile")).toEqual({
      hearts: 3,
      dual: false,
      fullDeath: false,
    });
  });
});

describe("Game Alpha wave construction", () => {
  it("creates forty hostiles and exactly one protected alphabet ally", () => {
    const model = new GameAlphaModel({ seed: 42 });
    const snapshot = model.getSnapshot();

    expect(snapshot.enemies).toHaveLength(40);
    expect(snapshot.enemies.every((enemy) => enemy.active)).toBe(true);
    expect(snapshot.ally.active).toBe(true);
    expect(snapshot.protectedLetter).toMatch(/^[A-Z]$/);
  });

  it("starts with three hearts and the retained high-score floor", () => {
    const model = new GameAlphaModel({ seed: 8 });
    const snapshot = model.getSnapshot();

    expect(snapshot.hearts).toBe(3);
    expect(snapshot.highScore).toBe(20_000);
    expect(snapshot.nextExtraHeartAt).toBe(30_000);
  });

  it("turns shooting the protected letter into a full death and heart loss", () => {
    let model: GameAlphaModel | null = null;
    for (let seed = 1; seed <= 200; seed += 1) {
      const candidate = new GameAlphaModel({ seed });
      if (candidate.getSnapshot().ally.homeY === 165) {
        model = candidate;
        break;
      }
    }
    expect(model).not.toBeNull();
    if (!model) return;

    for (let index = 0; index < 140; index += 1) model.update(1_000 / 60);
    expect(model.getSnapshot().phase).toBe("active");

    for (let index = 0; index < 360; index += 1) {
      const snapshot = model.getSnapshot();
      if (snapshot.phase === "player-death") break;
      model.movePlayerTo(snapshot.ally.x + snapshot.ally.width / 2);
      model.fire();
      model.update(1_000 / 60);
    }

    const snapshot = model.getSnapshot();
    expect(snapshot.phase).toBe("player-death");
    expect(snapshot.hearts).toBe(2);
    expect(snapshot.ally.active).toBe(false);
    expect(model.drainAudioCues()).toEqual(
      expect.arrayContaining(["ally-hit-warning", "ship-explosion"]),
    );
  });
});
