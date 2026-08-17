import { describe, expect, it } from "vitest";

import { scoreOfflineSpeech } from "../src/apk/activity/offlineSpeechScoring";

describe("offline speech scoring", () => {
  it("accepts exact speech despite case and punctuation", () => {
    expect(scoreOfflineSpeech("The Red Hen!", "the red hen", false)).toEqual({
      correct: true,
      similarity: 1,
    });
  });

  it("uses a forgiving threshold for long passage reading", () => {
    const result = scoreOfflineSpeech(
      "the small cat sat beside the tree",
      "the small red cat sat quietly beside the old tree",
      true,
    );

    expect(result.correct).toBe(true);
    expect(result.similarity).toBeGreaterThanOrEqual(0.55);
  });

  it("rejects an unrelated or empty response", () => {
    expect(scoreOfflineSpeech("banana", "the red hen", false).correct).toBe(
      false,
    );
    expect(scoreOfflineSpeech("", "A", false)).toEqual({
      correct: false,
      similarity: 0,
    });
  });
});
