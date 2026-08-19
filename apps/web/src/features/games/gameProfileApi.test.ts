import { afterEach, describe, expect, it, vi } from "vitest";

import { GameProfileRequestError } from "@readirect/game-lobby";
import { learnerGameProfileClient } from "./gameProfileApi";

const session = {
  token: "cookie-session",
  learner: {
    id: 10,
    learner_code: "GA001",
    full_name: "Game Reader",
    first_name: "Game",
    account_purpose: "standard",
    speech_language: "en",
    school: null,
    grade_level: 3,
    section: "A",
    progress: {
      stage: "before_diagnostic",
      current_required_lesson_order: null,
    },
    achievement_keys: [],
  },
  session: { expires_at: "2026-08-18T00:00:00+00:00" },
};

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("learner game profile API", () => {
  it("loads the snake-case API profile into the safe frontend shape", async () => {
    window.sessionStorage.setItem(
      "readirect.learner-session",
      JSON.stringify(session),
    );
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        profile: {
          audience: "learner",
          username: "ServerReader",
          discriminator: "4821",
          public_handle: "ServerReader#4821",
          is_active: true,
        },
      }),
    );

    await expect(learnerGameProfileClient.loadGameProfile()).resolves.toEqual({
      audience: "learner",
      username: "ServerReader",
      discriminator: "4821",
      publicHandle: "ServerReader#4821",
      isActive: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/games/profile",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({
          Authorization: "Bearer cookie-session",
        }),
      }),
    );
  });

  it("posts only the requested username and preserves a server-issued handle", async () => {
    window.sessionStorage.setItem(
      "readirect.learner-session",
      JSON.stringify(session),
    );
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          profile: {
            audience: "learner",
            username: "Reader7",
            discriminator: "0042",
            public_handle: "Reader7#0042",
            is_active: true,
          },
        },
        { status: 201 },
      ),
    );

    await expect(
      learnerGameProfileClient.createGameProfile(" Reader7 "),
    ).resolves.toMatchObject({
      publicHandle: "Reader7#0042",
      discriminator: "0042",
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({ username: "Reader7" });
    expect(String(fetchMock.mock.calls[0][1]?.body)).not.toMatch(
      /discriminator|learner_id|game_profile_id|token/i,
    );
  });

  it("keeps 401 distinct from an explicit profile-null response", async () => {
    window.sessionStorage.setItem(
      "readirect.learner-session",
      JSON.stringify(session),
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ message: "Unauthenticated." }, { status: 401 }),
    );

    await expect(
      learnerGameProfileClient.loadGameProfile(),
    ).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<GameProfileRequestError>);
  });
});
