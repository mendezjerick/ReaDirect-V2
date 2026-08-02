import type { Rectangle } from "../physics/collision";
import { getFruitTreeFrame, type FruitTreeKind } from "../assets/generatedOrchardAssets";
import { VILLAGE_DECOR_FRAME } from "../assets/generatedVillageDecorAssets";

export const TILE_SIZE = 32;

export type TileKind = "grass" | "path" | "plaza" | "market" | "forest" | "water" | "bridge";
export type FootstepSurface = "grass" | "land" | "stone" | "wood" | "water";

export const TERRAIN_DEFINITIONS: Record<TileKind, { id: TileKind; walkable: boolean; footstep: FootstepSurface }> = {
  grass: { id: "grass", walkable: true, footstep: "grass" },
  path: { id: "path", walkable: true, footstep: "land" },
  plaza: { id: "plaza", walkable: true, footstep: "stone" },
  market: { id: "market", walkable: true, footstep: "stone" },
  forest: { id: "forest", walkable: true, footstep: "land" },
  water: { id: "water", walkable: false, footstep: "water" },
  bridge: { id: "bridge", walkable: true, footstep: "wood" }
};

export type MapAreaKey =
  | "north-gate"
  | "central-plaza"
  | "market-area"
  | "west-homes"
  | "learning-hall-placeholder"
  | "east-homes"
  | "river-path"
  | "old-bridge"
  | "twin-waterfalls"
  | "south-lane"
  | "farm-woodland"
  | "east-riverbank"
  | "south-riverbend"
  | "south-river-cove"
  | "east-river-channel"
  | "tree-border";

export type MapArea = {
  key: MapAreaKey;
  label: string;
  bounds: Rectangle;
};

export type VisualAssetKey =
  | "tileset-nature"
  | "village-red-house"
  | "village-learning-hall"
  | "village-east-house"
  | "village-market-shop"
  | "tree-round"
  | "tree-wide"
  | "fruit-tree"
  | "farm-fence"
  | "village-decor"
  | "reading-shrine";

export type TerrainSprite = {
  assetKey: "tileset-floor" | "tileset-water";
  frame: number;
};

export type TileHitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VisualObject = {
  id: string;
  assetKey: VisualAssetKey;
  frame?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  blocksMovement: boolean;
  hitbox?: Rectangle;
  depthY: number;
};

type TileRegion = { x: number; y: number; width: number; height: number };

const WORLD_COLUMNS = 62;
const WORLD_ROWS = 66;

const PATH_REGIONS: readonly TileRegion[] = [
  // Northern forest arrival space and the stepped trail beyond the bridge.
  { x: 26, y: 2, width: 10, height: 5 },
  { x: 28, y: 5, width: 6, height: 4 },
  { x: 29, y: 8, width: 4, height: 4 },
  { x: 27, y: 11, width: 7, height: 5 },
  { x: 25, y: 15, width: 7, height: 4 },
  { x: 32, y: 10, width: 5, height: 4 },
  // West homes and the stepped market branch.
  { x: 8, y: 16, width: 7, height: 4 },
  { x: 12, y: 16, width: 9, height: 3 },
  { x: 12, y: 17, width: 7, height: 5 },
  { x: 17, y: 18, width: 6, height: 4 },
  { x: 20, y: 19, width: 5, height: 4 },
  // East homes and Lolo Ambo's quiet corner.
  { x: 32, y: 19, width: 6, height: 4 },
  { x: 36, y: 18, width: 6, height: 4 },
  { x: 40, y: 17, width: 6, height: 6 },
  // A gently offset southern lane instead of one straight corridor.
  { x: 24, y: 23, width: 8, height: 6 },
  { x: 22, y: 27, width: 8, height: 5 },
  { x: 20, y: 30, width: 12, height: 7 },
  // New southern loop and east riverbank reached by walking around the river bend.
  { x: 29, y: 34, width: 18, height: 4 },
  { x: 44, y: 33, width: 14, height: 5 },
  { x: 54, y: 18, width: 6, height: 18 },
  // The extended cove has walkable banks for a deliberate boat landing.
  { x: 43, y: 46, width: 4, height: 5 },
  { x: 54, y: 46, width: 1, height: 16 }
];

