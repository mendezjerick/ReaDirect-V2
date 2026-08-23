import { selectAsrModel } from "../asr/asrModelCatalog";
import { offlineJourneyContent } from "../content/offlineJourneyContent";
import { runOfflineInitialization } from "../onboarding/offlineInitialization";
import {
  acknowledgeOfflineAsr,
  acknowledgeOfflineClara,
  completeOfflineAssessment,
  completeOfflineIntro,
  completeOfflineLesson,
  createInitialOfflineLearnerState,
  saveOfflineLessonCheckpoint,
  skipOfflineDiagnostic,
} from "../storage/offlineLearnerState";
import { SIMULATOR_DEVICE_CAPABILITIES } from "./simulatorSettings";

import type { ClaraSelection } from "../clara/claraCapability";
import type { OfflineAppRuntime } from "../runtime/offlineAppRuntime";
import type { SimulatorSettings } from "./simulatorSettings";
import type { OfflineLearnerState } from "../storage/offlineLearnerState";

type SimulatorRuntimeOptions = {
  getSettings: () => SimulatorSettings;
  repository: OfflineAppRuntime["repository"];
};

export type SimulatorProgressPreset =
  "fresh" | "intro" | "dashboard" | "unlocked" | "mid-lesson" | "complete";

export type SimulatorCapabilitySelection = {
  asrTier: "low" | "medium" | "high";
  claraMode: "static" | "dynamic";
};

function simulatorError(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

function claraSelection(settings: SimulatorSettings): ClaraSelection {
  const dynamic = settings.claraMode === "dynamic";
  return {
    mode: dynamic ? "dynamic" : "static",
    displayName: dynamic ? "Dynamic" : "Static",
    reason: dynamic ? "supported" : "memory_limit",
    dynamicLocked: !dynamic,
    requiresAcknowledgement: true,
    acknowledgementLabel: "I understand",
  };
}

export function getSimulatorCapabilitySelection(
  settings: SimulatorSettings,
): SimulatorCapabilitySelection {
  return {
    asrTier: selectAsrModel(
      SIMULATOR_DEVICE_CAPABILITIES[settings.deviceProfile],
    ).tier,
    claraMode: settings.claraMode,
  };
}

export function createSimulatorRuntime({
  getSettings,
  repository,
}: SimulatorRuntimeOptions): OfflineAppRuntime {
  let expectedTranscript = "simulated answer";
  let recording = false;
  let hasCapture = false;
  let pendingPlayback:
    | {
        audio: HTMLAudioElement | null;
        timer: number | null;
        cancel: () => void;
        reject: (error: Error) => void;
      }
    | undefined;

  return {
    repository,
    initialize: (onProgress) => {
      const settings = getSettings();
      const capabilities =
        SIMULATOR_DEVICE_CAPABILITIES[settings.deviceProfile];
      return runOfflineInitialization(onProgress, {
        loadLearner: () => repository.initialize(),
        inspectAsr: async () => {
          await wait(settings.operationDelayMs);
          return {
            capabilities,
            selection: selectAsrModel(capabilities),
          };
        },
        prepareTts: async () => {
          await wait(settings.operationDelayMs);
          return {
            catalogId: "clara-sh-offline-apk-v2",
            languages: ["en", "fil-PH"] as const,
            assetCount: 586,
            totalBytes: 19_887_949,
            totalDurationMs: 2_309_760,
          };
        },
        initializeAsr: async (inspection) => {
          await wait(settings.operationDelayMs);
          return {
            tier: inspection.selection.tier,
            loadDurationMs: settings.operationDelayMs,
            threads: Math.max(1, capabilities.logicalCpuCores - 1),
            runtime: "whisper.cpp",
            systemInfo: `APK browser simulator (${settings.deviceProfile})`,
          };
        },
        inspectClara: async () => {
          await wait(settings.operationDelayMs);
          return claraSelection(settings);
        },
      });
    },
    asr: {
      async startRecording(maxDurationMs = 30_000, context) {
        const settings = getSettings();
        await wait(settings.operationDelayMs);
        if (settings.asrOutcome === "permission-error") {
          throw simulatorError(
            "MICROPHONE_PERMISSION_DENIED",
            "Microphone permission was denied in the APK simulator.",
          );
        }
        expectedTranscript = context?.expectedTranscript ?? "simulated answer";
        recording = true;
        hasCapture = false;
        return { sampleRateHz: 16000, maxDurationMs };
      },
      async stopRecording() {
        const settings = getSettings();
        await wait(settings.operationDelayMs);
        if (!recording) {
          throw simulatorError(
            "OFFLINE_ASR_NOT_RECORDING",
            "The APK simulator is not recording.",
          );
        }
        recording = false;
        hasCapture = true;
        return {
          sampleCount: 16_000,
          audioDurationMs: 1000,
        };
      },
      async playRecording() {
        const settings = getSettings();
        await wait(settings.operationDelayMs);
        if (!hasCapture) {
          throw simulatorError(
            "OFFLINE_ASR_NO_CAPTURE",
            "The APK simulator has no recording to play.",
          );
        }
        return {
          audioDurationMs: 1000,
          completed: true,
        };
      },
      async transcribeRecording() {
        const settings = getSettings();
        await wait(settings.operationDelayMs);
        if (!hasCapture) {
          throw simulatorError(
            "OFFLINE_ASR_NO_CAPTURE",
            "The APK simulator has no recording to transcribe.",
          );
        }
        if (settings.asrOutcome === "asr-error") {
          throw simulatorError(
            "OFFLINE_ASR_INFERENCE_FAILED",
            "Simulated offline speech recognition failed.",
          );
        }
        const capabilities =
          SIMULATOR_DEVICE_CAPABILITIES[settings.deviceProfile];
        return {
          transcript:
            settings.asrOutcome === "incorrect"
              ? "different simulated answer"
              : expectedTranscript,
          tier: selectAsrModel(capabilities).tier,
          sampleCount: 16_000,
          audioDurationMs: 1000,
          inferenceDurationMs: settings.operationDelayMs,
        };
      },
      async clearRecording() {
        recording = false;
        hasCapture = false;
      },
      async stopAndTranscribe() {
        if (recording) {
          recording = false;
          hasCapture = true;
        }
        const settings = getSettings();
        await wait(settings.operationDelayMs);
        if (!hasCapture) {
          throw simulatorError(
            "OFFLINE_ASR_NOT_RECORDING",
            "The APK simulator is not recording.",
          );
        }
        if (settings.asrOutcome === "asr-error") {
          throw simulatorError(
            "OFFLINE_ASR_INFERENCE_FAILED",
            "Simulated offline speech recognition failed.",
          );
        }
        const capabilities =
          SIMULATOR_DEVICE_CAPABILITIES[settings.deviceProfile];
        return {
          transcript:
            settings.asrOutcome === "incorrect"
              ? "different simulated answer"
              : expectedTranscript,
          tier: selectAsrModel(capabilities).tier,
          sampleCount: 16_000,
          audioDurationMs: 1000,
          inferenceDurationMs: settings.operationDelayMs,
        };
      },
      async cancelRecording() {
        recording = false;
      },
    },
    tts: {
      play(key, language) {
        const settings = getSettings();
        if (settings.ttsOutcome === "error") {
          return new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => {
              pendingPlayback = undefined;
              reject(
                simulatorError(
                  "OFFLINE_TTS_PLAYBACK_FAILED",
                  "Simulated Clara speech playback failed.",
                ),
              );
            }, settings.operationDelayMs);
            pendingPlayback = {
              audio: null,
              timer,
              cancel: () => window.clearTimeout(timer),
              reject,
            };
          });
        }

        const audio = new Audio(
          `/__offline-tts/${encodeURIComponent(language)}/${encodeURIComponent(key)}.ogg`,
        );
        audio.preload = "auto";
        return new Promise((resolve, reject) => {
          let settled = false;
          const cleanup = () => {
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("error", handleError);
            if (pendingPlayback?.audio === audio) pendingPlayback = undefined;
          };
          const handleEnded = () => {
            if (settled) return;
            settled = true;
            cleanup();
            const durationMs = Number.isFinite(audio.duration)
              ? Math.round(audio.duration * 1000)
              : 0;
            resolve({ key, language, durationMs, completed: true });
          };
          const handleError = () => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(
              simulatorError(
                "OFFLINE_TTS_PLAYBACK_FAILED",
                "Clara's packaged speech could not play in the browser simulator.",
              ),
            );
          };
          const cancel = () => {
            if (settled) return;
            settled = true;
            audio.pause();
            audio.currentTime = 0;
            cleanup();
          };

          audio.addEventListener("ended", handleEnded, { once: true });
          audio.addEventListener("error", handleError, { once: true });
          pendingPlayback = {
            audio,
            timer: null,
            cancel,
            reject,
          };
          void audio.play().catch(() => {
            handleError();
          });
        });
      },
      async stop() {
        if (!pendingPlayback) return;
        const activePlayback = pendingPlayback;
        activePlayback.cancel();
        activePlayback.reject(
          simulatorError(
            "OFFLINE_TTS_CANCELLED",
            "Simulated Clara speech playback was cancelled.",
          ),
        );
        pendingPlayback = undefined;
      },
    },
  };
}

