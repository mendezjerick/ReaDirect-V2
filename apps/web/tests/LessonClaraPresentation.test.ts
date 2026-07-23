import { describe, expect, it } from "vitest";

import { resolveLessonClaraPresentation } from "../src/features/lesson/lessonClaraPresentation";

describe("Lesson 1 Clara presentation", () => {
  it("looks toward the item while teaching and listens while awaiting a response", () => {
    expect(
      resolveLessonClaraPresentation({
        completed: false,
        processing: false,
        guidePreparing: true,
        speaking: false,
      }).behavior,
    ).toBe("demonstrating");
    expect(
      resolveLessonClaraPresentation({
        completed: false,
        processing: false,
        guidePreparing: false,
        speaking: false,
      }).behavior,
    ).toBe("listening");
  });

  it("uses supportive states for correct and needs-support evidence", () => {
    expect(
      resolveLessonClaraPresentation({
        completed: false,
        processing: false,
        guidePreparing: false,
        speaking: true,
        teachingState: "INDEPENDENT_FEEDBACK",
        outcome: "INDEPENDENT_CORRECT",
      }).behavior,
    ).toBe("encouraging");
    expect(
      resolveLessonClaraPresentation({
        completed: false,
        processing: false,
        guidePreparing: false,
        speaking: true,
        teachingState: "GIVING_CLUE",
        outcome: null,
      }).behavior,
    ).toBe("gentle_correction");
  });

  it("celebrates completion without using a negative reaction", () => {
    expect(
      resolveLessonClaraPresentation({
        completed: true,
        processing: false,
        guidePreparing: false,
        speaking: true,
      }),
    ).toEqual({
      emotion: "happy",
      behavior: "celebrating",
      cue: "blush",
    });
  });

  it("demonstrates modeled answers and keeps terminal review supportive", () => {
    expect(
      resolveLessonClaraPresentation({
        completed: false,
        processing: false,
        guidePreparing: false,
        speaking: false,
        teachingState: "DEMONSTRATING",
        outcome: null,
      }).behavior,
    ).toBe("demonstrating");

    expect(
      resolveLessonClaraPresentation({
        completed: false,
        processing: false,
        guidePreparing: false,
        speaking: false,
        teachingState: "REVIEW_SCHEDULED",
        outcome: "NOT_YET_CORRECT",
      }).behavior,
    ).toBe("gentle_correction");

    expect(
      resolveLessonClaraPresentation({
        completed: false,
        processing: false,
        guidePreparing: false,
        speaking: true,
        teachingState: "REVIEW_SCHEDULED",
        outcome: "DEMONSTRATED",
      }).behavior,
    ).toBe("encouraging");
  });
});