const MAIN_RIVER_REGIONS: readonly TileRegion[] = [
  // Five-tile channels give the boat room to turn and continue into the expanded map.
  { x: 1, y: 7, width: 53, height: 5 },
  { x: 49, y: 7, width: 5, height: 42 },
  // A wider southern cove gives the boat a place to turn and explore.
  { x: 47, y: 46, width: 8, height: 3 },
  // The cove turns right, then continues south as a second channel.
  { x: 55, y: 46, width: 5, height: 16 },
  // Small inlets keep the shoreline from reading as one rigid rectangle.
  { x: 15, y: 6, width: 4, height: 1 },
  { x: 38, y: 6, width: 5, height: 1 },
  { x: 12, y: 12, width: 3, height: 1 }
];

// The west horizontal channel is the learner's safe swimming area. The east channel remains boat-only.
export const SWIMMABLE_RIVER_REGION: TileRegion = { x: 1, y: 7, width: 28, height: 5 };

const BRIDGE_REGION: TileRegion = { x: 29, y: 7, width: 4, height: 5 };
const NATURE_FRAME = {
  leafyBush: 240,
  roundBush: 241,
  lowBush: 242,
  tallLeaves: 245,
  sunflower: 264,
  doubleSunflower: 265,
  redFlower: 267,
  whiteFlower: 270,
  smallStone: 292
} as const;

export const MAP_LANDMARKS = {
  spawn: tileCenter(27, 25),
  missEstelle: tileCenter(27, 21),
  marketFront: tileCenter(16, 20),
  loloCorner: tileCenter(43, 20),
  bridgeSouth: tileCenter(30, 12),
  bridgeNorth: tileCenter(30, 6),
  forestTrail: tileCenter(29, 14),
  twinWaterfalls: tileCenter(30, 4),
  southLane: tileCenter(23, 31),
  mangYato: tileCenter(45, 27),
  farmGate: tileCenter(33, 27),
  eastRiverbank: tileCenter(57, 24),
  southRiverbend: tileCenter(46, 36),
  southRiverCove: tileCenter(46, 48),
  eastRiverChannel: tileCenter(54, 52)
} as const;

export const MAP_DECORATION_LANDMARKS = {
  villageGuideSign: {
    position: tileCenter(30, 19),
    indicatorPosition: tileCenter(30, 18)
  },
  learningHallNotice: {
    position: tileCenter(24, 16),
    indicatorPosition: tileCenter(24, 15)
  },
  farmGateSign: {
    position: tileCenter(34, 26),
    indicatorPosition: tileCenter(34, 25)
  },
  readingShrine: {
    position: tileCenter(55, 18),
    indicatorPosition: tileCenter(55, 16)
  },
  shrineBoatWarningSign: {
    position: tileCenter(58, 17),
    indicatorPosition: tileCenter(58, 16)
  }
} as const;

const staticCollision = [
  rectTiles("north-boundary", 0, 0, WORLD_COLUMNS, 1),
  rectTiles("south-boundary", 0, WORLD_ROWS - 1, WORLD_COLUMNS, 1),
  rectTiles("west-boundary", 0, 0, 1, WORLD_ROWS),
  rectTiles("east-boundary", WORLD_COLUMNS - 1, 0, 1, WORLD_ROWS),
  ...waterCollisionTiles(),
  ...farmFenceCollision()
] satisfies Rectangle[];

