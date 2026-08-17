import { describe, expect, it, vi } from "vitest";

import {
  playPreparedOfflineTts,
  prepareOfflineTts,
  type OfflineTtsNativePlugin,
} from "../src/apk/native/offlineTtsBridge";

function createPlugin(): OfflineTtsNativePlugin {
  return {
    prepare: vi.fn().mockResolvedValue({
      catalogId: "clara-sh-offline-apk-v1",
      assetCount: 293,
      totalBytes: 9_887_949,
      totalDurationMs: 1_154_880,
    }),
    play: vi.fn(async ({ key }) => ({
      key,
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
      catalogId: "clara-sh-offline-apk-v1",
      assetCount: 293,
    });
  });

  it("plays a packaged key through the native plugin", async () => {
    const plugin = createPlugin();

    await expect(
      playPreparedOfflineTts(plugin, "lesson-1-mission-1"),
    ).resolves.toMatchObject({
      key: "lesson-1-mission-1",
      completed: true,
    });
    expect(plugin.play).toHaveBeenCalledWith({ key: "lesson-1-mission-1" });
  });

  it("blocks malformed keys before they reach Android assets", async () => {
    const plugin = createPlugin();

    await expect(
      playPreparedOfflineTts(plugin, "../private/voice"),
    ).rejects.toThrow("only letters, numbers, and hyphens");
    expect(plugin.play).not.toHaveBeenCalled();
  });
});
