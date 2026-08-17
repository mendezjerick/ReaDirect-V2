import type { DeviceAsrCapabilities } from "../asr/asrModelCatalog";

export type ClaraMode = "static" | "dynamic";

export type ClaraSelection = {
  mode: ClaraMode;
  displayName: "Static" | "Dynamic";
  reason:
    | "android_low_ram"
    | "memory_limit"
    | "cpu_limit"
    | "available_memory_limit"
    | "thermal_limit"
    | "requires_arm64"
    | "webgl_unavailable"
    | "texture_limit"
    | "supported";
  dynamicLocked: boolean;
  requiresAcknowledgement: true;
  acknowledgementLabel: "I understand";
};

export type ClaraGraphicsCapabilities = {
  webglAvailable: boolean;
  maxTextureSize: number;
};

const DYNAMIC_MINIMUM_MEMORY_MB = 4_096;
const DYNAMIC_MINIMUM_CPU_CORES = 6;
export const DYNAMIC_MINIMUM_TEXTURE_SIZE = 8_192;

export function inspectClaraGraphicsCapabilities(): ClaraGraphicsCapabilities {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");

    if (!context) {
      return { webglAvailable: false, maxTextureSize: 0 };
    }

    const maxTextureSize = Number(
      context.getParameter(context.MAX_TEXTURE_SIZE),
    );
    const loseContext = context.getExtension("WEBGL_lose_context");
    loseContext?.loseContext();

    return {
      webglAvailable: true,
      maxTextureSize: Number.isFinite(maxTextureSize) ? maxTextureSize : 0,
    };
  } catch {
    return { webglAvailable: false, maxTextureSize: 0 };
  }
}

export function selectClaraMode(
  capabilities: DeviceAsrCapabilities,
  graphics: ClaraGraphicsCapabilities,
): ClaraSelection {
  let reason: ClaraSelection["reason"] = "supported";
  if (capabilities.isLowRamDevice) reason = "android_low_ram";
  else if ((capabilities.thermalStatus ?? -1) >= 2) reason = "thermal_limit";
  else if (!capabilities.supportsArm64) reason = "requires_arm64";
  else if (
    capabilities.availableMemoryMb !== undefined &&
    capabilities.availableMemoryMb < 1_024
  ) {
    reason = "available_memory_limit";
  } else if (capabilities.totalMemoryMb < DYNAMIC_MINIMUM_MEMORY_MB) {
    reason = "memory_limit";
  } else if (capabilities.logicalCpuCores < DYNAMIC_MINIMUM_CPU_CORES) {
    reason = "cpu_limit";
  } else if (!graphics.webglAvailable) {
    reason = "webgl_unavailable";
  } else if (graphics.maxTextureSize < DYNAMIC_MINIMUM_TEXTURE_SIZE) {
    reason = "texture_limit";
  }

  const dynamic = reason === "supported";
  return {
    mode: dynamic ? "dynamic" : "static",
    displayName: dynamic ? "Dynamic" : "Static",
    reason,
    dynamicLocked: !dynamic,
    requiresAcknowledgement: true,
    acknowledgementLabel: "I understand",
  };
}

export function inspectAndSelectClaraMode(
  capabilities: DeviceAsrCapabilities,
): ClaraSelection {
  return selectClaraMode(capabilities, inspectClaraGraphicsCapabilities());
}
