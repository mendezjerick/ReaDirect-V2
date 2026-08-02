import { TILE_SIZE } from "../map/prototypeMap";
import type { Facing } from "../player/playerMovement";
import { canOccupy, type CollisionMap, type Point, type Rectangle } from "../physics/collision";
import { getNpc } from "../content/npcs";

export const AMBIENT_WALKER_IDS = [
  "miss-yuuri",
  "mang-panda",
  "mr-kikushibu"
] as const;

export type AmbientWalkerId = (typeof AMBIENT_WALKER_IDS)[number];

export type AmbientWalkerDefinition = {
  id: AmbientWalkerId;
  displayName: string;
  assetKey: string;
  spawn: Point;
  bounds: Rectangle;
  speed: number;
  initialDirection: Point;
};

export type AmbientWalkerState = AmbientWalkerDefinition & {
  position: Point;
  direction: Point;
  facing: Facing;
  moving: boolean;
  nextDecisionAt: number;
};

export const AMBIENT_WALKER_RADIUS = 7;

export const AMBIENT_WALKERS: readonly AmbientWalkerDefinition[] = [
  walker(
    "miss-yuuri",
    20,
    22,
    10,
    6,
    28,
    { x: 1, y: 0 }
  ),
  walker(
    "mang-panda",
    20,
    27,
    8,
    6,
    23,
    { x: -1, y: 0 }
  ),
  walker(
    "mr-kikushibu",
    28,
    3,
    7,
    5,
    26,
    { x: 0, y: 1 }
  )
];

const PLAYER_AVOID_DISTANCE = 34;
const DIRECTIONS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 }
];

export function createAmbientWalkerStates(): AmbientWalkerState[] {
  return AMBIENT_WALKERS.map((definition, index) => ({
    ...definition,
    position: { ...definition.spawn },
    direction: { ...definition.initialDirection },
    facing: facingForDirection(definition.initialDirection, "down"),
    moving: true,
    nextDecisionAt: 1.1 + index * 0.45
  }));
}

export function advanceAmbientWalker(
  state: AmbientWalkerState,
  deltaSeconds: number,
  elapsedSeconds: number,
  map: CollisionMap,
  playerPosition?: Point,
  random = Math.random
): AmbientWalkerState {
  let next = state;
  if (elapsedSeconds >= state.nextDecisionAt) {
    const shouldPause = state.moving && random() < 0.26;
    const direction = shouldPause
      ? state.direction
      : DIRECTIONS[Math.floor(random() * DIRECTIONS.length) % DIRECTIONS.length];
    next = {
      ...state,
      direction,
      facing: facingForDirection(direction, state.facing),
      moving: !shouldPause,
      nextDecisionAt: elapsedSeconds + (shouldPause ? 0.7 + random() : 1.6 + random() * 2.1)
    };
  }

  if (playerPosition && pointDistance(next.position, playerPosition) < PLAYER_AVOID_DISTANCE) {
    const direction = dominantDirection({
      x: next.position.x - playerPosition.x,
      y: next.position.y - playerPosition.y
    });
    next = {
      ...next,
      direction,
      facing: facingForDirection(direction, next.facing),
      moving: true
    };
  }

  if (!next.moving) return next;

  const candidate = {
    x: next.position.x + next.direction.x * next.speed * deltaSeconds,
    y: next.position.y + next.direction.y * next.speed * deltaSeconds
  };
  if (insideBounds(candidate, next.bounds) && canOccupy(candidate, AMBIENT_WALKER_RADIUS, map)) {
    return { ...next, position: candidate };
  }

  const currentIndex = Math.max(DIRECTIONS.indexOf(next.direction), 0);
  const direction = DIRECTIONS[(currentIndex + 1) % DIRECTIONS.length];
  return {
    ...next,
    direction,
    facing: facingForDirection(direction, next.facing),
    nextDecisionAt: Math.min(next.nextDecisionAt, elapsedSeconds + 0.3)
  };
}

function walker(
  id: AmbientWalkerId,
  boundsX: number,
  boundsY: number,
  boundsWidth: number,
  boundsHeight: number,
  speed: number,
  initialDirection: Point
): AmbientWalkerDefinition {
  const npc = getNpc(id);
  return {
    id,
    displayName: npc.displayName,
    assetKey: npc.assetKey,
    spawn: { ...npc.position },
    bounds: {
      id: `${id}-walking-bounds`,
      x: boundsX * TILE_SIZE,
      y: boundsY * TILE_SIZE,
      width: boundsWidth * TILE_SIZE,
      height: boundsHeight * TILE_SIZE
    },
    speed,
    initialDirection
  };
}

function facingForDirection(direction: Point, fallback: Facing): Facing {
  if (direction.x < 0) return "left";
  if (direction.x > 0) return "right";
  if (direction.y < 0) return "up";
  if (direction.y > 0) return "down";
  return fallback;
}

function insideBounds(point: Point, bounds: Rectangle) {
  return point.x - AMBIENT_WALKER_RADIUS >= bounds.x
    && point.x + AMBIENT_WALKER_RADIUS <= bounds.x + bounds.width
    && point.y - AMBIENT_WALKER_RADIUS >= bounds.y
    && point.y + AMBIENT_WALKER_RADIUS <= bounds.y + bounds.height;
}

function dominantDirection(vector: Point): Point {
  if (Math.abs(vector.x) >= Math.abs(vector.y)) {
    return { x: vector.x < 0 ? -1 : 1, y: 0 };
  }
  return { x: 0, y: vector.y < 0 ? -1 : 1 };
}

function pointDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function tileCenter(tileX: number, tileY: number) {
  return { x: (tileX + 0.5) * TILE_SIZE, y: (tileY + 0.5) * TILE_SIZE };
}
