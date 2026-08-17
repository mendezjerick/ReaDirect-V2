import { describe, expect, it, vi } from "vitest";

import {
  playPreparedOfflineTts,
  prepareOfflineTts,
  type OfflineTtsNativePlugin,
} from "../src/apk/native/offlineTtsBridge";

function createPlugin(): OfflineTtsNativePlugin {
  return {
    prepare: vi.fn().mockResolvedValue({
      catalogId: "clara-sh-offline-apk-v2",
      languages: ["en", "fil-PH"] as const,
      assetCount: 586,
      totalBytes: 19_887_949,
      totalDurationMs: 2_309_760,
    }),
    play: vi.fn(async ({ key, language }) => ({
      key,
      language,
      durationMs: 1_200,
      completed: true as const,
    })),
    stop: vi.fn(),
    getRuntimeState: vi.fn(),
    shutdown: vi.fn(),
  };
}

describe("offline TTS native bridge", () => {
  it("accepts the checksum-verified packaged catalog", async () => {
    const plugin = createPlugin();

    await expect(prepareOfflineTts(plugin)).resolves.toMatchObject({
      catalogId: "clara-sh-offline-apk-v2",
      languages: ["en", "fil-PH"],
      assetCount: 586,
    });
  });

  it("plays a packaged key through the native plugin", async () => {
    const plugin = createPlugin();

    await expect(
      playPreparedOfflineTts(plugin, "lesson-1-mission-1", "fil-PH"),
    ).resolves.toMatchObject({
      key: "lesson-1-mission-1",
      language: "fil-PH",
      completed: true,
    });
    expect(plugin.play).toHaveBeenCalledWith({
      key: "lesson-1-mission-1",
      language: "fil-PH",
    });
  });

  it("blocks malformed keys before they reach Android assets", async () => {
    const plugin = createPlugin();

    await expect(
      playPreparedOfflineTts(plugin, "../private/voice", "en"),
    ).rejects.toThrow("only letters, numbers, and hyphens");
    expect(plugin.play).not.toHaveBeenCalled();
  });
});
