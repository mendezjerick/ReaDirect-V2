import { describe, expect, it } from "vitest";
import { createInitialTutorialState, saveTutorialProgress, tutorialAllowsMissionEvent, tutorialReducer } from "./tutorialState";

describe("first-use tutorial state", () => {
  it("appears automatically only before the first completed attempt", () => {
    const first = createInitialTutorialState();
    expect(first.active).toBe(true);
    const finished = { ...first, active: false, finished: true };
    saveTutorialProgress(finished);
    expect(createInitialTutorialState().active).toBe(false);
  });

  it("waits for the required action and remembers completed steps", () => {
    let state = createInitialTutorialState();
    expect(tutorialReducer(state, { type: "COMPLETE_STEP", step: "interaction" })).toBe(state);
    for (const step of ["missionPanel", "directionArrow", "navigationTrail", "minimap"] as const) {
      state = tutorialReducer(state, { type: "COMPLETE_STEP", step });
    }
    const moved = tutorialReducer(state, { type: "COMPLETE_STEP", step: "movement" });
    expect(moved.step).toBe("interaction");
    expect(moved.completedSteps).toContain("movement");
    expect(moved.completedSteps).toContain("minimap");
  });

  it("asks before skipping and can be reopened later", () => {
    let state = tutorialReducer(createInitialTutorialState(), { type: "REQUEST_SKIP" });
    expect(state.skipConfirmationOpen).toBe(true);
    state = tutorialReducer(state, { type: "CONFIRM_SKIP" });
    expect(state.active).toBe(false);
    expect(tutorialReducer(state, { type: "REOPEN", step: "answerLater" }).step).toBe("answerLater");
  });

  it("allows only the mission event highlighted by each tutorial step", () => {
    expect(tutorialAllowsMissionEvent("interaction", "ACTIVATE_INTERACTION")).toBe(true);
    expect(tutorialAllowsMissionEvent("interaction", "REQUEST_HELP")).toBe(false);
    expect(tutorialAllowsMissionEvent("continueQuestions", "CONTINUE_AFTER_ACTION")).toBe(true);
    expect(tutorialAllowsMissionEvent("continueQuestions", "ANSWER_LATER")).toBe(false);
    expect(tutorialAllowsMissionEvent("answerLater", "ANSWER_LATER")).toBe(true);
    expect(tutorialAllowsMissionEvent("answerLater", "SUBMIT_ANSWER")).toBe(false);
  });
});
