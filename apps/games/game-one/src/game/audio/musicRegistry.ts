import type { WorldRegionId } from "../world/worldRegions";

export type MusicThemeId = "village-day" | "forest-placeholder" | "river-placeholder";

export type MusicDefinition = {
  id: MusicThemeId;
  regionId: WorldRegionId;
  status: "temporary-browser-synth" | "placeholder-unavailable";
  notes: readonly number[];
  beatMs: number;
  baseVolume: number;
};

export const MUSIC_THEMES: Record<MusicThemeId, MusicDefinition> = {
  "village-day": {
    id: "village-day",
    regionId: "village",
    status: "temporary-browser-synth",
    notes: [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23],
    beatMs: 560,
    baseVolume: 0.035
  },
  "forest-placeholder": {
    id: "forest-placeholder",
    regionId: "forest",
    status: "placeholder-unavailable",
    notes: [],
    beatMs: 0,
    baseVolume: 0
  },
  "river-placeholder": {
    id: "river-placeholder",
    regionId: "river",
    status: "placeholder-unavailable",
    notes: [],
    beatMs: 0,
    baseVolume: 0
  }
};

export const REGION_MUSIC: Record<WorldRegionId, MusicThemeId | null> = {
  village: "village-day",
  forest: "forest-placeholder",
  river: "river-placeholder",
  farm: "village-day",
  jungle: null,
  waterfall: null
};
