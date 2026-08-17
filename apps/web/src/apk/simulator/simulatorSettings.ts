import type { NativeDeviceAsrCapabilities } from "../native/offlineAsrBridge";

export type SimulatorDeviceProfile = "low" | "medium" | "high";
export type SimulatorAsrOutcome =
  "correct" | "incorrect" | "permission-error" | "asr-error";
export type SimulatorTtsOutcome = "success" | "error";

export type SimulatorSettings = {
  deviceProfile: SimulatorDeviceProfile;
  claraMode: "static" | "dynamic";
  asrOutcome: SimulatorAsrOutcome;
  ttsOutcome: SimulatorTtsOutcome;
  operationDelayMs: number;
  panelOpen: boolean;
};

export const SIMULATOR_SETTINGS_KEY = "readirect.offline.simulator.settings.v1";

export const DEFAULT_SIMULATOR_SETTINGS: SimulatorSettings = {
  deviceProfile: "high",
  claraMode: "dynamic",
  asrOutcome: "correct",
  ttsOutcome: "success",
  operationDelayMs: 120,
  panelOpen: true,
};

export const SIMULATOR_DEVICE_CAPABILITIES: Record<
  SimulatorDeviceProfile,
  NativeDeviceAsrCapabilities
> = {
  low: {
    totalMemoryMb: 2048,
    availableMemoryMb: 640,
    logicalCpuCores: 4,
    isLowRamDevice: true,
    supportsArm64: true,
    memoryClassMb: 256,
    largeMemoryClassMb: 512,
    supportedAbis: ["arm64-v8a", "armeabi-v7a"],
    androidSdk: 29,
    thermalStatus: 0,
  },
  medium: {
    totalMemoryMb: 4096,
    availableMemoryMb: 1536,
    logicalCpuCores: 6,
    isLowRamDevice: false,
    supportsArm64: true,
    memoryClassMb: 384,
    largeMemoryClassMb: 768,
    supportedAbis: ["arm64-v8a"],
    androidSdk: 33,
    thermalStatus: 0,
  },
  high: {
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
  },
};

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function normalizeSettings(value: unknown): SimulatorSettings | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SimulatorSettings>;
  if (
    !isOneOf(candidate.deviceProfile, ["low", "medium", "high"]) ||
    !isOneOf(candidate.claraMode, ["static", "dynamic"]) ||
    !isOneOf(candidate.asrOutcome, [
      "correct",
      "incorrect",
      "permission-error",
      "asr-error",
    ]) ||
    !isOneOf(candidate.ttsOutcome, ["success", "error"]) ||
    !Number.isFinite(candidate.operationDelayMs) ||
    typeof candidate.panelOpen !== "boolean"
  ) {
    return null;
  }

  return {
    deviceProfile: candidate.deviceProfile,
    claraMode: candidate.claraMode,
    asrOutcome: candidate.asrOutcome,
    ttsOutcome: candidate.ttsOutcome,
    operationDelayMs: Math.min(
      3000,
      Math.max(0, Math.round(Number(candidate.operationDelayMs))),
    ),
    panelOpen: candidate.panelOpen,
  };
}

export function loadSimulatorSettings(storage: Storage): SimulatorSettings {
  try {
    return (
      normalizeSettings(
        JSON.parse(storage.getItem(SIMULATOR_SETTINGS_KEY) ?? "null"),
      ) ?? { ...DEFAULT_SIMULATOR_SETTINGS }
    );
  } catch {
    return { ...DEFAULT_SIMULATOR_SETTINGS };
  }
}

export function saveSimulatorSettings(
  storage: Storage,
  settings: SimulatorSettings,
): SimulatorSettings {
  const normalized = normalizeSettings(settings) ?? {
    ...DEFAULT_SIMULATOR_SETTINGS,
  };
  storage.setItem(SIMULATOR_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}
