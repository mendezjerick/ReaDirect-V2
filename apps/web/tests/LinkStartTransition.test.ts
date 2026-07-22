import { describe, expect, it } from "vitest";

import {
  createLinkStartStreaks,
  getLinkStartWaveProgresses,
  LINK_START_COVER_COMPLETE_MS,
  LINK_START_STREAK_COLOR_COUNT,
} from "../src/components/transitions/linkStartMath";

describe("Link Start transition", () => {
  it("uses a smaller deterministic streak field on mobile", () => {
    const firstMobileField = createLinkStartStreaks(390);
    const secondMobileField = createLinkStartStreaks(390);

    expect(firstMobileField).toHaveLength(96);
    expect(secondMobileField).toEqual(firstMobileField);
  });

  it("progressively increases detail for larger viewports", () => {
    expect(createLinkStartStreaks(768)).toHaveLength(140);
    expect(createLinkStartStreaks(1366)).toHaveLength(192);
  });

  it("cycles deterministically through all six fixed prism colors", () => {
    const streaks = createLinkStartStreaks(390);
    const usedColorIndices = new Set(
      streaks.map((streak) => streak.colorIndex),
    );

    expect(usedColorIndices).toEqual(
      new Set(
        Array.from({ length: LINK_START_STREAK_COLOR_COUNT }, (_, i) => i),
      ),
    );
  });

  it("continuously generates overlapping cylinder waves until the white cover completes", () => {
    for (const elapsed of [800, 1200, 1800, 2200, 2524]) {
      expect(getLinkStartWaveProgresses(elapsed, 0)).not.toHaveLength(0);
      expect(getLinkStartWaveProgresses(elapsed, 1)).not.toHaveLength(0);
    }

    expect(getLinkStartWaveProgresses(2524, 0).length).toBeGreaterThan(1);
    expect(
      getLinkStartWaveProgresses(LINK_START_COVER_COMPLETE_MS, 0.5),
    ).toHaveLength(0);
  });
});
