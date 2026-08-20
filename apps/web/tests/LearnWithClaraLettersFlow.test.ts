import { describe, expect, it } from "vitest";

import {
  advanceLearnWithClaraLetters,
  startLearnWithClaraLetters,
} from "../src/features/learn-with-clara/learnWithClaraLettersFlow";

describe("Learn with Clara letters flow", () => {
  it("keeps the letter story in local client state", () => {
    let state = startLearnWithClaraLetters();

    expect(state.scene.key).toBe("parade-opening");
    expect(state.prefetch_speech_keys).toEqual([
      "learn-with-clara-letters-find-a",
    ]);

    state = advanceLearnWithClaraLetters(state);
    expect(state.scene.key).toBe("find-a");

    for (let index = 0; index < 10; index += 1) {
      state = advanceLearnWithClaraLetters(state);
    }

    expect(state.status).toBe("letters-complete");
    expect(state.scene.key).toBe("parade-finale");
  });
});
