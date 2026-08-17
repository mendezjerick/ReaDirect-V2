import { describe, expect, it, vi } from "vitest";

import {
  selectAndInitializeOfflineAsr,
  type NativeDeviceAsrCapabilities,
  type OfflineAsrNativePlugin,
} from "../src/apk/native/offlineAsrBridge";

function createPlugin(
  capabilities: NativeDeviceAsrCapabilities,
): OfflineAsrNativePlugin {
  return {
    getDeviceCapabilities: vi.fn().mockResolvedValue(capabilities),
    initialize: vi.fn(async ({ tier }) => ({
      tier,
      loadDurationMs: 25,
      threads: 4,
      runtime: "whisper.cpp" as const,
      systemInfo: "CPU",
    })),
    startRecording: vi.fn(),
    stopAndTranscribe: vi.fn(),
    cancelRecording: vi.fn(),
    getRuntimeState: vi.fn(),
    shutdown: vi.fn(),
  };
}

const standardCapabilities: NativeDeviceAsrCapabilities = {
  totalMemoryMb: 4096,
  availableMemoryMb: 2048,
  memoryClassMb: 256,
  largeMemoryClassMb: 512,
  logicalCpuCores: 6,
  isLowRamDevice: false,
  supportsArm64: true,
  supportedAbis: ["arm64-v8a"],
  androidSdk: 36,
  thermalStatus: 0,
};

describe("offline ASR native bridge", () => {
  it("initializes the tier selected from real device capabilities", async () => {
    const plugin = createPlugin(standardCapabilities);
    const result = await selectAndInitializeOfflineAsr(plugin);

    expect(result.selection.tier).toBe("medium");
    expect(plugin.initialize).toHaveBeenCalledWith({ tier: "medium" });
    expect(result.runtime.runtime).toBe("whisper.cpp");
  });

  it("passes a low-RAM device to the Low model", async () => {
    const plugin = createPlugin({
      ...standardCapabilities,
      totalMemoryMb: 2048,
      isLowRamDevice: true,
    });

    const result = await selectAndInitializeOfflineAsr(plugin);

    expect(result.selection.tier).toBe("low");
    expect(result.selection.lockedTiers).toEqual(["medium", "high"]);
    expect(plugin.initialize).toHaveBeenCalledWith({ tier: "low" });
  });

  it("rejects a native tier that disagrees with the selector", async () => {
    const plugin = createPlugin(standardCapabilities);
    vi.mocked(plugin.initialize).mockResolvedValue({
      tier: "high",
      loadDurationMs: 25,
      threads: 4,
      runtime: "whisper.cpp",
      systemInfo: "CPU",
    });

    await expect(selectAndInitializeOfflineAsr(plugin)).rejects.toThrow(
      "initialized high, but medium was selected",
    );
  });
});
