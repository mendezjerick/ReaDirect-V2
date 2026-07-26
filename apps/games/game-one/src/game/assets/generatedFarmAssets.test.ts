import { describe, expect, it } from "vitest";
import {
  createFarmFenceLayer,
  createFarmFenceTileset,
  createMangYatoSpriteSheet,
  FARM_FENCE_FRAMES,
  GENERATED_CHARACTER_FRAMES,
  GENERATED_TILE_SIZE
} from "./generatedFarmAssets";

describe("original generated farm assets", () => {
  it("builds one compact idle sheet for Mang Yato", () => {
    const sheet = createMangYatoSpriteSheet();
    expect(sheet.width).toBe(GENERATED_TILE_SIZE * GENERATED_CHARACTER_FRAMES);
    expect(sheet.height).toBe(GENERATED_TILE_SIZE);
  });

  it("builds reusable fence pieces and one composited farm boundary", () => {
    const tileset = createFarmFenceTileset();
    const boundary = createFarmFenceLayer();
    expect(tileset.width).toBe(GENERATED_TILE_SIZE * FARM_FENCE_FRAMES);
    expect(boundary.width).toBe(GENERATED_TILE_SIZE * 16);
    expect(boundary.height).toBe(GENERATED_TILE_SIZE * 10);
  });
});
