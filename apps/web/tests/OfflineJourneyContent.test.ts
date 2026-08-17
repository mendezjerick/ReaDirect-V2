import { describe, expect, it } from "vitest";

import { offlineJourneyContent } from "../src/apk/content/offlineJourneyContent";

describe("offline journey content", () => {
  it("contains the fixed Diagnostic, six lessons, and Final Assessment", () => {
    expect(offlineJourneyContent.assessments.diagnostic.items).toHaveLength(36);
    expect(offlineJourneyContent.lessons).toHaveLength(6);
    expect(
      offlineJourneyContent.lessons.map(({ items }) => items.length),
    ).toEqual([15, 10, 5, 5, 1, 5]);
    expect(offlineJourneyContent.assessments.final.items).toHaveLength(36);

    const allActivities = [
      offlineJourneyContent.assessments.diagnostic,
      ...offlineJourneyContent.lessons,
      offlineJourneyContent.assessments.final,
    ];
    expect(
      allActivities.reduce(
        (total, activity) => total + activity.items.length,
        0,
      ),
    ).toBe(113);
    for (const activity of allActivities) {
      expect(new Set(activity.items.map(({ key }) => key)).size).toBe(
        activity.items.length,
      );
    }
  });
});
