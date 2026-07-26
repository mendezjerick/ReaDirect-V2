export const NPC_IDS = ["miss-estelle", "lolo-ambo", "market-vendor", "bridge-keeper", "mang-yato"] as const;

export type NpcId = (typeof NPC_IDS)[number];

export type NpcDefinition = {
  id: NpcId;
  displayName: string;
  role: "guide" | "mapmaker" | "clue-giver" | "farmer";
  areaKey: string;
  assetKey: string;
  position: Point;
  interactionPosition: Point;
  collisionBase: Omit<Rectangle, "id">;
  renderDepth: number;
  interactionLabel: string;
  temporarySpriteMapping: string;
  optionalDialogue: Readonly<Record<"en" | "fil", readonly string[]>>;
};

// These CC0 sprites are temporary role mappings, not final character designs.
export const NPCS: readonly NpcDefinition[] = [
  {
    id: "miss-estelle",
    displayName: "Miss Estelle",
    role: "guide",
    areaKey: "central-plaza",
    assetKey: "npc-miss-estelle",
    position: MAP_LANDMARKS.missEstelle,
    interactionPosition: { x: MAP_LANDMARKS.missEstelle.x, y: MAP_LANDMARKS.missEstelle.y + TILE_SIZE },
    collisionBase: npcBase(MAP_LANDMARKS.missEstelle),
    renderDepth: MAP_LANDMARKS.missEstelle.y,
    interactionLabel: "Talk to Miss Estelle",
    temporarySpriteMapping: "Ninja Adventure Woman idle sprite",
    optionalDialogue: {
      en: ["Hello, reader!", "Come back when you want help with a saved question."],
      fil: ["Kumusta, mambabasa!", "Bumalik kapag handa ka sa inilaan mong tanong."]
    }
  },
  {
    id: "lolo-ambo",
    displayName: "Lolo Ambo",
    role: "mapmaker",
    areaKey: "east-homes",
    assetKey: "npc-lolo-ambo",
    position: MAP_LANDMARKS.loloCorner,
    interactionPosition: { x: MAP_LANDMARKS.loloCorner.x - TILE_SIZE, y: MAP_LANDMARKS.loloCorner.y },
    collisionBase: npcBase(MAP_LANDMARKS.loloCorner),
    renderDepth: MAP_LANDMARKS.loloCorner.y,
    interactionLabel: "Talk to Lolo Ambo",
    temporarySpriteMapping: "Ninja Adventure OldMan idle sprite",
    optionalDialogue: {
      en: ["The east path leads to the quiet homes.", "Watch the map and stay on the bridge."],
      fil: ["Patungo sa tahimik na mga bahay ang silangang daan.", "Tingnan ang mapa at dumaan sa tulay."]
    }
  },
  {
    id: "market-vendor",
    displayName: "Market Vendor",
    role: "clue-giver",
    areaKey: "market-area",
    assetKey: "npc-market-vendor",
    position: { x: MAP_LANDMARKS.marketFront.x, y: 542 },
    interactionPosition: MAP_LANDMARKS.marketFront,
    collisionBase: npcBase({ x: MAP_LANDMARKS.marketFront.x, y: 542 }),
    renderDepth: 607,
    interactionLabel: "Talk to the Market Vendor",
    temporarySpriteMapping: "Ninja Adventure OldMan2 idle sprite",
    optionalDialogue: {
      en: ["Fresh supplies are ready at the stall.", "Read the labels before you choose."],
      fil: ["Handa na ang mga gamit sa puwesto.", "Basahin ang mga label bago pumili."]
    }
  },
  {
    id: "bridge-keeper",
    displayName: "Bridge Keeper",
    role: "clue-giver",
    areaKey: "river-path",
    assetKey: "npc-bridge-keeper",
    position: tileCenter(35, 12),
    interactionPosition: tileCenter(34, 12),
    collisionBase: npcBase(tileCenter(35, 12)),
    renderDepth: tileCenter(35, 12).y,
    interactionLabel: "Talk to the Bridge Keeper",
    temporarySpriteMapping: "Ninja Adventure Master idle sprite",
    optionalDialogue: {
      en: ["The river is moving fast.", "Cross at the wooden bridge."],
      fil: ["Mabilis ang agos ng ilog.", "Tumawid sa tulay na kahoy."]
    }
  },
  {
    id: "mang-yato",
    displayName: "Mang Yato",
    role: "farmer",
    areaKey: "farm-woodland",
    assetKey: "npc-mang-yato",
    position: MAP_LANDMARKS.mangYato,
    interactionPosition: { x: MAP_LANDMARKS.mangYato.x - TILE_SIZE, y: MAP_LANDMARKS.mangYato.y },
    collisionBase: npcBase(MAP_LANDMARKS.mangYato),
    renderDepth: MAP_LANDMARKS.mangYato.y,
    interactionLabel: "Talk to Mang Yato",
    temporarySpriteMapping: "Original generated ReaDirect farmer sprite",
    optionalDialogue: {
      en: ["Welcome to my farm!", "The small wood is through the open gate. The tall grass is safe to walk through."],
      fil: ["Maligayang pagdating sa bukid ko!", "Nasa bukas na tarangkahan ang maliit na gubat. Ligtas lakaran ang matataas na damo."]
    }
  }
];

export function getNpc(npcId: NpcId) {
  return NPCS.find((npc) => npc.id === npcId)!;
}

function npcBase(position: Point) {
  return { x: position.x - 10, y: position.y - 4, width: 20, height: 12 };
}

function tileCenter(tileX: number, tileY: number) {
  return { x: (tileX + 0.5) * TILE_SIZE, y: (tileY + 0.5) * TILE_SIZE };
}
import { MAP_LANDMARKS, TILE_SIZE } from "../map/prototypeMap";
import type { Point, Rectangle } from "../physics/collision";
