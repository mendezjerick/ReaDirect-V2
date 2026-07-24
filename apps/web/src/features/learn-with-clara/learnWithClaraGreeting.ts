import type { ClaraSpeechKey } from "../clara-audio/claraSpeech";

export type ClaraGreetingPeriod = "morning" | "afternoon" | "evening";

const greetingSpeechKeys = {
  morning: "learn-with-clara-lesson-1-greeting-morning",
  afternoon: "learn-with-clara-lesson-1-greeting-afternoon",
  evening: "learn-with-clara-lesson-1-greeting-evening",
} as const satisfies Record<ClaraGreetingPeriod, ClaraSpeechKey>;

export function claraGreetingPeriodForHour(hour: number): ClaraGreetingPeriod {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError("Greeting hour must be an integer from 0 through 23.");
  }

  if (hour >= 5 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }

  return "evening";
}

export function claraGreetingSpeechKeyForDate(date: Date): ClaraSpeechKey {
  return greetingSpeechKeys[claraGreetingPeriodForHour(date.getHours())];
}
