import { describe, expect, it, vi } from "vitest";

const preferenceApi = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: preferenceApi,
}));

import {
  DEFAULT_READING_REMINDER_SETTINGS,
  createCapacitorReadingReminderPreferenceStore,
  parseReadingReminderPreference,
} from "../src/features/reading-reminder/readingReminderPreferences";

describe("Reading Reminder preferences", () => {
  it("rejects corrupt or wrong-schema values safely", () => {
    expect(parseReadingReminderPreference("not-json")).toBeNull();
    expect(
      parseReadingReminderPreference(
        JSON.stringify({
          ...DEFAULT_READING_REMINDER_SETTINGS,
          schemaVersion: 2,
        }),
      ),
    ).toBeNull();
    expect(
      parseReadingReminderPreference(
        JSON.stringify({
          ...DEFAULT_READING_REMINDER_SETTINGS,
          repeat: "selected",
          days: [],
        }),
      ),
    ).toBeNull();
  });

  it("uses the approved versioned Capacitor Preferences key", async () => {
    preferenceApi.get.mockResolvedValue({ value: null });
    const store = createCapacitorReadingReminderPreferenceStore();

    expect(await store.get()).toBeNull();
    expect(preferenceApi.get).toHaveBeenCalledWith({
      key: "readirect.reading-reminder.v1",
    });
  });
});