const visualObjects = [
  // West homes use a compact private garden instead of repeated loose trees.
  house("west-house", "village-red-house", 7, 12),
  wideTree("west-home-canopy", 2, 10),
  tree("west-home-side-tree", 12, 11),
  natureDecor("west-home-sunflower", 5, 15, NATURE_FRAME.sunflower),
  natureDecor("west-home-red-flower", 6, 15, NATURE_FRAME.redFlower),
  natureDecor("west-home-white-flower", 12, 15, NATURE_FRAME.whiteFlower),
  natureDecor("west-home-leafy-bush", 12, 14, NATURE_FRAME.tallLeaves),
  villageDecor("west-home-planter", 6, 16, VILLAGE_DECOR_FRAME.redPlanter),
  villageDecor("west-home-bench", 10, 16, VILLAGE_DECOR_FRAME.bench),

  // The learning hall has a formal, readable entrance like a civic building.
  house("learning-hall", "village-learning-hall", 20, 12),
  wideTree("hall-tree-line", 15, 11),
  villageDecor("learning-hall-notice", 24, 15, VILLAGE_DECOR_FRAME.sign, true),
  villageDecor("learning-hall-lantern-left", 19, 15, VILLAGE_DECOR_FRAME.lantern),
  villageDecor("learning-hall-lantern-right", 23, 15, VILLAGE_DECOR_FRAME.lantern),
  villageDecor("learning-hall-planter-left", 18, 16, VILLAGE_DECOR_FRAME.whitePlanter),
  villageDecor("learning-hall-planter-right", 24, 16, VILLAGE_DECOR_FRAME.redPlanter),

  // The story plaza is open in the middle and framed by useful street furniture.
  villageDecor("village-guide-sign", 30, 18, VILLAGE_DECOR_FRAME.sign, true),
  villageDecor("plaza-bench-west", 23, 23, VILLAGE_DECOR_FRAME.bench),
  villageDecor("plaza-bench-east", 32, 23, VILLAGE_DECOR_FRAME.bench),
  villageDecor("plaza-planter-west", 22, 20, VILLAGE_DECOR_FRAME.redPlanter),
  villageDecor("plaza-planter-east", 33, 20, VILLAGE_DECOR_FRAME.whitePlanter),
  natureDecor("plaza-stone-west", 21, 22, NATURE_FRAME.smallStone),
  natureDecor("plaza-stone-east", 34, 22, NATURE_FRAME.smallStone),

  // Market props are practical: produce, flowers, and a waiting bench.
  marketShop("market-shop", 14, 17),
  villageDecor("market-produce-left", 13, 19, VILLAGE_DECOR_FRAME.produceCrate),
  villageDecor("market-produce-right", 18, 19, VILLAGE_DECOR_FRAME.produceCrate),
  villageDecor("market-bench", 18, 21, VILLAGE_DECOR_FRAME.bench),
  natureDecor("market-red-flower", 12, 21, NATURE_FRAME.redFlower),
  natureDecor("market-white-flower", 19, 21, NATURE_FRAME.whiteFlower),

  // Lolo Ambo's corner feels older and calmer with stone markers and lamps.
  house("east-house", "village-east-house", 41, 12),
  wideTree("lolo-shade-tree", 44, 15),
  villageDecor("lolo-bench", 43, 17, VILLAGE_DECOR_FRAME.bench),
  villageDecor("lolo-lantern-west", 40, 16, VILLAGE_DECOR_FRAME.lantern),
  villageDecor("lolo-lantern-east", 47, 16, VILLAGE_DECOR_FRAME.lantern),
  villageDecor("lolo-stone-marker", 46, 20, VILLAGE_DECOR_FRAME.stoneMarker),
  natureDecor("lolo-white-flower", 40, 22, NATURE_FRAME.whiteFlower),

  // The southern lane transitions from village furniture into wilder growth.
  house("southwest-house", "village-learning-hall", 9, 26),
  wideTree("southwest-tree-line", 3, 25),
  villageDecor("south-lane-bench", 14, 29, VILLAGE_DECOR_FRAME.bench),
  natureDecor("south-lane-bush", 17, 30, NATURE_FRAME.roundBush),
  natureDecor("south-lane-stone", 18, 32, NATURE_FRAME.smallStone),

  // The farm has a working edge with supplies and planted color near its gate.
  sprite("farm-fence-boundary", "farm-fence", 33, 23, 16, 10, false),
  tree("farm-woodland-tree-north", 45, 24),
  tree("farm-woodland-tree-south", 45, 29),
  villageDecor("farm-gate-sign", 34, 26, VILLAGE_DECOR_FRAME.sign),
  villageDecor("farm-produce-crate", 43, 30, VILLAGE_DECOR_FRAME.produceCrate),
  natureDecor("farm-sunflower", 44, 28, NATURE_FRAME.doubleSunflower),
  natureDecor("farm-red-flower", 47, 27, NATURE_FRAME.redFlower),
  natureDecor("farm-leafy-bush", 47, 30, NATURE_FRAME.leafyBush),

  // The east bank is a quiet shrine garden with lamps and mixed flowers.
  readingShrine("east-riverbank-reading-shrine", 54, 15),
  villageDecor("shrine-boat-warning-sign", 58, 16, VILLAGE_DECOR_FRAME.sign, true),
  tree("east-riverbank-tree-north", 57, 13),
  wideTree("east-riverbank-tree-mid", 56, 21),
  tree("east-riverbank-tree-south", 58, 30),
  villageDecor("shrine-lantern-west", 54, 18, VILLAGE_DECOR_FRAME.lantern),
  villageDecor("shrine-lantern-east", 57, 18, VILLAGE_DECOR_FRAME.lantern),
  natureDecor("east-riverbank-sunflower", 58, 18, NATURE_FRAME.sunflower),
  natureDecor("east-riverbank-red-flower", 55, 31, NATURE_FRAME.redFlower),
  natureDecor("east-riverbank-white-flower", 56, 32, NATURE_FRAME.whiteFlower),
  wideTree("south-riverbend-tree", 47, 36),
  villageDecor("river-cove-landing-sign", 45, 48, VILLAGE_DECOR_FRAME.sign),
  villageDecor("river-cove-bench", 44, 50, VILLAGE_DECOR_FRAME.bench),
  natureDecor("river-cove-white-flower", 46, 50, NATURE_FRAME.whiteFlower),
  tree("river-cove-west-tree", 40, 47),
  villageDecor("east-channel-landing-sign", 54, 52, VILLAGE_DECOR_FRAME.sign),
  villageDecor("east-channel-bench", 54, 54, VILLAGE_DECOR_FRAME.bench),
  natureDecor("east-channel-white-flower", 54, 56, NATURE_FRAME.whiteFlower),
  tree("east-channel-lower-bank-tree", 52, 59),

  // Forest framing alternates canopy shapes so its silhouette is not tiled.
  wideTree("forest-west-a", 17, 3),
  tree("forest-west-b", 19, 7),
  wideTree("forest-west-c", 21, 11),
  tree("forest-east-a", 40, 2),
  wideTree("forest-east-b", 42, 6),
  wideTree("forest-east-wide-tree", 46, 3),
  tree("forest-east-c", 44, 11),

  // A mixed orchard frames the forest clearing without blocking its central route.
  fruitTree("forest-orchard-apple", "apple", 26, 2),
  fruitTree("forest-orchard-orange", "orange", 34, 2),
  fruitTree("forest-orchard-lemon", "lemon", 26, 5),
  fruitTree("forest-orchard-plum", "plum", 34, 5),

  // Irregular outer framing uses fewer, broader canopies.
  wideTree("border-northwest-a", 1, 1),
  wideTree("border-northwest-b", 8, 2),
  tree("border-northwest-c", 13, 1),
  wideTree("border-northeast-a", 55, 1),
  tree("border-northeast-b", 59, 3),
  tree("border-west-a", 1, 7),
  wideTree("border-west-b", 2, 17),
  tree("border-west-c", 1, 35),
  wideTree("border-east-b", 57, 25),
  tree("border-east-c", 59, 35),
  wideTree("border-south-a", 2, 63),
  tree("border-south-b", 12, 63),
  wideTree("border-south-c", 52, 63)
] satisfies VisualObject[];

