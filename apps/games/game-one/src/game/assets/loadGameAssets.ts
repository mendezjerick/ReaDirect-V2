import { GAME_ASSETS, REQUIRED_ASSET_KEYS, validateRequiredAssets } from "./assetRegistry";

type AssetRuntime = {
  loadSprite?: (
    name: string | null,
    source: string,
    options?: {
      sliceX?: number;
      sliceY?: number;
      anims?: Record<string, unknown>;
    }
  ) => unknown;
};

export function loadGameAssets(runtime: AssetRuntime) {
  if (!runtime.loadSprite) {
    throw new Error("KAPLAY sprite loading is unavailable.");
  }

  const validation = validateRequiredAssets();
  if (!validation.valid) {
    throw new Error("Required game assets are missing from the registry.");
  }

  for (const key of REQUIRED_ASSET_KEYS) {
    const asset = GAME_ASSETS[key];
    if (asset.kind === "license" || !("metadata" in asset)) {
      if (asset.kind !== "license") {
        runtime.loadSprite(asset.key, asset.path);
      }
      continue;
    }

    runtime.loadSprite(asset.key, asset.path, {
      sliceX: asset.metadata.columns,
      sliceY: asset.metadata.rows,
      anims: asset.key === "learner-walk" ? learnerWalkAnimations() : undefined
    });
  }
}

function learnerWalkAnimations() {
  return {
    walkDown: { frames: [0, 4, 8, 12], loop: true, speed: 8 },
    walkUp: { frames: [1, 5, 9, 13], loop: true, speed: 8 },
    walkLeft: { frames: [2, 6, 10, 14], loop: true, speed: 8 },
    walkRight: { frames: [3, 7, 11, 15], loop: true, speed: 8 }
  };
}
