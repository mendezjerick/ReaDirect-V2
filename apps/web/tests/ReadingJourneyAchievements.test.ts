import { describe, expect, it } from "vitest";

import { readingJourneyAchievements } from "../src/features/achievements/readingJourneyAchievements";

describe("Reading Journey achievement artwork", () => {
  it("assigns one distinct published pixel icon to every achievement", () => {
    const iconPaths = readingJourneyAchievements.map(
      (achievement) => achievement.iconPath,
    );

    expect(readingJourneyAchievements).toHaveLength(8);
    expect(new Set(iconPaths).size).toBe(8);
    expect(
      iconPaths.every((path) =>
        /^\/assets\/icons\/achievements\/[a-z-]+\.png$/.test(path),
      ),
    ).toBe(true);
  });
});
