import { describe, expect, it } from "vitest";
import { createGameInputState, directionForKey, normalizeJoystickVector, normalizeVector, resolveDirections } from "./gameInput";

describe("game input", () => {
  it("resolves opposing directions safely", () => {
    expect(resolveDirections(new Set(["left", "right"]))).toEqual({ x: 0, y: 0 });
    expect(resolveDirections(new Set(["up"]), new Set(["right"]))).toEqual({ x: 1, y: -1 });
  });

  it("normalizes diagonal movement", () => {
    const normalized = normalizeVector({ x: 1, y: 1 });

    expect(Math.hypot(normalized.x, normalized.y)).toBeCloseTo(1);
  });

  it("handles keyboard and touch directions through one abstraction", () => {
    const input = createGameInputState();

    expect(input.setKeyboardKey("KeyW", true)).toBe(true);
    input.setTouchDirection("right", true);

    expect(input.getVector().x).toBeCloseTo(Math.SQRT1_2);
    expect(input.getVector().y).toBeCloseTo(-Math.SQRT1_2);
  });

  it.each([
    ["KeyW", "up"],
    ["ArrowUp", "up"],
    ["KeyA", "left"],
    ["ArrowLeft", "left"],
    ["KeyS", "down"],
    ["ArrowDown", "down"],
    ["KeyD", "right"],
    ["ArrowRight", "right"]
  ])("maps %s to %s", (key, direction) => {
    expect(directionForKey(key)).toBe(direction);
  });

  it("uses a bounded analog vector when no digital direction is active", () => {
    const input = createGameInputState();
    input.setAnalogVector({ x: 2, y: 2 });
    expect(Math.hypot(input.getVector().x, input.getVector().y)).toBeCloseTo(1);

    input.setKeyboardKey("KeyA", true);
    expect(input.getVector()).toEqual({ x: -1, y: 0 });
  });

  it("applies a joystick dead zone and preserves diagonal direction", () => {
    expect(normalizeJoystickVector({ x: 0.05, y: -0.05 })).toEqual({ x: 0, y: 0 });
    const diagonal = normalizeJoystickVector({ x: 1, y: -1 });
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2);
    expect(diagonal.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it("clears and ignores input while disabled", () => {
    const input = createGameInputState();

    input.setTouchDirection("up", true);
    input.setEnabled(false);

    expect(input.getVector()).toEqual({ x: 0, y: 0 });
    expect(input.setKeyboardKey("ArrowDown", true)).toBe(false);
  });
});
