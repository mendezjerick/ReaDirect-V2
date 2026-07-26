import { describe, expect, it, vi } from "vitest";

import { findLargestFittingFontSize } from "../src/features/learner-activity/useFittedPassageText";

describe("findLargestFittingFontSize", () => {
  it("keeps the authored maximum when the passage already fits", () => {
    const fitsAtSize = vi.fn(() => true);

    expect(findLargestFittingFontSize(1, 23, fitsAtSize)).toBe(23);
    expect(fitsAtSize).toHaveBeenCalledOnce();
  });

  it("reduces the passage to the largest size that fits its rendered area", () => {
    const fittedSize = findLargestFittingFontSize(
      1,
      23,
      (fontSize) => fontSize <= 12.4,
    );

    expect(fittedSize).toBeGreaterThanOrEqual(12.3);
    expect(fittedSize).toBeLessThanOrEqual(12.4);
  });

  it("returns the smallest responsive size when no larger candidate fits", () => {
    expect(findLargestFittingFontSize(1, 23, () => false)).toBe(1);
  });
});