export const PROTOTYPE_MAP = {
  columns: WORLD_COLUMNS,
  rows: WORLD_ROWS,
  tileSize: TILE_SIZE,
  startPosition: MAP_LANDMARKS.spawn,
  areas: [
    area("north-gate", "Waterfall clearing", 26, 2, 10, 6),
    area("central-plaza", "Story plaza", 20, 16, 16, 10),
    area("market-area", "Market stall", 11, 16, 10, 7),
    area("west-homes", "West home", 5, 10, 11, 10),
    area("learning-hall-placeholder", "Learning hall", 17, 10, 10, 8),
    area("east-homes", "East home and garden", 38, 10, 10, 14),
    area("river-path", "Northern forest trail", 25, 10, 12, 8),
    area("old-bridge", "Old wooden bridge", 29, 7, 4, 5),
    area("twin-waterfalls", "North forest clearing", 22, 1, 17, 7),
    area("south-lane", "Winding south lane", 20, 23, 12, 10),
    area("farm-woodland", "Mang Yato's farm woodland", 33, 23, 16, 10),
    area("east-riverbank", "East riverbank", 54, 12, 7, 23),
    area("south-riverbend", "South river bend", 29, 33, 29, 6),
    area("east-river-channel", "East river channel", 55, 46, 5, 16),
    area("south-river-cove", "South river cove", 43, 44, 12, 8),
    area("tree-border", "Village tree border", 0, 0, WORLD_COLUMNS, WORLD_ROWS)
  ],
  collision: [
    ...staticCollision,
    ...visualObjects.flatMap((object) => (object.blocksMovement && object.hitbox ? [object.hitbox] : []))
  ] satisfies Rectangle[],
  isWalkablePoint,
  visualObjects
} as const;

