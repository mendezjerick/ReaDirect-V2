import tilesetFloorUrl from "../../assets/game/tiles/tileset-floor.png";
import tilesetNatureUrl from "../../assets/game/tiles/tileset-nature.png";
import tilesetWaterUrl from "../../assets/game/tiles/tileset-water.png";
import tilesetHouseUrl from "../../assets/game/tiles/tileset-house.png";
import learnerIdleUrl from "../../assets/game/characters/learner/yato-walk.png";
import learnerWalkUrl from "../../assets/game/characters/learner/yato-walk.png";
import blueHairExplorerUrl from "../../assets/game/characters/learner/blue-hair-explorer-v2.png";
import irumaUrl from "../../assets/game/characters/learner/iruma-walk.png";
import luffyUrl from "../../assets/game/characters/learner/luffy-walk.png";
import frierenUrl from "../../assets/game/characters/learner/frieren-walk.png";
import ambientMissYuuriUrl from "../../assets/game/characters/ambient/miss-yuuri-walk.png";
import ambientMangPandaUrl from "../../assets/game/characters/ambient/mang-panda-walk.png";
import ambientMrKikushibuUrl from "../../assets/game/characters/ambient/mr-kikushibu-walk.png";
import npcMissEstelleUrl from "../../assets/game/characters/npcs/miss-estelle-idle.png";
import npcLoloAmboUrl from "../../assets/game/characters/npcs/lolo-ambo-idle.png";
import npcMarketVendorUrl from "../../assets/game/characters/npcs/market-vendor-idle.png";
import npcBridgeKeeperUrl from "../../assets/game/characters/npcs/bridge-keeper-idle.png";
import mapFragmentUrl from "../../assets/game/items/map-fragment.png";
import treeRoundUrl from "../../assets/game/props/tree-round.png";
import treeWideUrl from "../../assets/game/props/tree-wide.png";
import stumpOrangeUrl from "../../assets/game/props/stump-orange.png";
import rockSmallUrl from "../../assets/game/props/rock-small.png";
import readingShrineUrl from "../../assets/game/props/reading-shrine.png";
import fountainUrl from "../../assets/game/props/fountain.png";
import loloSupplyPropsUrl from "../../assets/game/props/lolo-supply-props.png";
import loloEastHomesSignUrl from "../../assets/game/props/lolo-east-homes-sign.png";
import loloToLoloAmboSignUrl from "../../assets/game/props/lolo-to-lolo-ambo-sign.png";
import loloDeliverSuppliesSignUrl from "../../assets/game/props/lolo-deliver-supplies-sign.png";
import playgroundPropsUrl from "../../assets/game/props/playground-props.png";
import riverBoatUrl from "../../assets/game/vehicles/river-boat.png";
import suppliedGreenManorUrl from "../../assets/game/props/supplied-green-manor.png";
import suppliedStrawCottageUrl from "../../assets/game/props/supplied-straw-cottage.png";
import suppliedRedBarnUrl from "../../assets/game/props/supplied-red-barn.png";
import suppliedPurpleShopUrl from "../../assets/game/props/supplied-purple-shop.png";
import suppliedTowerHouseUrl from "../../assets/game/props/supplied-tower-house.png";
import suppliedBlueHouseUrl from "../../assets/game/props/supplied-blue-house.png";
import suppliedRedHouseUrl from "../../assets/game/props/supplied-red-house.png";
import ninjaAdventureLicenseUrl from "../../assets/game/licenses/ninja-adventure-cc0-license.txt?url";

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
  sourceDimensions?: { width: number; height: number };
};

const PLAYGROUND_PROP_REGIONS: Record<string, SpriteRegionMetadata> = {
  "playground-swings": playgroundRegion(55, 139, 347, 241),
  "playground-slide-tower": playgroundRegion(475, 112, 273, 288),
  "playground-seesaw": playgroundRegion(793, 211, 266, 168),
  "playground-climber": playgroundRegion(1128, 169, 268, 224),
  "playground-sand-table": playgroundRegion(66, 478, 288, 205),
  "playground-bench": playgroundRegion(436, 518, 229, 155),
  "playground-fence-long": playgroundRegion(739, 535, 319, 111),
  "playground-fence-short": playgroundRegion(1145, 536, 226, 110),
  "playground-signboard": playgroundRegion(88, 767, 246, 188),
  "playground-bush": playgroundRegion(476, 769, 196, 184),
  "playground-flower-bush": playgroundRegion(797, 772, 180, 181),
  "playground-flower-patch": playgroundRegion(1121, 812, 232, 142)
};

