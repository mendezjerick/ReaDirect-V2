import { describe, expect, it } from "vitest";
import { getCameraCenter } from "./cameraFollow";

describe("camera follow", () => {
  it("follows the player inside the map", () => {
    const camera = getCameraCenter({
      target: { x: 900, y: 600 },
      viewportWidth: 640,
      viewportHeight: 360
    });

    expect(camera).toEqual({ x: 900, y: 600 });
  });

  it("clamps at map boundaries", () => {
    const camera = getCameraCenter({
      target: { x: 20, y: 20 },
      viewportWidth: 640,
      viewportHeight: 360
    });

    expect(camera.x).toBe(320);
    expect(camera.y).toBe(180);
  });

  it("clamps against the redesigned village's far edge", () => {
    const camera = getCameraCenter({
      target: { x: 4000, y: 4000 },
      viewportWidth: 640,
      viewportHeight: 360
    });

    expect(camera).toEqual({ x: 1408, y: 908 });
  });
});
