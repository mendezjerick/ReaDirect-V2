import type { ClaraLive2DCanvas } from "../../features/intro/live2d/ClaraLive2DCanvas";
import type { ClaraMode, ClaraSelection } from "./claraCapability";

export type ClaraCanvasComponent = typeof ClaraLive2DCanvas;

const CUBISM_CORE_SOURCE = "/assets/live2d/core/live2dcubismcore.min.js";

let cubismCorePromise: Promise<void> | null = null;

export function resolveOfflineClaraMode(
  savedMode: ClaraMode | null,
  selection: ClaraSelection,
): ClaraMode {
  return savedMode === "dynamic" &&
    selection.mode === "dynamic" &&
    !selection.dynamicLocked
    ? "dynamic"
    : "static";
}

function loadCubismCore(): Promise<void> {
  if (typeof Live2DCubismCore !== "undefined") return Promise.resolve();
  if (cubismCorePromise) return cubismCorePromise;

  cubismCorePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CUBISM_CORE_SOURCE}"]`,
    );
    const script = existing ?? document.createElement("script");

    const handleLoad = () => resolve();
    const handleError = () => {
      cubismCorePromise = null;
      script.remove();
      reject(new Error("The offline Cubism runtime could not load."));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    if (!existing) {
      script.src = CUBISM_CORE_SOURCE;
      script.async = true;
      document.head.append(script);
    }
  });

  return cubismCorePromise;
}

export async function loadOfflineDynamicClara(): Promise<{
  default: ClaraCanvasComponent;
}> {
  await loadCubismCore();
  const module = await import("../../features/intro/live2d/ClaraLive2DCanvas");
  return { default: module.ClaraLive2DCanvas };
}
