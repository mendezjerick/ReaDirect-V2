import { describe, expect, it } from "vitest";
import { getCircularMinimapMarker, getGuideProgress, getNavigationDirection, getSafeGuidePoints, MINIMAP_CENTER, MINIMAP_CONTENT_RADIUS, movementHeadsTowardTarget, shouldShowGuideDots } from "./navigationModel";

describe("mission navigation model", () => {
  it("points toward the target and switches to nearby at the interaction distance", () => {
    expect(getNavigationDirection({ x: 0, y: 0 }, { x: 100, y: 0 })).toMatchObject({ angle: 0, nearby: false });
    expect(getNavigationDirection({ x: 0, y: 0 }, { x: 0, y: 80 })).toMatchObject({ angle: 90, nearby: true });
  });

  it("updates when the player moves and recognizes movement toward the target", () => {
    expect(getNavigationDirection({ x: 20, y: 0 }, { x: 0, y: 0 }).angle).toBe(180);
    expect(movementHeadsTowardTarget({ x: -1, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(movementHeadsTowardTarget({ x: 1, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 0 })).toBe(false);
  });

  it("shows guide dots only during the final approach to a character", () => {
    const target = { x: 0, y: 0 };

    expect(shouldShowGuideDots({ x: 260, y: 0 }, target)).toBe(false);
    expect(shouldShowGuideDots({ x: 200, y: 0 }, target)).toBe(true);
    expect(shouldShowGuideDots({ x: 128, y: 0 }, target)).toBe(true);
    expect(shouldShowGuideDots({ x: 80, y: 0 }, target)).toBe(false);
    expect(getGuideProgress({ x: 224, y: 0 }, target)).toBe(0);
    expect(getGuideProgress({ x: 158, y: 0 }, target)).toBe(50);
    expect(getGuideProgress({ x: 92, y: 0 }, target)).toBe(100);
  });

  it("stops a short dotted guide before a solid obstacle", () => {
    const map = {
      columns: 20,
      rows: 20,
      tileSize: 10,
      collision: [{ id: "wall", x: 42, y: 0, width: 10, height: 100 }]
    };
    const points = getSafeGuidePoints({ x: 20, y: 50 }, { x: 150, y: 50 }, map, 6);
    expect(points.every((point) => point.x < 42)).toBe(true);
  });

  it("keeps off-map targets on the circular edge while the player stays centered", () => {
    const marker = getCircularMinimapMarker({ x: 100, y: 100 }, { x: 1000, y: 100 });
    expect(marker).toMatchObject({ x: MINIMAP_CENTER + MINIMAP_CONTENT_RADIUS, y: MINIMAP_CENTER, clamped: true, angle: 0 });
    expect(getCircularMinimapMarker({ x: 100, y: 100 }, { x: 120, y: 100 }).clamped).toBe(false);
  });
});
