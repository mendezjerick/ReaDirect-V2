import {
  inspectAndSelectClaraMode,
  type ClaraSelection,
} from "../clara/claraCapability";
import {
  offlineAsrBridge,
  type OfflineAsrInitialization,
  type OfflineAsrInspection,
} from "../native/offlineAsrBridge";
import {
  offlineTtsBridge,
  type OfflineTtsCatalogSummary,
} from "../native/offlineTtsBridge";
import { offlineLearnerRepository } from "../storage/offlineLearnerRepository";

import type { OfflineLearnerState } from "../storage/offlineLearnerState";

export type OfflineInitializationProgress = {
  percent: 0 | 12 | 24 | 40 | 95 | 100;
  label: string;
  step: "starting" | "profile" | "device" | "voice" | "asr" | "clara";
};

export type OfflineInitializationResult = {
  learner: OfflineLearnerState;
  asr: OfflineAsrInspection & {
    runtime: OfflineAsrInitialization["runtime"];
  };
  tts: OfflineTtsCatalogSummary;
  clara: ClaraSelection;
};

export type OfflineInitializationDependencies = {
  loadLearner: () => Promise<OfflineLearnerState>;
  inspectAsr: () => Promise<OfflineAsrInspection>;
  prepareTts: () => Promise<OfflineTtsCatalogSummary>;
  initializeAsr: (
    inspection: OfflineAsrInspection,
  ) => Promise<OfflineAsrInitialization["runtime"]>;
  inspectClara: (
    capabilities: OfflineAsrInspection["capabilities"],
  ) => Promise<ClaraSelection>;
};

const defaultDependencies: OfflineInitializationDependencies = {
  loadLearner: () => offlineLearnerRepository.initialize(),
  inspectAsr: () => offlineAsrBridge.inspect(),
  prepareTts: () => offlineTtsBridge.prepare(),
  initializeAsr: (inspection) =>
    offlineAsrBridge.initializeInspection(inspection),
  inspectClara: async (capabilities) => inspectAndSelectClaraMode(capabilities),
};

export async function runOfflineInitialization(
  onProgress: (progress: OfflineInitializationProgress) => void,
  dependencies: OfflineInitializationDependencies = defaultDependencies,
): Promise<OfflineInitializationResult> {
  onProgress({ percent: 0, label: "Preparing offline mode", step: "starting" });

  const learner = await dependencies.loadLearner();
  onProgress({ percent: 12, label: "Checking this device", step: "profile" });

  const inspection = await dependencies.inspectAsr();
  onProgress({ percent: 24, label: "Preparing Clara's voice", step: "device" });

  onProgress({
    percent: 40,
    label: `Loading ${inspection.selection.model.displayName} and Clara`,
    step: "voice",
  });

  const [tts, runtime, clara] = await Promise.all([
    dependencies.prepareTts(),
    dependencies.initializeAsr(inspection),
    dependencies.inspectClara(inspection.capabilities),
  ]);
  onProgress({ percent: 95, label: "Checking Clara's display", step: "asr" });
  onProgress({ percent: 100, label: "Offline mode is ready", step: "clara" });

  return {
    learner,
    asr: { ...inspection, runtime },
    tts,
    clara,
  };
}
