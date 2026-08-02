import type { AudioCue } from "../types";

export type SoundAssetId =
  | Exclude<AudioCue, "tractor-loop-start" | "tractor-loop-stop" | "extra-life">
  | "tractor-loop";

export interface SoundAsset {
  mp3: string;
  ogg: string;
  volume: number;
  voices: number;
  loop?: boolean;
}

function soundAsset(
  basename: string,
  options: Omit<SoundAsset, "mp3" | "ogg">,
): SoundAsset {
  return {
    mp3: new URL(
      `../../assets/audio/sound-effects/${basename}.mp3`,
      import.meta.url,
    ).href,
    ogg: new URL(
      `../../assets/audio/sound-effects/${basename}.ogg`,
      import.meta.url,
    ).href,
    ...options,
  };
}

export const soundAssets: Readonly<Record<SoundAssetId, SoundAsset>> = {
  "player-shot": soundAsset("player-shot", { volume: 0.35, voices: 4 }),
  "basic-enemy-destroyed": soundAsset("basic-enemy-destroyed", {
    volume: 0.42,
    voices: 4,
  }),
  "strong-enemy-hit": soundAsset("strong-enemy-hit", {
    volume: 0.42,
    voices: 2,
  }),
  "strong-enemy-destroyed": soundAsset("strong-enemy-destroyed", {
    volume: 0.48,
    voices: 2,
  }),
  "special-enemy-destroyed": soundAsset("special-enemy-destroyed", {
    volume: 0.48,
    voices: 2,
  }),
  "enemy-dive": soundAsset("enemy-dive", { volume: 0.3, voices: 1 }),
  "enemy-projectile": soundAsset("enemy-projectile", {
    volume: 0.25,
    voices: 3,
  }),
  "special-charge": soundAsset("special-charge", {
    volume: 0.36,
    voices: 1,
  }),
  "ship-explosion": soundAsset("ship-explosion", {
    volume: 0.58,
    voices: 1,
  }),
  "ally-hit-warning": soundAsset("ally-hit-warning", {
    volume: 0.62,
    voices: 1,
  }),
  "formation-pulse": soundAsset("formation-pulse", {
    volume: 0.16,
    voices: 1,
  }),
  "enemy-morph": soundAsset("enemy-morph", { volume: 0.4, voices: 1 }),
  "tractor-start": soundAsset("tractor-start", { volume: 0.45, voices: 1 }),
  "tractor-loop": soundAsset("tractor-loop", {
    volume: 0.28,
    voices: 1,
    loop: true,
  }),
  "tractor-capture-complete": soundAsset("tractor-capture-complete", {
    volume: 0.48,
    voices: 1,
  }),
  "player-captured": soundAsset("player-captured", {
    volume: 0.45,
    voices: 1,
  }),
  "fighter-rescued": soundAsset("fighter-rescued", {
    volume: 0.5,
    voices: 1,
  }),
  "captured-fighter-destroyed": soundAsset("captured-fighter-destroyed", {
    volume: 0.5,
    voices: 1,
  }),
  "menu-select": soundAsset("menu-select", { volume: 0.35, voices: 1 }),
  "menu-cancel": soundAsset("menu-cancel", { volume: 0.35, voices: 1 }),
  "low-heart-warning": soundAsset("low-heart-warning", {
    volume: 0.38,
    voices: 1,
  }),
};

export function preferredSoundUrl(asset: SoundAsset): string {
  if (typeof document === "undefined") return asset.mp3;
  const probe = document.createElement("audio");
  return probe.canPlayType('audio/ogg; codecs="vorbis"')
    ? asset.ogg
    : asset.mp3;
}
