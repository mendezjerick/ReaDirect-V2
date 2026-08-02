import type { CollisionMap, Rectangle } from "../physics/collision";

export const SHOP_INTERIOR_WIDTH = 640;
export const SHOP_INTERIOR_HEIGHT = 480;
export const SHOP_INTERIOR_TILE_SIZE = 32;

export const SHOP_INTERIOR_SPAWN = { x: 320, y: 408 } as const;
export const SHOP_INTERIOR_EXIT = {
  left: 278,
  right: 362,
  thresholdY: 452
} as const;

export type ShopFixtureKind =
  | "wall"
  | "shelf"
  | "counter"
  | "produce"
  | "table";

export type ShopFixture = Rectangle & {
  kind: ShopFixtureKind;
  label?: string;
  accent?: string;
};

export const SHOP_INTERIOR_FIXTURES: readonly ShopFixture[] = [
  { id: "north-wall", kind: "wall", x: 32, y: 24, width: 576, height: 48 },
  { id: "west-wall", kind: "wall", x: 32, y: 24, width: 42, height: 424 },
  { id: "east-wall", kind: "wall", x: 566, y: 24, width: 42, height: 424 },
  { id: "south-wall-west", kind: "wall", x: 32, y: 430, width: 246, height: 18 },
  { id: "south-wall-east", kind: "wall", x: 362, y: 430, width: 246, height: 18 },

  { id: "scroll-shelf", kind: "shelf", label: "STORIES", accent: "#e95742", x: 76, y: 86, width: 104, height: 92 },
  { id: "map-shelf", kind: "shelf", label: "MAPS", accent: "#e7bd58", x: 460, y: 86, width: 104, height: 92 },
  { id: "apple-display", kind: "produce", label: "APPLES", accent: "#d94b47", x: 76, y: 214, width: 104, height: 72 },
  { id: "leaf-display", kind: "produce", label: "HERBS", accent: "#4d8e54", x: 460, y: 214, width: 104, height: 72 },
  { id: "berry-display", kind: "produce", label: "BERRIES", accent: "#7652a8", x: 76, y: 324, width: 104, height: 70 },
  { id: "corn-display", kind: "produce", label: "CORN", accent: "#f2ca4c", x: 460, y: 324, width: 104, height: 70 },

  { id: "main-counter", kind: "counter", label: "MARKET COUNTER", x: 218, y: 118, width: 204, height: 82 },
  { id: "reading-table", kind: "table", label: "READING TABLE", x: 244, y: 264, width: 152, height: 62 }
];

export const SHOP_INTERIOR_COLLISION_MAP: CollisionMap = {
  columns: SHOP_INTERIOR_WIDTH / SHOP_INTERIOR_TILE_SIZE,
  rows: SHOP_INTERIOR_HEIGHT / SHOP_INTERIOR_TILE_SIZE,
  tileSize: SHOP_INTERIOR_TILE_SIZE,
  collision: SHOP_INTERIOR_FIXTURES
};

export function isShopExit(position: { x: number; y: number }) {
  return position.x >= SHOP_INTERIOR_EXIT.left
    && position.x <= SHOP_INTERIOR_EXIT.right
    && position.y >= SHOP_INTERIOR_EXIT.thresholdY;
}
