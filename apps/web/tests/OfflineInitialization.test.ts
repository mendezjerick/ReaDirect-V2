import { describe, expect, it, vi } from "vitest";

import { selectClaraMode } from "../src/apk/clara/claraCapability";
import { runOfflineInitialization } from "../src/apk/onboarding/offlineInitialization";
import { createInitialOfflineLearnerState } from "../src/apk/storage/offlineLearnerState";

import type { OfflineInitializationDependencies } from "../src/apk/onboarding/offlineInitialization";

const now = "2026-08-16T01:00:00.000Z";
const learner = createInitialOfflineLearnerState({
  id: "5bc9dfb4-8163-4b59-aeab-f510fc2793e3",
  now,
});
const capabilities = {
  totalMemoryMb: 4_096,
  availableMemoryMb: 2_048,
  memoryClassMb: 256,
  largeMemoryClassMb: 512,
  logicalCpuCores: 6,
  isLowRamDevice: false,
  supportsArm64: true,
  supportedAbis: ["arm64-v8a"],
  androidSdk: 36,
  thermalStatus: 0,
};
const inspection = {
  capabilities,
  selection: {
    tier: "medium" as const,
    model: {
      displayName: "Medium" as const,
      technicalName: "Distil-Whisper Small English Q5_1",
      explanation: "Balanced",
      minimumMemoryMb: 3_072,
      minimumLogicalCpuCores: 4,
      requiresArm64: true,
    },
    reason: "highest_supported" as const,
    lockedTiers: ["high" as const],
    requiresAcknowledgement: true as const,
    acknowledgementLabel: "I understand" as const,
  },
};

describe("offline initialization", () => {
  it("advances only when each real initialization operation completes", async () => {
    const calls: string[] = [];
    const dependencies: OfflineInitializationDependencies = {
      loadLearner: vi.fn(async () => {
        calls.push("profile");
        return learner;
      }),
      inspectAsr: vi.fn(async () => {
        calls.push("device");
        return inspection;
      }),
      prepareTts: vi.fn(async () => {
        calls.push("voice");
        return {
          catalogId: "clara-sh-offline-apk-v1" as const,
          assetCount: 293,
          totalBytes: 9_887_949,
          totalDurationMs: 1_154_880,
        };
      }),
      initializeAsr: vi.fn(async () => {
        calls.push("asr");
        return {
          tier: "medium" as const,
          loadDurationMs: 800,
          threads: 4,
          runtime: "whisper.cpp" as const,
          systemInfo: "CPU",
        };
      }),
      inspectClara: vi.fn(async (device) => {
        calls.push("clara");
        return selectClaraMode(device, {
          webglAvailable: true,
          maxTextureSize: 8_192,
        });
      }),
    };
    const progress: number[] = [];

    const result = await runOfflineInitialization(
      (snapshot) => progress.push(snapshot.percent),
      dependencies,
    );

    expect(calls).toEqual(["profile", "device", "voice", "asr", "clara"]);
    expect(progress).toEqual([0, 12, 24, 40, 95, 100]);
    expect(result.asr.selection.tier).toBe("medium");
    expect(result.clara.mode).toBe("dynamic");
  });

  it("warms ASR, TTS, and Clara capabilities concurrently after inspection", async () => {
    let resolveVoice!: () => void;
    let resolveAsr!: () => void;
    let resolveClara!: () => void;
    const voiceGate = new Promise<void>((resolve) => {
      resolveVoice = resolve;
    });
    const asrGate = new Promise<void>((resolve) => {
      resolveAsr = resolve;
    });
    const claraGate = new Promise<void>((resolve) => {
      resolveClara = resolve;
    });
    const dependencies: OfflineInitializationDependencies = {
      loadLearner: vi.fn().mockResolvedValue(learner),
      inspectAsr: vi.fn().mockResolvedValue(inspection),
      prepareTts: vi.fn(async () => {
        await voiceGate;
        return {
          catalogId: "clara-sh-offline-apk-v1" as const,
          assetCount: 293,
          totalBytes: 9_887_949,
          totalDurationMs: 1_154_880,
        };
      }),
      initializeAsr: vi.fn(async () => {
        await asrGate;
        return {
          tier: "medium" as const,
          loadDurationMs: 800,
          threads: 4,
          runtime: "whisper.cpp" as const,
          systemInfo: "CPU",
        };
      }),
      inspectClara: vi.fn(async () => {
        await claraGate;
        return selectClaraMode(capabilities, {
          webglAvailable: true,
          maxTextureSize: 8_192,
        });
      }),
    };

    const initialization = runOfflineInitialization(
      () => undefined,
      dependencies,
    );
    await vi.waitFor(() => {
      expect(dependencies.prepareTts).toHaveBeenCalledOnce();
      expect(dependencies.initializeAsr).toHaveBeenCalledOnce();
      expect(dependencies.inspectClara).toHaveBeenCalledOnce();
    });

    resolveVoice();
    resolveAsr();
    resolveClara();
    await expect(initialization).resolves.toMatchObject({
      asr: { runtime: { tier: "medium" } },
      clara: { mode: "dynamic" },
    });
  });
});

describe("Clara capability selection", () => {
  it("locks Dynamic Clara on low-end devices", () => {
    expect(
      selectClaraMode(
        {
          totalMemoryMb: 2_048,
          logicalCpuCores: 4,
          isLowRamDevice: true,
          supportsArm64: true,
        },
        {
          webglAvailable: true,
          maxTextureSize: 8_192,
        },
      ),
    ).toMatchObject({
      mode: "static",
      displayName: "Static",
      reason: "android_low_ram",
      dynamicLocked: true,
    });
  });

  it("allows Dynamic Clara only at its complete device threshold", () => {
    expect(
      selectClaraMode(
        {
          totalMemoryMb: 4_096,
          logicalCpuCores: 6,
          isLowRamDevice: false,
          supportsArm64: true,
        },
        {
          webglAvailable: true,
          maxTextureSize: 8_192,
        },
      ),
    ).toMatchObject({
      mode: "dynamic",
      displayName: "Dynamic",
      dynamicLocked: false,
    });
    expect(
      selectClaraMode(
        {
          totalMemoryMb: 4_096,
          logicalCpuCores: 4,
          isLowRamDevice: false,
          supportsArm64: true,
        },
        {
          webglAvailable: true,
          maxTextureSize: 8_192,
        },
      ).mode,
    ).toBe("static");
  });

  it("locks Dynamic Clara when the GPU cannot hold its local texture", () => {
    expect(
      selectClaraMode(capabilities, {
        webglAvailable: true,
        maxTextureSize: 4_096,
      }),
    ).toMatchObject({
      mode: "static",
      reason: "texture_limit",
      dynamicLocked: true,
    });

    expect(
      selectClaraMode(capabilities, {
        webglAvailable: false,
        maxTextureSize: 0,
      }).reason,
    ).toBe("webgl_unavailable");
  });

  it("locks Dynamic Clara under memory or thermal pressure", () => {
    expect(
      selectClaraMode(
        { ...capabilities, availableMemoryMb: 768 },
        { webglAvailable: true, maxTextureSize: 8_192 },
      ),
    ).toMatchObject({ mode: "static", reason: "available_memory_limit" });
    expect(
      selectClaraMode(
        { ...capabilities, availableMemoryMb: 3_000, thermalStatus: 2 },
        { webglAvailable: true, maxTextureSize: 8_192 },
      ),
    ).toMatchObject({ mode: "static", reason: "thermal_limit" });
  });
});
