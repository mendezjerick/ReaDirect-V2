import { afterEach, describe, expect, it, vi } from "vitest";

import { createGameOneHostAdapter } from "./gameOneHostAdapter";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createGameOneHostAdapter", () => {
  it("does not create a profile while Game One is inactive", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ message: "Game not found." }, 404));
    const host = createGameOneHostAdapter({
      token: "learner-token",
    });

    await expect(host.load()).rejects.toThrow(/not active yet/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/games/chronicles-of-the-lost-kingdom/save",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer learner-token",
        }),
      }),
    );
  });

  it("does not create a learner profile when the save is unavailable", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message: "Create a game profile before saving game progress.",
          },
          409,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          game_key: "chronicles-of-the-lost-kingdom",
          save: null,
        }),
      );
    const host = createGameOneHostAdapter({
      token: "learner-token",
    });

    await expect(host.load()).rejects.toThrow(/changed elsewhere/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/learners/games/profile",
      expect.anything(),
    );
  });

  it("maps save and reset requests to revision-controlled API payloads", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({
          game_key: "chronicles-of-the-lost-kingdom",
          save: {
            checkpoint_key: "mission-2",
            save_schema_version: 1,
            state: { mission: 2 },
            revision: 4,
            saved_at: "2026-07-26T08:00:00Z",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          game_key: "chronicles-of-the-lost-kingdom",
          save: null,
        }),
      );
    const host = createGameOneHostAdapter({
      token: "learner-token",
    });

    await expect(
      host.save({
        checkpointKey: "mission-2",
        saveSchemaVersion: 1,
        state: { mission: 2 },
        expectedRevision: 3,
      }),
    ).resolves.toMatchObject({ revision: 4, checkpointKey: "mission-2" });
    await host.newGame(4);

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      checkpoint_key: "mission-2",
      save_schema_version: 1,
      state: { mission: 2 },
      expected_revision: 3,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      expected_revision: 4,
    });
  });

  it("does not expose raw server failures in the game interface", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          message: "SQLSTATE[42P01]: relation game_catalog does not exist",
        },
        500,
      ),
    );
    const host = createGameOneHostAdapter({
      token: "learner-token",
    });

    await expect(host.load()).rejects.toThrow(
      "ReaDirect could not access Game One progress.",
    );
    await expect(host.load()).rejects.not.toThrow(/SQLSTATE|game_catalog/);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
