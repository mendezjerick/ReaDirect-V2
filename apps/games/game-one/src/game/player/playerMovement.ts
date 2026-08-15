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
  speed = PLAYER_CONFIG.speedPixelsPerSecond,
  isPositionAllowed
}: {
  position: Point;
  input: Point;
  deltaSeconds: number;
  map: CollisionMap;
  radius?: number;
  speed?: number;
  isPositionAllowed?: (position: Point) => boolean;
}) {
  const canMoveTo = (point: Point) => canOccupy(point, radius, map) && (isPositionAllowed?.(point) ?? true);
  const step = {
    x: input.x * speed * deltaSeconds,
    y: input.y * speed * deltaSeconds
  };
  let next = clampPointToWorld({ x: position.x + step.x, y: position.y }, radius, map);

  if (!canMoveTo(next)) {
    next = position;
  }

  const yAttempt = clampPointToWorld({ x: next.x, y: position.y + step.y }, radius, map);
  if (canMoveTo(yAttempt)) {
    next = yAttempt;
  }

  return next;
}

export function getFacingFromInput(input: Point, previousFacing: Facing): Facing {
  const horizontal = Math.abs(input.x);
  const vertical = Math.abs(input.y);

  // Analog sticks naturally include a small amount of vertical drift. Choose
  // the dominant axis so a mostly-right or mostly-left gesture keeps its side-facing sprite.
  if (horizontal > vertical) return input.x < 0 ? "left" : "right";
  if (vertical > 0) return input.y < 0 ? "up" : "down";

  return previousFacing;
}

export type Facing = "up" | "down" | "left" | "right";
export type SpriteFacingLayout = "standard" | "yato" | "yato-mirror-left" | "row-walk" | "row-walk-four-way" | "row-three-dir";

export function getBaseFrameForFacing(facing: Facing, layout: SpriteFacingLayout = "standard") {
  const frames = layout === "yato"
    ? { down: 0, up: 1, left: 3, right: 2 }
    : layout === "yato-mirror-left"
      ? { down: 0, up: 1, left: 2, right: 2 }  // left reuses right column; sprite is flipped in getSpriteFlipXForFacing
    : layout === "row-walk"
      ? { down: 0, up: 8, left: 4, right: 4 }
      : layout === "row-walk-four-way"
        ? { down: 0, up: 8, left: 12, right: 4 }
      : layout === "row-three-dir"
        ? { down: 0, up: 4, left: 8, right: 8 }  // 3 direction rows: down, up, right; left mirrors right
      : { down: 0, up: 1, left: 2, right: 3 };

  return frames[facing];
}

export function getWalkFrameForFacing(
  facing: Facing,
  animationStep: number,
  layout: SpriteFacingLayout = "standard"
) {
  const clampedStep = Math.max(0, Math.floor(animationStep)) % 4;
  if (layout === "row-walk" || layout === "row-walk-four-way" || layout === "row-three-dir") {
    // Row-based layouts: walk steps are consecutive within each direction row.
    return getBaseFrameForFacing(facing, layout) + clampedStep;
  }
  if (layout === "yato-mirror-left") {
    // Skip the idle row (row 0) and ping-pong through walk rows 1→2→3→2.
    // This ensures the walk cycle is symmetric: step1, mid, step3, mid, repeat.
    // Both legs appear to alternate rather than the same leg always leading.
    const rowOffset = [4, 8, 12, 8][clampedStep];
    return getBaseFrameForFacing(facing, layout) + rowOffset;
  }
  // yato, standard: animation steps go down the column
  return getBaseFrameForFacing(facing, layout) + clampedStep * 4;
}

export function getSwimmingFrameForFacing(
  facing: Facing,
  animationSeconds: number,
  layout: SpriteFacingLayout = "standard",
  moving = true
) {
  if (!moving) return getBaseFrameForFacing(facing, layout);
  return getWalkFrameForFacing(facing, Math.floor(animationSeconds * 5), layout);
}

export function getSwimmingBobOffset(animationSeconds: number, reducedMotion = false) {
  return reducedMotion ? 0 : Math.sin(animationSeconds * 6) * 2;
}

export function getSwimmingStrokeAngle(
  facing: Facing,
  animationSeconds: number,
  moving: boolean,
  reducedMotion = false
) {
  if (reducedMotion) return 0;
  const amplitude = moving
    ? (facing === "left" || facing === "right" ? 4 : 2.5)
    : 0.8;
  return Math.sin(animationSeconds * (moving ? 10 : 4)) * amplitude;
}

export function getSpriteFlipXForFacing(facing: Facing, layout: SpriteFacingLayout = "standard") {
  // row-walk, row-three-dir, and yato-mirror-left have no dedicated left frames
  // — they reuse right-facing frames and mirror horizontally.
  return (layout === "row-walk" || layout === "row-three-dir" || layout === "yato-mirror-left") && facing === "left";
}

export function getBoatRidingFrame(
  facing: Facing,
  animationSeconds: number,
  moving: boolean,
  layout: SpriteFacingLayout = "standard"
) {
  if (!moving) return getBaseFrameForFacing(facing, layout);

  // The learner's walk cycle becomes a slower rowing rhythm while aboard.
  return getWalkFrameForFacing(facing, Math.floor(animationSeconds * 6), layout);
}
