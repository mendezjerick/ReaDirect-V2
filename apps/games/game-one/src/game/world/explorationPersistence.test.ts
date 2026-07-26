import { describe, expect, it } from "vitest";
import { MAP_LANDMARKS } from "../map/prototypeMap";
import { createInitialExplorationProgress, restoreExplorationProgress } from "./explorationPersistence";

describe("exploration persistence", () => {
  it("restores a safe position and optional fishing evidence", () => {
    const progress = {
      ...createInitialExplorationProgress(),
      safePosition: MAP_LANDMARKS.bridgeSouth,
      discoveredFishingSpotIds: ["east-river-bank" as const],
      fishingParticipation: 1,
      fishingAttempts: 2,
      caughtResultIds: ["message-bottle" as const]
    };
    expect(restoreExplorationProgress(progress)).toMatchObject(progress);
  });

  it("falls back instead of restoring the learner in deep water", () => {
    const restored = restoreExplorationProgress({
      ...createInitialExplorationProgress(),
      safePosition: { x: 64, y: 9 * 32 }
    });
    expect(restored).toBeNull();
  });

  it("falls back instead of restoring on an NPC collision", () => {
    const restored = restoreExplorationProgress({
      ...createInitialExplorationProgress(),
      safePosition: MAP_LANDMARKS.mangYato
    });
    expect(restored).toBeNull();
  });
});
