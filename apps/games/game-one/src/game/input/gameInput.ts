import type { Point } from "../physics/collision";

export type Direction = "up" | "down" | "left" | "right";

const KEY_TO_DIRECTION: Record<string, Direction | undefined> = {
  ArrowUp: "up",
  KeyW: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  KeyS: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  KeyA: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  KeyD: "right",
  d: "right",
  D: "right"
};

export type GameInputState = {
  setEnabled: (enabled: boolean) => void;
  setKeyboardKey: (key: string, active: boolean) => boolean;
  setTouchDirection: (direction: Direction, active: boolean) => void;
  setAnalogVector: (vector: Point) => void;
  releaseAll: () => void;
  getVector: () => Point;
};

export function createGameInputState(): GameInputState {
  const keyboardDirections = new Set<Direction>();
  const touchDirections = new Set<Direction>();
  let analogVector: Point = { x: 0, y: 0 };
  let enabled = true;

  return {
    setEnabled: (nextEnabled) => {
      enabled = nextEnabled;
      if (!enabled) {
        keyboardDirections.clear();
        touchDirections.clear();
        analogVector = { x: 0, y: 0 };
      }
    },
    setKeyboardKey: (key, active) => {
      const direction = KEY_TO_DIRECTION[key];
      if (!direction || !enabled) {
        return false;
      }

      setDirection(keyboardDirections, direction, active);
      return true;
    },
    setTouchDirection: (direction, active) => {
      if (!enabled) {
        touchDirections.clear();
        return;
      }

      setDirection(touchDirections, direction, active);
    },
    setAnalogVector: (vector) => {
      analogVector = enabled ? clampVector(vector) : { x: 0, y: 0 };
    },
    releaseAll: () => {
      keyboardDirections.clear();
      touchDirections.clear();
      analogVector = { x: 0, y: 0 };
    },
    getVector: () => {
      const digital = resolveDirections(keyboardDirections, touchDirections);
      return digital.x !== 0 || digital.y !== 0 ? normalizeVector(digital) : analogVector;
    }
  };
}

export function directionForKey(key: string): Direction | null {
  return KEY_TO_DIRECTION[key] ?? null;
}

export function resolveDirections(...directionSets: ReadonlySet<Direction>[]): Point {
  const active = new Set(directionSets.flatMap((directionSet) => Array.from(directionSet)));
  const x = Number(active.has("right")) - Number(active.has("left"));
  const y = Number(active.has("down")) - Number(active.has("up"));

  return { x, y };
}

export function normalizeVector(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

export function clampVector(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 1) return { x: vector.x, y: vector.y };
  return normalizeVector(vector);
}

export function normalizeJoystickVector(vector: Point, deadZone = 0.16): Point {
  const clamped = clampVector(vector);
  const length = Math.hypot(clamped.x, clamped.y);
  if (length <= deadZone) return { x: 0, y: 0 };
  const scaledLength = Math.min(1, (length - deadZone) / (1 - deadZone));
  return {
    x: (clamped.x / length) * scaledLength,
    y: (clamped.y / length) * scaledLength
  };
}

function setDirection(directions: Set<Direction>, direction: Direction, active: boolean) {
  if (active) {
    directions.add(direction);
  } else {
    directions.delete(direction);
  }
}
