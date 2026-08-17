import { afterEach, describe, expect, it, vi } from "vitest";

import { selectAsrModel } from "../src/apk/asr/asrModelCatalog";
import { createInitialOfflineLearnerState } from "../src/apk/storage/offlineLearnerState";
import {
  DEFAULT_SIMULATOR_SETTINGS,
  SIMULATOR_DEVICE_CAPABILITIES,
  loadSimulatorSettings,
  saveSimulatorSettings,
} from "../src/apk/simulator/simulatorSettings";
import {
  applySimulatorProgressPreset,
  createSimulatorRuntime,
} from "../src/apk/simulator/simulatorRuntime";

import type { SimulatorSettings } from "../src/apk/simulator/simulatorSettings";

describe("offline APK simulator runtime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses safe defaults for invalid settings and clamps delay", () => {
    window.localStorage.setItem(
      "readirect.offline.simulator.settings.v1",
      '{"deviceProfile":"unknown","operationDelayMs":99999}',
    );
    expect(loadSimulatorSettings(window.localStorage)).toEqual(
      DEFAULT_SIMULATOR_SETTINGS,
    );

    saveSimulatorSettings(window.localStorage, {
      ...DEFAULT_SIMULATOR_SETTINGS,
      operationDelayMs: 99999,
    });
    expect(loadSimulatorSettings(window.localStorage).operationDelayMs).toBe(
      3000,
    );
  });

  it.each([
    ["low", "low"],
    ["medium", "medium"],
    ["high", "high"],
  ] as const)(
    "selects the %s ASR tier from its device profile",
    (profile, tier) => {
      expect(selectAsrModel(SIMULATOR_DEVICE_CAPABILITIES[profile]).tier).toBe(
        tier,
      );
    },
  );

  it("simulates correct and incorrect transcripts from the current target", async () => {
    let settings: SimulatorSettings = {
      ...DEFAULT_SIMULATOR_SETTINGS,
      operationDelayMs: 0,
    };
    const runtime = createRuntime(() => settings);

    await runtime.asr.startRecording(30_000, { expectedTranscript: "cat" });
    await expect(runtime.asr.stopRecording()).resolves.toMatchObject({
      audioDurationMs: 1000,
    });
    await expect(runtime.asr.playRecording()).resolves.toMatchObject({
      completed: true,
    });
    await expect(runtime.asr.transcribeRecording()).resolves.toMatchObject({
      transcript: "cat",
      tier: "high",
    });

    settings = { ...settings, asrOutcome: "incorrect" };
    await runtime.asr.startRecording(30_000, { expectedTranscript: "cat" });
    await runtime.asr.stopRecording();
    await expect(runtime.asr.transcribeRecording()).resolves.toMatchObject({
      transcript: "different simulated answer",
      tier: "high",
    });
  });

  it("simulates microphone permission and ASR inference failures", async () => {
    let settings: SimulatorSettings = {
      ...DEFAULT_SIMULATOR_SETTINGS,
      asrOutcome: "permission-error",
      operationDelayMs: 0,
    };
    const runtime = createRuntime(() => settings);

    await expect(runtime.asr.startRecording()).rejects.toMatchObject({
      code: "MICROPHONE_PERMISSION_DENIED",
    });

    settings = { ...settings, asrOutcome: "asr-error" };
    await runtime.asr.startRecording(30_000, { expectedTranscript: "cat" });
    await runtime.asr.stopRecording();
    await expect(runtime.asr.transcribeRecording()).rejects.toMatchObject({
      code: "OFFLINE_ASR_INFERENCE_FAILED",
    });
  });

  it("plays the packaged Clara cue and resolves only after audible playback ends", async () => {
    const settings: SimulatorSettings = {
      ...DEFAULT_SIMULATOR_SETTINGS,
      operationDelayMs: 0,
    };
    const audioInstances: FakeAudio[] = [];
    vi.stubGlobal(
      "Audio",
      class extends FakeAudio {
        constructor(source: string) {
          super(source);
          audioInstances.push(this);
        }
      },
    );
    const runtime = createRuntime(() => settings);

    const playback = runtime.tts.play("lesson-1-mission-1", "fil-PH");
    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].src).toBe(
      "/__offline-tts/fil-PH/lesson-1-mission-1.ogg",
    );
    expect(audioInstances[0].play).toHaveBeenCalledOnce();

    let completed = false;
    void playback.then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(completed).toBe(false);

    audioInstances[0].finish();
    await expect(playback).resolves.toEqual({
      key: "lesson-1-mission-1",
      language: "fil-PH",
      durationMs: 3360,
      completed: true,
    });
  });

  it("simulates failed and cancelled TTS playback", async () => {
    let settings: SimulatorSettings = {
      ...DEFAULT_SIMULATOR_SETTINGS,
      operationDelayMs: 0,
    };
    const audioInstances: FakeAudio[] = [];
    vi.stubGlobal(
      "Audio",
      class extends FakeAudio {
        constructor(source: string) {
          super(source);
          audioInstances.push(this);
        }
      },
    );
    const runtime = createRuntime(() => settings);

    settings = { ...settings, ttsOutcome: "error" };
    await expect(
      runtime.tts.play("lesson-1-mission-1", "en"),
    ).rejects.toMatchObject({
      code: "OFFLINE_TTS_PLAYBACK_FAILED",
    });

    settings = {
      ...settings,
      ttsOutcome: "success",
      operationDelayMs: 0,
    };
    const playback = runtime.tts.play("lesson-1-mission-1", "en");
    await runtime.tts.stop();
    await expect(playback).rejects.toMatchObject({
      code: "OFFLINE_TTS_CANCELLED",
    });
    expect(audioInstances[0].pause).toHaveBeenCalledOnce();
  });

  it("creates valid progress presets for each visual debugging entry point", async () => {
    const fresh = await applyPreset("fresh");
    expect(fresh.setup.onboardingCompletedAt).toBeNull();

    const intro = await applyPreset("intro");
    expect(intro.setup.onboardingCompletedAt).not.toBeNull();
    expect(intro.setup.introCompletedAt).toBeNull();

    const dashboard = await applyPreset("dashboard");
    expect(dashboard.setup.introCompletedAt).not.toBeNull();
    expect(dashboard.journey.diagnostic.status).toBe("available");

    const unlocked = await applyPreset("unlocked");
    expect(unlocked.journey.diagnostic.status).toBe("completed");
    expect(
      unlocked.journey.lessons.every(({ status }) => status === "available"),
    ).toBe(true);

    const midLesson = await applyPreset("mid-lesson");
    expect(midLesson.journey.lessons[2]).toMatchObject({
      status: "in_progress",
      currentMissionKey: "Read a phrase",
      currentItemKey: "lesson-3-mission-1-1",
    });

    const complete = await applyPreset("complete");
    expect(
      complete.journey.lessons.every(({ status }) => status === "completed"),
    ).toBe(true);
    expect(complete.journey.finalAssessment.status).toBe("completed");
    expect(complete.journey.achievements).toHaveLength(8);

    const lowDashboard = await applyPreset("dashboard", {
      asrTier: "low",
      claraMode: "static",
    });
    expect(lowDashboard.setup).toMatchObject({
      asr: { tier: "low" },
      clara: { mode: "static" },
    });
  });
});

