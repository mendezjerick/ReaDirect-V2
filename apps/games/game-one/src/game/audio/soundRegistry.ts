import type { MapAreaKey } from "../map/prototypeMap";

export type SoundCategory = "ambience" | "footsteps" | "navigation" | "interaction" | "feedback" | "interface" | "music";
export type SoundDefinition = {
  id: string;
  category: SoundCategory;
  filePath: null;
  terrainOrLocationId?: string;
  baseVolume: number;
  loop: boolean;
  fadeMs: number;
  priority: number;
  cooldownMs: number;
  status: "temporary-browser-synth";
  frequency: number;
};

function sound(definition: Omit<SoundDefinition, "filePath" | "status">): SoundDefinition {
  return { ...definition, filePath: null, status: "temporary-browser-synth" };
}

export const RPG_SOUNDS = {
  "footstep-land": sound({ id: "footstep-land", category: "footsteps", terrainOrLocationId: "land", baseVolume: 0.07, loop: false, fadeMs: 20, priority: 4, cooldownMs: 300, frequency: 150 }),
  "footstep-grass": sound({ id: "footstep-grass", category: "footsteps", terrainOrLocationId: "grass", baseVolume: 0.055, loop: false, fadeMs: 25, priority: 4, cooldownMs: 320, frequency: 230 }),
  "footstep-stone": sound({ id: "footstep-stone", category: "footsteps", terrainOrLocationId: "stone", baseVolume: 0.055, loop: false, fadeMs: 18, priority: 4, cooldownMs: 290, frequency: 310 }),
  "footstep-wood": sound({ id: "footstep-wood", category: "footsteps", terrainOrLocationId: "wood", baseVolume: 0.06, loop: false, fadeMs: 20, priority: 4, cooldownMs: 310, frequency: 190 }),
  "swim-wave": sound({ id: "swim-wave", category: "ambience", terrainOrLocationId: "water", baseVolume: 0.045, loop: false, fadeMs: 30, priority: 4, cooldownMs: 380, frequency: 140 }),
  "ambience-village": sound({ id: "ambience-village", category: "ambience", terrainOrLocationId: "village", baseVolume: 0.018, loop: true, fadeMs: 650, priority: 5, cooldownMs: 0, frequency: 96 }),
  "ambience-market": sound({ id: "ambience-market", category: "ambience", terrainOrLocationId: "market-area", baseVolume: 0.016, loop: true, fadeMs: 650, priority: 5, cooldownMs: 0, frequency: 118 }),
  "ambience-forest": sound({ id: "ambience-forest", category: "ambience", terrainOrLocationId: "forest", baseVolume: 0.015, loop: true, fadeMs: 700, priority: 5, cooldownMs: 0, frequency: 82 }),
  "ambience-water": sound({ id: "ambience-water", category: "ambience", terrainOrLocationId: "old-bridge", baseVolume: 0.017, loop: true, fadeMs: 700, priority: 5, cooldownMs: 0, frequency: 72 }),
  "cue-mission": sound({ id: "cue-mission", category: "navigation", baseVolume: 0.08, loop: false, fadeMs: 40, priority: 2, cooldownMs: 600, frequency: 440 }),
  "cue-guide": sound({ id: "cue-guide", category: "navigation", baseVolume: 0.055, loop: false, fadeMs: 40, priority: 3, cooldownMs: 700, frequency: 520 }),
  "cue-arrival": sound({ id: "cue-arrival", category: "navigation", baseVolume: 0.07, loop: false, fadeMs: 50, priority: 2, cooldownMs: 1000, frequency: 660 }),
  "cue-interact": sound({ id: "cue-interact", category: "interaction", baseVolume: 0.055, loop: false, fadeMs: 35, priority: 3, cooldownMs: 700, frequency: 560 }),
  "cue-map": sound({ id: "cue-map", category: "interface", baseVolume: 0.045, loop: false, fadeMs: 30, priority: 3, cooldownMs: 150, frequency: 390 }),
  "cue-correct": sound({ id: "cue-correct", category: "feedback", baseVolume: 0.08, loop: false, fadeMs: 50, priority: 2, cooldownMs: 500, frequency: 720 }),
  "cue-incorrect": sound({ id: "cue-incorrect", category: "feedback", baseVolume: 0.045, loop: false, fadeMs: 50, priority: 2, cooldownMs: 500, frequency: 250 }),
  "cue-complete": sound({ id: "cue-complete", category: "feedback", baseVolume: 0.09, loop: false, fadeMs: 80, priority: 2, cooldownMs: 1200, frequency: 820 })
} as const;

export type RpgSoundId = keyof typeof RPG_SOUNDS;

export const LOCATION_AMBIENCE: Record<MapAreaKey, RpgSoundId> = {
  "north-gate": "ambience-water",
  "central-plaza": "ambience-village",
  "market-area": "ambience-market",
  "west-homes": "ambience-village",
  "learning-hall-placeholder": "ambience-village",
  "east-homes": "ambience-village",
  "river-path": "ambience-forest",
  "old-bridge": "ambience-water",
  "twin-waterfalls": "ambience-water",
  "south-lane": "ambience-village",
  "farm-woodland": "ambience-forest",
  "east-riverbank": "ambience-water",
  "south-riverbend": "ambience-forest",
  "south-river-cove": "ambience-water",
  "east-river-channel": "ambience-water",
  "riverside-hamlet": "ambience-village",
  "canal-hamlet": "ambience-village",
  "tree-border": "ambience-forest"
};
