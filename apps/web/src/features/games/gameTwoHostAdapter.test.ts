import { afterEach, describe, expect, it, vi } from "vitest";

import { createGameTwoHostAdapter } from "./gameTwoHostAdapter";

afterEach(() => vi.restoreAllMocks());

describe("createGameTwoHostAdapter", () => {
  it("uses the fixed OtterTale key for save and reset", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({
          game_key: "ottertale",
          save: {
            checkpoint_key: "stage-1-complete",
            save_schema_version: 1,
            state: {
              rulesetVersion: "v1",
              completedStageIds: [1],
              bestScoresByStage: { "1": 24 },
            },
            revision: 2,
            saved_at: "2026-08-18T00:00:00Z",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ game_key: "ottertale", save: null }),
      );
    const host = createGameTwoHostAdapter({ token: "learner-token" });

    await expect(
      host.save({
        checkpointKey: "stage-1-complete",
        saveSchemaVersion: 1,
        state: {
          rulesetVersion: "v1",
          completedStageIds: [1],
          bestScoresByStage: { "1": 24 },
        },
        expectedRevision: 1,
      }),
    ).resolves.toMatchObject({ revision: 2 });
    await host.newGame(2);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/learners/games/ottertale/save",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/learners/games/ottertale/new-game",
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/learners/games/profile",
      expect.anything(),
    );
  });

  it("keeps inactive and server failures recoverable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ message: "Game not found." }, 404),
    );
    const host = createGameTwoHostAdapter({ token: "learner-token" });
    await expect(host.load()).rejects.toThrow(/not active yet/i);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
