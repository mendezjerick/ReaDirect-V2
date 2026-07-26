import { describe, expect, it } from "vitest";
import { MAP_LANDMARKS, PROTOTYPE_MAP, TILE_SIZE } from "../map/prototypeMap";
import { getBaseFrameForFacing, getWalkFrameForFacing, movePlayer, PLAYER_CONFIG } from "./playerMovement";

describe("player movement", () => {
  it("moves consistently based on delta time", () => {
    const position = MAP_LANDMARKS.spawn;

    const moved = movePlayer({
      position,
      input: { x: 1, y: 0 },
      deltaSeconds: 0.5,
      map: PROTOTYPE_MAP
    });

    expect(moved.x).toBeGreaterThan(position.x);
    expect(moved.y).toBe(position.y);
  });

  it("blocks movement beyond world boundaries", () => {
    const moved = movePlayer({
      position: { x: 13, y: 13 },
      input: { x: -1, y: 0 },
      deltaSeconds: 1,
      map: PROTOTYPE_MAP
    });

    expect(moved.x).toBe(13);
  });

  it("blocks tree and fence boundaries", () => {
    const hitbox = PROTOTYPE_MAP.visualObjects.find(({ id }) => id === "border-northwest-b")!.hitbox!;
    const position = { x: hitbox.x - PLAYER_CONFIG.radius - 1, y: hitbox.y + hitbox.height / 2 };
    const moved = movePlayer({
      position,
      input: { x: 1, y: 0 },
      deltaSeconds: 0.1,
      map: PROTOTYPE_MAP
    });

    expect(moved.x).toBe(position.x);
  });

  it("blocks entering the visible lower tree row", () => {
    const hitbox = PROTOTYPE_MAP.visualObjects.find(({ id }) => id === "border-south-b")!.hitbox!;
    const position = { x: hitbox.x + hitbox.width / 2, y: hitbox.y - PLAYER_CONFIG.radius - 1 };
    const moved = movePlayer({
      position,
      input: { x: 0, y: 1 },
      deltaSeconds: 0.1,
      map: PROTOTYPE_MAP
    });

    expect(moved.y).toBe(position.y);
  });

  it("allows movement into ordinary garden grass while solid objects remain blocked", () => {
    const position = { x: 4 * TILE_SIZE, y: 12 * TILE_SIZE };
    const moved = movePlayer({
      position,
      input: { x: -1, y: 0 },
      deltaSeconds: 0.25,
      map: PROTOTYPE_MAP
    });

    expect(moved.x).toBeLessThan(position.x);
  });

  it("blocks building and obstacle collision", () => {
    const position = { x: 25 * TILE_SIZE, y: 12 * TILE_SIZE };
    const moved = movePlayer({
      position,
      input: { x: 0, y: -1 },
      deltaSeconds: 0.25,
      map: PROTOTYPE_MAP
    });

    expect(moved.y).toBe(position.y);
  });

  it("blocks entering the visible house body from above", () => {
    const position = { x: 8 * TILE_SIZE, y: 12 * TILE_SIZE };
    const moved = movePlayer({
      position,
      input: { x: 0, y: -1 },
      deltaSeconds: 0.5,
      map: PROTOTYPE_MAP
    });

    expect(moved.y).toBe(position.y);
  });

  it("allows normal movement on both village paths and grass", () => {
    const pathPosition = { x: 18.5 * TILE_SIZE, y: 20.5 * TILE_SIZE };
    const pathMoved = movePlayer({
      position: pathPosition,
      input: { x: 1, y: 0 },
      deltaSeconds: 0.1,
      map: PROTOTYPE_MAP
    });
    const grassPosition = { x: 4.5 * TILE_SIZE, y: 4.5 * TILE_SIZE };
    const grassMoved = movePlayer({
      position: grassPosition,
      input: { x: 1, y: 0 },
      deltaSeconds: 0.1,
      map: PROTOTYPE_MAP
    });

    expect(pathMoved.x).toBeGreaterThan(pathPosition.x);
    expect(grassMoved.x).toBeGreaterThan(grassPosition.x);
  });

  it("allows the player to move through the intended north and south path openings", () => {
    const northPath = { x: 27.5 * TILE_SIZE, y: 2.5 * TILE_SIZE };
    const northMoved = movePlayer({
      position: northPath,
      input: { x: 0, y: 1 },
      deltaSeconds: 0.1,
      map: PROTOTYPE_MAP
    });
    const southPath = { x: 27.5 * TILE_SIZE, y: 31.5 * TILE_SIZE };
    const southMoved = movePlayer({
      position: southPath,
      input: { x: 0, y: -1 },
      deltaSeconds: 0.1,
      map: PROTOTYPE_MAP
    });

    expect(northMoved.y).toBeGreaterThan(northPath.y);
    expect(southMoved.y).toBeLessThan(southPath.y);
  });

  it("crosses smoothly from the path into adjacent grass", () => {
    const position = { x: 22.1 * TILE_SIZE, y: 29.5 * TILE_SIZE };
    const moved = movePlayer({
      position,
      input: { x: -1, y: 0 },
      deltaSeconds: 0.1,
      map: PROTOTYPE_MAP
    });

    expect(moved.x).toBeLessThan(position.x);
  });

  it("uses column-based walk frames so animation stays in one facing direction", () => {
    expect(getBaseFrameForFacing("down")).toBe(0);
    expect(getBaseFrameForFacing("up")).toBe(1);
    expect(getBaseFrameForFacing("left")).toBe(2);
    expect(getBaseFrameForFacing("right")).toBe(3);

    expect([0, 1, 2, 3].map((step) => getWalkFrameForFacing("down", step))).toEqual([
      0, 4, 8, 12
    ]);
    expect([0, 1, 2, 3].map((step) => getWalkFrameForFacing("right", step))).toEqual([
      3, 7, 11, 15
    ]);
  });
});
