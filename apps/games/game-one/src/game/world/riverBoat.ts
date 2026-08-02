import type { GameLanguage } from "../localization/language";
import { getTerrainAtPoint, PROTOTYPE_MAP, TILE_SIZE } from "../map/prototypeMap";
import type { Facing } from "../player/playerMovement";
import { canOccupy, type CollisionMap, type Point } from "../physics/collision";

export type RiverBoatProximity = "hidden" | "nearby" | "face-water" | "ready" | "riding";

export type RiverBoatDockId = "south-bank-dock" | "east-channel-dock" | "river-cove-dock" | "east-river-channel-dock";

export type RiverBoatDock = {
  id: RiverBoatDockId;
  landPosition: Point;
  boatPosition: Point;
  requiredFacing: Facing;
  parkedFacing: Facing;
};

export type RiverBoatState = {
  position: Point;
  riding: boolean;
  facing: Facing;
  dockId: RiverBoatDockId;
};

export type RiverBoatLanding = {
  position: Point;
  distance: number;
  dockId: RiverBoatDockId;
};

export type RiverBoatBoardingPoint = {
  position: Point;
  requiredFacing: Facing;
  distance: number;
};

const BOAT_HALF_WIDTH = 28;
const BOAT_HALF_HEIGHT = 12;
const BOARDING_RADIUS = 58;
const NEARBY_RADIUS = 112;
const DOCK_RETURN_RADIUS = 44;
const LEARNER_RADIUS = 12;
const LANDING_SEARCH_RADIUS = TILE_SIZE * 18;
const LANDING_SAMPLE_STEP = TILE_SIZE / 4;
const defaultBankPointCache = new Map<string, RiverBoatLanding | null>();

export const RIVER_BOAT = {
  id: "east-river-boat",
  assetKey: "river-boat",
  labels: {
    en: { board: "Ride Boat", leave: "Get Off Boat" },
    fil: { board: "Sumakay sa Bangka", leave: "Bumaba sa Bangka" }
  } satisfies Record<GameLanguage, { board: string; leave: string }>,
  docks: [
    {
      id: "south-bank-dock",
      landPosition: tileCenter(38, 13),
      boatPosition: tileCenter(38, 9),
      requiredFacing: "up",
      parkedFacing: "right"
    },
    {
      id: "east-channel-dock",
      landPosition: tileCenter(47, 20),
      boatPosition: tileCenter(51, 20),
      requiredFacing: "right",
      parkedFacing: "down"
    },
    {
      id: "river-cove-dock",
      landPosition: tileCenter(46, 48),
      boatPosition: tileCenter(50, 47),
      requiredFacing: "right",
      parkedFacing: "down"
    },
    {
      id: "east-river-channel-dock",
      landPosition: tileCenter(54, 52),
      boatPosition: tileCenter(57, 52),
      requiredFacing: "right",
      parkedFacing: "down"
    }
  ] satisfies readonly RiverBoatDock[],
  speed: 104
} as const;

export function createRiverBoatState(): RiverBoatState {
  const dock = getRiverBoatDock("south-bank-dock");
  return {
    position: { ...dock.boatPosition },
    riding: false,
    facing: dock.parkedFacing,
    dockId: dock.id
  };
}

export function getRiverBoatProximity(
  playerPosition: Point,
  facing: Facing,
  state: RiverBoatState,
  blocked = false
): RiverBoatProximity {
  if (blocked) return "hidden";
  if (state.riding) {
    return getAvailableRiverBoatDock(state) ? "ready" : "riding";
  }

  const boardingPoint = getRiverBoatBoardingPoint(state, playerPosition);
  if (!boardingPoint) return "hidden";

  const distance = boardingPoint.distance;
  if (distance > NEARBY_RADIUS) return "hidden";
  if (distance > BOARDING_RADIUS) return "nearby";
  return facing === boardingPoint.requiredFacing ? "ready" : "face-water";
}

export function moveRiverBoat(
  state: RiverBoatState,
  input: Point,
  deltaSeconds: number
): RiverBoatState {
  if (!state.riding) return state;
  const length = Math.hypot(input.x, input.y);
  if (length === 0) return state;
  const direction = length > 1
    ? { x: input.x / length, y: input.y / length }
    : input;
  const candidate = {
    x: state.position.x + direction.x * RIVER_BOAT.speed * deltaSeconds,
    y: state.position.y + direction.y * RIVER_BOAT.speed * deltaSeconds
  };
  const facing = facingForDirection(direction, state.facing);
  if (isRiverBoatPositionAllowed(candidate, facing)) {
    return { ...state, position: candidate, facing };
  }

  const horizontalFacing = direction.x < 0 ? "left" : "right";
  const horizontalCandidate = {
    x: candidate.x,
    y: state.position.y
  };
  if (direction.x !== 0 && isRiverBoatPositionAllowed(horizontalCandidate, horizontalFacing)) {
    return { ...state, position: horizontalCandidate, facing: horizontalFacing };
  }

  const verticalFacing = direction.y < 0 ? "up" : "down";
  const verticalCandidate = {
    x: state.position.x,
    y: candidate.y
  };
  if (direction.y !== 0 && isRiverBoatPositionAllowed(verticalCandidate, verticalFacing)) {
    return { ...state, position: verticalCandidate, facing: verticalFacing };
  }

  return state;
}

export function boardRiverBoat(state: RiverBoatState): RiverBoatState {
  return state.riding ? state : { ...state, riding: true };
}

export function leaveRiverBoat(state: RiverBoatState): RiverBoatState {
  const landing = getNearestRiverBoatLanding(state);
  return landing
    ? { ...state, riding: false, dockId: landing.dockId }
    : state;
}

