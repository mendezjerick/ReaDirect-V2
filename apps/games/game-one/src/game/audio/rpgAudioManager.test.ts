import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIO_PREFERENCES_KEY, createRpgAudioManager, type AudioBackend } from "./rpgAudioManager";

describe("RPG terrain and location audio", () => {
  let time = 0;
  let backend: AudioBackend;
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    time = 0;
    backend = {
      unlock: vi.fn(),
      play: vi.fn(),
      ambience: vi.fn(),
      music: vi.fn(),
      setMasterVolume: vi.fn(),
      setSfxVolume: vi.fn(),
      setMusicVolume: vi.fn(),
      setDucked: vi.fn(),
      setPaused: vi.fn(),
      stopAll: vi.fn()
    };
  });

  it("waits for a learner gesture before starting location audio", () => {
    const audio = manager();
    audio.updateLocation("central-plaza");
    expect(backend.ambience).not.toHaveBeenCalled();

    audio.unlock();
    expect(backend.unlock).toHaveBeenCalledOnce();
    expect(lastAmbienceId()).toBe("ambience-village");
  });

  it("uses only the current terrain footstep while the player actually moves", () => {
    const audio = manager();
    audio.unlock();

    expect(audio.updateMovement({ moving: false, surface: "land" })).toBe(false);
    expect(audio.updateMovement({ moving: true, surface: "land" })).toBe(true);
    time = 400;
    expect(audio.updateMovement({ moving: true, surface: "grass" })).toBe(true);
    expect(vi.mocked(backend.play).mock.calls.map(([sound]) => sound.id)).toEqual([
      "footstep-land",
      "footstep-grass"
    ]);
  });

  it("uses the wood footstep for indoor shop floors", () => {
    const audio = manager();
    audio.unlock();

    expect(audio.updateMovement({ moving: true, surface: "wood" })).toBe(true);
    expect(vi.mocked(backend.play).mock.calls[0]?.[0].id).toBe("footstep-wood");
  });

  it("plays a cooled swimming wave while the learner is moving in water", () => {
    const audio = manager();
    audio.unlock();

    expect(audio.updateSwimming({ swimming: false, moving: true })).toBe(false);
    expect(audio.updateSwimming({ swimming: true, moving: false })).toBe(false);
    expect(audio.updateSwimming({ swimming: true, moving: true })).toBe(true);
    time = 100;
    expect(audio.updateSwimming({ swimming: true, moving: true })).toBe(false);
    time = 500;
    expect(audio.updateSwimming({ swimming: true, moving: true })).toBe(true);
    expect(vi.mocked(backend.play).mock.calls.map(([sound]) => sound.id)).toEqual([
      "swim-wave",
      "swim-wave"
    ]);
  });

  it("prevents rapid overlapping footsteps and honors the sound setting", () => {
    const audio = manager();
    audio.unlock();
    expect(audio.updateMovement({ moving: true, surface: "grass" })).toBe(true);
    time = 100;
    expect(audio.updateMovement({ moving: true, surface: "grass" })).toBe(false);
    audio.setPreferences(preferences({ sound: false, music: true, masterVolume: 0.5 }));
    time = 1000;
    expect(audio.updateMovement({ moving: true, surface: "grass" })).toBe(false);
    expect(vi.mocked(backend.play)).toHaveBeenCalledTimes(1);
  });

  it("changes ambience only after a location remains stable", () => {
    const audio = manager();
    audio.unlock();
    audio.updateLocation("central-plaza");
    time = 100;
    audio.updateLocation("market-area");
    time = 500;
    audio.updateLocation("market-area");
    expect(lastAmbienceId()).toBe("ambience-village");
    time = 701;
    audio.updateLocation("market-area");
    expect(lastAmbienceId()).toBe("ambience-market");
    expect(backend.ambience).toHaveBeenCalledTimes(2);
  });

  it("plays arrival once until the learner leaves and returns", () => {
    const audio = manager();
    audio.unlock();
    audio.setNearbyTarget("miss-estelle");
    audio.setNearbyTarget("miss-estelle");
    expect(cueCount("cue-arrival")).toBe(1);
    audio.setNearbyTarget(null);
    time = 1200;
    audio.setNearbyTarget("miss-estelle");
    expect(cueCount("cue-arrival")).toBe(2);
  });

  it("persists settings and forwards duck, pause, and cleanup state", () => {
    const audio = manager();
    audio.setPreferences(preferences({ sound: true, music: false, masterVolume: 0.4, sfxVolume: 0.7, musicVolume: 0.3 }));
    expect(JSON.parse(storage.getItem(AUDIO_PREFERENCES_KEY) ?? "null")).toEqual({
      sound: true,
      music: false,
      masterVolume: 0.4,
      sfxVolume: 0.7,
      musicVolume: 0.3
    });
    audio.setDucked(true);
    audio.setPaused(true);
    audio.stop();
    expect(backend.setDucked).toHaveBeenCalledWith(true);
    expect(backend.setPaused).toHaveBeenCalledWith(true);
    expect(backend.stopAll).toHaveBeenCalledOnce();
  });

  it("starts one gesture-gated village theme and stops it in placeholder regions", () => {
    const audio = manager();
    expect(backend.music).not.toHaveBeenCalled();
    audio.unlock();
    expect(vi.mocked(backend.music).mock.calls.at(-1)?.[0]?.id).toBe("village-day");
    audio.setMusicRegion("forest");
    expect(vi.mocked(backend.music).mock.calls.at(-1)?.[0]).toBeNull();
  });

  it("migrates older stored preferences with separate channel defaults", () => {
    storage.setItem(AUDIO_PREFERENCES_KEY, JSON.stringify({ sound: true, music: true, masterVolume: 0.5 }));
    expect(manager().getPreferences()).toEqual({ sound: true, music: true, masterVolume: 0.5, sfxVolume: 0.8, musicVolume: 0.45 });
  });

  function manager() {
    return createRpgAudioManager({ backend, storage, now: () => time });
  }

  function lastAmbienceId() {
    return vi.mocked(backend.ambience).mock.calls.at(-1)?.[0]?.id;
  }

  function cueCount(id: string) {
    return vi.mocked(backend.play).mock.calls.filter(([sound]) => sound.id === id).length;
  }

  function preferences(overrides: Partial<{ sound: boolean; music: boolean; masterVolume: number; sfxVolume: number; musicVolume: number }> = {}) {
    return { sound: true, music: true, masterVolume: 0.65, sfxVolume: 0.8, musicVolume: 0.45, ...overrides };
  }
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };
}
