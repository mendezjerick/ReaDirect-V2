export const ASR_TIER_ORDER = ["low", "medium", "high"] as const;

export type AsrTier = (typeof ASR_TIER_ORDER)[number];

type AsrTierDefinition = {
  displayName: "Low" | "Medium" | "High";
  technicalName: string;
  explanation: string;
  minimumMemoryMb: number;
  minimumLogicalCpuCores: number;
  requiresArm64: boolean;
};

export const ASR_MODEL_CATALOG: Record<AsrTier, AsrTierDefinition> = {
  low: {
    displayName: "Low",
    technicalName: "Whisper Base English Q5_1",
    explanation:
      "This lightweight model uses less device memory. Speech-recognition results can be less accurate than Medium or High.",
    minimumMemoryMb: 0,
    minimumLogicalCpuCores: 1,
    requiresArm64: false,
  },
  medium: {
    displayName: "Medium",
    technicalName: "Distil-Whisper Small English Q5_1",
    explanation:
      "This balanced model provides stronger speech recognition while keeping processing practical on standard phones.",
    minimumMemoryMb: 3072,
    minimumLogicalCpuCores: 4,
    requiresArm64: true,
  },
  high: {
    displayName: "High",
    technicalName: "Whisper Large V3 Turbo Q5_0",
    explanation:
      "This is the best-quality bundled model and uses the most device memory and processing power.",
    minimumMemoryMb: 6144,
    minimumLogicalCpuCores: 8,
    requiresArm64: true,
  },
};

export type DeviceAsrCapabilities = {
  totalMemoryMb: number;
  availableMemoryMb?: number;
  logicalCpuCores: number;
  isLowRamDevice: boolean;
  supportsArm64: boolean;
  thermalStatus?: number;
};

export type AsrSelectionReason =
  | "android_low_ram"
  | "memory_limit"
  | "cpu_limit"
  | "available_memory_limit"
  | "thermal_limit"
  | "requires_arm64"
  | "highest_supported";

export type AsrModelSelection = {
  tier: AsrTier;
  model: AsrTierDefinition;
  reason: AsrSelectionReason;
  lockedTiers: AsrTier[];
  requiresAcknowledgement: true;
  acknowledgementLabel: "I understand";
};

function validateCapabilities(capabilities: DeviceAsrCapabilities) {
  if (
    !Number.isFinite(capabilities.totalMemoryMb) ||
    capabilities.totalMemoryMb < 0
  ) {
    throw new Error("ASR capability memory must be a non-negative number.");
  }

  if (
    capabilities.availableMemoryMb !== undefined &&
    (!Number.isFinite(capabilities.availableMemoryMb) ||
      capabilities.availableMemoryMb < 0)
  ) {
    throw new Error(
      "ASR available memory must be a non-negative number when provided.",
    );
  }

  if (
    capabilities.thermalStatus !== undefined &&
    (!Number.isInteger(capabilities.thermalStatus) ||
      capabilities.thermalStatus < -1)
  ) {
    throw new Error("ASR thermal status must be an integer of -1 or greater.");
  }

  if (
    !Number.isInteger(capabilities.logicalCpuCores) ||
    capabilities.logicalCpuCores < 1
  ) {
    throw new Error("ASR capability CPU cores must be a positive integer.");
  }
}

function createSelection(
  tier: AsrTier,
  reason: AsrSelectionReason,
): AsrModelSelection {
  const selectedIndex = ASR_TIER_ORDER.indexOf(tier);

  return {
    tier,
    model: ASR_MODEL_CATALOG[tier],
    reason,
    lockedTiers: ASR_TIER_ORDER.slice(selectedIndex + 1),
    requiresAcknowledgement: true,
    acknowledgementLabel: "I understand",
  };
}

export function selectAsrModel(
  capabilities: DeviceAsrCapabilities,
): AsrModelSelection {
  validateCapabilities(capabilities);

  if (capabilities.isLowRamDevice) {
    return createSelection("low", "android_low_ram");
  }

  if ((capabilities.thermalStatus ?? -1) >= 3) {
    return createSelection("low", "thermal_limit");
  }

  if (!capabilities.supportsArm64) {
    return createSelection("low", "requires_arm64");
  }

  if (capabilities.totalMemoryMb < ASR_MODEL_CATALOG.medium.minimumMemoryMb) {
    return createSelection("low", "memory_limit");
  }

  if (
    capabilities.availableMemoryMb !== undefined &&
    capabilities.availableMemoryMb < 768
  ) {
    return createSelection("low", "available_memory_limit");
  }

  if (
    capabilities.logicalCpuCores <
    ASR_MODEL_CATALOG.medium.minimumLogicalCpuCores
  ) {
    return createSelection("low", "cpu_limit");
  }

  if (
    capabilities.totalMemoryMb >= ASR_MODEL_CATALOG.high.minimumMemoryMb &&
    capabilities.logicalCpuCores >=
      ASR_MODEL_CATALOG.high.minimumLogicalCpuCores &&
    (capabilities.availableMemoryMb === undefined ||
      capabilities.availableMemoryMb >= 2_048) &&
    (capabilities.thermalStatus ?? -1) < 2
  ) {
    return createSelection("high", "highest_supported");
  }

  if (
    capabilities.totalMemoryMb >= ASR_MODEL_CATALOG.high.minimumMemoryMb &&
    capabilities.logicalCpuCores >=
      ASR_MODEL_CATALOG.high.minimumLogicalCpuCores
  ) {
    return createSelection(
      "medium",
      (capabilities.thermalStatus ?? -1) >= 2
        ? "thermal_limit"
        : "available_memory_limit",
    );
  }

  return createSelection("medium", "highest_supported");
}