export type PrototypeMap = typeof PROTOTYPE_MAP;

export function getWorldSize(map: Pick<PrototypeMap, "columns" | "rows" | "tileSize"> = PROTOTYPE_MAP) {
  return { width: map.columns * map.tileSize, height: map.rows * map.tileSize };
}

export function getTileKind(tileX: number, tileY: number): TileKind {
  if (contains(BRIDGE_REGION, tileX, tileY)) return "bridge";
  if (isWaterTile(tileX, tileY)) return "water";
  if (isMarketTile(tileX, tileY)) return "market";
  if (isPlazaTile(tileX, tileY)) return "plaza";
  if (isRouteTile(tileX, tileY)) return tileY <= 16 ? "forest" : "path";
  return "grass";
}

export function getTerrainSprite(tileX: number, tileY: number): TerrainSprite {
  const kind = getTileKind(tileX, tileY);
  if (kind === "water") {
    return { assetKey: "tileset-water", frame: waterFrame(tileX, tileY) };
  }
  if (kind === "bridge") {
    const bridgeRows = [
      [340, 341, 342, 343],
      [368, 369, 370, 371],
      [396, 397, 398, 399]
    ] as const;
    const localY = tileY - BRIDGE_REGION.y;
    const row = localY === 0 ? bridgeRows[0] : localY === BRIDGE_REGION.height - 1 ? bridgeRows[2] : bridgeRows[1];
    return { assetKey: "tileset-water", frame: row[tileX - BRIDGE_REGION.x] };
  }
  if (kind === "grass") {
    return { assetKey: "tileset-floor", frame: 264 };
  }
  if (isWalkableTileKind(kind)) {
    return { assetKey: "tileset-floor", frame: pathFrame(tileX, tileY) };
  }
  return { assetKey: "tileset-water", frame: waterFrame(tileX, tileY) };
}

export const WATER_ANIMATION_PHASES = 4;

export function getAnimatedWaterFrame(tileX: number, tileY: number, phase: number) {
  if (getTileKind(tileX, tileY) !== "water") return null;
  const surrounded = [
    getTileKind(tileX, tileY - 1),
    getTileKind(tileX, tileY + 1),
    getTileKind(tileX - 1, tileY),
    getTileKind(tileX + 1, tileY)
  ].every((kind) => kind === "water" || kind === "bridge");
  if (!surrounded) return null;
  const frames = [29, 39, 67, 123];
  return frames[(Math.max(0, phase) + coordinateVariant(tileX, tileY, frames.length)) % frames.length];
}

export function isWalkablePoint(point: { x: number; y: number }) {
  const tileX = Math.floor(point.x / TILE_SIZE);
  const tileY = Math.floor(point.y / TILE_SIZE);
  if (tileX < 0 || tileY < 0 || tileX >= WORLD_COLUMNS || tileY >= WORLD_ROWS) return false;
  return isWalkableTileKind(getTileKind(tileX, tileY));
}

export function isWalkableTileKind(kind: TileKind) {
  return TERRAIN_DEFINITIONS[kind].walkable;
}

export function getTerrainAtPoint(point: { x: number; y: number }) {
  const kind = getTileKind(Math.floor(point.x / TILE_SIZE), Math.floor(point.y / TILE_SIZE));
  return TERRAIN_DEFINITIONS[kind];
}

export function getMapAreaAtPoint(point: { x: number; y: number }) {
  return PROTOTYPE_MAP.areas.find((area) => area.key !== "tree-border" && pointInRectangle(point, area.bounds))
    ?? PROTOTYPE_MAP.areas.find((area) => area.key === "tree-border")!;
}

function isPlazaTile(tileX: number, tileY: number) {
  const dx = (tileX + 0.5 - 27.5) / 8.5;
  const dy = (tileY + 0.5 - 21) / 5.2;
  return dx * dx + dy * dy <= 1;
}

function isMarketTile(tileX: number, tileY: number) {
  return tileX >= 11 && tileX <= 20 && tileY >= 16 && tileY <= 23 && isRouteTile(tileX, tileY);
}

function isRouteTile(tileX: number, tileY: number) {
  return isPlazaTile(tileX, tileY) || PATH_REGIONS.some((region) => containsRounded(region, tileX, tileY));
}

function isWaterTile(tileX: number, tileY: number) {
  return MAIN_RIVER_REGIONS.some((region) => contains(region, tileX, tileY));
}

