import { describe, expect, it, vi } from "vitest";

import type { GameTwoHostAdapter } from "../../src/host/GameTwoHostAdapter";
import {
  createGameTwoCheckpoint,
  createInitialGameTwoProgress,
  gameTwoStatesEqual,
  hydrateGameTwoSave,
  isGameTwoSaveState,
  mergeGameTwoCompletion,
} from "../../src/game/persistence/gameTwoSaveContract";
import { persistGameTwoCompletion } from "../../src/game/persistence/gameTwoSaveCoordinator";

function host(overrides: Partial<GameTwoHostAdapter> = {}): GameTwoHostAdapter {
  return {
    profile: null,
    load: vi.fn(async () => null),
    save: vi.fn(async (request) => ({
      checkpointKey: request.checkpointKey,
      saveSchemaVersion: request.saveSchemaVersion,
      state: request.state,
      revision: request.expectedRevision + 1,
      savedAt: "2026-08-18T00:00:00Z",
    })),
    newGame: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("OtterTale persistence contract", () => {
  it("uses ottertale and schema v1 with an explicit empty state", () => {
    const progress = createInitialGameTwoProgress();
    expect(createGameTwoCheckpoint(0)).toBe("stage-0-complete");
    expect(progress.state).toEqual({
      rulesetVersion: "v1",
      completedStageIds: [],
      bestScoresByStage: {},
    });
    expect(hydrateGameTwoSave(null)).toEqual(progress);
  });

  it("accepts valid completed stages and rejects invalid contract shapes", () => {
    const valid = {
      rulesetVersion: "v1" as const,
      completedStageIds: [0, 1],
      bestScoresByStage: { "0": 12, "1": 24 },
    };
    expect(isGameTwoSaveState(valid)).toBe(true);
    expect(isGameTwoSaveState({ ...valid, unknown: true })).toBe(false);
    expect(isGameTwoSaveState({ ...valid, completedStageIds: [0, 0] })).toBe(
      false,
    );
    expect(isGameTwoSaveState({ ...valid, completedStageIds: [4] })).toBe(
      false,
    );
    expect(
      isGameTwoSaveState({ ...valid, bestScoresByStage: { "2": 4 } }),
    ).toBe(false);
    expect(
      isGameTwoSaveState({ ...valid, bestScoresByStage: { "1": -1 } }),
    ).toBe(false);
  });

  it("merges stages deterministically and keeps only completed-stage scores", () => {
    const previous = mergeGameTwoCompletion(
      createInitialGameTwoProgress().state,
      { stageId: 1, score: 40 },
    );
    const merged = mergeGameTwoCompletion(previous, { stageId: 0, score: 12 });
    expect(merged).toEqual({
      rulesetVersion: "v1",
      completedStageIds: [0, 1],
      bestScoresByStage: { "0": 12, "1": 40 },
    });
    expect(mergeGameTwoCompletion(merged, { stageId: 1, score: 20 })).toEqual(
      merged,
    );
    expect(
      gameTwoStatesEqual(merged, { ...merged, completedStageIds: [1, 0] }),
    ).toBe(true);
  });

  it("saves once for a new completion and does not write lower scores", async () => {
    const save = vi.fn();
    const current = {
      state: mergeGameTwoCompletion(createInitialGameTwoProgress().state, {
        stageId: 1,
        score: 40,
      }),
      revision: 1,
    };
    const result = await persistGameTwoCompletion(host({ save }), current, {
      stageId: 1,
      score: 20,
    });
    expect(result).toEqual(current);
    expect(save).not.toHaveBeenCalled();
  });

  it("uses the completed stage checkpoint and excludes transient run fields", async () => {
    const save = vi.fn(async (request) => ({
      checkpointKey: request.checkpointKey,
      saveSchemaVersion: request.saveSchemaVersion,
      state: request.state,
      revision: 1,
      savedAt: "2026-08-18T00:00:00Z",
    }));
    await persistGameTwoCompletion(
      host({ save }),
      createInitialGameTwoProgress(),
      { stageId: 3, score: 18 },
    );
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ checkpointKey: "stage-3-complete" }),
    );
    expect(save.mock.calls[0][0].state).toEqual({
      rulesetVersion: "v1",
      completedStageIds: [3],
      bestScoresByStage: { "3": 18 },
    });
  });

  it("unions concurrent stages and retries at most once", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("conflict"))
      .mockResolvedValueOnce({
        checkpointKey: "stage-1-complete",
        saveSchemaVersion: 1,
        state: {
          rulesetVersion: "v1",
          completedStageIds: [0, 1],
          bestScoresByStage: { "0": 50, "1": 60 },
        },
        revision: 4,
        savedAt: "2026-08-18T00:00:00Z",
      });
    const load = vi.fn().mockResolvedValue({
      checkpointKey: "stage-0-complete",
      saveSchemaVersion: 1,
      state: {
        rulesetVersion: "v1",
        completedStageIds: [0],
        bestScoresByStage: { "0": 50 },
      },
      revision: 3,
      savedAt: "2026-08-18T00:00:00Z",
    });
    const result = await persistGameTwoCompletion(
      host({ save, load }),
      createInitialGameTwoProgress(),
      { stageId: 1, score: 60 },
    );
    expect(result.revision).toBe(4);
    expect(save).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("accepts a timeout when the server already contains equal progress", async () => {
    const save = vi.fn().mockRejectedValue(new Error("timeout"));
    const load = vi.fn().mockResolvedValue({
      checkpointKey: "stage-2-complete",
      saveSchemaVersion: 1,
      state: {
        rulesetVersion: "v1",
        completedStageIds: [2],
        bestScoresByStage: { "2": 30 },
      },
      revision: 8,
      savedAt: "2026-08-18T00:00:00Z",
    });
    const result = await persistGameTwoCompletion(
      host({ save, load }),
      createInitialGameTwoProgress(),
      { stageId: 2, score: 30 },
    );
    expect(result.revision).toBe(8);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
