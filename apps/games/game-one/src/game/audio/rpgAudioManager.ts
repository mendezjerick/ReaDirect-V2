import type { FootstepSurface, MapAreaKey } from "../map/prototypeMap";
import type { WorldRegionId } from "../world/worldRegions";
import { MUSIC_THEMES, REGION_MUSIC, type MusicDefinition } from "./musicRegistry";
import { LOCATION_AMBIENCE, RPG_SOUNDS, type RpgSoundId, type SoundDefinition } from "./soundRegistry";

export const AUDIO_PREFERENCES_KEY = "readirect-rpg:audio-preferences:v1";

export type AudioPreferences = {
  sound: boolean;
  music: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
};
export type AudioBackend = {
  unlock: () => void;
  play: (definition: SoundDefinition, pitch: number) => void;
  ambience: (definition: SoundDefinition | null, masterVolume: number) => void;
  music: (definition: MusicDefinition | null) => void;
  setMasterVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setDucked: (ducked: boolean) => void;
  setPaused: (paused: boolean) => void;
  stopAll: () => void;
};

const DEFAULT_PREFERENCES: AudioPreferences = {
  sound: true,
  music: true,
  masterVolume: 0.65,
  sfxVolume: 0.8,
  musicVolume: 0.45
};

export function createRpgAudioManager({
  storage = window.localStorage,
  backend = createWebAudioBackend(),
  now = () => performance.now()
}: {
  storage?: Storage;
  backend?: AudioBackend;
  now?: () => number;
} = {}) {
  let preferences = readPreferences(storage);
  let lastFootstepAt = Number.NEGATIVE_INFINITY;
  let stepVariation = 0;
  let currentArea: MapAreaKey | null = null;
  let pendingArea: { id: MapAreaKey; since: number } | null = null;
  let nearbyTarget: string | null = null;
  let currentRegion: WorldRegionId = "village";
  let unlocked = false;
  const lastCueAt = new Map<RpgSoundId, number>();
  backend.setMasterVolume(preferences.masterVolume);
  backend.setSfxVolume(preferences.sfxVolume);
  backend.setMusicVolume(preferences.musicVolume);

  const play = (id: RpgSoundId) => {
    if (!unlocked || !preferences.sound) return false;
    const definition = RPG_SOUNDS[id];
    const currentTime = now();
    if (currentTime - (lastCueAt.get(id) ?? Number.NEGATIVE_INFINITY) < definition.cooldownMs) return false;
    lastCueAt.set(id, currentTime);
    backend.play(definition, 1);
    return true;
  };

  return {
    unlock() {
      if (unlocked) return;
      unlocked = true;
      backend.unlock();
      if (preferences.sound && currentArea) {
        backend.ambience(RPG_SOUNDS[LOCATION_AMBIENCE[currentArea]], preferences.masterVolume);
      }
      backend.music(preferences.music ? playableTheme(currentRegion) : null);
    },
    getPreferences: () => ({ ...preferences }),
    setPreferences(next: AudioPreferences) {
      preferences = {
        ...next,
        masterVolume: clampVolume(next.masterVolume),
        sfxVolume: clampVolume(next.sfxVolume),
        musicVolume: clampVolume(next.musicVolume)
      };
      storage.setItem(AUDIO_PREFERENCES_KEY, JSON.stringify(preferences));
      backend.setMasterVolume(preferences.masterVolume);
      backend.setSfxVolume(preferences.sfxVolume);
      backend.setMusicVolume(preferences.musicVolume);
      if (unlocked && !preferences.sound) backend.ambience(null, preferences.masterVolume);
      else if (unlocked && currentArea) backend.ambience(RPG_SOUNDS[LOCATION_AMBIENCE[currentArea]], preferences.masterVolume);
      if (unlocked) backend.music(preferences.music ? playableTheme(currentRegion) : null);
    },
    setMusicRegion(region: WorldRegionId) {
      if (region === currentRegion) return;
      currentRegion = region;
      if (unlocked) backend.music(preferences.music ? playableTheme(currentRegion) : null);
    },
    updateMovement({ moving, surface }: { moving: boolean; surface: FootstepSurface }) {
      if (!unlocked || !moving || !preferences.sound || surface === "water") return false;
      const id = `footstep-${surface}` as RpgSoundId;
      const definition = RPG_SOUNDS[id] ?? RPG_SOUNDS["footstep-land"];
      const currentTime = now();
      if (currentTime - lastFootstepAt < definition.cooldownMs) return false;
      lastFootstepAt = currentTime;
      stepVariation = (stepVariation + 1) % 3;
      backend.play(definition, [0.96, 1, 1.04][stepVariation]);
      return true;
    },
    updateLocation(area: MapAreaKey) {
      if (area === currentArea) { pendingArea = null; return; }
      const currentTime = now();
      if (!currentArea) {
        currentArea = area;
      } else if (pendingArea?.id !== area) {
        pendingArea = { id: area, since: currentTime };
        return;
      } else if (currentTime - pendingArea.since < 600) {
        return;
      } else {
        currentArea = area;
        pendingArea = null;
      }
      if (unlocked && preferences.sound) backend.ambience(RPG_SOUNDS[LOCATION_AMBIENCE[currentArea]], preferences.masterVolume);
    },
    setNearbyTarget(targetId: string | null) {
      if (targetId && targetId !== nearbyTarget) play("cue-arrival");
      nearbyTarget = targetId;
    },
    missionActivated: () => play("cue-mission"),
    guideShown: () => play("cue-guide"),
    interactionAvailable: () => play("cue-interact"),
    mapChanged: () => play("cue-map"),
    correct: () => play("cue-correct"),
    incorrect: () => play("cue-incorrect"),
    completed: () => play("cue-complete"),
    setDucked: backend.setDucked,
    setPaused: backend.setPaused,
    stop: backend.stopAll
  };
}

