import { getTileKind, PROTOTYPE_MAP, TILE_SIZE } from "../map/prototypeMap";
import type { Point } from "../physics/collision";

export const CONNECTED_TALL_GRASS_ASSET_KEY = "connected-tall-grass";
export const TALL_GRASS_SOURCE_TILE_SIZE = 16;
export const TALL_GRASS_ATLAS_COLUMNS = 13;
export const TALL_GRASS_FOREGROUND_FRAME = 12;
export const GRASS_CONTACT_POOL_SIZE = 5;
export const GRASS_UPDATE_INTERVAL = 1 / 8;
export const GRASS_REACTION_SECONDS = 0.42;

type FieldMask = {
  x: number;
  y: number;
  rows: readonly string[];
};

const FIELD_MASKS: readonly FieldMask[] = [
  {
    x: 1,
    y: 2,
    rows: [
      "#########",
      "#########",
      "#########",
      "#########",
      "#########"
    ]
  },
  {
    x: 2,
    y: 20,
    rows: [
      "########",
      "########",
      "########",
      "########",
      "########"
    ]
  },
  {
    x: 34,
    y: 24,
    rows: [
      "#########",
      "#########",
      "#########",
      "#########",
      "#########"
    ]
  }
];

export type TallGrassPatch = {
  key: string;
  tileX: number;
  tileY: number;
  x: number;
  y: number;
  phase: number;
};

export function isTallGrassTile(tileX: number, tileY: number) {
  if (!isMapTile(tileX, tileY) || getTileKind(tileX, tileY) !== "grass") return false;
  return FIELD_MASKS.some((field) => {
    const row = field.rows[tileY - field.y];
    return row?.[tileX - field.x] === "#";
  });
}

export function getTallGrassFrame(tileX: number, tileY: number) {
  const top = isTallGrassTile(tileX, tileY - 1);
  const bottom = isTallGrassTile(tileX, tileY + 1);
  const left = isTallGrassTile(tileX - 1, tileY);
  const right = isTallGrassTile(tileX + 1, tileY);

  if (!top && !left) return 7;
  if (!top && !right) return 8;
  if (!bottom && !left) return 9;
  if (!bottom && !right) return 10;
  if (!top) return 3;
  if (!bottom) return 4;
  if (!left) return 5;
  if (!right) return 6;
  return Math.abs(tileX * 17 + tileY * 31 + tileX * tileY * 3) % 3;
}

export function getTallGrassTileKey(point: Point) {
  const tileX = Math.floor(point.x / TILE_SIZE);
  const tileY = Math.floor(point.y / TILE_SIZE);
  return isTallGrassTile(tileX, tileY) ? tileKey(tileX, tileY) : null;
}

export function getTouchingTallGrassPatches(point: Point, radius = 12): TallGrassPatch[] {
  const centerTileX = Math.floor(point.x / TILE_SIZE);
  const centerTileY = Math.floor(point.y / TILE_SIZE);
  const currentKey = tileKey(centerTileX, centerTileY);
  const patches: TallGrassPatch[] = [];

  for (let tileY = centerTileY - 1; tileY <= centerTileY + 1; tileY += 1) {
    for (let tileX = centerTileX - 1; tileX <= centerTileX + 1; tileX += 1) {
      if (!isTallGrassTile(tileX, tileY) || !circleTouchesTile(point, radius, tileX, tileY)) continue;
      patches.push({
        key: tileKey(tileX, tileY),
        tileX,
        tileY,
        x: tileX * TILE_SIZE + TILE_SIZE / 2,
        y: tileY * TILE_SIZE + TILE_SIZE / 2,
        phase: ((tileX * 17 + tileY * 29) % 31) / 31
      });
    }
  }

  return patches
    .sort((first, second) => {
      if (first.key === currentKey) return -1;
      if (second.key === currentKey) return 1;
      const firstDistance = (first.tileX - centerTileX) ** 2 + (first.tileY - centerTileY) ** 2;
      const secondDistance = (second.tileX - centerTileX) ** 2 + (second.tileY - centerTileY) ** 2;
      return firstDistance - secondDistance || first.key.localeCompare(second.key);
    })
    .slice(0, GRASS_CONTACT_POOL_SIZE);
}

export function getTallGrassMotion(
  patch: TallGrassPatch,
  nowSeconds: number,
  reactionEndsAt: number,
  reducedMotion: boolean
) {
  if (reducedMotion) return { swayX: 0, angle: 0 };
  const reactionStrength = Math.max(0, Math.min(1, (reactionEndsAt - nowSeconds) / GRASS_REACTION_SECONDS));
  const idleSway = Math.sin(nowSeconds * 1.7 + patch.phase * Math.PI * 2) * 0.22;
  const reactionSway = Math.sin(nowSeconds * 32 + patch.phase * 4) * 3 * reactionStrength;
  return {
    swayX: idleSway + reactionSway,
    angle: reactionStrength > 0
      ? Math.sin(nowSeconds * 26 + patch.phase * 3) * 8 * reactionStrength
      : 0
  };
}

