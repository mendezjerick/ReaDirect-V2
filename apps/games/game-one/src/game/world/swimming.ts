import type { Facing } from "../player/playerMovement";
import {
  getTerrainAtPoint,
  isSwimmableRiverPosition,
  PROTOTYPE_MAP,
  TILE_SIZE
} from "../map/prototypeMap";
import { canOccupy, type CollisionMap, type Point } from "../physics/collision";

const ENTRY_START_DISTANCE = TILE_SIZE / 2;
const ENTRY_END_DISTANCE = TILE_SIZE * 2;
const ENTRY_SAMPLE_STEP = TILE_SIZE / 4;
const EXIT_SEARCH_RADIUS = TILE_SIZE * 6;
const EXIT_SAMPLE_STEP = TILE_SIZE / 4;
const DEFAULT_SWIMMER_RADIUS = 12;

export function getSwimEntryPoint(
  position: Point,
  facing: Facing,
  radius = DEFAULT_SWIMMER_RADIUS
) {
  const direction = directionForFacing(facing);
  for (let distance = ENTRY_START_DISTANCE; distance <= ENTRY_END_DISTANCE; distance += ENTRY_SAMPLE_STEP) {
    const candidate = {
      x: position.x + direction.x * distance,
      y: position.y + direction.y * distance
    };
    if (isSwimmableRiverPosition(candidate, radius)) return candidate;
  }
  return null;
}

export function getNearestSwimmableRiverPosition(
  position: Point,
  radius = DEFAULT_SWIMMER_RADIUS
) {
  let nearest: { position: Point; distance: number } | null = null;

  for (let offsetY = -EXIT_SEARCH_RADIUS; offsetY <= EXIT_SEARCH_RADIUS; offsetY += EXIT_SAMPLE_STEP) {
    for (let offsetX = -EXIT_SEARCH_RADIUS; offsetX <= EXIT_SEARCH_RADIUS; offsetX += EXIT_SAMPLE_STEP) {
      const distance = Math.hypot(offsetX, offsetY);
      if (distance > EXIT_SEARCH_RADIUS || (nearest && distance >= nearest.distance)) continue;

      const candidate = {
        x: position.x + offsetX,
        y: position.y + offsetY
      };
      if (!isSwimmableRiverPosition(candidate, radius)) continue;

      nearest = { position: candidate, distance };
    }
  }

  return nearest?.position ?? null;
}

export function getNearestSwimExitPoint(
  position: Point,
  map: CollisionMap = PROTOTYPE_MAP,
  radius = DEFAULT_SWIMMER_RADIUS
) {
  let nearest: { position: Point; distance: number } | null = null;

  for (let offsetY = -EXIT_SEARCH_RADIUS; offsetY <= EXIT_SEARCH_RADIUS; offsetY += EXIT_SAMPLE_STEP) {
    for (let offsetX = -EXIT_SEARCH_RADIUS; offsetX <= EXIT_SEARCH_RADIUS; offsetX += EXIT_SAMPLE_STEP) {
      const distance = Math.hypot(offsetX, offsetY);
      if (distance === 0 || distance > EXIT_SEARCH_RADIUS || (nearest && distance >= nearest.distance)) continue;

      const candidate = {
        x: position.x + offsetX,
        y: position.y + offsetY
      };
      if (getTerrainAtPoint(candidate).id === "water" || !canOccupy(candidate, radius, map)) continue;

      nearest = { position: candidate, distance };
    }
  }

  return nearest?.position ?? null;
}

function directionForFacing(facing: Facing): Point {
  if (facing === "up") return { x: 0, y: -1 };
  if (facing === "down") return { x: 0, y: 1 };
  if (facing === "left") return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}
