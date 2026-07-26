import { describe, expect, it } from "vitest";
import {
  createRoamingAnimalSpriteSheet,
  getRoamingAnimalFrame,
  ROAMING_ANIMAL_FRAMES,
  ROAMING_ANIMAL_FRAME_SIZE
} from "./generatedAnimalAssets";

describe("generated roaming animal assets", () => {
  it("creates directional walk frames for every animal kind", () => {
    const sheet = createRoamingAnimalSpriteSheet();

    expect(sheet.width).toBe(ROAMING_ANIMAL_FRAME_SIZE * ROAMING_ANIMAL_FRAMES);
    expect(sheet.height).toBe(ROAMING_ANIMAL_FRAME_SIZE);
    expect(getRoamingAnimalFrame("rabbit", "left", false, 0)).toBe(0);
    expect(getRoamingAnimalFrame("chicken", "right", false, 0)).toBe(6);
    expect(getRoamingAnimalFrame("duck", "right", true, 0.25)).toBe(11);
  });
});
