import { describe, expect, it } from "vitest";
import {
  clampInteractionPromptPosition,
  fitAspectWithin
} from "./gameViewport";

describe("responsive game viewport", () => {
  it.each([
    [{ width: 1920, height: 1080 }, { width: 1920, height: 1080 }],
    [{ width: 844, height: 390 }, { width: 693.3333333333334, height: 390 }],
    [{ width: 390, height: 844 }, { width: 390, height: 219.375 }]
  ])("fits a 16:9 playfield inside %o", (viewport, expected) => {
    const result = fitAspectWithin(viewport);
    expect(result.width).toBeCloseTo(expected.width);
    expect(result.height).toBeCloseTo(expected.height);
    expect(result.width / result.height).toBeCloseTo(16 / 9);
  });

  it("keeps a prompt outside the short-landscape header and control zones", () => {
    expect(
      clampInteractionPromptPosition(
        { x: 1, y: 1 },
        { width: 640, height: 320 }
      )
    ).toEqual({ x: 0.94, y: 0.65 });
  });

  it("keeps a portrait prompt within readable horizontal bounds", () => {
    const result = clampInteractionPromptPosition(
      { x: -0.5, y: 0 },
      { width: 360, height: 800 }
    );
    expect(result.x).toBe(0.06);
    expect(result.y).toBe(0.12);
  });
});
