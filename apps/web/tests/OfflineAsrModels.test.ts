import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ASR_MODEL_CATALOG,
  ASR_TIER_ORDER,
  selectAsrModel,
} from "../src/apk/asr/asrModelCatalog";

type ArtifactCatalog = {
  package: {
    tier_order: string[];
    total_model_bytes: number;
  };
  models: Record<
    string,
    {
      user_facing_name: string;
      technical_name: string;
      deployment_artifact: {
        size_bytes: number;
      };
    }
  >;
};

function readArtifactCatalog(): ArtifactCatalog {
  return JSON.parse(
    readFileSync(
      path.resolve("../../services/asr/mobile_models/artifacts.json"),
      "utf8",
    ),
  ) as ArtifactCatalog;
}

describe("offline ASR model tiers", () => {
  it("exposes only the Low, Medium, and High user-facing tiers", () => {
    const artifacts = readArtifactCatalog();

    expect(ASR_TIER_ORDER).toEqual(["low", "medium", "high"]);
    expect(artifacts.package.tier_order).toEqual(ASR_TIER_ORDER);

    for (const tier of ASR_TIER_ORDER) {
      expect(artifacts.models[tier].user_facing_name).toBe(
        ASR_MODEL_CATALOG[tier].displayName,
      );
      expect(artifacts.models[tier].technical_name).toBe(
        ASR_MODEL_CATALOG[tier].technicalName,
      );
      expect(ASR_MODEL_CATALOG[tier].displayName).not.toMatch(/^Mu$/i);
    }

    const totalBytes = ASR_TIER_ORDER.reduce(
      (total, tier) =>
        total + artifacts.models[tier].deployment_artifact.size_bytes,
      0,
    );
    expect(totalBytes).toBe(artifacts.package.total_model_bytes);
  });

  it("selects High for capable devices", () => {
    expect(
      selectAsrModel({
        totalMemoryMb: 8192,
        logicalCpuCores: 8,
        isLowRamDevice: false,
        supportsArm64: true,
      }),
    ).toMatchObject({
      tier: "high",
      lockedTiers: [],
      requiresAcknowledgement: true,
      acknowledgementLabel: "I understand",
    });
  });

  it("selects Medium and locks High on standard devices", () => {
    expect(
      selectAsrModel({
        totalMemoryMb: 4096,
        logicalCpuCores: 6,
        isLowRamDevice: false,
        supportsArm64: true,
      }),
    ).toMatchObject({
      tier: "medium",
      lockedTiers: ["high"],
    });
  });

  it("downgrades under constrained available memory or thermal pressure", () => {
    expect(
      selectAsrModel({
        totalMemoryMb: 8_192,
        availableMemoryMb: 1_024,
        logicalCpuCores: 8,
        isLowRamDevice: false,
        supportsArm64: true,
        thermalStatus: 0,
      }),
    ).toMatchObject({
      tier: "medium",
      reason: "available_memory_limit",
    });
    expect(
      selectAsrModel({
        totalMemoryMb: 8_192,
        availableMemoryMb: 4_096,
        logicalCpuCores: 8,
        isLowRamDevice: false,
        supportsArm64: true,
        thermalStatus: 2,
      }),
    ).toMatchObject({ tier: "medium", reason: "thermal_limit" });
    expect(
      selectAsrModel({
        totalMemoryMb: 8_192,
        availableMemoryMb: 4_096,
        logicalCpuCores: 8,
        isLowRamDevice: false,
        supportsArm64: true,
        thermalStatus: 3,
      }),
    ).toMatchObject({ tier: "low", reason: "thermal_limit" });
  });

  it.each([
    ["Android low-RAM", 8192, 8, true, true, "android_low_ram"],
    ["limited memory", 2048, 8, false, true, "memory_limit"],
    ["limited CPU", 4096, 2, false, true, "cpu_limit"],
    ["32-bit architecture", 4096, 8, false, false, "requires_arm64"],
  ])(
    "selects Low for %s devices",
    (
      _case,
      totalMemoryMb,
      logicalCpuCores,
      isLowRamDevice,
      supportsArm64,
      reason,
    ) => {
      expect(
        selectAsrModel({
          totalMemoryMb,
          logicalCpuCores,
          isLowRamDevice,
          supportsArm64,
        }),
      ).toMatchObject({
        tier: "low",
        reason,
        lockedTiers: ["medium", "high"],
      });
    },
  );

  it("rejects invalid native capability readings", () => {
    expect(() =>
      selectAsrModel({
        totalMemoryMb: Number.NaN,
        logicalCpuCores: 8,
        isLowRamDevice: false,
        supportsArm64: true,
      }),
    ).toThrow("memory must be a non-negative number");

    expect(() =>
      selectAsrModel({
        totalMemoryMb: 4096,
        logicalCpuCores: 0,
        isLowRamDevice: false,
        supportsArm64: true,
      }),
    ).toThrow("CPU cores must be a positive integer");
  });
});
