import { describe, expect, it } from "vitest";
import { getMission, MISSIONS } from "../content/missions";
import { createMissionRounds, createSeededRandom } from "../questions/questionRound";
import {
  createInitialMissionState,
  getReadingHearts,
  isMissionStageBlocking,
  missionReducer,
  type MissionState
} from "./missionState";

describe("connected mission journey state", () => {
  it("starts with the first mission and all six stable rounds prepared", () => {
    const state = initialState();
    expect(state.missionId).toBe("plaza-welcome");
    expect(state.stage).toBe("approachStoryCharacter");
    expect(state.rounds).toHaveLength(6);
    expect(state.completedMissionIds).toEqual([]);
  });

  it("requires the briefing, reading, and practical decision before questions", () => {
    let state = initialState();
    expect(missionReducer(state, { type: "BEGIN_MISSION_ACTION" })).toBe(state);
    state = missionReducer(state, { type: "TALK_TO_NPC", npcId: "miss-estelle" });
    state = missionReducer(state, { type: "SKIP_DIALOGUE" });
    expect(state.stage).toBe("readingIntro");
    state = missionReducer(state, { type: "START_READING" });
    state = finishReadingPages(state);
    state = missionReducer(state, { type: "FINISH_STORY" });
    state = missionReducer(state, { type: "BEGIN_MISSION_ACTION" });
    expect(state.stage).toBe("missionAction");
    expect(missionReducer(state, { type: "CONTINUE_AFTER_ACTION" })).toBe(state);

    state = missionReducer(state, {
      type: "SUBMIT_MISSION_ACTION",
      choiceId: getMission(state.missionId).action.correctChoiceId
    });
    state = missionReducer(state, { type: "CONTINUE_AFTER_ACTION" });
    expect(state.stage).toBe("questionIntro");
    state = missionReducer(state, { type: "START_QUESTIONS" });
    expect(state.stage).toBe("questionRound");
  });

  it("skips dialogue without skipping the required reading", () => {
    const dialogue = missionReducer(initialState(), { type: "START_ACTIVITY" });
    const state = missionReducer(dialogue, { type: "SKIP_DIALOGUE" });
    expect(state.activeDialogue).toBeNull();
    expect(state.stage).toBe("readingIntro");
    expect(state.readingPresented).toBe(false);
  });

  it("redirects interaction with the wrong existing NPC", () => {
    const state = missionReducer(initialState(), { type: "TALK_TO_NPC", npcId: "lolo-ambo" });
    expect(state.stage).toBe("approachStoryCharacter");
    expect(state.activeDialogue?.kind).toBe("optional");
    expect(state.activeDialogue?.speakerName).toBe("Lolo Ambo");
    expect(state.activeDialogue?.pages[0]).toMatch(/east path/i);
  });

  it("keeps an incorrect action in place and strengthens support", () => {
    let state = actionState();
    const action = getMission(state.missionId).action;
    const wrong = action.choices.filter(({ id }) => id !== action.correctChoiceId);
    state = missionReducer(state, { type: "SUBMIT_MISSION_ACTION", choiceId: wrong[0].id });
    state = missionReducer(state, { type: "SUBMIT_MISSION_ACTION", choiceId: wrong[1].id });
    expect(state.stage).toBe("missionActionFeedback");
    expect(state.actionStatus).toBe("incorrect");
    expect(state.actionAttempts).toBe(2);
    expect(state.rejectedActionChoiceIds).toEqual([wrong[0].id, wrong[1].id]);
  });

  it("preserves question order, attempts, and progress when reading again", () => {
    let state = questionState();
    const round = state.round;
    const question = round.questions[0];
    const wrong = question.choices.find(({ id }) => id !== question.correctChoiceId)!;
    state = missionReducer(state, { type: "SELECT_ANSWER", choiceId: wrong.id });
    state = missionReducer(state, { type: "SUBMIT_ANSWER", choiceId: wrong.id });
    state = missionReducer(state, { type: "OPEN_STORY_REVIEW" });
    state = missionReducer(state, { type: "CLOSE_STORY_REVIEW" });
    expect(state.stage).toBe("questionFeedback");
    expect(state.round).toBe(round);
    expect(state.rejectedChoiceIds).toEqual([wrong.id]);
    expect(state.currentQuestionIndex).toBe(0);
  });

  it("saves a question for later without marking it wrong or revealing its answer", () => {
    const state = questionState();
    const question = state.round.questions[0];
    const confirmation = missionReducer(state, { type: "ANSWER_LATER" });
    expect(confirmation.stage).toBe("deferredConfirmation");
    const saved = missionReducer(confirmation, { type: "CONFIRM_ANSWER_LATER" });
    expect(saved.savedQuestionIds).toContain(question.id);
    expect(saved.attemptsByQuestion[question.id]).toBeUndefined();
    expect(saved.completedQuestionIds).not.toContain(question.id);
    expect(saved.answerStatus).toBe("idle");
    expect(saved.stage).toBe("missionInProgress");
    expect(saved.announcement).not.toContain(question.choices.find(({ id }) => id === question.correctChoiceId)!.text);
    expect(getReadingHearts(saved)).toBe(3);
    expect(isMissionStageBlocking(saved.stage)).toBe(false);
  });

  it("deducts once only for an incorrect submission and never for selection or duplicate submission", () => {
    let state = questionState();
    const question = state.round.questions[0];
    const wrong = question.choices.filter(({ id }) => id !== question.correctChoiceId);
    state = missionReducer(state, { type: "SELECT_ANSWER", choiceId: wrong[0].id });
    expect(getReadingHearts(state)).toBe(3);
    state = missionReducer(state, { type: "SUBMIT_ANSWER", choiceId: wrong[0].id });
    expect(getReadingHearts(state)).toBe(2);
    const duplicate = missionReducer(state, { type: "SUBMIT_ANSWER", choiceId: wrong[0].id });
    expect(duplicate).toBe(state);
    expect(state.incorrectSubmissionsByQuestion[question.id]).toBe(1);
    state = missionReducer(state, { type: "TRY_QUESTION_AGAIN" });
    state = missionReducer(state, { type: "SELECT_ANSWER", choiceId: question.correctChoiceId });
    state = missionReducer(state, { type: "SUBMIT_ANSWER", choiceId: question.correctChoiceId });
    expect(getReadingHearts(state)).toBe(2);
    state = missionReducer(state, { type: "CONTINUE_AFTER_CORRECT" });
    expect(state.currentQuestionIndex).toBe(1);
    expect(getReadingHearts(state)).toBe(2);
  });

  it("does not remove a heart when reading again", () => {
    let state = questionState();
    const hearts = getReadingHearts(state);
    state = missionReducer(state, { type: "OPEN_STORY_REVIEW" });
    state = missionReducer(state, { type: "CLOSE_STORY_REVIEW" });
    expect(getReadingHearts(state)).toBe(hearts);
    expect(state.passageRereadCount).toBe(1);
  });

  it("opens supportive recovery at zero hearts and restarts only the current comprehension", () => {
    let state = questionState();
    const question = state.round.questions[0];
    const wrong = question.choices.filter(({ id }) => id !== question.correctChoiceId);
    for (const choice of wrong) {
      state = missionReducer(state, { type: "SELECT_ANSWER", choiceId: choice.id });
      state = missionReducer(state, { type: "SUBMIT_ANSWER", choiceId: choice.id });
      if (state.stage === "questionFeedback") state = missionReducer(state, { type: "TRY_QUESTION_AGAIN" });
    }
    expect(state.stage).toBe("heartRecovery");
    expect(getReadingHearts(state)).toBe(0);
    state = {
      ...state,
      completedMissionIds: ["plaza-welcome"],
      savedQuestionIds: [state.round.questions[1].id]
    };
    state = missionReducer(state, { type: "READ_AND_RESTART" });
    expect(state.stage).toBe("storyReview");
    expect(state.reviewReturnStage).toBe("questionIntro");
    expect(getReadingHearts(state)).toBe(3);
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.comprehensionRestartCount).toBe(1);
    expect(state.recoveredQuestionIds).toContain(question.id);
    expect(state.incorrectSubmissionsByQuestion[question.id]).toBeUndefined();
    expect(state.completedMissionIds).toEqual(["plaza-welcome"]);
    expect(state.savedQuestionIds).toEqual([state.round.questions[1].id]);
  });

  it("defers immediately to free exploration without advancing or losing a heart", () => {
    const state = questionState();
    const original = state.round.questions[0];
    const choices = original.choices;
    const saved = missionReducer(missionReducer(state, { type: "ANSWER_LATER" }), { type: "CONFIRM_ANSWER_LATER" });
    expect(saved.stage).toBe("missionInProgress");
    expect(saved.round.questions[saved.currentQuestionIndex].id).toBe(original.id);
    expect(saved.round.questions[0].choices).toBe(choices);
    expect(saved.savedNotice).toMatch(/Question saved/i);
    expect(getReadingHearts(saved)).toBe(3);
  });

  it("resumes the same deferred question intentionally with hearts and attempts preserved", () => {
    let state = questionState();
    const savedId = state.round.questions[0].id;
    const wrong = state.round.questions[0].choices.find(({ id }) => id !== state.round.questions[0].correctChoiceId)!;
    state = missionReducer(state, { type: "SELECT_ANSWER", choiceId: wrong.id });
    state = missionReducer(state, { type: "SUBMIT_ANSWER", choiceId: wrong.id });
    state = missionReducer(state, { type: "TRY_QUESTION_AGAIN" });
    state = missionReducer(state, { type: "ANSWER_LATER" });
    state = missionReducer(state, { type: "CONFIRM_ANSWER_LATER" });
    expect(state.stage).toBe("missionInProgress");
    state = missionReducer(state, { type: "ANSWER_SAVED_NOW" });
    expect(state.stage).toBe("deferredResume");
    state = missionReducer(state, { type: "START_SAVED_QUESTIONS" });
    expect(state.stage).toBe("questionRound");
    expect(state.round.questions[state.currentQuestionIndex].id).toBe(savedId);
    expect(getReadingHearts(state)).toBe(2);
    expect(state.attemptsByQuestion[savedId]).toBe(1);
  });

  it("resumes a deferred question by returning to its mission giver", () => {
    let state = questionState();
    state = missionReducer(missionReducer(state, { type: "ANSWER_LATER" }), { type: "CONFIRM_ANSWER_LATER" });
    state = missionReducer(state, {
      type: "ACTIVATE_INTERACTION",
      target: {
        id: "npc:miss-estelle",
        kind: "npc",
        label: "Talk to Miss Estelle",
        description: "Talk to Miss Estelle.",
        position: { x: 0, y: 0 },
        npcId: "miss-estelle",
        enabled: true
      }
    });
    expect(state.stage).toBe("deferredResume");
  });

  it("restores three hearts when a new mission comprehension activity begins", () => {
    const completed = {
      ...questionState(),
      stage: "missionCompleted" as const,
      readingHeartsRemaining: 1,
      completedMissionIds: ["plaza-welcome"] as const
    };
    const nextMission = missionReducer(completed, { type: "CONTINUE_TO_NEXT_MISSION" });
    expect(nextMission.stage).toBe("approachStoryCharacter");
    expect(getReadingHearts(nextMission)).toBe(3);
  });

  it("does not complete a mission before the action and every answer are correct", () => {
    let state = questionState();
    const question = state.round.questions[0];
    state = missionReducer(state, { type: "SELECT_ANSWER", choiceId: question.correctChoiceId });
    state = missionReducer(state, { type: "SUBMIT_ANSWER", choiceId: question.correctChoiceId });
    state = missionReducer(state, { type: "CONTINUE_AFTER_CORRECT" });
    expect(state.stage).toBe("questionRound");
    expect(state.completedMissionIds).toEqual([]);
  });

  it("advances through all six missions and completes the connected journey", () => {
    let state = initialState();
    for (const mission of MISSIONS) {
      expect(state.missionId).toBe(mission.id);
      state = completeCurrentMission(state);
      expect(state.stage).toBe("missionCompleted");
      expect(state.completedMissionIds).toContain(mission.id);
      state = missionReducer(state, { type: "CONTINUE_TO_NEXT_MISSION" });
    }
    expect(state.stage).toBe("activityCompleted");
    expect(state.activityCompleted).toBe(true);
    expect(state.completedMissionIds).toEqual(MISSIONS.map(({ id }) => id));
  });

  it("replay resets all mission and support progress with fresh prepared rounds", () => {
    const active = questionState();
    const nextRounds = createMissionRounds(MISSIONS, createSeededRandom(99), active.rounds);
    const reset = missionReducer(active, { type: "RESET_ACTIVITY", rounds: nextRounds });
    expect(reset).toEqual(createInitialMissionState(nextRounds));
    expect(reset.rounds).not.toBe(active.rounds);
    expect(reset.completedQuestionIds).toEqual([]);
  });
});

