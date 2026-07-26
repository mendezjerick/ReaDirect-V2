import { PROTOTYPE_MAP } from "../map/prototypeMap";
import { canOccupy, type CollisionMap, type Point } from "../physics/collision";
import { PLAYER_CONFIG, type Facing } from "../player/playerMovement";

export const NAVIGATION_NEARBY_DISTANCE = 92;
export const NAVIGATION_GUIDE_DOTS_DISTANCE = 224;
export const MINIMAP_VIEW_SIZE = 240;
export const MINIMAP_CENTER = MINIMAP_VIEW_SIZE / 2;
export const MINIMAP_CONTENT_RADIUS = 96;
export const MINIMAP_WORLD_SCALE = 0.32;

export function getNavigationDirection(player: Point, target: Point) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const distance = Math.hypot(dx, dy);
  return {
    angle: distance < 8 ? 0 : Math.atan2(dy, dx) * 180 / Math.PI,
    distance,
    nearby: distance <= NAVIGATION_NEARBY_DISTANCE
  };
}

export function getSafeGuidePoints(
  player: Point,
  target: Point,
  map: CollisionMap = PROTOTYPE_MAP,
  maximumDots = 6
) {
  const { distance } = getNavigationDirection(player, target);
  if (distance < 16) return [];
  const dx = (target.x - player.x) / distance;
  const dy = (target.y - player.y) / distance;
  const points: Point[] = [];
  for (let index = 1; index <= maximumDots; index += 1) {
    const step = Math.min(index * 22, Math.max(distance - 18, 0));
    if (step <= 0) break;
    const point = { x: player.x + dx * step, y: player.y + dy * step };
    if (!canOccupy(point, PLAYER_CONFIG.radius, map)) break;
    points.push(point);
    if (step >= distance - 18) break;
  }
  return points;
}

export function shouldShowGuideDots(player: Point, target: Point) {
  const { distance } = getNavigationDirection(player, target);
  return distance > NAVIGATION_NEARBY_DISTANCE && distance <= NAVIGATION_GUIDE_DOTS_DISTANCE;
}

export function getGuideProgress(player: Point, target: Point) {
  const { distance } = getNavigationDirection(player, target);
  const range = NAVIGATION_GUIDE_DOTS_DISTANCE - NAVIGATION_NEARBY_DISTANCE;
  return Math.round(Math.min(1, Math.max(0, (NAVIGATION_GUIDE_DOTS_DISTANCE - distance) / range)) * 100);
}

export function getCircularMinimapMarker(player: Point, target: Point) {
  const dx = (target.x - player.x) * MINIMAP_WORLD_SCALE;
  const dy = (target.y - player.y) * MINIMAP_WORLD_SCALE;
  const distance = Math.hypot(dx, dy);
  const clamped = distance > MINIMAP_CONTENT_RADIUS;
  const scale = clamped && distance > 0 ? MINIMAP_CONTENT_RADIUS / distance : 1;
  return {
    x: MINIMAP_CENTER + dx * scale,
    y: MINIMAP_CENTER + dy * scale,
    clamped,
    angle: Math.atan2(dy, dx) * 180 / Math.PI
  };
}

export function facingAngle(facing: Facing) {
  return { up: -90, right: 0, down: 90, left: 180 }[facing];
}

export function movementHeadsTowardTarget(direction: Point, player: Point, target: Point) {
  const targetLength = Math.hypot(target.x - player.x, target.y - player.y);
  const inputLength = Math.hypot(direction.x, direction.y);
  if (targetLength === 0 || inputLength === 0) return false;
  return ((target.x - player.x) * direction.x + (target.y - player.y) * direction.y) / (targetLength * inputLength) > 0.25;
}