function readPreferences(storage: Storage): AudioPreferences {
  try {
    const parsed = JSON.parse(storage.getItem(AUDIO_PREFERENCES_KEY) ?? "null") as Partial<AudioPreferences> | null;
    return parsed && typeof parsed.sound === "boolean" && typeof parsed.music === "boolean" && typeof parsed.masterVolume === "number"
      ? {
          sound: parsed.sound,
          music: parsed.music,
          masterVolume: clampVolume(parsed.masterVolume),
          sfxVolume: clampVolume(parsed.sfxVolume ?? DEFAULT_PREFERENCES.sfxVolume),
          musicVolume: clampVolume(parsed.musicVolume ?? DEFAULT_PREFERENCES.musicVolume)
        }
      : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function clampVolume(volume: number) {
  return Math.min(1, Math.max(0, volume));
}

function playableTheme(region: WorldRegionId) {
  const id = REGION_MUSIC[region];
  if (!id) return null;
  const theme = MUSIC_THEMES[id];
  return theme.status === "temporary-browser-synth" ? theme : null;
}

function createWebAudioBackend(): AudioBackend {
  const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return silentBackend();
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let effects: GainNode | null = null;
  let ambienceGain: GainNode | null = null;
  let musicGain: GainNode | null = null;
  let ambienceOscillator: OscillatorNode | null = null;
  let currentAmbience: SoundDefinition | null = null;
  let currentMusic: MusicDefinition | null = null;
  let musicTimer: number | null = null;
  let musicStep = 0;
  let masterVolume = DEFAULT_PREFERENCES.masterVolume;
  let sfxVolume = DEFAULT_PREFERENCES.sfxVolume;
  let musicVolume = DEFAULT_PREFERENCES.musicVolume;
  let ducked = false;
  let paused = false;

  const ensure = () => {
    if (context) return context;
    context = new AudioContextConstructor();
    master = context.createGain();
    effects = context.createGain();
    ambienceGain = context.createGain();
    musicGain = context.createGain();
    effects.connect(master);
    ambienceGain.connect(master);
    musicGain.connect(master);
    master.connect(context.destination);
    applyMaster();
    applyChannelVolumes();
    return context;
  };
  const applyMaster = () => {
    if (!context || !master) return;
    const level = paused ? 0 : masterVolume * (ducked ? 0.28 : 1);
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.linearRampToValueAtTime(level, context.currentTime + 0.18);
  };
  const applyChannelVolumes = () => {
    if (!context) return;
    if (effects) effects.gain.setValueAtTime(sfxVolume, context.currentTime);
    if (ambienceGain && currentAmbience) ambienceGain.gain.setValueAtTime(currentAmbience.baseVolume * sfxVolume, context.currentTime);
    if (musicGain) musicGain.gain.setValueAtTime(musicVolume, context.currentTime);
  };
  const stopMusicLoop = () => {
    if (musicTimer !== null) window.clearInterval(musicTimer);
    musicTimer = null;
    musicStep = 0;
  };
  const playMusicNote = () => {
    if (!currentMusic || paused || !musicGain || !context || context.state !== "running") return;
    const frequency = currentMusic.notes[musicStep % currentMusic.notes.length];
    musicStep += 1;
    if (!frequency) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    envelope.gain.setValueAtTime(0.0001, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(currentMusic.baseVolume, context.currentTime + 0.04);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
    oscillator.connect(envelope);
    envelope.connect(musicGain);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.44);
  };
  const startMusicLoop = () => {
    stopMusicLoop();
    if (!currentMusic || currentMusic.notes.length === 0 || paused) return;
    playMusicNote();
    musicTimer = window.setInterval(playMusicNote, currentMusic.beatMs);
  };

  return {
    unlock() { void ensure().resume().catch(() => undefined); },
    play(definition, pitch) {
      const audio = ensure();
      if (audio.state !== "running" || !effects) return;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = definition.category === "footsteps" ? "triangle" : "sine";
      oscillator.frequency.value = definition.frequency * pitch;
      gain.gain.setValueAtTime(definition.baseVolume, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.09);
      oscillator.connect(gain);
      gain.connect(effects);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.1);
    },
    ambience(definition) {
      const audio = ensure();
      if (!ambienceGain) return;
      currentAmbience = definition;
      const old = ambienceOscillator;
      if (old) {
        ambienceGain.gain.linearRampToValueAtTime(0, audio.currentTime + 0.35);
        old.stop(audio.currentTime + 0.36);
        ambienceOscillator = null;
      }
      if (!definition) return;
      const oscillator = audio.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = definition.frequency;
      ambienceGain.gain.setValueAtTime(0, audio.currentTime + 0.36);
      ambienceGain.gain.linearRampToValueAtTime(definition.baseVolume * sfxVolume, audio.currentTime + definition.fadeMs / 1000 + 0.36);
      oscillator.connect(ambienceGain);
      oscillator.start(audio.currentTime + 0.36);
      ambienceOscillator = oscillator;
    },
    music(definition) {
      ensure();
      if (currentMusic?.id === definition?.id && musicTimer !== null) return;
      currentMusic = definition;
      startMusicLoop();
    },
    setMasterVolume(volume) { masterVolume = volume; applyMaster(); },
    setSfxVolume(volume) { sfxVolume = volume; applyChannelVolumes(); },
    setMusicVolume(volume) { musicVolume = volume; applyChannelVolumes(); },
    setDucked(value) { ducked = value; applyMaster(); },
    setPaused(value) {
      if (paused === value) return;
      paused = value;
      applyMaster();
      if (paused) stopMusicLoop();
      else startMusicLoop();
    },
    stopAll() {
      stopMusicLoop();
      ambienceOscillator?.stop();
      ambienceOscillator = null;
      void context?.close().catch(() => undefined);
      context = null;
    }
  };
}

function silentBackend(): AudioBackend {
  return {
    unlock() {},
    play() {},
    ambience() {},
    music() {},
    setMasterVolume() {},
    setSfxVolume() {},
    setMusicVolume() {},
    setDucked() {},
    setPaused() {},
    stopAll() {}
  };
}
