import { describe, expect, it } from "vitest";
import {
  createFruitTreeSpriteSheet,
  FRUIT_TREE_FRAMES,
  FRUIT_TREE_FRAME_SIZE,
  getFruitTreeFrame
} from "./generatedOrchardAssets";

describe("generated orchard assets", () => {
  it("creates one consistent sheet containing four fruit varieties", () => {
    const sheet = createFruitTreeSpriteSheet();

    expect(sheet.width).toBe(FRUIT_TREE_FRAME_SIZE * FRUIT_TREE_FRAMES);
    expect(sheet.height).toBe(FRUIT_TREE_FRAME_SIZE);
    expect([
      getFruitTreeFrame("apple"),
      getFruitTreeFrame("orange"),
      getFruitTreeFrame("lemon"),
      getFruitTreeFrame("plum")
    ]).toEqual([0, 1, 2, 3]);
  });
});
