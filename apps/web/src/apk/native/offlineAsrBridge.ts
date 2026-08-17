import { Capacitor, registerPlugin } from "@capacitor/core";

import {
  selectAsrModel,
  type AsrModelSelection,
  type AsrTier,
  type DeviceAsrCapabilities,
} from "../asr/asrModelCatalog";

export type NativeDeviceAsrCapabilities = DeviceAsrCapabilities & {
  availableMemoryMb: number;
  memoryClassMb: number;
  largeMemoryClassMb: number;
  supportedAbis: string[];
  androidSdk: number;
  thermalStatus: number;
};

export type OfflineAsrInitialization = {
  capabilities: NativeDeviceAsrCapabilities;
  selection: AsrModelSelection;
  runtime: {
    tier: AsrTier;
    loadDurationMs: number;
    threads: number;
    runtime: "whisper.cpp";
    systemInfo: string;
  };
};

export type OfflineAsrInspection = Pick<
  OfflineAsrInitialization,
  "capabilities" | "selection"
>;

export type OfflineAsrTranscription = {
  transcript: string;
  tier: AsrTier;
  sampleCount: number;
  audioDurationMs: number;
  inferenceDurationMs: number;
};

export type OfflineAsrRuntimeState = {
  initialized: boolean;
  tier: AsrTier | null;
  recording: boolean;
  busy: boolean;
  threads: number;
};

export interface OfflineAsrNativePlugin {
  getDeviceCapabilities(): Promise<NativeDeviceAsrCapabilities>;
  initialize(options: {
    tier: AsrTier;
  }): Promise<OfflineAsrInitialization["runtime"]>;
  startRecording(options: { maxDurationMs: number }): Promise<{
    sampleRateHz: 16000;
    maxDurationMs: number;
  }>;
  stopAndTranscribe(): Promise<OfflineAsrTranscription>;
  cancelRecording(): Promise<void>;
  getRuntimeState(): Promise<OfflineAsrRuntimeState>;
  shutdown(): Promise<void>;
}

const NativeOfflineAsr = registerPlugin<OfflineAsrNativePlugin>("OfflineAsr");

function assertAndroidRuntime() {
  if (Capacitor.getPlatform() !== "android") {
    throw new Error(
      "Offline ASR is available only inside the ReaDirect Android app.",
    );
  }
}

export async function selectAndInitializeOfflineAsr(
  plugin: OfflineAsrNativePlugin,
): Promise<OfflineAsrInitialization> {
  const inspection = await inspectOfflineAsr(plugin);
  const runtime = await initializeInspectedOfflineAsr(plugin, inspection);

  return { ...inspection, runtime };
}

export async function inspectOfflineAsr(
  plugin: OfflineAsrNativePlugin,
): Promise<OfflineAsrInspection> {
  const capabilities = await plugin.getDeviceCapabilities();
  return { capabilities, selection: selectAsrModel(capabilities) };
}

export async function initializeInspectedOfflineAsr(
  plugin: OfflineAsrNativePlugin,
  inspection: OfflineAsrInspection,
): Promise<OfflineAsrInitialization["runtime"]> {
  const { selection } = inspection;
  const runtime = await plugin.initialize({ tier: selection.tier });

  if (runtime.tier !== selection.tier) {
    throw new Error(
      `Offline ASR initialized ${runtime.tier}, but ${selection.tier} was selected.`,
    );
  }

  return runtime;
}

export const offlineAsrBridge = {
  async inspect(): Promise<OfflineAsrInspection> {
    assertAndroidRuntime();
    return inspectOfflineAsr(NativeOfflineAsr);
  },

  async initializeInspection(
    inspection: OfflineAsrInspection,
  ): Promise<OfflineAsrInitialization["runtime"]> {
    assertAndroidRuntime();
    return initializeInspectedOfflineAsr(NativeOfflineAsr, inspection);
  },

  async initialize(): Promise<OfflineAsrInitialization> {
    assertAndroidRuntime();
    return selectAndInitializeOfflineAsr(NativeOfflineAsr);
  },

  async startRecording(maxDurationMs = 30_000) {
    assertAndroidRuntime();
    return NativeOfflineAsr.startRecording({ maxDurationMs });
  },

  async stopAndTranscribe(): Promise<OfflineAsrTranscription> {
    assertAndroidRuntime();
    return NativeOfflineAsr.stopAndTranscribe();
  },

  async cancelRecording(): Promise<void> {
    assertAndroidRuntime();
    await NativeOfflineAsr.cancelRecording();
  },

  async getRuntimeState(): Promise<OfflineAsrRuntimeState> {
    assertAndroidRuntime();
    return NativeOfflineAsr.getRuntimeState();
  },

  async shutdown(): Promise<void> {
    assertAndroidRuntime();
    await NativeOfflineAsr.shutdown();
  },
};
