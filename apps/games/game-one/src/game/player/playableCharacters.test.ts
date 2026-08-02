import { describe, expect, it } from "vitest";
import { GAME_ASSETS } from "../assets/assetRegistry";
import {
  getBaseFrameForFacing,
  getSpriteFlipXForFacing,
  getWalkFrameForFacing
} from "./playerMovement";
import {
  getPlayableCharacter,
  getPlayableCharacterRenderOffsetY,
  isPlayableCharacterId
} from "./playableCharacters";

describe("playable character selection", () => {
  it("defines a playable sprite asset and directional layout for each explorer", () => {
    expect(getPlayableCharacter("yato").assetKey).toBe("learnerWalk");
    expect(getPlayableCharacter("blue-hair-explorer").name.en).toBe("Rimuru Tempest");
    expect(getPlayableCharacter("blue-hair-explorer").spriteLayout).toBe("row-walk-four-way");
    expect(getPlayableCharacter("blue-hair-explorer").spriteOffsetY).toBe(0);
    expect(getPlayableCharacter("blue-hair-explorer").boatSpriteOffsetY).toBe(0);
    expect(
      getPlayableCharacterRenderOffsetY(getPlayableCharacter("blue-hair-explorer"), "left")
    ).toBe(getPlayableCharacterRenderOffsetY(getPlayableCharacter("blue-hair-explorer"), "down"));
    expect(GAME_ASSETS[getPlayableCharacter("blue-hair-explorer").assetKey].metadata).toMatchObject({
      columns: 4,
      rows: 4
    });
  });

  it("recognizes only supported learner-bound character identifiers", () => {
    expect(isPlayableCharacterId("yato")).toBe(true);
    expect(isPlayableCharacterId("luffy")).toBe(true);
    expect(isPlayableCharacterId("unknown")).toBe(false);
  });

  it("maps the new four-by-four sheet to independent front, side, back, and left frames", () => {
    expect(getBaseFrameForFacing("down", "row-walk-four-way")).toBe(0);
    expect(getWalkFrameForFacing("right", 3, "row-walk-four-way")).toBe(7);
    expect(getBaseFrameForFacing("up", "row-walk-four-way")).toBe(8);
    expect(getBaseFrameForFacing("left", "row-walk-four-way")).toBe(12);
    expect(getSpriteFlipXForFacing("left", "row-walk-four-way")).toBe(false);
  });
});
