import { GAME_ASSETS } from "../assets/assetRegistry";
import type { GameLanguage } from "../localization/language";
import type { Facing, SpriteFacingLayout } from "./playerMovement";

export const PLAYABLE_CHARACTER_PREFERENCE_KEY = "readirect-rpg:playable-character:v1";

export type PlayableCharacterId = "yato" | "blue-hair-explorer" | "iruma" | "luffy" | "frieren";
export type PlayableCharacterAssetKey = "learnerWalk" | "blueHairExplorer" | "iruma" | "luffy" | "frieren";

export type PlayableCharacter = {
  id: PlayableCharacterId;
  name: Record<GameLanguage, string>;
  assetKey: PlayableCharacterAssetKey;
  spriteLayout: SpriteFacingLayout;
  spriteScale: number;
  /** Aligns artwork whose feet are not centered in its source frame. */
  spriteOffsetY: number;
  /** Keeps the explorer seated inside the boat while using a grounded land baseline. */
  boatSpriteOffsetY: number;
  /** Corrects individual directional frames whose feet sit at a different source height. */
  spriteFacingOffsetY: Partial<Record<Facing, number>>;
};

export const PLAYABLE_CHARACTERS: readonly PlayableCharacter[] = [
  {
    id: "yato",
    name: { en: "Yato", fil: "Yato" },
    assetKey: "learnerWalk",
    spriteLayout: "yato",
    spriteScale: 0.17,
    spriteOffsetY: 0,
    boatSpriteOffsetY: 0,
    spriteFacingOffsetY: {}
  },
  {
    id: "blue-hair-explorer",
    name: { en: "Rimuru Tempest", fil: "Rimuru Tempest" },
    assetKey: "blueHairExplorer",
    spriteLayout: "row-walk-four-way",
    spriteScale: 0.15,
    spriteOffsetY: 0,
    boatSpriteOffsetY: 0,
    spriteFacingOffsetY: {}
  },
  {
    id: "iruma",
    name: { en: "Iruma Suzuki", fil: "Iruma Suzuki" },
    assetKey: "iruma",
    spriteLayout: "yato-mirror-left",
    spriteScale: 0.35,
    spriteOffsetY: 0,
    boatSpriteOffsetY: 0,
    spriteFacingOffsetY: {}
  },
  {
    id: "luffy",
    name: { en: "Monkey D. Luffy", fil: "Monkey D. Luffy" },
    assetKey: "luffy",
    spriteLayout: "yato-mirror-left",
    spriteScale: 0.21, // scale down from 256px to fit game tiles
    spriteOffsetY: 0,
    boatSpriteOffsetY: 0,
    spriteFacingOffsetY: {}
  },
  {
    id: "frieren",
    name: { en: "Frieren", fil: "Frieren" },
    assetKey: "frieren",
    spriteLayout: "row-three-dir",
    spriteScale: 0.29,
    spriteOffsetY: 0,
    boatSpriteOffsetY: 0,
    spriteFacingOffsetY: {}
  }
] as const;

export const DEFAULT_PLAYABLE_CHARACTER_ID: PlayableCharacterId = "yato";

export function getPlayableCharacter(id: PlayableCharacterId = DEFAULT_PLAYABLE_CHARACTER_ID) {
  return PLAYABLE_CHARACTERS.find((character) => character.id === id) ?? PLAYABLE_CHARACTERS[0];
}

export function getPlayableCharacterAsset(id: PlayableCharacterId) {
  return GAME_ASSETS[getPlayableCharacter(id).assetKey];
}

export function getPlayableCharacterRenderOffsetY(
  character: PlayableCharacter,
  facing: Facing,
  ridingBoat = false
) {
  return (ridingBoat ? character.boatSpriteOffsetY : character.spriteOffsetY)
    + (character.spriteFacingOffsetY[facing] ?? 0);
}

export function isPlayableCharacterId(value: unknown): value is PlayableCharacterId {
  return PLAYABLE_CHARACTERS.some((character) => character.id === value);
}

export function loadPlayableCharacterSelection(storage: Storage = window.localStorage) {
  try {
    const value = storage.getItem(PLAYABLE_CHARACTER_PREFERENCE_KEY);
    return isPlayableCharacterId(value) ? value : null;
  } catch {
    return null;
  }
}

export function savePlayableCharacterSelection(
  id: PlayableCharacterId,
  storage: Storage = window.localStorage
) {
  try {
    storage.setItem(PLAYABLE_CHARACTER_PREFERENCE_KEY, id);
  } catch {
    // The selection remains active until the learner leaves this game session.
  }
}
