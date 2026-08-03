import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearActivitySpeechPreparation,
  prepareActivitySpeech,
} from "../src/features/clara-audio/activitySpeechReadiness";

const manifest = {
  activity: "lesson-1",
  published_groups: ["lesson-1-fixed"],
  published_speech_keys: ["lesson-1-mission-1"],
  runtime_profiles: ["result"],
  requires_runtime: true,
};

const readiness = {
  activity: "lesson-1",
  ready: true,
  published_ready: true,
  published_groups: ["lesson-1-fixed"],
  voice_version: "clara-sh-v1",
  unavailable_speech_keys: [],
  runtime_required: true,
  runtime_ready: true,
  runtime_profiles: ["result"],
  profiles_ready: ["result"],
  device: "cuda",
};

afterEach(() => {
  clearActivitySpeechPreparation();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("activity speech readiness", () => {
  it("shares one manifest and readiness request for concurrent callers", async () => {
    let readinessRequests = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/activity-manifest?activity=lesson-1")) {
        return Promise.resolve(Response.json(manifest));
      }

      readinessRequests += 1;
      return Promise.resolve(Response.json(readiness));
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = prepareActivitySpeech("learner-token", "lesson-1");
    const second = prepareActivitySpeech("learner-token", "lesson-1");

    await expect(Promise.all([first, second])).resolves.toEqual([
      readiness,
      readiness,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(readinessRequests).toBe(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/learners/tts/activity-readiness",
      expect.objectContaining({
        body: JSON.stringify({ activity: "lesson-1" }),
      }),
    );
  });

  it("removes failed requests so retry performs a fresh preparation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(manifest))
      .mockResolvedValueOnce(
        Response.json(
          { ...readiness, ready: false, message: "Voice is warming." },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(Response.json(readiness));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      prepareActivitySpeech("learner-token", "lesson-1"),
    ).rejects.toThrow("Voice is warming.");
    await expect(
      prepareActivitySpeech("learner-token", "lesson-1"),
    ).resolves.toEqual(readiness);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects a manifest for a different activity", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ ...manifest, activity: "lesson-2" }),
        ),
    );

    await expect(
      prepareActivitySpeech("learner-token", "lesson-1"),
    ).rejects.toThrow("invalid activity status");
  });
});
