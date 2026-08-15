import { describe, expect, it } from "vitest";
import { MAP_LANDMARKS } from "../map/prototypeMap";
import { createInitialExplorationProgress, EXPLORATION_PROGRESS_KEY, loadExplorationProgress, saveExplorationProgress } from "./explorationPersistence";

describe("exploration persistence", () => {
  it("restores a safe position and optional fishing evidence", () => {
    const storage = memoryStorage();
    const progress = {
      ...createInitialExplorationProgress(),
      safePosition: MAP_LANDMARKS.bridgeSouth,
      discoveredFishingSpotIds: ["east-river-bank" as const],
      fishingParticipation: 1,
      fishingAttempts: 2,
      caughtResultIds: ["message-bottle" as const]
    };
    saveExplorationProgress(progress, storage);
    expect(loadExplorationProgress(storage)).toMatchObject(progress);
  });

  it("falls back instead of restoring the learner in deep water", () => {
    const storage = memoryStorage();
    storage.setItem(EXPLORATION_PROGRESS_KEY, JSON.stringify({
      ...createInitialExplorationProgress(),
      safePosition: { x: 64, y: 9 * 32 }
    }));
    expect(loadExplorationProgress(storage).safePosition).toEqual(MAP_LANDMARKS.spawn);
  });

  it("falls back instead of restoring on an NPC collision", () => {
    const storage = memoryStorage();
    storage.setItem(EXPLORATION_PROGRESS_KEY, JSON.stringify({
      ...createInitialExplorationProgress(),
      safePosition: MAP_LANDMARKS.mangYato
    }));
    expect(loadExplorationProgress(storage).safePosition).toEqual(MAP_LANDMARKS.spawn);
  });
});

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); }
  };
}
