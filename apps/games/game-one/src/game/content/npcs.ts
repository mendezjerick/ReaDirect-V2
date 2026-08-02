export const NPC_IDS = [
  "miss-estelle",
  "lolo-ambo",
  "market-vendor",
  "bridge-keeper",
  "mang-yato",
  "miss-yuuri",
  "mang-panda",
  "mr-kikushibu"
] as const;

export type NpcId = (typeof NPC_IDS)[number];

export type NpcDefinition = {
  id: NpcId;
  displayName: string;
  role: "guide" | "mapmaker" | "clue-giver" | "farmer" | "librarian" | "carpenter" | "history-teacher";
  roleTitle: Readonly<Record<"en" | "fil", string>>;
  movement: "stationary" | "ambient";
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

const MARKET_VENDOR_POSITION = {
  x: MAP_LANDMARKS.marketFront.x,
  y: MAP_LANDMARKS.marketFront.y - TILE_SIZE
} as const;

const BRIDGE_KEEPER_POSITION = tileCenter(36, 14);
const BRIDGE_KEEPER_INTERACTION_POSITION = tileCenter(35, 14);

// These CC0 sprites are temporary role mappings, not final character designs.
export const NPCS: readonly NpcDefinition[] = [
  {
    id: "miss-estelle",
    displayName: "Miss Estelle",
    role: "guide",
    roleTitle: { en: "Reading Guide", fil: "Gabay sa Pagbasa" },
    movement: "stationary",
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
    roleTitle: { en: "Village Mapmaker", fil: "Gumagawa ng Mapa" },
    movement: "stationary",
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
    roleTitle: { en: "Market Vendor", fil: "Tindero sa Palengke" },
    movement: "stationary",
    areaKey: "market-area",
    assetKey: "npc-market-vendor",
    position: MARKET_VENDOR_POSITION,
    interactionPosition: MAP_LANDMARKS.marketFront,
    collisionBase: npcBase(MARKET_VENDOR_POSITION),
    renderDepth: MARKET_VENDOR_POSITION.y,
    interactionLabel: "Talk to the Market Vendor",
    temporarySpriteMapping: "Ninja Adventure OldMan2 idle sprite",
    optionalDialogue: {
      en: ["Fresh supplies are ready in the shop.", "Read the labels before you choose."],
      fil: ["Handa na ang mga gamit sa tindahan.", "Basahin ang mga label bago pumili."]
    }
  },
  {
    id: "bridge-keeper",
    displayName: "Bridge Keeper",
    role: "clue-giver",
    roleTitle: { en: "Bridge Keeper", fil: "Bantay sa Tulay" },
    movement: "stationary",
    areaKey: "river-path",
    assetKey: "npc-bridge-keeper",
    position: BRIDGE_KEEPER_POSITION,
    interactionPosition: BRIDGE_KEEPER_INTERACTION_POSITION,
    collisionBase: npcBase(BRIDGE_KEEPER_POSITION),
    renderDepth: BRIDGE_KEEPER_POSITION.y,
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
    roleTitle: { en: "Village Farmer", fil: "Magsasaka sa Baryo" },
    movement: "stationary",
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
  },
  {
    id: "miss-yuuri",
    displayName: "Miss Yuuri",
    role: "librarian",
    roleTitle: { en: "Village Librarian", fil: "Librarian ng Baryo" },
    movement: "ambient",
    areaKey: "central-plaza",
    assetKey: "ambient-miss-yuuri",
    position: tileCenter(24, 24),
    interactionPosition: tileCenter(24, 24),
    collisionBase: npcBase(tileCenter(24, 24)),
    renderDepth: tileCenter(24, 24).y,
    interactionLabel: "Talk to Miss Yuuri",
    temporarySpriteMapping: "Ninja Adventure Princess walking sprite",
    optionalDialogue: {
      en: [
        "I am the village librarian. I choose short stories for new readers.",
        "The old notes say every mark on Lolo Ambo's map protects a place and its story.",
        "That is why we read the signs. They help us remember the Lost Kingdom."
      ],
      fil: [
        "Ako ang librarian ng baryo. Pumipili ako ng maiikling kuwento para sa mga bagong mambabasa.",
        "Sabi sa lumang note, bawat marka sa mapa ni Lolo Ambo ay may lugar at kuwento.",
        "Kaya binabasa natin ang mga sign. Tinutulungan tayo nitong maalala ang Lost Kingdom."
      ]
    }
  },
  {
    id: "mang-panda",
    displayName: "Mang Panda",
    role: "carpenter",
    roleTitle: { en: "Village Carpenter", fil: "Karpintero ng Baryo" },
    movement: "ambient",
    areaKey: "south-lane",
    assetKey: "ambient-mang-panda",
    position: tileCenter(23, 30),
    interactionPosition: tileCenter(23, 30),
    collisionBase: npcBase(tileCenter(23, 30)),
    renderDepth: tileCenter(23, 30).y,
    interactionLabel: "Talk to Mang Panda",
    temporarySpriteMapping: "Ninja Adventure OldMan3 walking sprite",
    optionalDialogue: {
      en: [
        "I am the village carpenter. I repaired the reading tables and the welcome sign.",
        "I also replace the small trail signs when rain wears them down.",
        "A clear sign keeps readers on the old route marked by Lolo Ambo."
      ],
      fil: [
        "Ako ang karpintero ng baryo. Inayos ko ang mga reading table at welcome sign.",
        "Pinapalitan ko rin ang maliliit na sign sa daan kapag nasira ng ulan.",
        "Kapag malinaw ang sign, nasusundan ng mga mambabasa ang lumang daan sa mapa ni Lolo Ambo."
      ]
    }
  },
  {
    id: "mr-kikushibu",
    displayName: "Mr. Kikushibu",
    role: "history-teacher",
    roleTitle: { en: "History Teacher", fil: "Guro sa History" },
    movement: "ambient",
    areaKey: "north-gate",
    assetKey: "ambient-mr-kikushibu",
    position: tileCenter(31, 6),
    interactionPosition: tileCenter(31, 6),
    collisionBase: npcBase(tileCenter(31, 6)),
    renderDepth: tileCenter(31, 6).y,
    interactionLabel: "Talk to Mr. Kikushibu",
    temporarySpriteMapping: "Ninja Adventure Inspector walking sprite",
    optionalDialogue: {
      en: [
        "I teach the history of our village and the Lost Kingdom.",
        "The kingdom was forgotten when people stopped reading its old signs and maps.",
        "Each reader who follows the route helps the village remember."
      ],
      fil: [
        "Itinuturo ko ang history ng baryo at ng Lost Kingdom.",
        "Nakalimutan ang kaharian nang hindi na binasa ng mga tao ang mga lumang sign at mapa.",
        "Bawat mambabasa na sumusunod sa daan ay tumutulong sa baryo na maalala ito."
      ]
    }
  }
];

export const STATIONARY_NPCS: readonly NpcDefinition[] = NPCS.filter(
  (npc) => npc.movement === "stationary"
);

export const AMBIENT_NPCS: readonly NpcDefinition[] = NPCS.filter(
  (npc) => npc.movement === "ambient"
);

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
