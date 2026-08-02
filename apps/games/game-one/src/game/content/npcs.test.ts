import { describe, expect, it } from "vitest";
import { AMBIENT_NPCS, NPCS, NPC_IDS, STATIONARY_NPCS } from "./npcs";
import { MAP_LANDMARKS, PROTOTYPE_MAP, TILE_SIZE, isWalkablePoint } from "../map/prototypeMap";
import { canOccupy, type Rectangle } from "../physics/collision";

describe("Phase 3 NPC map placement", () => {
  it("uses stable unique identifiers and documents every temporary sprite mapping", () => {
    expect(NPCS.map((npc) => npc.id)).toEqual(NPC_IDS);
    expect(new Set(NPCS.map((npc) => npc.id)).size).toBe(8);
    expect(NPCS.every((npc) => npc.temporarySpriteMapping.length > 0)).toBe(true);
    expect(NPCS.every((npc) => npc.optionalDialogue.en.length > 0 && npc.optionalDialogue.fil.length > 0)).toBe(true);
    expect(NPCS.filter((npc) => npc.id === "miss-estelle")).toHaveLength(1);
    expect(NPCS.filter((npc) => npc.id === "mang-yato")).toHaveLength(1);
    expect(AMBIENT_NPCS.map(({ id }) => id)).toEqual([
      "miss-yuuri",
      "mang-panda",
      "mr-kikushibu"
    ]);
    expect(STATIONARY_NPCS).toHaveLength(5);
    expect(NPCS.find(({ id }) => id === "mr-kikushibu")).toMatchObject({
      areaKey: "north-gate",
      position: { x: 31.5 * TILE_SIZE, y: 6.5 * TILE_SIZE }
    });
  });

  it("gives each ambient character a clear bilingual lore role", () => {
    expect(AMBIENT_NPCS.map(({ role }) => role)).toEqual([
      "librarian",
      "carpenter",
      "history-teacher"
    ]);
    for (const npc of AMBIENT_NPCS) {
      expect(npc.roleTitle.en).toBeTruthy();
      expect(npc.roleTitle.fil).toBeTruthy();
      expect(npc.optionalDialogue.en.join(" ")).toMatch(/map|kingdom|route|sign/i);
      expect(npc.optionalDialogue.fil.join(" ")).toMatch(/mapa|kingdom|daan|sign/i);
    }
  });

  it("keeps a walkable interaction approach for every NPC", () => {
    for (const npc of NPCS) {
      expect(isWalkablePoint(npc.position), `${npc.id} visual position`).toBe(true);
      expect(canOccupy(npc.interactionPosition, 12, PROTOTYPE_MAP), npc.id).toBe(true);
    }
  });

  it("keeps NPC base collisions separate from prop base collisions", () => {
    const propHitboxes = PROTOTYPE_MAP.visualObjects.flatMap((object) => object.hitbox ? [object.hitbox] : []);

    for (const npc of NPCS) {
      for (const prop of propHitboxes) {
        expect(overlaps(npc.collisionBase, prop), `${npc.id} overlaps ${prop.id}`).toBe(false);
      }
    }
  });

  it("places the market vendor outside the shop entrance", () => {
    const vendor = NPCS.find((npc) => npc.id === "market-vendor")!;
    const shop = PROTOTYPE_MAP.visualObjects.find((object) => object.id === "market-shop")!;

    expect(vendor.position.y).toBeGreaterThan(shop.depthY);
    expect(vendor.renderDepth).toBeGreaterThan(shop.depthY);
    expect(vendor.interactionPosition).toEqual(MAP_LANDMARKS.marketFront);
    expect(vendor.interactionPosition.y).toBeGreaterThan(shop.hitbox!.y + shop.hitbox!.height);
    expect(overlaps(vendor.collisionBase, shop.hitbox!)).toBe(false);
  });

  it("places the Bridge Keeper beside the south-east bridge entrance", () => {
    const keeper = NPCS.find((npc) => npc.id === "bridge-keeper")!;

    expect(keeper.position).toEqual({ x: 36.5 * TILE_SIZE, y: 14.5 * TILE_SIZE });
    expect(keeper.interactionPosition).toEqual({ x: 35.5 * TILE_SIZE, y: 14.5 * TILE_SIZE });
    expect(isWalkablePoint(keeper.position)).toBe(true);
    expect(canOccupy(keeper.interactionPosition, 12, PROTOTYPE_MAP)).toBe(true);
    expect(keeper.position.x).toBeGreaterThan(MAP_LANDMARKS.bridgeSouth.x);
    expect(keeper.position.x - MAP_LANDMARKS.bridgeSouth.x).toBe(TILE_SIZE * 6);
  });

  it("gives every NPC a unique visual position and collision base", () => {
    expect(new Set(NPCS.map((npc) => `${npc.position.x},${npc.position.y}`)).size).toBe(NPCS.length);
    expect(new Set(NPCS.map((npc) => `${npc.collisionBase.x},${npc.collisionBase.y}`)).size).toBe(NPCS.length);
  });
});

function overlaps(a: Omit<Rectangle, "id">, b: Rectangle) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
