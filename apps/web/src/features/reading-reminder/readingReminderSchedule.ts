import type {
  LocalNotificationSchema,
  Weekday,
} from "@capacitor/local-notifications";

import type { ReadingReminderPreference } from "./readingReminderPreferences";

export const READING_REMINDER_CHANNEL_ID = "reading-reminders-v1";
export const READING_REMINDER_CHANNEL_NAME = "Reading Reminders";
export const READING_REMINDER_CHANNEL_DESCRIPTION =
  "Gentle reminders to practice reading with ReaDirect.";

export const READING_REMINDER_NOTIFICATION_IDS = {
  SUN: 48100,
  MON: 48101,
  TUE: 48102,
  WED: 48103,
  THU: 48104,
  FRI: 48105,
  SAT: 48106,
} as const;

export const READING_REMINDER_NOTIFICATION_ID_LIST = Object.values(
  READING_REMINDER_NOTIFICATION_IDS,
);

export type ReadingReminderDay = keyof typeof READING_REMINDER_NOTIFICATION_IDS;

const DAY_ORDER: ReadingReminderDay[] = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
];

const WEEKDAY_NUMBERS: Record<ReadingReminderDay, Weekday> = {
  SUN: 1,
  MON: 2,
  TUE: 3,
  WED: 4,
  THU: 5,
  FRI: 6,
  SAT: 7,
};

const READING_REMINDER_MESSAGES: Record<
  ReadingReminderDay,
  { title: string; body: string }
> = {
  SUN: {
    title: "Sunday story time",
    body: "Take a calm moment to read with ReaDirect.",
  },
  MON: {
    title: "Monday reading warm-up",
    body: "Start the week with a few minutes of reading practice.",
  },
  TUE: {
    title: "Tuesday reading trail",
    body: "Keep your reading journey moving with ReaDirect.",
  },
  WED: {
    title: "Midweek reading moment",
    body: "Pause for a small, confidence-building reading win.",
  },
  THU: {
    title: "Thursday reading boost",
    body: "A short reading practice can brighten your day.",
  },
  FRI: {
    title: "Friday reading finish",
    body: "Finish the week with a few friendly pages.",
  },
  SAT: {
    title: "Saturday story break",
    body: "Make room for a relaxed reading adventure today.",
  },
};

export function getReadingReminderDays(
  settings: Pick<ReadingReminderPreference, "repeat" | "days">,
): ReadingReminderDay[] {
  if (settings.repeat === "daily") return [...DAY_ORDER];
  if (settings.repeat === "weekdays") {
    return ["MON", "TUE", "WED", "THU", "FRI"];
  }

  return DAY_ORDER.filter((day) => settings.days.includes(day));
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

export function buildReadingReminderNotifications(
  settings: ReadingReminderPreference,
): LocalNotificationSchema[] {
  const { hour, minute } = parseTime(settings.time);

  return getReadingReminderDays(settings).map((day) => {
    const message = READING_REMINDER_MESSAGES[day];

    return {
      id: READING_REMINDER_NOTIFICATION_IDS[day],
      ...message,
      channelId: READING_REMINDER_CHANNEL_ID,
      autoCancel: true,
      isExactNotification: false,
      schedule: {
        // Wake the device from idle without requesting exact-alarm access.
        // Android may still apply its inexact delivery window.
        allowWhileIdle: true,
        on: {
          weekday: WEEKDAY_NUMBERS[day],
          hour,
          minute,
        },
      },
    };
  });
}

export function getReadingReminderIds(
  settings: Pick<ReadingReminderPreference, "repeat" | "days">,
): number[] {
  return getReadingReminderDays(settings).map(
    (day) => READING_REMINDER_NOTIFICATION_IDS[day],
  );
}
