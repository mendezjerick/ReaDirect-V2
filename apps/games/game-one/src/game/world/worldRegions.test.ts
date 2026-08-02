import { describe, expect, it } from "vitest";
import { TILE_SIZE } from "../map/prototypeMap";
import { AVAILABLE_WORLD_REGIONS, getWorldRegionAtPoint, getWorldRegionLabel, WORLD_REGIONS } from "./worldRegions";

describe("world regions", () => {
  it("identifies the connected village, river, and forest in priority order", () => {
    expect(getWorldRegionAtPoint({ x: 20 * TILE_SIZE, y: 22 * TILE_SIZE }).id).toBe("village");
    expect(getWorldRegionAtPoint({ x: 20 * TILE_SIZE, y: 9 * TILE_SIZE }).id).toBe("river");
    expect(getWorldRegionAtPoint({ x: 51 * TILE_SIZE, y: 25 * TILE_SIZE }).id).toBe("river");
    expect(getWorldRegionAtPoint({ x: 57 * TILE_SIZE, y: 24 * TILE_SIZE }).id).toBe("village");
    expect(getWorldRegionAtPoint({ x: 20 * TILE_SIZE, y: 4 * TILE_SIZE }).id).toBe("forest");
  });

  it("activates the bounded farm while keeping later locations unavailable", () => {
    expect(AVAILABLE_WORLD_REGIONS.map(({ id }) => id)).toEqual(["river", "forest", "farm", "village"]);
    expect(getWorldRegionAtPoint({ x: 40 * TILE_SIZE, y: 27 * TILE_SIZE }).id).toBe("farm");
    expect(WORLD_REGIONS.filter(({ available }) => !available).map(({ id }) => id)).toEqual(["jungle", "waterfall"]);
  });

  it("uses stable English and Filipino labels", () => {
    expect(getWorldRegionLabel("village", "en")).toBe("Village");
    expect(getWorldRegionLabel("village", "fil")).toBe("Nayon");
    expect(getWorldRegionLabel("river", "fil")).toBe("Ilog");
    expect(getWorldRegionLabel("farm", "fil")).toBe("Gubat sa Bukid");
  });
});