class FakeAudio extends EventTarget {
  readonly src: string;
  currentTime = 0;
  duration = 3.36;
  preload = "";
  readonly play = vi.fn().mockResolvedValue(undefined);
  readonly pause = vi.fn();

  constructor(source: string) {
    super();
    this.src = source;
  }

  finish() {
    this.dispatchEvent(new Event("ended"));
  }
}

function createRuntime(getSettings: () => SimulatorSettings) {
  let learner = createInitialOfflineLearnerState({
    id: "732549b7-a73e-49f0-bbaa-251cb412ec59",
    now: "2026-08-17T03:00:00.000Z",
  });
  return createSimulatorRuntime({
    getSettings,
    repository: {
      initialize: async () => learner,
      update: async (mutate) => {
        learner = mutate(learner, "2026-08-17T03:01:00.000Z");
        return learner;
      },
    },
  });
}

async function applyPreset(
  preset:
    "fresh" | "intro" | "dashboard" | "unlocked" | "mid-lesson" | "complete",
  capabilitySelection?: {
    asrTier: "low" | "medium" | "high";
    claraMode: "static" | "dynamic";
  },
) {
  let learner = createInitialOfflineLearnerState({
    id: "2d67d81a-4cd3-4454-b907-25aeec2c63f3",
    now: "2026-08-17T04:00:00.000Z",
  });
  return applySimulatorProgressPreset(
    {
      initialize: async () => learner,
      update: async (mutate) => {
        learner = mutate(learner, "2026-08-17T04:01:00.000Z");
        return learner;
      },
    },
    preset,
    capabilitySelection,
  );
}
