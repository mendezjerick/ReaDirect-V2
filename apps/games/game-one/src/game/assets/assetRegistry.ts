export type SpriteSheetMetadata = {
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
};

export type SpriteRegionMetadata = {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
};

export type GameAsset = {
  key: string;
  path: string;
  sourcePath: string;
  kind: "tileset" | "character" | "prop" | "item" | "license";
  metadata?: SpriteSheetMetadata;
  region?: SpriteRegionMetadata;
};

export const GAME_ASSETS = {
  tilesetFloor: {
    key: "tileset-floor",
    path: new URL("../../assets/runtime/tiles/tileset-floor.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetFloor.png",
    kind: "tileset",
    metadata: {
      width: 352,
      height: 417,
      frameWidth: 16,
      frameHeight: 16,
      columns: 22,
      rows: 26
    }
  },
  tilesetNature: {
    key: "tileset-nature",
    path: new URL("../../assets/runtime/tiles/tileset-nature.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetNature.png",
    kind: "tileset",
    metadata: {
      width: 384,
      height: 336,
      frameWidth: 16,
      frameHeight: 16,
      columns: 24,
      rows: 21
    }
  },
  tilesetWater: {
    key: "tileset-water",
    path: new URL("../../assets/runtime/tiles/tileset-water.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetWater.png",
    kind: "tileset",
    metadata: {
      width: 448,
      height: 272,
      frameWidth: 16,
      frameHeight: 16,
      columns: 28,
      rows: 17
    }
  },
  tilesetVillageAbandoned: {
    key: "tileset-village-abandoned",
    path: new URL("../../assets/runtime/tiles/tileset-village-abandoned.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetVillageAbandoned.png",
    kind: "tileset",
    metadata: {
      width: 320,
      height: 192,
      frameWidth: 16,
      frameHeight: 16,
      columns: 20,
      rows: 12
    }
  },
  learnerIdle: {
    key: "learner-idle",
    path: new URL("../../assets/runtime/characters/learner/villager-idle.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/Villager/SeparateAnim/Idle.png",
    kind: "character",
    metadata: {
      width: 64,
      height: 16,
      frameWidth: 16,
      frameHeight: 16,
      columns: 4,
      rows: 1
    }
  },
  learnerWalk: {
    key: "learner-walk",
    path: new URL("../../assets/runtime/characters/learner/villager-walk.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/Villager/SeparateAnim/Walk.png",
    kind: "character",
    metadata: {
      width: 64,
      height: 64,
      frameWidth: 16,
      frameHeight: 16,
      columns: 4,
      rows: 4
    }
  },
  npcMissEstelle: {
    key: "npc-miss-estelle",
    path: new URL("../../assets/runtime/characters/npcs/miss-estelle-idle.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/Woman/SeparateAnim/Idle.png",
    kind: "character",
    metadata: idleSheetMetadata()
  },
  npcLoloAmbo: {
    key: "npc-lolo-ambo",
    path: new URL("../../assets/runtime/characters/npcs/lolo-ambo-idle.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/OldMan/SeparateAnim/Idle.png",
    kind: "character",
    metadata: idleSheetMetadata()
  },
  npcMarketVendor: {
    key: "npc-market-vendor",
    path: new URL("../../assets/runtime/characters/npcs/market-vendor-idle.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/OldMan2/SeparateAnim/Idle.png",
    kind: "character",
    metadata: idleSheetMetadata()
  },
  npcBridgeKeeper: {
    key: "npc-bridge-keeper",
    path: new URL("../../assets/runtime/characters/npcs/bridge-keeper-idle.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/Master/SeparateAnim/Idle.png",
    kind: "character",
    metadata: idleSheetMetadata()
  },
  mapFragment: {
    key: "map-fragment",
    path: new URL("../../assets/runtime/items/map-fragment.png", import.meta.url).href,
    sourcePath: "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Items/Scroll/Scroll.png",
    kind: "item"
  },
  villageRedHouse: {
    key: "village-red-house",
    path: new URL("../../assets/runtime/tiles/tileset-house.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetHouse.png crop 0,0 64x48",
    kind: "prop",
    region: houseRegion(0, 0)
  },
  villageLearningHall: {
    key: "village-learning-hall",
    path: new URL("../../assets/runtime/tiles/tileset-house.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetHouse.png crop 192,0 64x48",
    kind: "prop",
    region: houseRegion(192, 0)
  },
  villageEastHouse: {
    key: "village-east-house",
    path: new URL("../../assets/runtime/tiles/tileset-house.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetHouse.png crop 128,0 64x48",
    kind: "prop",
    region: houseRegion(128, 0)
  },
  villageMarketCounter: {
    key: "village-market-counter",
    path: new URL("../../assets/runtime/tiles/tileset-house.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetHouse.png crop 256,0 64x48",
    kind: "prop",
    region: houseRegion(256, 0)
  },
  treeRound: {
    key: "tree-round",
    path: new URL("../../assets/runtime/props/tree-round.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetNature.png crop 0,0 32x32",
    kind: "prop"
  },
  treeWide: {
    key: "tree-wide",
    path: new URL("../../assets/runtime/props/tree-wide.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetNature.png crop 0,48 64x32",
    kind: "prop"
  },
  stumpOrange: {
    key: "stump-orange",
    path: new URL("../../assets/runtime/props/stump-orange.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetNature.png crop 32,144 32x16",
    kind: "prop"
  },
  rockSmall: {
    key: "rock-small",
    path: new URL("../../assets/runtime/props/rock-small.png", import.meta.url).href,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetNature.png crop 160,192 32x16",
    kind: "prop"
  },
  ninjaAdventureLicense: {
    key: "ninja-adventure-cc0-license",
    path: new URL("../../assets/runtime/licenses/ninja-adventure-cc0-license.txt", import.meta.url).href,
    sourcePath: "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/LICENSE.txt",
    kind: "license"
  }
} as const satisfies Record<string, GameAsset>;

export type GameAssetKey = keyof typeof GAME_ASSETS;

export const REQUIRED_ASSET_KEYS = [
  "tilesetFloor",
  "tilesetNature",
  "tilesetWater",
  "tilesetVillageAbandoned",
  "learnerIdle",
  "learnerWalk",
  "npcMissEstelle",
  "npcLoloAmbo",
  "npcMarketVendor",
  "npcBridgeKeeper",
  "mapFragment",
  "villageRedHouse",
  "villageLearningHall",
  "villageEastHouse",
  "villageMarketCounter",
  "treeRound",
  "treeWide",
  "stumpOrange",
  "rockSmall",
  "ninjaAdventureLicense"
] as const satisfies readonly GameAssetKey[];

export function validateRequiredAssets(
  registry: Record<string, GameAsset> = GAME_ASSETS,
  requiredKeys: readonly string[] = REQUIRED_ASSET_KEYS
) {
  const missing = requiredKeys.filter((key) => !registry[key]);
  const incomplete = requiredKeys.filter((key) => {
    const asset = registry[key];
    return asset ? !asset.key || !asset.path || !asset.sourcePath || !asset.kind : false;
  });

  return {
    valid: missing.length === 0 && incomplete.length === 0,
    missing,
    incomplete
  };
}

function idleSheetMetadata(): SpriteSheetMetadata {
  return {
    width: 64,
    height: 16,
    frameWidth: 16,
    frameHeight: 16,
    columns: 4,
    rows: 1
  };
}

function houseRegion(x: number, y: number): SpriteRegionMetadata {
  return { x, y, width: 64, height: 48, sourceWidth: 528, sourceHeight: 368 };
}
