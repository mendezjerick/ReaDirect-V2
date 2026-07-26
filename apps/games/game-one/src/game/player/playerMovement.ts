import type { Point } from "../physics/collision";
import { canOccupy, clampPointToWorld, type CollisionMap } from "../physics/collision";

export const PLAYER_CONFIG = {
  radius: 12,
  speedPixelsPerSecond: 160
} as const;

export function movePlayer({
  position,
  input,
  deltaSeconds,
  map,
  radius = PLAYER_CONFIG.radius,
  speed = PLAYER_CONFIG.speedPixelsPerSecond
}: {
  position: Point;
  input: Point;
  deltaSeconds: number;
  map: CollisionMap;
  radius?: number;
  speed?: number;
}) {
  const step = {
    x: input.x * speed * deltaSeconds,
    y: input.y * speed * deltaSeconds
  };
  let next = clampPointToWorld({ x: position.x + step.x, y: position.y }, radius, map);

  if (!canOccupy(next, radius, map)) {
    next = position;
  }

  const yAttempt = clampPointToWorld({ x: next.x, y: position.y + step.y }, radius, map);
  if (canOccupy(yAttempt, radius, map)) {
    next = yAttempt;
  }

  return next;
}

export function getFacingFromInput(input: Point, previousFacing: Facing): Facing {
  if (input.y < 0) {
    return "up";
  }
  if (input.y > 0) {
    return "down";
  }
  if (input.x < 0) {
    return "left";
  }
  if (input.x > 0) {
    return "right";
  }

  return previousFacing;
}

export type Facing = "up" | "down" | "left" | "right";

export function getBaseFrameForFacing(facing: Facing) {
  return {
    down: 0,
    up: 1,
    left: 2,
    right: 3
  }[facing];
}

export function getWalkFrameForFacing(facing: Facing, animationStep: number) {
  const clampedStep = Math.max(0, Math.floor(animationStep)) % 4;
  return getBaseFrameForFacing(facing) + clampedStep * 4;
}