function initialState(seed = 4) {
  return createInitialMissionState(createMissionRounds(MISSIONS, createSeededRandom(seed)));
}

function actionState() {
  let state = missionReducer(initialState(), { type: "START_ACTIVITY" });
  state = missionReducer(state, { type: "SKIP_DIALOGUE" });
  state = missionReducer(state, { type: "START_READING" });
  state = finishReadingPages(state);
  state = missionReducer(state, { type: "FINISH_STORY" });
  return missionReducer(state, { type: "BEGIN_MISSION_ACTION" });
}

function questionState() {
  let state = actionState();
  state = missionReducer(state, {
    type: "SUBMIT_MISSION_ACTION",
    choiceId: getMission(state.missionId).action.correctChoiceId
  });
  state = missionReducer(state, { type: "CONTINUE_AFTER_ACTION" });
  return missionReducer(state, { type: "START_QUESTIONS" });
}

function completeCurrentMission(start: MissionState) {
  let state = missionReducer(start, { type: "TALK_TO_NPC", npcId: getMission(start.missionId).npcId });
  state = missionReducer(state, { type: "SKIP_DIALOGUE" });
  state = missionReducer(state, { type: "START_READING" });
  state = finishReadingPages(state);
  state = missionReducer(state, { type: "FINISH_STORY" });
  state = missionReducer(state, { type: "BEGIN_MISSION_ACTION" });
  state = missionReducer(state, {
    type: "SUBMIT_MISSION_ACTION",
    choiceId: getMission(state.missionId).action.correctChoiceId
  });
  state = missionReducer(state, { type: "CONTINUE_AFTER_ACTION" });
  state = missionReducer(state, { type: "START_QUESTIONS" });
  for (const question of state.round.questions) {
    state = missionReducer(state, { type: "SELECT_ANSWER", choiceId: question.correctChoiceId });
    state = missionReducer(state, { type: "SUBMIT_ANSWER", choiceId: question.correctChoiceId });
    state = missionReducer(state, { type: "CONTINUE_AFTER_CORRECT" });
  }
  state = missionReducer(state, { type: "CONTINUE_AFTER_QUESTIONS" });
  return state;
}

function finishReadingPages(start: MissionState) {
  let state = start;
  const lastPage = getMission(state.missionId).reading.pages.length - 1;
  while (state.readingPageIndex < lastPage) state = missionReducer(state, { type: "NEXT_READING_PAGE" });
  return state;
}
