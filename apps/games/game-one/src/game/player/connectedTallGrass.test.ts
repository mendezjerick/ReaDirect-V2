import { describe, expect, it } from "vitest";
import { getTerrainAtPoint, MAP_LANDMARKS, TILE_SIZE } from "../map/prototypeMap";
import {
  createConnectedTallGrassTileset,
  getTallGrassFrame,
  getTallGrassMotion,
  getTallGrassTileKey,
  getTouchingTallGrassPatches,
  GRASS_CONTACT_POOL_SIZE,
  GRASS_REACTION_SECONDS,
  isTallGrassTile,
  TALL_GRASS_ATLAS_COLUMNS,
  TALL_GRASS_SOURCE_TILE_SIZE
} from "./connectedTallGrass";

describe("connected tall grass", () => {
  it("forms dense permanent fields with center, edge, and corner autotiles", () => {
    expect(isTallGrassTile(6, 5)).toBe(true);
    expect(isTallGrassTile(7, 5)).toBe(true);
    expect(getTallGrassFrame(6, 5)).toBeLessThanOrEqual(2);
    expect(getTallGrassFrame(1, 2)).toBe(7);
    expect(getTallGrassFrame(9, 2)).toBe(8);
  });

  it("keeps ordinary ground and paths outside the tall-grass field", () => {
    expect(isTallGrassTile(18, 24)).toBe(false);
    expect(getTallGrassTileKey(MAP_LANDMARKS.spawn)).toBeNull();
    expect(getTallGrassTileKey(tileCenter(6, 5))).toBe("6:5");
  });

  it("keeps tall grass walkable and on the grass footstep surface", () => {
    expect(getTerrainAtPoint(tileCenter(6, 5))).toEqual({
      id: "grass",
      walkable: true,
      footstep: "grass"
    });
  });

  it("checks only tiles touching the player and caps the overlay pool", () => {
    const patches = getTouchingTallGrassPatches(tileCenter(6, 5));

    expect(patches).toHaveLength(1);
    expect(patches[0].key).toBe("6:5");
    expect(patches.length).toBeLessThanOrEqual(GRASS_CONTACT_POOL_SIZE);

    const boundaryPatches = getTouchingTallGrassPatches({
      x: 7 * TILE_SIZE - 4,
      y: 5.5 * TILE_SIZE
    });
    expect(boundaryPatches.map(({ key }) => key)).toEqual(expect.arrayContaining(["6:5", "7:5"]));
  });

  it("bends briefly after contact and settles to a subtle idle sway", () => {
    const patch = getTouchingTallGrassPatches(tileCenter(6, 5))[0];
    const active = getTallGrassMotion(patch, 1, 1 + GRASS_REACTION_SECONDS, false);
    const settled = getTallGrassMotion(patch, 2, 1 + GRASS_REACTION_SECONDS, false);

    expect(Math.abs(active.angle)).toBeGreaterThan(0);
    expect(settled.angle).toBe(0);
    expect(Math.abs(settled.swayX)).toBeLessThanOrEqual(0.22);
    expect(getTallGrassMotion(patch, 1, 2, true)).toEqual({ swayX: 0, angle: 0 });
  });

  it("creates one original pixel atlas containing every autotile frame", () => {
    const atlas = createConnectedTallGrassTileset();
    expect(atlas.width).toBe(TALL_GRASS_SOURCE_TILE_SIZE * TALL_GRASS_ATLAS_COLUMNS);
    expect(atlas.height).toBe(TALL_GRASS_SOURCE_TILE_SIZE);
  });
});

function tileCenter(tileX: number, tileY: number) {
  return { x: (tileX + 0.5) * TILE_SIZE, y: (tileY + 0.5) * TILE_SIZE };
}
