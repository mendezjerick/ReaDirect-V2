import { describe, expect, it } from "vitest";

import { getReadingReminderOwnerKey } from "../src/features/reading-reminder/ReadingReminderCoordinator";

describe("Reading Reminder ownership", () => {
  it("uses a local type-prefixed learner identity without storing sensitive fields", () => {
    expect(
      getReadingReminderOwnerKey({
        learner: { id: 42, account_purpose: "standard" },
      }),
    ).toBe("learner:42");
    expect(
      getReadingReminderOwnerKey({
        learner: { id: 1, account_purpose: "guest" },
      }),
    ).toBe("guest:1");
  });

  it("returns null when no learner session is active", () => {
    expect(getReadingReminderOwnerKey(null)).toBeNull();
  });
});
