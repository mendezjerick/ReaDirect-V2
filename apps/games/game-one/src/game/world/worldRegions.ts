import type { Point } from "../physics/collision";
import { TILE_SIZE } from "../map/prototypeMap";
import type { GameLanguage } from "../localization/language";

export type WorldRegionId = "village" | "forest" | "river" | "farm" | "jungle" | "waterfall";

export type WorldRegion = {
  id: WorldRegionId;
  labels: Record<GameLanguage, string>;
  available: boolean;
  bounds: { x: number; y: number; width: number; height: number };
};

export const WORLD_REGIONS: readonly WorldRegion[] = [
  region("river", "River", "Ilog", 1, 8, 52, 3, true),
  region("forest", "Forest", "Kagubatan", 0, 0, 54, 8, true),
  region("farm", "Farm Woodland", "Gubat sa Bukid", 33, 23, 16, 10, true),
  region("village", "Village", "Nayon", 0, 11, 54, 23, true),
  region("jungle", "Jungle", "Gubat", 0, 0, 0, 0, false),
  region("waterfall", "Waterfall Clearing", "Lunan ng Talon", 0, 0, 0, 0, false)
];

export const AVAILABLE_WORLD_REGIONS = WORLD_REGIONS.filter((regionDefinition) => regionDefinition.available);

export function getWorldRegionAtPoint(point: Point) {
  return AVAILABLE_WORLD_REGIONS.find((regionDefinition) => containsPoint(regionDefinition.bounds, point))
    ?? AVAILABLE_WORLD_REGIONS.find((regionDefinition) => regionDefinition.id === "village")!;
}

export function getWorldRegionLabel(regionId: WorldRegionId, language: GameLanguage) {
  return WORLD_REGIONS.find((regionDefinition) => regionDefinition.id === regionId)?.labels[language] ?? regionId;
}

function region(
  id: WorldRegionId,
  english: string,
  filipino: string,
  x: number,
  y: number,
  width: number,
  height: number,
  available: boolean
): WorldRegion {
  return {
    id,
    labels: { en: english, fil: filipino },
    available,
    bounds: {
      x: x * TILE_SIZE,
      y: y * TILE_SIZE,
      width: width * TILE_SIZE,
      height: height * TILE_SIZE
    }
  };
}

function containsPoint(bounds: WorldRegion["bounds"], point: Point) {
  return point.x >= bounds.x && point.x < bounds.x + bounds.width &&
    point.y >= bounds.y && point.y < bounds.y + bounds.height;
}