function waterCollisionTiles() {
  const collision: Rectangle[] = [];
  for (let y = 0; y < WORLD_ROWS; y += 1) {
    for (let x = 0; x < WORLD_COLUMNS; x += 1) {
      if (isWaterTile(x, y) && !contains(BRIDGE_REGION, x, y)) {
        collision.push(rectTiles(`water-${x}-${y}`, x, y, 1, 1));
      }
    }
  }
  return collision;
}

function pathFrame(tileX: number, tileY: number) {
  const pathLike = (x: number, y: number) => {
    const kind = getTileKind(x, y);
    return kind !== "grass" && kind !== "water";
  };
  const top = pathLike(tileX, tileY - 1);
  const bottom = pathLike(tileX, tileY + 1);
  const left = pathLike(tileX - 1, tileY);
  const right = pathLike(tileX + 1, tileY);

  if (!top && !left) return 154;
  if (!top && !right) return 156;
  if (!bottom && !left) return 198;
  if (!bottom && !right) return 200;
  if (!top) return 155;
  if (!bottom) return 199;
  if (!left) return 176;
  if (!right) return 178;

  return 177;
}

function waterFrame(tileX: number, tileY: number) {
  const top = isWaterTile(tileX, tileY - 1);
  const bottom = isWaterTile(tileX, tileY + 1);
  const left = isWaterTile(tileX - 1, tileY);
  const right = isWaterTile(tileX + 1, tileY);
  if (!top && !left) return 0;
  if (!top && !right) return 2;
  if (!bottom && !left) return 56;
  if (!bottom && !right) return 58;
  if (!top) return 1;
  if (!bottom) return 57;
  if (!left) return 28;
  if (!right) return 30;
  const centerFrames = [29, 29, 29, 39, 67, 123];
  return centerFrames[coordinateVariant(tileX, tileY, centerFrames.length)];
}

function coordinateVariant(tileX: number, tileY: number, count: number) {
  return Math.abs(tileX * 17 + tileY * 31 + tileX * tileY * 3) % count;
}

function contains(region: TileRegion, tileX: number, tileY: number) {
  return tileX >= region.x && tileX < region.x + region.width && tileY >= region.y && tileY < region.y + region.height;
}

function containsRounded(region: TileRegion, tileX: number, tileY: number) {
  if (!contains(region, tileX, tileY)) return false;
  const radius = Math.min(2.5, region.width / 2, region.height / 2);
  const centerX = tileX + 0.5;
  const centerY = tileY + 0.5;
  const nearestX = Math.min(region.x + region.width - radius, Math.max(region.x + radius, centerX));
  const nearestY = Math.min(region.y + region.height - radius, Math.max(region.y + radius, centerY));
  return Math.hypot(centerX - nearestX, centerY - nearestY) <= radius;
}

function pointInRectangle(point: { x: number; y: number }, rectangle: Rectangle) {
  return point.x >= rectangle.x && point.x <= rectangle.x + rectangle.width && point.y >= rectangle.y && point.y <= rectangle.y + rectangle.height;
}

function area(key: MapAreaKey, label: string, x: number, y: number, width: number, height: number): MapArea {
  return { key, label, bounds: rectTiles(key, x, y, width, height) };
}

function house(id: string, assetKey: Extract<VisualAssetKey, `village-${string}`>, x: number, y: number) {
  return sprite(id, assetKey, x, y, 4, 3, true, undefined, {
    x: 0.3,
    y: 0.2,
    width: 3.4,
    height: 2.6
  });
}

function marketShop(id: string, x: number, y: number) {
  return sprite(id, "village-market-shop", x, y - 1, 4, 3, true, undefined, {
    x: 0.2,
    y: 2.2,
    width: 3.6,
    height: 0.65
  });
}

function tree(id: string, x: number, y: number) {
  return sprite(id, "tree-round", x, y, 2, 2, true, undefined, {
    x: 0.2,
    y: 0.25,
    width: 1.6,
    height: 1.6
  });
}

export function isSwimmableRiverPoint(point: { x: number; y: number }) {
  const tileX = Math.floor(point.x / TILE_SIZE);
  const tileY = Math.floor(point.y / TILE_SIZE);
  return contains(SWIMMABLE_RIVER_REGION, tileX, tileY) && isWaterTile(tileX, tileY);
}

