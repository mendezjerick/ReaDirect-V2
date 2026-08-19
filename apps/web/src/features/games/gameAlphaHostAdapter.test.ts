import { afterEach, describe, expect, it, vi } from "vitest";

import { createGameAlphaHostAdapter } from "./gameAlphaHostAdapter";

afterEach(() => vi.restoreAllMocks());

describe("createGameAlphaHostAdapter", () => {
  it("maps Alpha save and reset requests without creating a profile", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({
          game_key: "game-alpha",
          save: {
            checkpoint_key: "run-complete",
            save_schema_version: 1,
            state: {
              rulesetVersion: "game-alpha-score-v1",
              personalBestScore: 90,
              highestStageReached: 3,
            },
            revision: 2,
            saved_at: "2026-08-18T00:00:00Z",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ game_key: "game-alpha", save: null }),
      );
    const host = createGameAlphaHostAdapter({ token: "learner-token" });
    await expect(
      host.save({
        checkpointKey: "run-complete",
        saveSchemaVersion: 1,
        state: {
          rulesetVersion: "game-alpha-score-v1",
          personalBestScore: 90,
          highestStageReached: 3,
        },
        expectedRevision: 1,
      }),
    ).resolves.toMatchObject({ revision: 2 });
    await host.newGame(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      expected_revision: 1,
      checkpoint_key: "run-complete",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      expected_revision: 2,
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/learners/games/profile",
      expect.anything(),
    );
  });

  it("keeps server failures recoverable and generic", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ message: "SQLSTATE internal detail" }, 500),
    );
    const host = createGameAlphaHostAdapter({ token: "learner-token" });
    await expect(host.load()).rejects.toThrow(
      "ReaDirect could not access Alphabet Defender progress.",
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
