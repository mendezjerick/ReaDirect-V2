import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OfflineOnboarding } from "../src/apk/onboarding/OfflineOnboarding";
import {
  createInitialOfflineLearnerState,
  offlineLearnerStateSchema,
} from "../src/apk/storage/offlineLearnerState";

import type { OfflineInitializationResult } from "../src/apk/onboarding/offlineInitialization";

const times = [
  "2026-08-16T01:00:00.000Z",
  "2026-08-16T01:00:01.000Z",
  "2026-08-16T01:00:02.000Z",
];

function createResult(): OfflineInitializationResult {
  const learner = createInitialOfflineLearnerState({
    id: "5bc9dfb4-8163-4b59-aeab-f510fc2793e3",
    now: times[0],
  });
  return {
    learner,
    asr: {
      capabilities: {
        totalMemoryMb: 2_048,
        availableMemoryMb: 1_024,
        memoryClassMb: 192,
        largeMemoryClassMb: 384,
        logicalCpuCores: 4,
        isLowRamDevice: true,
        supportsArm64: true,
        supportedAbis: ["arm64-v8a"],
        androidSdk: 32,
        thermalStatus: 0,
      },
      selection: {
        tier: "low",
        model: {
          displayName: "Low",
          technicalName: "Whisper Base English Q5_1",
          explanation: "Lightweight",
          minimumMemoryMb: 0,
          minimumLogicalCpuCores: 1,
          requiresArm64: false,
        },
        reason: "android_low_ram",
        lockedTiers: ["medium", "high"],
        requiresAcknowledgement: true,
        acknowledgementLabel: "I understand",
      },
      runtime: {
        tier: "low",
        loadDurationMs: 400,
        threads: 2,
        runtime: "whisper.cpp",
        systemInfo: "CPU",
      },
    },
    tts: {
      catalogId: "clara-sh-offline-apk-v2",
      languages: ["en", "fil-PH"],
      assetCount: 586,
      totalBytes: 19_887_949,
      totalDurationMs: 2_635_040,
    },
    clara: {
      mode: "static",
      displayName: "Static",
      reason: "android_low_ram",
      dynamicLocked: true,
      requiresAcknowledgement: true,
      acknowledgementLabel: "I understand",
    },
  };
}

describe("offline onboarding", () => {
  it("requires ASR acknowledgement before the independent Clara acknowledgement", async () => {
    const user = userEvent.setup();
    const result = createResult();
    let stored = result.learner;
    let clockIndex = 1;
    const repository = {
      update: vi.fn(async (mutate) => {
        const mutated = mutate(stored, times[clockIndex++]);
        stored = offlineLearnerStateSchema.parse({
          ...mutated,
          revision: stored.revision + 1,
        });
        return stored;
      }),
    };
    const initialize = vi.fn(async (onProgress) => {
      onProgress({
        percent: 100,
        label: "Offline mode is ready",
        step: "clara",
      });
      return result;
    });
    const onReady = vi.fn();

    render(
      <OfflineOnboarding
        onReady={onReady}
        initialize={initialize}
        repository={repository}
      />,
    );

    expect(
      await screen.findByRole("alertdialog", {
        name: /Speech recognition: Low/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Whisper|Turbo|Mu/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "I understand" }));
    expect(
      await screen.findByRole("alertdialog", {
        name: /Clara display: Static/i,
      }),
    ).toBeInTheDocument();
    expect(onReady).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "I understand" }));
    expect(onReady).toHaveBeenCalledOnce();
    expect(onReady.mock.calls[0][0].setup).toMatchObject({
      onboardingCompletedAt: times[2],
      asr: { tier: "low", acknowledgedAt: times[1] },
      clara: { mode: "static", acknowledgedAt: times[2] },
    });
    expect(onReady.mock.calls[0][1]).toBe(result);
  });

  it("recovers from interrupted initialization through an explicit retry", async () => {
    const user = userEvent.setup();
    const result = createResult();
    const initialize = vi
      .fn()
      .mockRejectedValueOnce(new Error("Initialization was interrupted."))
      .mockResolvedValueOnce(result);

    render(
      <OfflineOnboarding onReady={() => undefined} initialize={initialize} />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Initialization was interrupted.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("alertdialog", {
        name: /Speech recognition: Low/i,
      }),
    ).toBeInTheDocument();
    expect(initialize).toHaveBeenCalledTimes(2);
  });
});
