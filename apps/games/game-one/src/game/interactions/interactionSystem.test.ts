import { describe, expect, it, vi } from "vitest";
import { LANDMARK_IDS } from "../content/landmarks";
import { NPC_IDS } from "../content/npcs";
import { SHOP_IDS } from "../content/shops";
import { createInteractionGuard, getInteractionTargets, selectClosestInteraction, type InteractionTarget } from "./interactionSystem";

describe("interaction system", () => {
  it("provides all NPCs and readable landmarks as unique interaction targets", () => {
    const targets = getInteractionTargets();
    const npcTargets = targets.filter((target) => target.kind === "npc");
    const landmarkTargets = targets.filter((target) => target.kind === "landmark");
    expect(npcTargets.map((target) => target.npcId)).toEqual(NPC_IDS);
    expect(landmarkTargets.map((target) => target.landmarkId)).toEqual(LANDMARK_IDS);
    const shopTargets = targets.filter((target) => target.kind === "shop");
    expect(shopTargets.map((target) => target.shopId)).toEqual(SHOP_IDS);
    expect(new Set(targets.map((target) => target.id)).size).toBe(NPC_IDS.length + LANDMARK_IDS.length + SHOP_IDS.length);
  });

  it("selects the nearest enabled target and clears it after leaving range", () => {
    const targets = fixtures();
    expect(selectClosestInteraction({ x: 12, y: 0 }, targets, 30)?.id).toBe("near");
    expect(selectClosestInteraction({ x: 200, y: 200 }, targets, 30)).toBeNull();
  });

  it("uses a stable identifier to break equal-distance ties", () => {
    const targets: InteractionTarget[] = [target("target-b", 10, 0), target("target-a", -10, 0)];
    expect(selectClosestInteraction({ x: 0, y: 0 }, targets, 20)?.id).toBe("target-a");
  });

  it("keeps the active prompt through the exit margin without showing distant targets", () => {
    const targets = [target("near", 0, 0)];
    expect(selectClosestInteraction({ x: 60, y: 0 }, targets)).toBeNull();
    expect(selectClosestInteraction({ x: 60, y: 0 }, targets, { activeTargetId: "near" })?.id).toBe("near");
    expect(selectClosestInteraction({ x: 73, y: 0 }, targets, { activeTargetId: "near" })).toBeNull();
  });

  it("only exposes the active mission NPC and rejects interaction through a wall", () => {
    const targets = [target("estelle", 40, 0), { ...target("vendor", 8, 0), npcId: "market-vendor" as const }];
    const map = { columns: 10, rows: 10, tileSize: 32, collision: [{ id: "wall", x: 18, y: -8, width: 8, height: 16 }] };
    expect(selectClosestInteraction({ x: 0, y: 0 }, targets, { allowedNpcId: "miss-estelle", collisionMap: map })).toBeNull();
    expect(selectClosestInteraction({ x: 0, y: 0 }, targets, { allowedNpcId: "market-vendor", collisionMap: map })?.id).toBe("vendor");
  });

  it("allows optional lore characters without letting them replace a nearby mission target", () => {
    const missionTarget = target("estelle", 30, 0);
    const loreTarget = {
      ...target("yuuri", 8, 0),
      npcId: "miss-yuuri" as const,
      optional: true
    };

    expect(
      selectClosestInteraction(
        { x: 0, y: 0 },
        [loreTarget],
        { allowedNpcId: "miss-estelle" }
      )?.id
    ).toBe("yuuri");
    expect(
      selectClosestInteraction(
        { x: 0, y: 0 },
        [loreTarget, missionTarget],
        { allowedNpcId: "miss-estelle" }
      )?.id
    ).toBe("estelle");
  });

  it("allows readable landmarks without replacing a nearby mission target", () => {
    const missionTarget = target("estelle", 30, 0);
    const landmark: InteractionTarget = {
      id: "landmark:village-guide-sign",
      kind: "landmark",
      label: "Read sign",
      description: "Read sign.",
      position: { x: 8, y: 0 },
      enabled: true,
      optional: true,
      landmarkId: "village-guide-sign"
    };

    expect(selectClosestInteraction({ x: 0, y: 0 }, [landmark], { allowedNpcId: "miss-estelle" })?.id)
      .toBe("landmark:village-guide-sign");
    expect(selectClosestInteraction({ x: 0, y: 0 }, [landmark, missionTarget], { allowedNpcId: "miss-estelle" })?.id)
      .toBe("estelle");
  });

  it("guards one interaction press from rapid duplicate activation", () => {
    let timestamp = 1000;
    const callback = vi.fn();
    const guard = createInteractionGuard(180, () => timestamp);
    expect(guard.activate(callback)).toBe(true);
    timestamp += 20;
    expect(guard.activate(callback)).toBe(false);
    timestamp += 200;
    expect(guard.activate(callback)).toBe(true);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});

function fixtures(): InteractionTarget[] {
  return [target("far", 25, 0), target("near", 10, 0), { ...target("disabled", 1, 0), enabled: false }];
}

function target(id: string, x: number, y: number): InteractionTarget {
  return { id, kind: "npc", label: id, description: id, position: { x, y }, enabled: true, npcId: "miss-estelle" };
}
