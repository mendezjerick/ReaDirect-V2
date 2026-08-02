import { describe, expect, it } from "vitest";
import {
  VILLAGE_DECOR_FRAMES,
  VILLAGE_DECOR_FRAME,
  VILLAGE_DECOR_TILE_SIZE
} from "./generatedVillageDecorAssets";

describe("generated village decor assets", () => {
  it("keeps one stable frame for every village decoration", () => {
    expect(Object.values(VILLAGE_DECOR_FRAME)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(VILLAGE_DECOR_FRAMES).toBe(7);
  });

  it("defines one compact horizontal 16-pixel sprite sheet", () => {
    expect(VILLAGE_DECOR_TILE_SIZE * VILLAGE_DECOR_FRAMES).toBe(112);
    expect(VILLAGE_DECOR_TILE_SIZE).toBe(16);
  });
});
