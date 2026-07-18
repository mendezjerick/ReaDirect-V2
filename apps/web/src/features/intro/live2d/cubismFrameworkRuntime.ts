import { CubismFramework } from "@cubism-framework/live2dcubismframework";
import { CubismWebGLOffscreenManager } from "@cubism-framework/rendering/cubismoffscreenmanager";

let activeLeases = 0;

export function acquireCubismFramework(): () => void {
  if (typeof Live2DCubismCore === "undefined") {
    throw new Error("Cubism Core for Web did not load.");
  }

  if (activeLeases === 0) {
    if (!CubismFramework.startUp()) {
      throw new Error("Cubism Framework could not start.");
    }

    CubismFramework.initialize();
  }

  activeLeases += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    activeLeases = Math.max(0, activeLeases - 1);

    if (activeLeases === 0) {
      CubismWebGLOffscreenManager.getInstance().release();
      CubismFramework.dispose();
      CubismFramework.cleanUp();
    }
  };
}
