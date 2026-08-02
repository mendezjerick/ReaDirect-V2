import tilesetFloorUrl from "../../assets/runtime/tiles/tileset-floor.png";
import tilesetNatureUrl from "../../assets/runtime/tiles/tileset-nature.png";
import tilesetWaterUrl from "../../assets/runtime/tiles/tileset-water.png";
import tilesetHouseUrl from "../../assets/runtime/tiles/tileset-house.png";
import learnerIdleUrl from "../../assets/runtime/characters/learner/yato-walk.png";
import learnerWalkUrl from "../../assets/runtime/characters/learner/yato-walk.png";
import blueHairExplorerUrl from "../../assets/runtime/characters/learner/blue-hair-explorer-v2.png";
import irumaUrl from "../../assets/runtime/characters/learner/iruma-walk.png";
import luffyUrl from "../../assets/runtime/characters/learner/luffy-walk.png";
import frierenUrl from "../../assets/runtime/characters/learner/frieren-walk.png";
import ambientMissYuuriUrl from "../../assets/runtime/characters/ambient/miss-yuuri-walk.png";
import ambientMangPandaUrl from "../../assets/runtime/characters/ambient/mang-panda-walk.png";
import ambientMrKikushibuUrl from "../../assets/runtime/characters/ambient/mr-kikushibu-walk.png";
import npcMissEstelleUrl from "../../assets/runtime/characters/npcs/miss-estelle-idle.png";
import npcLoloAmboUrl from "../../assets/runtime/characters/npcs/lolo-ambo-idle.png";
import npcMarketVendorUrl from "../../assets/runtime/characters/npcs/market-vendor-idle.png";
import npcBridgeKeeperUrl from "../../assets/runtime/characters/npcs/bridge-keeper-idle.png";
import mapFragmentUrl from "../../assets/runtime/items/map-fragment.png";
import treeRoundUrl from "../../assets/runtime/props/tree-round.png";
import treeWideUrl from "../../assets/runtime/props/tree-wide.png";
import stumpOrangeUrl from "../../assets/runtime/props/stump-orange.png";
import rockSmallUrl from "../../assets/runtime/props/rock-small.png";
import readingShrineUrl from "../../assets/runtime/props/reading-shrine.png";
import riverBoatUrl from "../../assets/runtime/vehicles/river-boat.png";
import ninjaAdventureLicenseUrl from "../../assets/runtime/licenses/ninja-adventure-cc0-license.txt?url";

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
    path: tilesetFloorUrl,
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
    path: tilesetNatureUrl,
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
    path: tilesetWaterUrl,
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
  learnerIdle: {
    key: "learner-idle",
    path: learnerIdleUrl,
    sourcePath: "AI-generated Game One character asset supplied and approved by the project owner",
    kind: "character",
    metadata: {
      width: 1024,
      height: 1024,
      frameWidth: 256,
      frameHeight: 256,
      columns: 4,
      rows: 4
    }
  },
  learnerWalk: {
    key: "learner-walk",
    path: learnerWalkUrl,
    sourcePath: "AI-generated Game One character asset supplied and approved by the project owner",
    kind: "character",
    metadata: {
      width: 1024,
      height: 1024,
      frameWidth: 256,
      frameHeight: 256,
      columns: 4,
      rows: 4
    }
  },
  blueHairExplorer: {
    key: "blue-hair-explorer",
    path: blueHairExplorerUrl,
    sourcePath: "AI-generated Game One character asset, rebuilt as a chroma-keyed 4x4 exploration sheet",
    kind: "character",
    metadata: {
      width: 1248,
      height: 1248,
      frameWidth: 312,
        frameHeight: 312,
        columns: 4,
        rows: 4
    }
  },
  iruma: {
    key: "iruma",
    path: irumaUrl,
    sourcePath: "AI-generated Game One character walk sheet supplied and approved by the project owner",
    kind: "character",
    metadata: {
      width: 600,
      height: 600,
      frameWidth: 150,
      frameHeight: 150,
      columns: 4,
      rows: 4
    }
  },
  luffy: {
    key: "luffy",
    path: luffyUrl,
    sourcePath: "AI-generated Game One character walk sheet supplied and approved by the project owner",
    kind: "character",
    metadata: {
      width: 1024,
      height: 1024,
      frameWidth: 256,
      frameHeight: 256,
      columns: 4,
      rows: 4
    }
  },
  frieren: {
    key: "frieren",
    path: frierenUrl,
    sourcePath: "AI-generated Game One character walk sheet supplied and approved by the project owner",
    kind: "character",
    metadata: {
      width: 600,
      height: 600,
      frameWidth: 150,
      frameHeight: 150,
      columns: 4,
      rows: 4
    }
  },
  ambientMissYuuri: {
    key: "ambient-miss-yuuri",
    path: ambientMissYuuriUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/Princess/SeparateAnim/Walk.png",
    kind: "character",
    metadata: walkSheetMetadata()
  },
  ambientMangPanda: {
    key: "ambient-mang-panda",
    path: ambientMangPandaUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/OldMan3/SeparateAnim/Walk.png",
    kind: "character",
    metadata: walkSheetMetadata()
  },
  ambientMrKikushibu: {
    key: "ambient-mr-kikushibu",
    path: ambientMrKikushibuUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/Inspector/SeparateAnim/Walk.png",
    kind: "character",
    metadata: walkSheetMetadata()
  },
  riverBoat: {
    key: "river-boat",
    path: riverBoatUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Vehicles/Boat.png",
    kind: "prop"
  },
  npcMissEstelle: {
    key: "npc-miss-estelle",
    path: npcMissEstelleUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/Woman/SeparateAnim/Idle.png",
    kind: "character",
    metadata: idleSheetMetadata()
  },
  npcLoloAmbo: {
    key: "npc-lolo-ambo",
    path: npcLoloAmboUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/OldMan/SeparateAnim/Idle.png",
    kind: "character",
    metadata: idleSheetMetadata()
  },
  npcMarketVendor: {
    key: "npc-market-vendor",
    path: npcMarketVendorUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/OldMan2/SeparateAnim/Idle.png",
    kind: "character",
    metadata: idleSheetMetadata()
  },
  npcBridgeKeeper: {
    key: "npc-bridge-keeper",
    path: npcBridgeKeeperUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Actor/Character/Master/SeparateAnim/Idle.png",
    kind: "character",
    metadata: idleSheetMetadata()
  },
  mapFragment: {
    key: "map-fragment",
    path: mapFragmentUrl,
    sourcePath: "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Items/Scroll/Scroll.png",
    kind: "item"
  },
  villageRedHouse: {
    key: "village-red-house",
    path: tilesetHouseUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetHouse.png crop 0,0 64x48",
    kind: "prop",
    region: houseRegion(0, 0)
  },
  villageLearningHall: {
    key: "village-learning-hall",
    path: tilesetHouseUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetHouse.png crop 192,0 64x48",
    kind: "prop",
    region: houseRegion(192, 0)
  },
  villageEastHouse: {
    key: "village-east-house",
    path: tilesetHouseUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetHouse.png crop 128,0 64x48",
    kind: "prop",
    region: houseRegion(128, 0)
  },
  villageMarketShop: {
    key: "village-market-shop",
    path: tilesetHouseUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetHouse.png crop 64,0 64x48",
    kind: "prop",
    region: houseRegion(64, 0)
  },
  treeRound: {
    key: "tree-round",
    path: treeRoundUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetNature.png crop 0,0 32x32",
    kind: "prop"
  },
  treeWide: {
    key: "tree-wide",
    path: treeWideUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetNature.png crop 0,48 64x32",
    kind: "prop"
  },
  stumpOrange: {
    key: "stump-orange",
    path: stumpOrangeUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetNature.png crop 32,144 32x16",
    kind: "prop"
  },
  rockSmall: {
    key: "rock-small",
    path: rockSmallUrl,
    sourcePath:
      "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/Backgrounds/Tilesets/TilesetNature.png crop 160,192 32x16",
    kind: "prop"
  },
  readingShrine: {
    key: "reading-shrine",
    path: readingShrineUrl,
    sourcePath: "AI-generated ReaDirect reading shrine asset from the east-riverbank game reference",
    kind: "prop"
  },
  ninjaAdventureLicense: {
    key: "ninja-adventure-cc0-license",
    path: ninjaAdventureLicenseUrl,
    sourcePath: "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/LICENSE.txt",
    kind: "license"
  }
} as const satisfies Record<string, GameAsset>;

export type GameAssetKey = keyof typeof GAME_ASSETS;

export const REQUIRED_ASSET_KEYS = [
  "tilesetFloor",
  "tilesetNature",
  "tilesetWater",
  "learnerIdle",
  "learnerWalk",
  "blueHairExplorer",
  "iruma",
  "luffy",
  "frieren",
  "ambientMissYuuri",
  "ambientMangPanda",
  "ambientMrKikushibu",
  "riverBoat",
  "npcMissEstelle",
  "npcLoloAmbo",
  "npcMarketVendor",
  "npcBridgeKeeper",
  "mapFragment",
  "villageRedHouse",
  "villageLearningHall",
  "villageEastHouse",
  "villageMarketShop",
  "treeRound",
  "treeWide",
  "stumpOrange",
  "rockSmall",
  "readingShrine",
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

function walkSheetMetadata(): SpriteSheetMetadata {
  return {
    width: 64,
    height: 64,
    frameWidth: 16,
    frameHeight: 16,
    columns: 4,
    rows: 4
  };
}

function houseRegion(x: number, y: number): SpriteRegionMetadata {
  return { x, y, width: 64, height: 48, sourceWidth: 528, sourceHeight: 368 };
}