export function createConnectedTallGrassTileset() {
  const canvas = document.createElement("canvas");
  canvas.width = TALL_GRASS_SOURCE_TILE_SIZE * TALL_GRASS_ATLAS_COLUMNS;
  canvas.height = TALL_GRASS_SOURCE_TILE_SIZE;
  const context = getCanvasContext(canvas);
  if (!context) return canvas;

  context.imageSmoothingEnabled = false;
  const frames: readonly EdgeFlags[] = [
    {},
    {},
    {},
    { top: true },
    { bottom: true },
    { left: true },
    { right: true },
    { top: true, left: true },
    { top: true, right: true },
    { bottom: true, left: true },
    { bottom: true, right: true }
  ];
  frames.forEach((edges, frame) => drawFieldTile(context, frame, edges));
  drawFieldTile(context, 11, {});
  drawForegroundBlades(context, TALL_GRASS_FOREGROUND_FRAME);
  return canvas;
}

type EdgeFlags = {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
};

const BLADE_PATTERNS = [
  [[2, 6], [6, 4], [11, 7], [14, 4], [3, 13], [8, 11], [13, 14]],
  [[3, 4], [8, 6], [13, 5], [1, 11], [6, 14], [11, 12], [15, 10]],
  [[1, 7], [5, 5], [10, 4], [14, 8], [3, 14], [8, 12], [13, 13]]
] as const;

function drawFieldTile(context: CanvasRenderingContext2D, frame: number, edges: EdgeFlags) {
  const offsetX = frame * TALL_GRASS_SOURCE_TILE_SIZE;
  const seed = frame * 13 + 7;
  for (let y = 0; y < TALL_GRASS_SOURCE_TILE_SIZE; y += 1) {
    for (let x = 0; x < TALL_GRASS_SOURCE_TILE_SIZE; x += 1) {
      if (!isCoveredPixel(x, y, edges)) continue;
      const noise = (x * 11 + y * 7 + seed) % 37;
      context.fillStyle = noise === 0 ? "#285334" : "#386f3b";
      context.fillRect(offsetX + x, y, 1, 1);
    }
  }

  const bladePattern = BLADE_PATTERNS[frame % BLADE_PATTERNS.length];
  bladePattern.forEach(([x, y], index) => {
    if (!isCoveredPixel(x, y, edges) || !isCoveredPixel(x, y - 2, edges)) return;
    const light = index % 3 === 0;
    context.fillStyle = light ? "#72a64d" : "#589047";
    context.fillRect(offsetX + x, y - 2, 1, 3);
    if (index % 2 === 0 && isCoveredPixel(x - 1, y - 1, edges)) {
      context.fillRect(offsetX + x - 1, y - 1, 1, 1);
    } else if (isCoveredPixel(x + 1, y - 1, edges)) {
      context.fillRect(offsetX + x + 1, y - 1, 1, 1);
    }
    context.fillStyle = "#91bf59";
    context.fillRect(offsetX + x, y - 2, 1, 1);
  });

}

function drawForegroundBlades(context: CanvasRenderingContext2D, frame: number) {
  const offsetX = frame * TALL_GRASS_SOURCE_TILE_SIZE;
  const clusters = [
    [1, 15],
    [4, 14],
    [7, 15],
    [10, 14],
    [13, 15]
  ] as const;
  clusters.forEach(([x, y], index) => {
    context.fillStyle = index % 2 === 0 ? "#4f8542" : "#386f3b";
    context.fillRect(offsetX + x, y - 3, 2, 4);
    context.fillRect(offsetX + x - 1, y - 1, 1, 2);
    context.fillRect(offsetX + x + 2, y - 2, 1, 2);
    context.fillStyle = "#86b653";
    context.fillRect(offsetX + x, y - 3, 1, 1);
  });
}

function isCoveredPixel(x: number, y: number, edges: EdgeFlags) {
  if (edges.top && y < 3 + ((x * 3 + 1) % 2)) return false;
  if (edges.bottom && y > 12 - ((x * 5 + 1) % 2)) return false;
  if (edges.left && x < 2 + ((y * 3 + 1) % 2)) return false;
  if (edges.right && x > 13 - ((y * 5 + 1) % 2)) return false;
  if (edges.top && edges.left && x < 6 && y < 6 && x + y < 6) return false;
  if (edges.top && edges.right && x > 9 && y < 6 && (15 - x) + y < 6) return false;
  if (edges.bottom && edges.left && x < 6 && y > 9 && x + (15 - y) < 6) return false;
  if (edges.bottom && edges.right && x > 9 && y > 9 && (15 - x) + (15 - y) < 6) return false;
  return true;
}

function circleTouchesTile(point: Point, radius: number, tileX: number, tileY: number) {
  const left = tileX * TILE_SIZE;
  const top = tileY * TILE_SIZE;
  const closestX = Math.max(left, Math.min(point.x, left + TILE_SIZE));
  const closestY = Math.max(top, Math.min(point.y, top + TILE_SIZE));
  return (point.x - closestX) ** 2 + (point.y - closestY) ** 2 <= radius ** 2;
}

function getCanvasContext(canvas: HTMLCanvasElement) {
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) return null;
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}

function isMapTile(tileX: number, tileY: number) {
  return tileX >= 0 && tileY >= 0 && tileX < PROTOTYPE_MAP.columns && tileY < PROTOTYPE_MAP.rows;
}

function tileKey(tileX: number, tileY: number) {
  return `${tileX}:${tileY}`;
}