export function isSwimmableRiverPosition(point: { x: number; y: number }, radius = 12) {
  // Swimming effects extend below the player's collision circle, so reserve a small
  // visual shoreline margin as well as the physical player radius.
  const inset = Math.max(radius + 16, 0);
  return [
    point,
    { x: point.x - inset, y: point.y },
    { x: point.x + inset, y: point.y },
    { x: point.x, y: point.y - inset },
    { x: point.x, y: point.y + inset },
    { x: point.x - inset, y: point.y - inset },
    { x: point.x + inset, y: point.y - inset },
    { x: point.x - inset, y: point.y + inset },
    { x: point.x + inset, y: point.y + inset }
  ].every(isSwimmableRiverPoint);
}

function wideTree(id: string, x: number, y: number) {
  return sprite(id, "tree-wide", x, y, 4, 2, true, undefined, {
    x: 0.25,
    y: 0.7,
    width: 3.5,
    height: 0.85
  });
}

function fruitTree(id: string, kind: FruitTreeKind, x: number, y: number) {
  return sprite(id, "fruit-tree", x, y, 2, 2, true, getFruitTreeFrame(kind), {
    x: 0.65,
    y: 1.4,
    width: 0.7,
    height: 0.5
  });
}

function readingShrine(id: string, x: number, y: number) {
  return sprite(id, "reading-shrine", x, y, 3, 3, true, undefined, {
    x: 0.45,
    y: 2.2,
    width: 2.1,
    height: 0.55
  });
}

function natureDecor(id: string, x: number, y: number, frame: number) {
  return tileDecoration(id, "tileset-nature", x, y, frame);
}

function villageDecor(
  id: string,
  x: number,
  y: number,
  frame: number,
  blocksMovement = false
) {
  return sprite(id, "village-decor", x, y, 1, 1, blocksMovement, frame, {
    x: 0.2,
    y: 0.55,
    width: 0.6,
    height: 0.35
  });
}

function tileDecoration(id: string, assetKey: VisualAssetKey, x: number, y: number, frame: number) {
  return sprite(id, assetKey, x, y, 1, 1, false, frame);
}

function sprite(
  id: string,
  assetKey: VisualAssetKey,
  x: number,
  y: number,
  width: number,
  height: number,
  blocksMovement: boolean,
  frame?: number,
  hitbox?: TileHitbox
): VisualObject {
  return {
    id,
    assetKey,
    frame,
    x: x * TILE_SIZE,
    y: y * TILE_SIZE,
    width: width * TILE_SIZE,
    height: height * TILE_SIZE,
    blocksMovement,
    depthY: (y + height) * TILE_SIZE,
    hitbox: blocksMovement
      ? rectTiles(`${id}-hitbox`, x + (hitbox?.x ?? 0), y + (hitbox?.y ?? 0), hitbox?.width ?? width, hitbox?.height ?? height)
      : undefined
  };
}

function rectTiles(id: string, x: number, y: number, width: number, height: number): Rectangle {
  return { id, x: x * TILE_SIZE, y: y * TILE_SIZE, width: width * TILE_SIZE, height: height * TILE_SIZE };
}

function farmFenceCollision() {
  const collision: Rectangle[] = [
    rectTiles("farm-fence-top-left-hitbox", 33.2, 23.2, 0.6, 0.6),
    rectTiles("farm-fence-top-right-hitbox", 48.2, 23.2, 0.6, 0.6),
    rectTiles("farm-fence-bottom-left-hitbox", 33.2, 32.2, 0.6, 0.6),
    rectTiles("farm-fence-bottom-right-hitbox", 48.2, 32.2, 0.6, 0.6)
  ];
  for (let x = 34; x <= 47; x += 1) {
    collision.push(rectTiles(`farm-fence-top-${x}-hitbox`, x, 23.25, 1, 0.5));
    collision.push(rectTiles(`farm-fence-bottom-${x}-hitbox`, x, 32.25, 1, 0.5));
  }
  for (let y = 24; y <= 31; y += 1) {
    collision.push(rectTiles(`farm-fence-right-${y}-hitbox`, 48.3, y, 0.4, 1));
  }
  for (const y of [24, 25, 29, 30, 31]) {
    collision.push(rectTiles(`farm-fence-left-${y}-hitbox`, 33.3, y, 0.4, 1));
  }
  return collision;
}

function tileCenter(tileX: number, tileY: number) {
  return { x: (tileX + 0.5) * TILE_SIZE, y: (tileY + 0.5) * TILE_SIZE };
}
