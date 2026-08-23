import { Preferences } from "@capacitor/preferences";
import { z } from "zod";

import type { ReadingReminderDay } from "./readingReminderSchedule";

export const READING_REMINDER_PREFERENCE_KEY = "readirect.reading-reminder.v1";

const daySchema = z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);

export const readingReminderPreferenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    enabled: z.boolean(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    repeat: z.enum(["daily", "weekdays", "selected"]),
    days: z
      .array(daySchema)
      .refine((days) => new Set(days).size === days.length),
    ownerKey: z.string().min(1).nullable(),
    timezoneOffsetMinutes: z.number().int().min(-840).max(840),
  })
  .superRefine((settings, context) => {
    if (settings.repeat === "selected" && settings.days.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["days"],
        message: "Select at least one reminder day.",
      });
    }
  });

export type ReadingReminderPreference = z.infer<
  typeof readingReminderPreferenceSchema
>;

export const DEFAULT_READING_REMINDER_SETTINGS: ReadingReminderPreference = {
  schemaVersion: 1,
  enabled: false,
  time: "18:00",
  repeat: "weekdays",
  days: ["MON", "TUE", "WED", "THU", "FRI"],
  ownerKey: null,
  timezoneOffsetMinutes: new Date().getTimezoneOffset(),
};

export function createDefaultReadingReminderSettings(
  timezoneOffsetMinutes = new Date().getTimezoneOffset(),
): ReadingReminderPreference {
  return { ...DEFAULT_READING_REMINDER_SETTINGS, timezoneOffsetMinutes };
}

export function parseReadingReminderPreference(
  raw: string | null | undefined,
): ReadingReminderPreference | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    const result = readingReminderPreferenceSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export interface ReadingReminderPreferenceStore {
  get(): Promise<ReadingReminderPreference | null>;
  set(value: ReadingReminderPreference): Promise<void>;
  remove(): Promise<void>;
}

export function createCapacitorReadingReminderPreferenceStore(): ReadingReminderPreferenceStore {
  return {
    async get() {
      const { value } = await Preferences.get({
        key: READING_REMINDER_PREFERENCE_KEY,
      });
      return parseReadingReminderPreference(value);
    },
    async set(value) {
      await Preferences.set({
        key: READING_REMINDER_PREFERENCE_KEY,
        value: JSON.stringify(value),
      });
    },
    async remove() {
      await Preferences.remove({ key: READING_REMINDER_PREFERENCE_KEY });
    },
  };
}

export function isReadingReminderDay(
  value: string,
): value is ReadingReminderDay {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].includes(
    value as ReadingReminderDay,
  );
}
