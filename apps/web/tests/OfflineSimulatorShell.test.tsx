import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OfflineApkApp } from "../src/apk/OfflineApkApp";
import { selectAsrModel } from "../src/apk/asr/asrModelCatalog";
import { createInitialOfflineLearnerState } from "../src/apk/storage/offlineLearnerState";
import { ThemeProvider } from "../src/features/theme/ThemeProvider";
import { OfflineSimulatorShell } from "../src/apk/simulator/OfflineSimulatorShell";

import type { OfflineAppRuntime } from "../src/apk/runtime/offlineAppRuntime";

vi.mock("../src/app/appTarget", () => ({ APP_TARGET: "offline-apk" }));

describe("offline APK simulator shell", () => {
  beforeEach(() => window.localStorage.clear());

  it("runs the real onboarding with an injected browser runtime", async () => {
    let learner = createInitialOfflineLearnerState({
      id: "a3cd67e2-79cf-4ee6-b35b-0734364d2542",
      now: "2026-08-17T03:00:00.000Z",
    });
    const capabilities = {
      totalMemoryMb: 8192,
      availableMemoryMb: 4096,
      logicalCpuCores: 8,
      isLowRamDevice: false,
      supportsArm64: true,
      memoryClassMb: 512,
      largeMemoryClassMb: 1024,
      supportedAbis: ["arm64-v8a"],
      androidSdk: 35,
      thermalStatus: 0,
    };
    const selection = selectAsrModel(capabilities);
    const runtime: OfflineAppRuntime = {
      repository: {
        initialize: async () => learner,
        update: async (mutate) => {
          learner = mutate(learner, "2026-08-17T03:01:00.000Z");
          return learner;
        },
      },
      initialize: async () => ({
        learner,
        asr: {
          capabilities,
          selection,
          runtime: {
            tier: "high",
            loadDurationMs: 120,
            threads: 8,
            runtime: "whisper.cpp",
            systemInfo: "browser simulator",
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
          mode: "dynamic",
          displayName: "Dynamic",
          reason: "supported",
          dynamicLocked: false,
          requiresAcknowledgement: true,
          acknowledgementLabel: "I understand",
        },
      }),
      asr: {
        startRecording: async (maxDurationMs = 30_000) => ({
          sampleRateHz: 16000,
          maxDurationMs,
        }),
        stopRecording: async () => ({
          sampleCount: 16_000,
          audioDurationMs: 1000,
        }),
        playRecording: async () => ({
          audioDurationMs: 1000,
          completed: true,
        }),
        transcribeRecording: async () => ({
          transcript: "simulated answer",
          tier: "high",
          sampleCount: 16_000,
          audioDurationMs: 1000,
          inferenceDurationMs: 120,
        }),
        clearRecording: async () => undefined,
        stopAndTranscribe: async () => ({
          transcript: "simulated answer",
          tier: "high",
          sampleCount: 16_000,
          audioDurationMs: 1000,
          inferenceDurationMs: 120,
        }),
        cancelRecording: async () => undefined,
      },
      tts: {
        play: async (key, language) => ({
          key,
          language,
          durationMs: 120,
          completed: true,
        }),
        stop: async () => undefined,
      },
    };

    render(
      <ThemeProvider>
        <OfflineApkApp runtime={runtime} />
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole("alertdialog", {
        name: "Speech recognition: High",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/available only inside the ReaDirect Android app/i),
    ).not.toBeInTheDocument();
  });

  it("switches device and Clara modes through the real onboarding", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <OfflineSimulatorShell />
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole("alertdialog", {
        name: "Speech recognition: High",
      }),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Device profile"), "low");
    expect(
      await screen.findByRole("alertdialog", {
        name: "Speech recognition: Low",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "I understand" }));
    expect(
      await screen.findByRole("alertdialog", { name: "Clara display: Static" }),
    ).toBeInTheDocument();
  });

  it("opens dashboard presets, resets progress, and collapses its panel", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <OfflineSimulatorShell />
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole("complementary", { name: "APK Simulator" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dashboard ready" }));
    expect(
      await screen.findByRole("button", { name: "Open Reading Journey" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Reset simulated app" }),
    );
    expect(
      await screen.findByRole("alertdialog", {
        name: "Speech recognition: High",
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Collapse simulator" }),
    );
    expect(
      screen.getByRole("button", { name: "Open APK Simulator" }),
    ).toBeInTheDocument();
  });
});
