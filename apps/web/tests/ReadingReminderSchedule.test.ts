import { describe, expect, it } from "vitest";

import {
  READING_REMINDER_NOTIFICATION_IDS,
  buildReadingReminderNotifications,
  getReadingReminderDays,
} from "../src/features/reading-reminder/readingReminderSchedule";
import type { ReadingReminderDay } from "../src/features/reading-reminder/readingReminderSchedule";

const baseSettings = {
  schemaVersion: 1 as const,
  enabled: true,
  time: "18:00",
  repeat: "weekdays" as const,
  days: ["MON", "TUE", "WED", "THU", "FRI"] as ReadingReminderDay[],
  ownerKey: "learner:1",
  timezoneOffsetMinutes: -480,
};

describe("Reading Reminder schedule mapping", () => {
  it("maps Daily to all seven deterministic weekday IDs", () => {
    expect(
      getReadingReminderDays({ ...baseSettings, repeat: "daily", days: [] }),
    ).toEqual(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);

    const notifications = buildReadingReminderNotifications({
      ...baseSettings,
      repeat: "daily",
      days: [],
    });

    expect(notifications.map(({ id }) => id)).toEqual([
      READING_REMINDER_NOTIFICATION_IDS.SUN,
      READING_REMINDER_NOTIFICATION_IDS.MON,
      READING_REMINDER_NOTIFICATION_IDS.TUE,
      READING_REMINDER_NOTIFICATION_IDS.WED,
      READING_REMINDER_NOTIFICATION_IDS.THU,
      READING_REMINDER_NOTIFICATION_IDS.FRI,
      READING_REMINDER_NOTIFICATION_IDS.SAT,
    ]);
  });

  it("maps Weekdays and Selected Days without creating extra schedules", () => {
    expect(getReadingReminderDays(baseSettings)).toEqual([
      "MON",
      "TUE",
      "WED",
      "THU",
      "FRI",
    ]);
    expect(
      getReadingReminderDays({
        ...baseSettings,
        repeat: "selected",
        days: ["SUN", "SAT"],
      }),
    ).toEqual(["SUN", "SAT"]);
  });

  it("creates privacy-safe inexact local notification payloads", () => {
    const [notification] = buildReadingReminderNotifications(baseSettings);

    expect(notification).toMatchObject({
      id: READING_REMINDER_NOTIFICATION_IDS.MON,
      title: "Monday reading warm-up",
      body: "Start the week with a few minutes of reading practice.",
      channelId: "reading-reminders-v1",
      isExactNotification: false,
      autoCancel: true,
      schedule: {
        allowWhileIdle: true,
        on: { weekday: 2, hour: 18, minute: 0 },
      },
    });
    expect(notification).not.toHaveProperty("extra");
  });

  it("gives each scheduled weekday a distinct privacy-safe message", () => {
    const notifications = buildReadingReminderNotifications({
      ...baseSettings,
      repeat: "daily",
      days: [],
    });
    const messages = notifications.map(({ title, body }) => `${title}|${body}`);

    expect(new Set(messages).size).toBe(notifications.length);
  });
});
