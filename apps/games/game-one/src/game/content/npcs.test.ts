import { describe, expect, it } from "vitest";
import { NPCS, NPC_IDS } from "./npcs";
import { MAP_LANDMARKS, PROTOTYPE_MAP, isWalkablePoint } from "../map/prototypeMap";
import { canOccupy, type Rectangle } from "../physics/collision";

describe("Phase 3 NPC map placement", () => {
  it("uses stable unique identifiers and documents every temporary sprite mapping", () => {
    expect(NPCS.map((npc) => npc.id)).toEqual(NPC_IDS);
    expect(new Set(NPCS.map((npc) => npc.id)).size).toBe(5);
    expect(NPCS.every((npc) => npc.temporarySpriteMapping.length > 0)).toBe(true);
    expect(NPCS.every((npc) => npc.optionalDialogue.en.length > 0 && npc.optionalDialogue.fil.length > 0)).toBe(true);
    expect(NPCS.filter((npc) => npc.id === "miss-estelle")).toHaveLength(1);
    expect(NPCS.filter((npc) => npc.id === "mang-yato")).toHaveLength(1);
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

  it("places the market vendor behind the counter with interaction in front", () => {
    const vendor = NPCS.find((npc) => npc.id === "market-vendor")!;
    const counter = PROTOTYPE_MAP.visualObjects.find((object) => object.id === "market-counter")!;

    expect(vendor.position.y).toBeLessThan(counter.depthY);
    expect(vendor.renderDepth).toBeLessThan(counter.depthY);
    expect(vendor.interactionPosition).toEqual(MAP_LANDMARKS.marketFront);
    expect(vendor.interactionPosition.y).toBeGreaterThan(counter.hitbox!.y + counter.hitbox!.height);
    expect(overlaps(vendor.collisionBase, counter.hitbox!)).toBe(false);
  });

  it("gives every NPC a unique visual position and collision base", () => {
    expect(new Set(NPCS.map((npc) => `${npc.position.x},${npc.position.y}`)).size).toBe(NPCS.length);
    expect(new Set(NPCS.map((npc) => `${npc.collisionBase.x},${npc.collisionBase.y}`)).size).toBe(NPCS.length);
  });
});

function overlaps(a: Omit<Rectangle, "id">, b: Rectangle) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
