import { describe, expect, it } from "vitest";

import {
  getAssessmentSpeechKey,
  getNextAssessmentSpeechKey,
} from "../src/features/assessment/assessmentSpeech";

describe("Assessment Part 1 speech keys", () => {
  it("uses the full task instruction for item one", () => {
    expect(getAssessmentSpeechKey("task-1a", 1)).toBe("assessment-letters");
    expect(getAssessmentSpeechKey("task-2a", 1)).toBe("assessment-rhymes");
    expect(getAssessmentSpeechKey("task-2b", 1)).toBe("assessment-words");
  });

  it("uses controlled ordinal cues for items two through ten", () => {
    expect(getAssessmentSpeechKey("task-1a", 2)).toBe(
      "assessment-letters-item-2",
    );
    expect(getAssessmentSpeechKey("task-2a", 6)).toBe(
      "assessment-rhymes-item-6",
    );
    expect(getAssessmentSpeechKey("task-2b", 10)).toBe(
      "assessment-words-item-10",
    );
  });

  it("prefetches only the next item within the current task", () => {
    expect(getNextAssessmentSpeechKey("task-1a", 1, 10)).toBe(
      "assessment-letters-item-2",
    );
    expect(getNextAssessmentSpeechKey("task-2a", 9, 10)).toBe(
      "assessment-rhymes-item-10",
    );
    expect(getNextAssessmentSpeechKey("task-2b", 10, 10)).toBeNull();
    expect(getNextAssessmentSpeechKey("orientation")).toBeNull();
    expect(getNextAssessmentSpeechKey("part-1-results")).toBeNull();
  });
});
