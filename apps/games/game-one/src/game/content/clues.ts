export const CLUE_IDS = [
  "estelle-mission",
  "lolo-river-path",
  "vendor-old-bridge",
  "keeper-twin-waterfalls",
  "river-sign",
  "forest-sign"
] as const;

export type ClueId = (typeof CLUE_IDS)[number];

export const SIGN_IDS = ["river-path-sign", "forest-path-sign"] as const;
export type SignId = (typeof SIGN_IDS)[number];

export type SignDefinition = {
  id: SignId;
  label: string;
  position: { x: number; y: number };
  dialogueId: "river-path-sign" | "forest-path-sign";
};

export const SIGNS: readonly SignDefinition[] = [
  {
    id: "river-path-sign",
    label: "Read the river path sign",
    position: { x: 768, y: 400 },
    dialogueId: "river-path-sign"
  },
  {
    id: "forest-path-sign",
    label: "Read the forest path sign",
    position: { x: 976, y: 256 },
    dialogueId: "forest-path-sign"
  }
];
