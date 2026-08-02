import {
  preferredSoundUrl,
  soundAssets,
  type SoundAssetId,
} from "./audioManifest";
import type { AudioCue } from "../types";

export class GameAudio {
  private context: AudioContext | null = null;
  private muted = false;
  private destroyed = false;
  private buffers = new Map<SoundAssetId, Promise<AudioBuffer>>();
  private active = new Map<SoundAssetId, Set<AudioBufferSourceNode>>();
  private timers = new Set<number>();

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stopAll();
  }

  async resume(): Promise<void> {
    if (this.destroyed || this.muted || typeof AudioContext === "undefined")
      return;
    const context = this.getContext();
    if (context.state === "suspended") await context.resume();
  }

  handleCues(cues: readonly AudioCue[]): void {
    const alphabetDeath =
      cues.includes("ally-hit-warning") && cues.includes("ship-explosion");

    for (const cue of cues) {
      if (cue === "tractor-loop-start") {
        void this.play("tractor-loop");
      } else if (cue === "tractor-loop-stop") {
        this.stop("tractor-loop");
      } else if (cue === "extra-life") {
        // A dedicated extra-life jingle is intentionally not assigned yet.
      } else if (cue === "ship-explosion" && alphabetDeath) {
        const timer = window.setTimeout(() => {
          this.timers.delete(timer);
          void this.play("ship-explosion");
        }, 110);
        this.timers.add(timer);
      } else {
        void this.play(cue);
      }
    }
  }

  async play(id: SoundAssetId): Promise<void> {
    if (this.destroyed || this.muted) return;
    const asset = soundAssets[id];
    const current = this.active.get(id) ?? new Set<AudioBufferSourceNode>();
    if (current.size >= asset.voices) return;

    try {
      const context = this.getContext();
      if (context.state === "suspended") await context.resume();
      const buffer = await this.load(id);
      if (this.destroyed || this.muted) return;

      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = asset.loop ?? false;
      gain.gain.value = asset.volume;
      source.connect(gain);
      gain.connect(context.destination);
      source.addEventListener("ended", () => {
        current.delete(source);
        source.disconnect();
        gain.disconnect();
      });
      current.add(source);
      this.active.set(id, current);
      source.start();
    } catch {
      // Audio must never stop or corrupt gameplay when decoding is unavailable.
    }
  }

  stop(id: SoundAssetId): void {
    const sources = this.active.get(id);
    if (!sources) return;
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        // The source may already have ended between scheduling and cleanup.
      }
    }
    sources.clear();
    this.active.delete(id);
  }

  stopAll(): void {
    for (const id of this.active.keys()) this.stop(id);
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    this.stopAll();
    this.buffers.clear();
    if (this.context && this.context.state !== "closed") {
      await this.context.close();
    }
    this.context = null;
  }

  private getContext(): AudioContext {
    if (!this.context) this.context = new AudioContext();
    return this.context;
  }

  private load(id: SoundAssetId): Promise<AudioBuffer> {
    const existing = this.buffers.get(id);
    if (existing) return existing;

    const promise = fetch(preferredSoundUrl(soundAssets[id]))
      .then((response) => {
        if (!response.ok)
          throw new Error(`Unable to load Game Alpha sound: ${id}`);
        return response.arrayBuffer();
      })
      .then((data) => this.getContext().decodeAudioData(data));
    this.buffers.set(id, promise);
    return promise;
  }
}
