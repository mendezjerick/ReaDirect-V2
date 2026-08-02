import { describe, expect, it } from "vitest";
import { BOAT_WAKE_FRAMES, getBoatAnimationState } from "./generatedBoatEffects";

describe("generated boat animation", () => {
  it("cycles wake frames and rowing angles while moving", () => {
    const samples = [0, 0.2, 0.4, 0.6].map((clock) =>
      getBoatAnimationState(clock, true, false)
    );

    expect(new Set(samples.map(({ wakeFrame }) => wakeFrame)).size).toBeGreaterThan(1);
    expect(new Set(samples.map(({ oarAngle }) => Math.round(oarAngle))).size).toBeGreaterThan(1);
    expect(samples.every(({ wakeFrame }) => wakeFrame >= 0 && wakeFrame < BOAT_WAKE_FRAMES)).toBe(true);
    expect(samples.every(({ wakeVisible }) => wakeVisible)).toBe(true);
  });

  it("keeps a gentle bob at rest and respects reduced motion", () => {
    const resting = getBoatAnimationState(0.4, false, false);
    const reduced = getBoatAnimationState(0.4, true, true);

    expect(resting.wakeVisible).toBe(false);
    expect(resting.bobOffset).not.toBe(0);
    expect(reduced).toMatchObject({
      bobOffset: 0,
      oarAngle: 0,
      wakeFrame: 0,
      wakeVisible: true
    });
  });
});