function playgroundRegion(x: number, y: number, width: number, height: number): SpriteRegionMetadata {
  return { x, y, width, height, sourceWidth: 1448, sourceHeight: 1086 };
}

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
    sourcePath: "User-supplied d4c6a1ba-d0ca-4d2a-a1ac-a817cb123472.png",
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
    sourcePath: "User-supplied d4c6a1ba-d0ca-4d2a-a1ac-a817cb123472.png",
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
      sourcePath: "User-supplied 87ca4464-12c5-42d6-8d94-f4838e388112.png, rebuilt and baseline-normalized as a chroma-keyed 4x4 exploration sheet",
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
    sourcePath: "User-supplied iruma-walk.png — Iruma Suzuki (Mairimashita! Iruma-kun) pixel chibi walk sheet, transparent background, 4 columns × 4 rows",
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
    sourcePath: "User-supplied luffy-walk.png",
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
    sourcePath: "User-supplied frieren-walk.png — Frieren (Sōsou no Frieren) pixel chibi walk sheet, transparent background, 4 columns × 3-4 rows (down, up, right)",
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
  suppliedGreenManor: {
    key: "supplied-green-manor",
    path: suppliedGreenManorUrl,
    sourcePath: "User-supplied house.png crop: green manor",
    kind: "prop",
    sourceDimensions: { width: 325, height: 310 }
  },
  suppliedStrawCottage: {
    key: "supplied-straw-cottage",
    path: suppliedStrawCottageUrl,
    sourcePath: "User-supplied house.png crop: straw cottage",
    kind: "prop",
    sourceDimensions: { width: 240, height: 325 }
  },
  suppliedRedBarn: {
    key: "supplied-red-barn",
    path: suppliedRedBarnUrl,
    sourcePath: "User-supplied house.png crop: red barn",
    kind: "prop",
    sourceDimensions: { width: 250, height: 365 }
  },
  suppliedPurpleShop: {
    key: "supplied-purple-shop",
    path: suppliedPurpleShopUrl,
    sourcePath: "User-supplied house.png crop: purple shop",
    kind: "prop",
    sourceDimensions: { width: 430, height: 280 }
  },
  suppliedTowerHouse: {
    key: "supplied-tower-house",
    path: suppliedTowerHouseUrl,
    sourcePath: "User-supplied house.png crop: tower house",
    kind: "prop",
    sourceDimensions: { width: 285, height: 385 }
  },
  suppliedBlueHouse: {
    key: "supplied-blue-house",
    path: suppliedBlueHouseUrl,
    sourcePath: "User-supplied house.png crop: blue house",
    kind: "prop",
    sourceDimensions: { width: 300, height: 305 }
  },
  suppliedRedHouse: {
    key: "supplied-red-house",
    path: suppliedRedHouseUrl,
    sourcePath: "User-supplied house.png crop: red house",
    kind: "prop",
    sourceDimensions: { width: 295, height: 235 }
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
  loloSupplyCart: loloProp("lolo-supply-cart", 0, 0),
  loloSupplySacks: loloProp("lolo-supply-sacks", 1, 0),
  loloDirectionSign: loloProp("lolo-direction-sign", 2, 0),
  loloProduceCrate: loloProp("lolo-produce-crate", 3, 0),
  loloMapCrate: loloProp("lolo-map-crate", 0, 1),
  loloWoodFence: loloProp("lolo-wood-fence", 1, 1),
  loloLanternPost: loloProp("lolo-lantern-post", 2, 1),
  loloFlowerRocks: loloProp("lolo-flower-rocks", 3, 1),
  loloEastHomesSign: {
    key: "lolo-east-homes-sign",
    path: loloEastHomesSignUrl,
    sourcePath: "User-supplied lolo.png East Homes sign, rebuilt with transparent background",
    kind: "prop",
    sourceDimensions: { width: 445, height: 365 }
  },
  loloToLoloAmboSign: {
    key: "lolo-to-lolo-ambo-sign",
    path: loloToLoloAmboSignUrl,
    sourcePath: "User-supplied lolo.png To Lolo Ambo sign, rebuilt with transparent background",
    kind: "prop",
    sourceDimensions: { width: 526, height: 363 }
  },
  loloDeliverSuppliesSign: {
    key: "lolo-deliver-supplies-sign",
    path: loloDeliverSuppliesSignUrl,
    sourcePath: "User-supplied lolo.png Deliver Supplies to Lolo Ambo notice, rebuilt with transparent background",
    kind: "prop",
    sourceDimensions: { width: 728, height: 355 }
  },
  playgroundSwings: playgroundProp("playground-swings"),
  playgroundSlideTower: playgroundProp("playground-slide-tower"),
  playgroundSeesaw: playgroundProp("playground-seesaw"),
  playgroundClimber: playgroundProp("playground-climber"),
  playgroundSandTable: playgroundProp("playground-sand-table"),
  playgroundBench: playgroundProp("playground-bench"),
  playgroundFenceLong: playgroundProp("playground-fence-long"),
  playgroundFenceShort: playgroundProp("playground-fence-short"),
  playgroundSignboard: playgroundProp("playground-signboard"),
  playgroundBush: playgroundProp("playground-bush"),
  playgroundFlowerBush: playgroundProp("playground-flower-bush"),
  playgroundFlowerPatch: playgroundProp("playground-flower-patch"),
  readingShrine: {
    key: "reading-shrine",
    path: readingShrineUrl,
    sourcePath: "Generated ReaDirect reading shrine asset from the east-riverbank game reference",
    kind: "prop"
  },
  fountain: {
    key: "village-fountain",
    path: fountainUrl,
    sourcePath: "Ninja Adventure - Asset Pack/Ninja Adventure - Asset Pack/fountain.png, complete fountain animation states",
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
  "suppliedGreenManor",
  "suppliedStrawCottage",
  "suppliedRedBarn",
  "suppliedPurpleShop",
  "suppliedTowerHouse",
  "suppliedBlueHouse",
  "suppliedRedHouse",
  "treeRound",
  "treeWide",
  "stumpOrange",
  "rockSmall",
  "loloSupplyCart",
  "loloSupplySacks",
  "loloDirectionSign",
  "loloEastHomesSign",
  "loloToLoloAmboSign",
  "loloDeliverSuppliesSign",
  "loloProduceCrate",
  "loloMapCrate",
  "loloWoodFence",
  "loloLanternPost",
  "loloFlowerRocks",
  "playgroundSwings",
  "playgroundSlideTower",
  "playgroundSeesaw",
  "playgroundClimber",
  "playgroundSandTable",
  "playgroundBench",
  "playgroundFenceLong",
  "playgroundFenceShort",
  "playgroundSignboard",
  "playgroundBush",
  "playgroundFlowerBush",
  "playgroundFlowerPatch",
  "readingShrine",
  "fountain",
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

function loloProp(
  key: string,
  column: number,
  row: number
): Omit<GameAsset, "metadata"> & {
  region: SpriteRegionMetadata;
  sourceDimensions: { width: number; height: number };
} {
  const regions: readonly SpriteRegionMetadata[] = [
    { x: 36, y: 273, width: 278, height: 242, sourceWidth: 1254, sourceHeight: 1254 },
    { x: 314, y: 284, width: 313, height: 209, sourceWidth: 1254, sourceHeight: 1254 },
    { x: 627, y: 277, width: 286, height: 229, sourceWidth: 1254, sourceHeight: 1254 },
    { x: 974, y: 299, width: 236, height: 193, sourceWidth: 1254, sourceHeight: 1254 },
    { x: 54, y: 705, width: 241, height: 247, sourceWidth: 1254, sourceHeight: 1254 },
    { x: 344, y: 758, width: 283, height: 172, sourceWidth: 1254, sourceHeight: 1254 },
    { x: 627, y: 627, width: 314, height: 321, sourceWidth: 1254, sourceHeight: 1254 },
    { x: 941, y: 757, width: 263, height: 191, sourceWidth: 1254, sourceHeight: 1254 }
  ];
  const region = regions[row * 4 + column];
  if (!region) throw new Error(`Unknown Lolo prop region: ${column},${row}`);

  return {
    key,
    path: loloSupplyPropsUrl,
    sourcePath: "User-supplied lolo.png, rebuilt as a transparent 4x2 pixel-art prop sheet",
    kind: "prop",
    region,
    sourceDimensions: { width: region.width, height: region.height }
  };
}

function playgroundProp(
  key: string
): Omit<GameAsset, "metadata"> & { region: SpriteRegionMetadata; sourceDimensions: { width: number; height: number } } {
  const region = PLAYGROUND_PROP_REGIONS[key];

  if (!region) {
    throw new Error(`Unknown playground prop region: ${key}`);
  }

  return {
    key,
    path: playgroundPropsUrl,
    sourcePath: "User-supplied playground.png, rebuilt as transparent pixel-art prop regions",
    kind: "prop",
    region,
    sourceDimensions: { width: region.width, height: region.height }
  };
}
