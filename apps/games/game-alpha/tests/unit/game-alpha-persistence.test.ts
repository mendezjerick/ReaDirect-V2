import { describe, expect, it, vi } from "vitest";

import type { GameAlphaHostAdapter } from "../../src/host/GameAlphaHostAdapter";
import {
  createInitialGameAlphaProgress,
  gameAlphaStatesEqual,
  hydrateGameAlphaSave,
  mergeGameAlphaRun,
} from "../../src/game/persistence/gameAlphaSaveContract";
import { persistGameAlphaRun } from "../../src/game/persistence/gameAlphaSaveCoordinator";

function host(
  overrides: Partial<GameAlphaHostAdapter> = {},
): GameAlphaHostAdapter {
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

describe("Game Alpha persistence", () => {
  it("hydrates explicit null to the canonical clean state", () => {
    expect(hydrateGameAlphaSave(null)).toEqual(
      createInitialGameAlphaProgress(),
    );
  });

  it("keeps only the v1 completed-run summary", () => {
    const state = mergeGameAlphaRun(createInitialGameAlphaProgress().state, {
      score: 42,
      highestStageReached: 3,
    });
    expect(state).toEqual({
      rulesetVersion: "game-alpha-score-v1",
      personalBestScore: 42,
      highestStageReached: 3,
    });
    expect(Object.keys(state).sort()).toEqual([
      "highestStageReached",
      "personalBestScore",
      "rulesetVersion",
    ]);
  });

  it("does not write a lower completed run", async () => {
    const current = {
      state: mergeGameAlphaRun(createInitialGameAlphaProgress().state, {
        score: 100,
        highestStageReached: 4,
      }),
      revision: 2,
    };
    const save = vi.fn();
    const result = await persistGameAlphaRun(host({ save }), current, {
      score: 10,
      highestStageReached: 2,
    });
    expect(gameAlphaStatesEqual(result.state, current.state)).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it("reconciles a timeout when the server already has an equal or better state", async () => {
    const current = createInitialGameAlphaProgress();
    const save = vi.fn().mockRejectedValue(new Error("timeout"));
    const load = vi
      .fn()
      .mockResolvedValue({
        checkpointKey: "run-complete",
        saveSchemaVersion: 1,
        state: {
          rulesetVersion: "game-alpha-score-v1",
          personalBestScore: 50,
          highestStageReached: 5,
        },
        revision: 4,
        savedAt: "2026-08-18T00:00:00Z",
      });
    const result = await persistGameAlphaRun(host({ save, load }), current, {
      score: 50,
      highestStageReached: 5,
    });
    expect(result.revision).toBe(4);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("performs at most one bounded retry after a conflict", async () => {
    const current = createInitialGameAlphaProgress();
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("conflict"))
      .mockResolvedValueOnce({
        checkpointKey: "run-complete",
        saveSchemaVersion: 1,
        state: {
          rulesetVersion: "game-alpha-score-v1",
          personalBestScore: 75,
          highestStageReached: 2,
        },
        revision: 8,
        savedAt: "2026-08-18T00:00:00Z",
      });
    const load = vi
      .fn()
      .mockResolvedValue({
        checkpointKey: "run-complete",
        saveSchemaVersion: 1,
        state: {
          rulesetVersion: "game-alpha-score-v1",
          personalBestScore: 10,
          highestStageReached: 1,
        },
        revision: 7,
        savedAt: "2026-08-18T00:00:00Z",
      });
    const result = await persistGameAlphaRun(host({ save, load }), current, {
      score: 75,
      highestStageReached: 2,
    });
    expect(result.revision).toBe(8);
    expect(save).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
