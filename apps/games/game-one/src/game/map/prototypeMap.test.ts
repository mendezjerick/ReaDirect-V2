import { describe, expect, it } from "vitest";
import {
  getAnimatedWaterFrame,
  getTerrainSprite,
  getTerrainAtPoint,
  getTileKind,
  MAP_LANDMARKS,
  PROTOTYPE_MAP,
  TILE_SIZE,
  isWalkablePoint
} from "./prototypeMap";
import { canOccupy, type Point } from "../physics/collision";

const PLAYER_RADIUS = 12;

describe("village map composition", () => {
  it("keeps every blocking hitbox inside its visible sprite", () => {
    const blockingObjects = PROTOTYPE_MAP.visualObjects.filter((object) => object.blocksMovement);
    const collisions = new Map(PROTOTYPE_MAP.collision.map((collision) => [collision.id, collision]));

    expect(blockingObjects.length).toBeGreaterThan(0);
    for (const object of blockingObjects) {
      const hitbox = collisions.get(`${object.id}-hitbox`);
      expect(hitbox).toEqual(object.hitbox);
      expect(hitbox!.x).toBeGreaterThanOrEqual(object.x);
      expect(hitbox!.y).toBeGreaterThanOrEqual(object.y);
      expect(hitbox!.x + hitbox!.width).toBeLessThanOrEqual(object.x + object.width);
      expect(hitbox!.y + hitbox!.height).toBeLessThanOrEqual(object.y + object.height);
    }
  });

  it("blocks the visible body of each house instead of only its bottom edge", () => {
    const houses = PROTOTYPE_MAP.visualObjects.filter((object) => object.id.includes("house") || object.id === "learning-hall");

    expect(houses).toHaveLength(4);
    for (const house of houses) {
      expect(house.width).toBe(4 * TILE_SIZE);
      expect(house.height).toBe(3 * TILE_SIZE);
      expect(house.hitbox!.height).toBeGreaterThan(2 * TILE_SIZE);
      expect(canOccupy({
        x: house.hitbox!.x + house.hitbox!.width / 2,
        y: house.hitbox!.y + house.hitbox!.height / 2
      }, PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(false);
    }
  });

  it("uses one consistent tree sprite for single trees and clusters", () => {
    const trees = PROTOTYPE_MAP.visualObjects.filter((object) => object.assetKey === "tree-round" || object.assetKey === "tree-wide");

    expect(trees.length).toBeGreaterThan(0);
    expect(new Set(trees.map((tree) => tree.assetKey))).toEqual(new Set(["tree-round"]));
    expect(trees.every((tree) => tree.width === 2 * TILE_SIZE && tree.height === 2 * TILE_SIZE)).toBe(true);
  });

  it("frames the forest clearing with four fruit trees and trunk-only collision", () => {
    const orchard = PROTOTYPE_MAP.visualObjects.filter((object) => object.assetKey === "fruit-tree");

    expect(orchard.map(({ frame }) => frame)).toEqual([0, 1, 2, 3]);
    expect(orchard.every((tree) => tree.blocksMovement)).toBe(true);
    expect(orchard.every((tree) => tree.hitbox?.width === 0.7 * TILE_SIZE)).toBe(true);
    expect(orchard.every((tree) => tree.hitbox!.height < tree.height / 2)).toBe(true);
    expect(canOccupy(MAP_LANDMARKS.twinWaterfalls, PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(true);
    expect(canOccupy(MAP_LANDMARKS.bridgeNorth, PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(true);
  });

  it("keeps decorative details out of movement collision", () => {
    const collisionIds = new Set(PROTOTYPE_MAP.collision.map((collision) => collision.id));

    expect(collisionIds.has("plaza-flower-a-hitbox")).toBe(false);
    expect(collisionIds.has("market-produce-left-hitbox")).toBe(false);
  });

  it("uses terrain sprites for every terrain category", () => {
    expect(getTerrainSprite(2, 2).assetKey).toBe("tileset-floor");
    expect(getTerrainSprite(2, 9).assetKey).toBe("tileset-water");
    expect(getTerrainSprite(30, 9).assetKey).toBe("tileset-water");
    expect(getTileKind(30, 9)).toBe("bridge");
  });

  it("uses one seamless atlas frame for ordinary grass ground", () => {
    for (let tileY = 0; tileY < PROTOTYPE_MAP.rows; tileY += 1) {
      for (let tileX = 0; tileX < PROTOTYPE_MAP.columns; tileX += 1) {
        if (getTileKind(tileX, tileY) === "grass") {
          expect(getTerrainSprite(tileX, tileY)).toEqual({ assetKey: "tileset-floor", frame: 264 });
        }
      }
    }
  });

  it("keeps grass, routes, and bridge walkable while water remains blocked", () => {
    expect(isWalkablePoint(MAP_LANDMARKS.spawn)).toBe(true);
    expect(isWalkablePoint(tileCenter(2, 2))).toBe(true);
    expect(getTerrainAtPoint(tileCenter(2, 2))).toEqual({ id: "grass", walkable: true, footstep: "grass" });
    expect(canOccupy(tileCenter(2, 9), PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(false);

    for (let y = 8; y <= 10; y += 1) {
      for (let x = 29; x <= 32; x += 1) {
        expect(canOccupy(tileCenter(x, y), PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(true);
      }
    }
  });

  it("shapes one continuous river with a clear bridge crossing", () => {
    expect(getTileKind(6, 8)).toBe("water");
    expect(getTileKind(7, 8)).toBe("water");
    expect(getTileKind(13, 8)).toBe("water");
    expect(getTileKind(52, 10)).toBe("water");
    expect(getTileKind(23, 4)).not.toBe("water");
    expect(getTileKind(37, 4)).not.toBe("water");

    expect(getTileKind(28, 9)).toBe("water");
    expect(getTileKind(29, 9)).toBe("bridge");
    expect(getTileKind(32, 9)).toBe("bridge");
    expect(getTileKind(33, 9)).toBe("water");
    expect(getTileKind(51, 18)).toBe("water");
    expect(canOccupy(tileCenter(51, 18), PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(false);
  });

  it("provides reusable animation frames only for calm interior water tiles", () => {
    const phases = [0, 1, 2, 3]
      .map((phase) => getAnimatedWaterFrame(51, 17, phase))
      .filter((frame): frame is number => frame !== null);
    expect(new Set(phases).size).toBeGreaterThan(1);
    expect(getAnimatedWaterFrame(30, 9, 1)).toBeNull();
    expect(getAnimatedWaterFrame(20, 20, 1)).toBeNull();
  });

  it("rounds route-region corners instead of drawing rectangular grass boundaries", () => {
    expect(getTileKind(26, 2)).toBe("grass");
    expect(getTileKind(28, 2)).toBe("forest");
    expect(getTileKind(27, 3)).toBe("forest");
    expect(getTerrainSprite(28, 2).frame).not.toBe(177);
    expect(getTerrainSprite(30, 4).frame).toBe(177);
  });

  it("connects spawn to every gameplay landmark through walkable tile centers", () => {
    const reachable = floodFill(MAP_LANDMARKS.spawn);
    const landmarks = Object.entries(MAP_LANDMARKS);

    for (const [name, point] of landmarks) {
      expect(reachable.has(pointKey(point)), `${name} should be reachable`).toBe(true);
    }
  });

  it("keeps the market front clear and places the counter collision only at its base", () => {
    const counter = PROTOTYPE_MAP.visualObjects.find((object) => object.id === "market-counter");

    expect(counter?.assetKey).toBe("village-market-counter");
    expect(counter?.hitbox?.height).toBeLessThan(TILE_SIZE);
    expect(counter!.hitbox!.y).toBeGreaterThan(counter!.y + 2 * TILE_SIZE);
    expect(canOccupy(MAP_LANDMARKS.marketFront, PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(true);
  });

  it("keeps the expected exploration landmarks represented", () => {
    const areaKeys = PROTOTYPE_MAP.areas.map((area) => area.key);

    expect(areaKeys).toEqual(
      expect.arrayContaining(["market-area", "old-bridge", "twin-waterfalls", "south-lane", "farm-woodland"])
    );
  });

  it("connects the farm fence while leaving a usable three-tile west gate", () => {
    const fence = PROTOTYPE_MAP.visualObjects.filter((object) => object.assetKey === "farm-fence");
    const fenceCollision = PROTOTYPE_MAP.collision.filter((collision) => collision.id.startsWith("farm-fence-"));

    expect(fence).toHaveLength(1);
    expect(fenceCollision.length).toBeGreaterThan(30);
    expect(canOccupy(tileCenter(33, 27), PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(true);
    expect(canOccupy(tileCenter(33, 23), PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(false);
    expect(canOccupy(tileCenter(48, 27), PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(false);
    expect(canOccupy(tileCenter(40, 32), PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(false);
    expect(canOccupy(tileCenter(40, 27), PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(true);
  });
});

function floodFill(start: Point) {
  const queue = [toTile(start)];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    if (visited.has(key)) continue;

    const center = tileCenter(current.x, current.y);
    if (!canOccupy(center, PLAYER_RADIUS, PROTOTYPE_MAP)) continue;
    visited.add(key);

    queue.push(
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 }
    );
  }

  return visited;
}

function toTile(point: Point) {
  return { x: Math.floor(point.x / TILE_SIZE), y: Math.floor(point.y / TILE_SIZE) };
}

function pointKey(point: Point) {
  const tile = toTile(point);
  return `${tile.x},${tile.y}`;
}

function tileCenter(tileX: number, tileY: number) {
  return { x: (tileX + 0.5) * TILE_SIZE, y: (tileY + 0.5) * TILE_SIZE };
}