export function getNearestRiverBoatLanding(
  state: RiverBoatState,
  map: CollisionMap = PROTOTYPE_MAP
): RiverBoatLanding | null {
  if (!state.riding) return null;

  const dock = getAvailableRiverBoatDock(state);
  if (dock && canOccupy(dock.landPosition, LEARNER_RADIUS, map)) {
    return {
      position: { ...dock.landPosition },
      distance: pointDistance(state.position, dock.boatPosition),
      dockId: dock.id
    };
  }

  return getNearestWalkableBankPoint(state.position, map, state.dockId);
}

export function getRiverBoatBoardingPoint(
  state: RiverBoatState,
  playerPosition: Point,
  map: CollisionMap = PROTOTYPE_MAP
): RiverBoatBoardingPoint | null {
  if (state.riding) return null;

  const dock = getRiverBoatDock(state.dockId);
  const nearbyBank = getNearestWalkableBankPoint(state.position, map);
  const candidates = [
    {
      position: dock.landPosition,
      requiredFacing: dock.requiredFacing
    },
    nearbyBank
      ? {
          position: nearbyBank.position,
          requiredFacing: facingTowardBoat(nearbyBank.position, state.position)
        }
      : null
  ].filter((candidate): candidate is { position: Point; requiredFacing: Facing } => candidate !== null);
  const boardingPoint = candidates.sort(
    (a, b) => pointDistance(playerPosition, a.position) - pointDistance(playerPosition, b.position)
  )[0];
  if (!boardingPoint) return null;

  return {
    ...boardingPoint,
    distance: pointDistance(playerPosition, boardingPoint.position)
  };
}

function getNearestWalkableBankPoint(
  boatPosition: Point,
  map: CollisionMap = PROTOTYPE_MAP,
  dockId: RiverBoatDockId = "south-bank-dock"
): RiverBoatLanding | null {
  const cacheKey = `${Math.round(boatPosition.x)}:${Math.round(boatPosition.y)}`;
  if (map === PROTOTYPE_MAP && defaultBankPointCache.has(cacheKey)) {
    return defaultBankPointCache.get(cacheKey) ?? null;
  }

  let nearest: RiverBoatLanding | null = null;
  for (let offsetY = -LANDING_SEARCH_RADIUS; offsetY <= LANDING_SEARCH_RADIUS; offsetY += LANDING_SAMPLE_STEP) {
    for (let offsetX = -LANDING_SEARCH_RADIUS; offsetX <= LANDING_SEARCH_RADIUS; offsetX += LANDING_SAMPLE_STEP) {
      const position = {
        x: boatPosition.x + offsetX,
        y: boatPosition.y + offsetY
      };
      if (getTerrainAtPoint(position).id === "water" || !canOccupy(position, LEARNER_RADIUS, map)) continue;

      const distance = Math.hypot(offsetX, offsetY);
      if (!nearest || distance < nearest.distance) {
        nearest = {
          position,
          distance,
          dockId
        };
      }
    }
  }

  if (map === PROTOTYPE_MAP) defaultBankPointCache.set(cacheKey, nearest);
  return nearest;
}

export function getAvailableRiverBoatDock(state: RiverBoatState) {
  if (!state.riding) return null;
  return RIVER_BOAT.docks
    .map((dock) => ({
      dock,
      distance: pointDistance(state.position, dock.boatPosition)
    }))
    .filter(({ distance }) => distance <= DOCK_RETURN_RADIUS)
    .sort((a, b) => a.distance - b.distance)[0]?.dock ?? null;
}

export function getRiverBoatDock(dockId: RiverBoatDockId) {
  return RIVER_BOAT.docks.find((dock) => dock.id === dockId)!;
}

export function isRiverBoatPositionAllowed(position: Point, facing: Facing) {
  const horizontal = facing === "left" || facing === "right";
  const halfWidth = horizontal ? BOAT_HALF_WIDTH : BOAT_HALF_HEIGHT;
  const halfHeight = horizontal ? BOAT_HALF_HEIGHT : BOAT_HALF_WIDTH;
  const sampleX = Math.max(halfWidth - 2, 0);
  const sampleY = Math.max(halfHeight - 2, 0);
  const samples = [
    position,
    { x: position.x - sampleX, y: position.y - sampleY },
    { x: position.x + sampleX, y: position.y - sampleY },
    { x: position.x - sampleX, y: position.y + sampleY },
    { x: position.x + sampleX, y: position.y + sampleY },
    { x: position.x - sampleX, y: position.y },
    { x: position.x + sampleX, y: position.y },
    { x: position.x, y: position.y - sampleY },
    { x: position.x, y: position.y + sampleY }
  ];
  return samples.every((point) => getTerrainAtPoint(point).id === "water");
}

function tileCenter(tileX: number, tileY: number) {
  return { x: (tileX + 0.5) * TILE_SIZE, y: (tileY + 0.5) * TILE_SIZE };
}

function pointDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function facingTowardBoat(bankPosition: Point, boatPosition: Point) {
  return facingForDirection(
    { x: boatPosition.x - bankPosition.x, y: boatPosition.y - bankPosition.y },
    "up"
  );
}

function facingForDirection(direction: Point, fallback: Facing): Facing {
  if (Math.abs(direction.x) >= Math.abs(direction.y) && direction.x !== 0) {
    return direction.x < 0 ? "left" : "right";
  }
  if (direction.y !== 0) return direction.y < 0 ? "up" : "down";
  return fallback;
}
