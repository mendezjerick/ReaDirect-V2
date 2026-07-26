import { describe, expect, it } from "vitest";
import { MISSIONS } from "../content/missions";
import { createMissionRounds, createSeededRandom } from "../questions/questionRound";
import { createInitialMissionState, missionReducer } from "./missionState";
import { createStoredMissionProgress, restoreMissionProgress } from "./missionPersistence";

describe("mission save serialization", () => {
  it("restores saved unanswered questions and retry state", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(4));
    let state = createInitialMissionState(rounds);
    state = { ...state, stage: "questionRound", readingPresented: true, actionStatus: "correct" };
    state = missionReducer(state, { type: "ANSWER_LATER" });
    state = missionReducer(state, { type: "CONFIRM_ANSWER_LATER" });
    const restored = restoreMissionProgress(
      createStoredMissionProgress(state),
      rounds
    );
    expect(restored?.savedQuestionIds).toEqual(state.savedQuestionIds);
    expect(restored?.currentQuestionIndex).toBe(state.currentQuestionIndex);
  });

  it("records the language and content identifiers with progress", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(8));
    const state = createInitialMissionState(rounds, "fil");
    const stored = createStoredMissionProgress(state);

    expect(stored).toMatchObject({
      version: 1,
      minigameId: "chronicles-of-the-lost-kingdom",
      contentVersionId: "bilingual-v1",
      language: "fil"
    });
  });

  it("ignores progress with an incompatible mission catalog", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(5));
    expect(restoreMissionProgress({ version: 1, state: { rounds: [] } }, rounds)).toBeNull();
  });

  it("migrates older reading progress to the first page", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(5));
    const legacyState = { ...createInitialMissionState(rounds), stage: "storyPresentation" } as Record<string, unknown>;
    delete legacyState.readingPageIndex;
    delete legacyState.readingHeartsRemaining;
    delete legacyState.incorrectSubmissionsByQuestion;
    delete legacyState.recoveredQuestionIds;
    delete legacyState.passageRereadCount;
    const stored = { version: 1, state: legacyState };
    expect(restoreMissionProgress(stored, rounds)?.readingPageIndex).toBe(0);
    expect(restoreMissionProgress(stored, rounds)?.readingHeartsRemaining).toBe(3);
  });
});
