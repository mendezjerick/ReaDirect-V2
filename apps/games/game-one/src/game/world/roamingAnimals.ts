import { TILE_SIZE } from "../map/prototypeMap";
import { canOccupy, type CollisionMap, type Point, type Rectangle } from "../physics/collision";

export type RoamingAnimalKind = "rabbit" | "chicken" | "duck";

export type RoamingAnimalDefinition = {
  id: string;
  kind: RoamingAnimalKind;
  spawn: Point;
  bounds: Rectangle;
  speed: number;
  initialDirection: Point;
};

export type RoamingAnimalState = RoamingAnimalDefinition & {
  position: Point;
  direction: Point;
  facing: "left" | "right";
  moving: boolean;
  nextDecisionAt: number;
};

export const ROAMING_ANIMALS: readonly RoamingAnimalDefinition[] = [
  animal("orchard-rabbit-a", "rabbit", 29, 3, 28, 2, 6, 5, 23, { x: 1, y: 0 }),
  animal("orchard-rabbit-b", "rabbit", 32, 6, 28, 2, 6, 5, 20, { x: -1, y: 0 }),
  animal("river-duck", "duck", 37, 12, 34, 11, 6, 4, 18, { x: 1, y: 0 }),
  animal("farm-chicken-a", "chicken", 36, 27, 34, 24, 14, 8, 21, { x: 1, y: 0 }),
  animal("farm-chicken-b", "chicken", 41, 29, 34, 24, 14, 8, 19, { x: -1, y: 0 })
];

const ANIMAL_RADIUS = 7;
const PLAYER_AVOID_DISTANCE = 34;
const DIRECTIONS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 }
];

export function createRoamingAnimalStates(): RoamingAnimalState[] {
  return ROAMING_ANIMALS.map((definition, index) => ({
    ...definition,
    position: { ...definition.spawn },
    direction: { ...definition.initialDirection },
    facing: definition.initialDirection.x < 0 ? "left" : "right",
    moving: true,
    nextDecisionAt: 1.25 + index * 0.3
  }));
}

export function advanceRoamingAnimal(
  state: RoamingAnimalState,
  deltaSeconds: number,
  elapsedSeconds: number,
  map: CollisionMap,
  playerPosition?: Point,
  random = Math.random
): RoamingAnimalState {
  let next = state;
  if (elapsedSeconds >= state.nextDecisionAt) {
    const shouldPause = state.moving && random() < 0.32;
    const direction = shouldPause
      ? state.direction
      : DIRECTIONS[Math.floor(random() * DIRECTIONS.length) % DIRECTIONS.length];
    next = {
      ...state,
      direction,
      facing: direction.x === 0 ? state.facing : direction.x < 0 ? "left" : "right",
      moving: !shouldPause,
      nextDecisionAt: elapsedSeconds + (shouldPause ? 0.55 + random() * 0.9 : 1.4 + random() * 2.2)
    };
  }

  if (playerPosition && pointDistance(next.position, playerPosition) < PLAYER_AVOID_DISTANCE) {
    const away = dominantDirection({
      x: next.position.x - playerPosition.x,
      y: next.position.y - playerPosition.y
    });
    next = {
      ...next,
      direction: away,
      facing: away.x === 0 ? next.facing : away.x < 0 ? "left" : "right",
      moving: true
    };
  }

  if (!next.moving) return next;
  const candidate = {
    x: next.position.x + next.direction.x * next.speed * deltaSeconds,
    y: next.position.y + next.direction.y * next.speed * deltaSeconds
  };
  if (insideBounds(candidate, next.bounds, ANIMAL_RADIUS) && canOccupy(candidate, ANIMAL_RADIUS, map)) {
    return { ...next, position: candidate };
  }

  const turned = DIRECTIONS[(DIRECTIONS.indexOf(next.direction) + 1) % DIRECTIONS.length];
  return {
    ...next,
    direction: turned,
    facing: turned.x === 0 ? next.facing : turned.x < 0 ? "left" : "right",
    nextDecisionAt: Math.min(next.nextDecisionAt, elapsedSeconds + 0.35)
  };
}

function animal(
  id: string,
  kind: RoamingAnimalKind,
  tileX: number,
  tileY: number,
  boundsX: number,
  boundsY: number,
  boundsWidth: number,
  boundsHeight: number,
  speed: number,
  initialDirection: Point
): RoamingAnimalDefinition {
  return {
    id,
    kind,
    spawn: tileCenter(tileX, tileY),
    bounds: {
      id: `${id}-roaming-bounds`,
      x: boundsX * TILE_SIZE,
      y: boundsY * TILE_SIZE,
      width: boundsWidth * TILE_SIZE,
      height: boundsHeight * TILE_SIZE
    },
    speed,
    initialDirection
  };
}

function insideBounds(point: Point, bounds: Rectangle, radius: number) {
  return point.x - radius >= bounds.x
    && point.x + radius <= bounds.x + bounds.width
    && point.y - radius >= bounds.y
    && point.y + radius <= bounds.y + bounds.height;
}

function dominantDirection(vector: Point) {
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
