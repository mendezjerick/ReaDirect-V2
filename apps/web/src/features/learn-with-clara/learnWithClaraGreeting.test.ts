import { describe, expect, it } from "vitest";

import {
  claraGreetingPeriodForHour,
  claraGreetingSpeechKeyForDate,
} from "./learnWithClaraGreeting";

describe("Learn with Ma'am Clara time-aware greeting", () => {
  it.each([
    [5, "morning"],
    [11, "morning"],
    [12, "afternoon"],
    [16, "afternoon"],
    [17, "evening"],
    [23, "evening"],
    [0, "evening"],
    [4, "evening"],
  ] as const)("maps hour %i to %s", (hour, expected) => {
    expect(claraGreetingPeriodForHour(hour)).toBe(expected);
  });

  it("resolves a published speech key from local time", () => {
    expect(claraGreetingSpeechKeyForDate(new Date(2026, 6, 23, 13, 30))).toBe(
      "learn-with-clara-lesson-1-greeting-afternoon",
    );
  });

  it.each([-1, 24, 8.5, Number.NaN])("rejects invalid hour %s", (hour) => {
    expect(() => claraGreetingPeriodForHour(hour)).toThrow(RangeError);
  });
});
