import { describe, expect, it } from "vitest";
import { canOccupy, createCollisionLookup, type Rectangle } from "./collision";

describe("spatial collision lookup", () => {
  const obstacles: Rectangle[] = [
    { id: "near", x: 64, y: 64, width: 32, height: 32 },
    { id: "far", x: 1024, y: 1024, width: 32, height: 32 }
  ];

  it("returns only obstacles in cells touching the player footprint", () => {
    const lookup = createCollisionLookup(obstacles, 64);
    expect(lookup({ x: 80, y: 80 }, 12).map(({ id }) => id)).toEqual(["near"]);
    expect(lookup({ x: 400, y: 400 }, 12)).toEqual([]);
  });

  it("preserves collision behavior when attached to a map", () => {
    const map = { columns: 40, rows: 40, tileSize: 32, collision: obstacles, getNearbyCollision: createCollisionLookup(obstacles, 64) };
    expect(canOccupy({ x: 80, y: 80 }, 12, map)).toBe(false);
    expect(canOccupy({ x: 400, y: 400 }, 12, map)).toBe(true);
  });
});
