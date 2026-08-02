import { describe, expect, it } from "vitest";
import { getWorldSize } from "../map/prototypeMap";
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
    const viewportWidth = 640;
    const viewportHeight = 360;
    const camera = getCameraCenter({
      target: { x: 4000, y: 4000 },
      viewportWidth,
      viewportHeight
    });
    const world = getWorldSize();

    expect(camera).toEqual({
      x: world.width - viewportWidth / 2,
      y: world.height - viewportHeight / 2
    });
  });
});
