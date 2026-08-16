import { describe, expect, it } from "vitest";
import { MISSIONS } from "../content/missions";
import { createMissionRounds, createSeededRandom } from "../questions/questionRound";
import { createInitialMissionState, missionReducer } from "./missionState";
import { hasInProgressMission, loadMissionProgress, saveMissionProgress } from "./missionPersistence";

describe("local mission progress", () => {
  it("restores saved unanswered questions and retry state", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(4));
    let state = createInitialMissionState(rounds);
    state = { ...state, stage: "questionRound", readingPresented: true, actionStatus: "correct" };
    state = missionReducer(state, { type: "ANSWER_LATER" });
    state = missionReducer(state, { type: "CONFIRM_ANSWER_LATER" });
    saveMissionProgress(state);
    const restored = loadMissionProgress(rounds);
    expect(restored?.savedQuestionIds).toEqual(state.savedQuestionIds);
    expect(restored?.currentQuestionIndex).toBe(state.currentQuestionIndex);
    expect(hasInProgressMission()).toBe(true);
  });

  it("records the language and content identifiers with progress", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(8));
    const state = createInitialMissionState(rounds, "fil");
    saveMissionProgress(state);
    const stored = JSON.parse(localStorage.getItem("readirect-rpg:mission-progress:v1") ?? "null");

    expect(stored).toMatchObject({
      version: 1,
      minigameId: "chronicles-of-the-lost-kingdom",
      contentVersionId: "bilingual-v1",
      language: "fil"
    });
  });

  it("ignores progress with an incompatible mission catalog", () => {
    localStorage.setItem("readirect-rpg:mission-progress:v1", JSON.stringify({ version: 1, state: { rounds: [] } }));
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(5));
    expect(loadMissionProgress(rounds)).toBeNull();
  });

  it("migrates older reading progress to the first page", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(5));
    const legacyState = { ...createInitialMissionState(rounds), stage: "storyPresentation" } as Record<string, unknown>;
    delete legacyState.readingPageIndex;
    delete legacyState.readingHeartsRemaining;
    delete legacyState.incorrectSubmissionsByQuestion;
    delete legacyState.recoveredQuestionIds;
    localStorage.setItem("readirect-rpg:mission-progress:v1", JSON.stringify({ version: 1, state: legacyState }));
    expect(loadMissionProgress(rounds)?.readingPageIndex).toBe(0);
    expect(loadMissionProgress(rounds)?.readingHeartsRemaining).toBe(3);
  });

  it("moves old story review saves into the comprehension flow", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(12));
    const legacyState = {
      ...createInitialMissionState(rounds),
      stage: "storyReview",
      reviewReturnStage: "questionRound",
      readingPresented: true,
      actionStatus: "correct"
    };
    localStorage.setItem("readirect-rpg:mission-progress:v1", JSON.stringify({ version: 1, state: legacyState }));
    expect(loadMissionProgress(rounds)?.stage).toBe("questionRound");
  });
});
