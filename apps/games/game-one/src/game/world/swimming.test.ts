import { describe, expect, it } from "vitest";
import {
  getTerrainAtPoint,
  isSwimmableRiverPosition,
  PROTOTYPE_MAP,
  TILE_SIZE
} from "../map/prototypeMap";
import { canOccupy } from "../physics/collision";
import {
  getNearestSwimmableRiverPosition,
  getNearestSwimExitPoint,
  getSwimEntryPoint
} from "./swimming";

describe("swimming entry", () => {
  it("finds the west river when the player faces its bank", () => {
    const entry = getSwimEntryPoint({ x: 10.5 * TILE_SIZE, y: 12.5 * TILE_SIZE }, "up");

    expect(entry).not.toBeNull();
    expect(entry!.y).toBeLessThan(12 * TILE_SIZE);
    expect(isSwimmableRiverPosition(entry!, 12)).toBe(true);
  });

  it("does not expose an entry from the opposite direction", () => {
    expect(getSwimEntryPoint({ x: 10.5 * TILE_SIZE, y: 12.5 * TILE_SIZE }, "down")).toBeNull();
  });

  it("finds the nearest valid land without placing the swimmer inside an obstacle", () => {
    const exit = getNearestSwimExitPoint(
      { x: 10.5 * TILE_SIZE, y: 9.5 * TILE_SIZE },
      PROTOTYPE_MAP
    );

    expect(exit).not.toBeNull();
    expect(getTerrainAtPoint(exit!).id).not.toBe("water");
    expect(canOccupy(exit!, 12, PROTOTYPE_MAP)).toBe(true);
  });

  it("recovers an edge swimmer into water that fully fits the player", () => {
    const recovered = getNearestSwimmableRiverPosition({ x: 28.9 * TILE_SIZE, y: 9.5 * TILE_SIZE }, 12);

    expect(recovered).not.toBeNull();
    expect(isSwimmableRiverPosition(recovered!, 12)).toBe(true);
  });
});
