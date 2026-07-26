import { GAME_CONFIG } from "../config/gameConfig";
import { getWorldSize, PROTOTYPE_MAP } from "../map/prototypeMap";
import { clamp, type Point } from "../physics/collision";

export function getCameraCenter({
  target,
  viewportWidth = GAME_CONFIG.logicalWidth,
  viewportHeight = GAME_CONFIG.logicalHeight,
  map = PROTOTYPE_MAP
}: {
  target: Point;
  viewportWidth?: number;
  viewportHeight?: number;
  map?: Pick<typeof PROTOTYPE_MAP, "columns" | "rows" | "tileSize">;
}): Point {
  const world = getWorldSize(map);
  const halfWidth = viewportWidth / 2;
  const halfHeight = viewportHeight / 2;

  return {
    x: world.width <= viewportWidth ? world.width / 2 : clamp(target.x, halfWidth, world.width - halfWidth),
    y: world.height <= viewportHeight ? world.height / 2 : clamp(target.y, halfHeight, world.height - halfHeight)
  };
}
