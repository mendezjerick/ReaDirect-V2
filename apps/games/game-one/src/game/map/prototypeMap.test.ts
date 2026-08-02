import { describe, expect, it } from "vitest";
import {
  getAnimatedWaterFrame,
  getTerrainSprite,
  getTerrainAtPoint,
  getTileKind,
  isSwimmableRiverPosition,
  isSwimmableRiverPoint,
  MAP_LANDMARKS,
  PROTOTYPE_MAP,
  TILE_SIZE,
  isWalkablePoint
} from "./prototypeMap";
import { canOccupy, type Point } from "../physics/collision";
import { VILLAGE_DECOR_FRAME } from "../assets/generatedVillageDecorAssets";

const PLAYER_RADIUS = 12;

describe("village map composition", () => {
  it("expands the playable world east and south", () => {
    expect(PROTOTYPE_MAP.columns).toBe(62);
    expect(PROTOTYPE_MAP.rows).toBe(66);
    expect(isWalkablePoint(MAP_LANDMARKS.eastRiverbank)).toBe(true);
    expect(isWalkablePoint(MAP_LANDMARKS.southRiverbend)).toBe(true);
    expect(isWalkablePoint(MAP_LANDMARKS.southRiverCove)).toBe(true);
    expect(isWalkablePoint(MAP_LANDMARKS.eastRiverChannel)).toBe(true);
  });

  it("limits swimming to the west river channel", () => {
    expect(isSwimmableRiverPoint({ x: 10.5 * TILE_SIZE, y: 9.5 * TILE_SIZE })).toBe(true);
    expect(isSwimmableRiverPoint({ x: 51.5 * TILE_SIZE, y: 20.5 * TILE_SIZE })).toBe(false);
    expect(isSwimmableRiverPoint({ x: 30.5 * TILE_SIZE, y: 9.5 * TILE_SIZE })).toBe(false);
    expect(isSwimmableRiverPosition({ x: 28.1 * TILE_SIZE, y: 9.5 * TILE_SIZE })).toBe(true);
    expect(isSwimmableRiverPosition({ x: 28.5 * TILE_SIZE, y: 9.5 * TILE_SIZE })).toBe(false);
    expect(isSwimmableRiverPosition({ x: 10.5 * TILE_SIZE, y: 11.1 * TILE_SIZE })).toBe(true);
    expect(isSwimmableRiverPosition({ x: 10.5 * TILE_SIZE, y: 11.5 * TILE_SIZE })).toBe(false);
  });

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

  it("uses approved tree shapes with stable sprite dimensions", () => {
    const trees = PROTOTYPE_MAP.visualObjects.filter((object) => object.assetKey === "tree-round" || object.assetKey === "tree-wide");

    expect(trees.length).toBeGreaterThan(0);
    expect(new Set(trees.map((tree) => tree.assetKey))).toEqual(new Set(["tree-round", "tree-wide"]));
    expect(trees.filter((tree) => tree.assetKey === "tree-round").every((tree) => tree.width === 2 * TILE_SIZE && tree.height === 2 * TILE_SIZE)).toBe(true);
    expect(trees.filter((tree) => tree.assetKey === "tree-wide").every((tree) => tree.width === 4 * TILE_SIZE && tree.height === 2 * TILE_SIZE)).toBe(true);
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
    expect(PROTOTYPE_MAP.visualObjects.some((object) => object.assetKey === "stump-orange")).toBe(false);
    expect(PROTOTYPE_MAP.visualObjects.some((object) => object.assetKey === "rock-small")).toBe(false);
    expect(PROTOTYPE_MAP.visualObjects.find((object) => object.id === "west-home-sunflower")?.frame).toBe(264);
  });

  it("uses distinct decoration sets for civic, market, home, farm, and shrine areas", () => {
    const villageDecor = PROTOTYPE_MAP.visualObjects.filter((object) => object.assetKey === "village-decor");
    const natureDecorFrames = new Set(
      PROTOTYPE_MAP.visualObjects
        .filter((object) => object.assetKey === "tileset-nature")
        .map((object) => object.frame)
    );

    expect(new Set(villageDecor.map((object) => object.frame))).toEqual(
      new Set(Object.values(VILLAGE_DECOR_FRAME))
    );
    expect(natureDecorFrames.size).toBeGreaterThanOrEqual(6);
    expect(PROTOTYPE_MAP.visualObjects.some((object) => object.id === "learning-hall-notice")).toBe(true);
    expect(PROTOTYPE_MAP.visualObjects.some((object) => object.id === "market-produce-left")).toBe(true);
    expect(PROTOTYPE_MAP.visualObjects.some((object) => object.id === "lolo-stone-marker")).toBe(true);
    expect(PROTOTYPE_MAP.visualObjects.some((object) => object.id === "farm-produce-crate")).toBe(true);
    expect(PROTOTYPE_MAP.visualObjects.some((object) => object.id === "shrine-lantern-west")).toBe(true);
    expect(PROTOTYPE_MAP.visualObjects.some((object) => object.id === "shrine-boat-warning-sign")).toBe(true);
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

    for (let y = 7; y <= 11; y += 1) {
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
    expect(getTileKind(34, 12)).not.toBe("water");
    expect(canOccupy(tileCenter(34, 12), PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(true);
    expect(getTileKind(54, 14)).not.toBe("water");
    expect(getTileKind(54, 27)).not.toBe("water");
    expect(getTileKind(51, 32)).toBe("water");
    expect(getTileKind(51, 18)).toBe("water");
    expect(canOccupy(tileCenter(51, 18), PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(false);
    expect(getTileKind(51, 47)).toBe("water");
    expect(getTileKind(47, 47)).toBe("water");
    expect(getTileKind(57, 41)).not.toBe("water");
    expect(getTileKind(57, 57)).toBe("water");
    expect(getTileKind(54, 52)).not.toBe("water");
    expect(getTileKind(57, 62)).not.toBe("water");
    expect(canOccupy(MAP_LANDMARKS.southRiverCove, PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(true);
    expect(getTileKind(57, 24)).not.toBe("water");
    expect(getTileKind(52, 36)).toBe("water");
    expect(getTileKind(46, 36)).not.toBe("water");
  });

  it("animates the calm center band while leaving banks and the bridge stable", () => {
    const phases = [0, 1, 2, 3]
      .map((phase) => getAnimatedWaterFrame(51, 17, phase))
      .filter((frame): frame is number => frame !== null);
    expect(new Set(phases).size).toBeGreaterThan(1);
    const eastRiverPhases = [0, 1, 2, 3].map((phase) =>
      getAnimatedWaterFrame(38, 9, phase)
    );
    expect(new Set(eastRiverPhases).size).toBeGreaterThan(1);
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

  it("keeps the market front clear and places the shop collision only at its base", () => {
    const shop = PROTOTYPE_MAP.visualObjects.find((object) => object.id === "market-shop");

    expect(shop?.assetKey).toBe("village-market-shop");
    expect(shop?.hitbox?.height).toBeLessThan(TILE_SIZE);
    expect(shop!.hitbox!.y).toBeGreaterThan(shop!.y + 2 * TILE_SIZE);
    expect(canOccupy(MAP_LANDMARKS.marketFront, PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(true);
  });

  it("places the east-bank reading shrine beside the route without blocking it", () => {
    const shrine = PROTOTYPE_MAP.visualObjects.find((object) => object.id === "east-riverbank-reading-shrine");

    expect(shrine).toMatchObject({
      assetKey: "reading-shrine",
      width: 3 * TILE_SIZE,
      height: 3 * TILE_SIZE,
      blocksMovement: true
    });
    expect(shrine!.hitbox!.y).toBeGreaterThan(shrine!.y + 2 * TILE_SIZE);
    expect(canOccupy(tileCenter(54, 18), PLAYER_RADIUS, PROTOTYPE_MAP)).toBe(true);
  });

  it("keeps the expected exploration landmarks represented", () => {
    const areaKeys = PROTOTYPE_MAP.areas.map((area) => area.key);

    expect(areaKeys).toEqual(
      expect.arrayContaining([
        "market-area",
        "old-bridge",
        "twin-waterfalls",
        "south-lane",
        "farm-woodland",
        "east-riverbank",
        "south-riverbend",
        "south-river-cove",
        "east-river-channel"
      ])
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