export function applySimulatorProgressPreset(
  repository: OfflineAppRuntime["repository"],
  preset: SimulatorProgressPreset,
  capabilitySelection: SimulatorCapabilitySelection = {
    asrTier: "high",
    claraMode: "dynamic",
  },
): Promise<OfflineLearnerState> {
  return repository.update((current, now) => {
    let next = createInitialOfflineLearnerState({
      id: current.profile.id,
      now,
      revision: current.revision,
    });
    if (preset === "fresh") return next;

    next = acknowledgeOfflineAsr(next, capabilitySelection.asrTier, now);
    next = acknowledgeOfflineClara(next, capabilitySelection.claraMode, now);
    if (preset === "intro") return next;

    next = completeOfflineIntro(next, now);
    if (preset === "dashboard") return next;

    next = skipOfflineDiagnostic(
      next,
      offlineJourneyContent.assessments.diagnostic.items.map(({ key }) => key),
      now,
    );
    if (preset === "unlocked") return next;

    if (preset === "mid-lesson") {
      const item = offlineJourneyContent.lessons[2].items[0];
      return saveOfflineLessonCheckpoint(
        next,
        3,
        {
          currentMissionKey: item.phase,
          currentPhase: item.phase,
          currentItemKey: item.key,
          completedItemKeys: [],
        },
        now,
      );
    }

    for (const order of [1, 2, 3, 4, 5, 6] as const) {
      next = completeOfflineLesson(next, order, now);
    }
    return completeOfflineAssessment(
      next,
      "final",
      {
        score: offlineJourneyContent.assessments.final.items.length,
        maximum: offlineJourneyContent.assessments.final.items.length,
      },
      now,
    );
  });
}
