import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMission, MISSIONS } from "../content/missions";
import { createInitialMissionState, missionReducer, type MissionState } from "../mission/missionState";
import { createMissionRounds, createSeededRandom } from "../questions/questionRound";
import {
  CompletionOverlay,
  DeferredQuestionOverlay,
  DeferredSavedNotice,
  DialogueOverlay,
  HelpOverlay,
  HeartRecoveryOverlay,
  MissionActionOverlay,
  MissionResultOverlay,
  ObjectiveTracker,
  QuestionOverlay,
  QuestionIntroOverlay,
  ReadingIntroOverlay,
  RemainingQuestionsOverlay,
  StoryPresentationOverlay
} from "./MissionUi";

describe("connected mission React UI", () => {
  beforeEach(() => {
    localStorage.setItem("readirect-rpg:typewriter-enabled:v1", "false");
  });
  it("renders accessible NPC dialogue with a skip control", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const state = missionReducer(initialState(), { type: "START_ACTIVITY" });
    render(<DialogueOverlay state={state} dispatch={dispatch} />);
    expect(screen.getByRole("dialog", { name: /Miss Estelle dialogue/i })).toBeVisible();
    expect(screen.getByTestId("dialogue-portrait-miss-estelle")).toBeVisible();
    expect(screen.getByText("Miss Estelle")).toBeVisible();
    expect(screen.getByText(/village will read together/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Skip dialogue with Miss Estelle/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "SKIP_DIALOGUE" });
  });

  it("uses the first dialogue input to finish typing and the next input to advance", async () => {
    localStorage.setItem("readirect-rpg:typewriter-enabled:v1", "true");
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const state = missionReducer(initialState(), { type: "START_ACTIVITY" });
    const fullText = state.activeDialogue!.pages[0];
    render(<DialogueOverlay state={state} dispatch={dispatch} />);
    const next = screen.getByRole("button", { name: /Next/i });
    await user.click(next);
    expect(screen.getByLabelText(fullText)).toHaveTextContent(fullText);
    expect(dispatch).not.toHaveBeenCalledWith({ type: "ADVANCE_DIALOGUE" });
    await new Promise((resolve) => setTimeout(resolve, 200));
    await user.click(next);
    expect(dispatch).toHaveBeenCalledWith({ type: "ADVANCE_DIALOGUE" });
  });

  it("does not let a double click advance several dialogue messages", async () => {
    localStorage.setItem("readirect-rpg:typewriter-enabled:v1", "true");
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const state = missionReducer(initialState(), { type: "START_ACTIVITY" });
    render(<DialogueOverlay state={state} dispatch={dispatch} />);
    await user.dblClick(screen.getByRole("button", { name: /Next/i }));
    expect(dispatch).not.toHaveBeenCalledWith({ type: "ADVANCE_DIALOGUE" });
  });

  it("shows mission progress and keeps the objective collapsible", async () => {
    const user = userEvent.setup();
    render(<ObjectiveTracker state={initialState()} />);
    expect(screen.getByText(/Mission 1 of 6/i)).toBeVisible();
    expect(screen.getByText(/Talk to Miss Estelle/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Collapse objective tracker/i }));
    expect(screen.queryByText(/Talk to Miss Estelle/i)).not.toBeInTheDocument();
  });

  it("presents the reading format, purpose, and complete message", () => {
    const state = { ...initialState(), stage: "storyPresentation" as const };
    render(<StoryPresentationOverlay state={state} dispatch={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /Where the Reading Journey Begins/i })).toBeVisible();
    expect(screen.getByText(/Community Notice/i)).toBeVisible();
    expect(screen.getByText(/Purpose:/i)).toBeVisible();
    expect(screen.getByText(/reading activity begins this afternoon/i)).toBeVisible();
  });

  it("uses intentional introductions before reading and questions", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<ReadingIntroOverlay state={{ ...initialState(), stage: "readingIntro" }} dispatch={dispatch} />);
    await user.click(screen.getByRole("button", { name: /Open the Story/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "START_READING" });
  });

  it("selects an answer without submitting or advancing it", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<QuestionOverlay state={questionState()} dispatch={dispatch} />);
    await user.click(screen.getAllByRole("button", { name: /^[A-D]\./i })[0]);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "SELECT_ANSWER" }));
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "SUBMIT_ANSWER" }));
    expect(screen.getByRole("img", { name: /3 hearts remaining/i })).toBeVisible();
  });

  it("offers a supportive question restart at zero hearts", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<HeartRecoveryOverlay state={{ ...questionState(), stage: "heartRecovery", readingHeartsRemaining: 0 }} dispatch={dispatch} />);
    expect(screen.getByRole("dialog", { name: /start this challenge again/i })).toBeVisible();
    expect(screen.getByText(/hearts are back.*questions again/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Try Another Clue/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "RESTART_COMPREHENSION" });
  });

  it("confirms Answer Later before saving the question", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<DeferredQuestionOverlay state={{ ...questionState(), stage: "deferredConfirmation" }} dispatch={dispatch} />);
    expect(screen.getByRole("dialog", { name: /Answer this question later/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Save for Later/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "CONFIRM_ANSWER_LATER" });
  });

  it("shows a nonblocking saved-question confirmation during exploration", () => {
    render(
      <DeferredSavedNotice
        state={{ ...questionState(), stage: "missionInProgress", savedNotice: "Question saved! You can return to it later." }}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(/Question saved.*return to it later/i);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("starts questions only from the transition action", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<QuestionIntroOverlay state={{ ...questionState(), stage: "questionIntro" }} dispatch={dispatch} />);
    await user.click(screen.getByRole("button", { name: /Start Questions/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "START_QUESTIONS" });
  });

  it("requires a four-choice mission decision without reopening the story", () => {
    const state = actionState();
    render(<MissionActionOverlay state={state} dispatch={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /Use what you read/i })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /^[A-D]\./i })).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /Read Again/i })).not.toBeInTheDocument();
  });

  it("shows contextual, progressively stronger incorrect feedback", () => {
    const base = questionState();
    const question = base.round.questions[0];
    const wrong = question.choices.filter(({ id }) => id !== question.correctChoiceId);
    const state: MissionState = {
      ...base,
      stage: "questionFeedback",
      answerStatus: "incorrect",
      selectedChoiceId: wrong[1].id,
      rejectedChoiceIds: [wrong[0].id, wrong[1].id],
      attemptsByQuestion: { [question.id]: 2 }
    };
    render(<QuestionOverlay state={state} dispatch={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent(question.incorrectFeedback);
    expect(screen.getByRole("status")).toHaveTextContent(question.explanation);
    expect(screen.getAllByText(/Try another/i).length).toBeGreaterThan(0);
  });

  it("offers Answer Later away from the answer grid and shows saved progress", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const state: MissionState = { ...questionState(), savedQuestionIds: [questionState().round.questions[1].id] };
    render(<QuestionOverlay state={state} dispatch={dispatch} />);
    expect(screen.getByText(/Where the Reading Journey Begins/i)).toBeVisible();
    expect(screen.getByText(/1 question saved for later/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Answer Later/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "ANSWER_LATER" });
  });

  it("offers child-friendly choices when questions remain", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const base = questionState();
    const state: MissionState = {
      ...base,
      stage: "questionsRemaining",
      savedQuestionIds: base.round.questions.map(({ id }) => id)
    };
    render(<RemainingQuestionsOverlay state={state} dispatch={dispatch} onDashboard={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /2 questions to answer/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Answer Now/i }));
    await user.click(screen.getByRole("button", { name: /Continue Later/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "ANSWER_SAVED_NOW" });
    expect(dispatch).toHaveBeenCalledWith({ type: "CONTINUE_LATER" });
  });

  it("shows a world result and reward before the next mission", () => {
    const state: MissionState = {
      ...questionState(),
      stage: "missionCompleted",
      completedMissionIds: ["plaza-welcome"]
    };
    render(<MissionResultOverlay state={state} dispatch={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /welcome sign now marks/i })).toBeVisible();
    expect(screen.getByText(/Welcome Ribbon/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /Continue Journey/i })).toBeVisible();
  });

  it("ends with journey context, replay, and dashboard actions without scores", () => {
    const state: MissionState = {
      ...initialState(),
      stage: "activityCompleted",
      activityCompleted: true,
      completedMissionIds: MISSIONS.map(({ id }) => id)
    };
    render(<CompletionOverlay state={state} onReplay={vi.fn()} onDashboard={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /Reading Journey Is Open/i })).toHaveTextContent(/central plaza.*market.*old bridge.*forest route/i);
    expect(screen.getByRole("button", { name: /Replay Journey/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Return to Dashboard/i })).toBeVisible();
    expect(screen.queryByText(/score|grade|ranking|diagnostic/i)).not.toBeInTheDocument();
  });

  it("shows a contextual mission guide and opens the map", async () => {
    const user = userEvent.setup();
    const state = { ...questionState(), helpOpen: true };
    const dispatch = vi.fn();
    const onOpenMap = vi.fn();
    render(
      <HelpOverlay
        state={state}
        dispatch={dispatch}
        onOpenMap={onOpenMap}
        onShowTutorial={vi.fn()}
      />
    );

    const guide = screen.getByRole("dialog", { name: /Need a hint/i });
    expect(guide).toHaveTextContent(state.round.questions[0].hint);
    expect(guide).toHaveTextContent(/Do this now/i);
    expect(guide).toHaveTextContent(/Try this/i);
    expect(guide).toHaveTextContent(/Quick controls/i);

    await user.click(screen.getByRole("button", { name: /Open Map/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "CLOSE_HELP" });
    expect(onOpenMap).toHaveBeenCalledOnce();
  });

  it("closes help before reopening the tutorial", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const onShowTutorial = vi.fn();
    render(
      <HelpOverlay
        state={{ ...initialState(), helpOpen: true }}
        dispatch={dispatch}
        onOpenMap={vi.fn()}
        onShowTutorial={onShowTutorial}
      />
    );

    await user.click(screen.getByRole("button", { name: /Show Tutorial/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "CLOSE_HELP" });
    expect(onShowTutorial).toHaveBeenCalledOnce();
  });
});

function initialState() {
  return createInitialMissionState(createMissionRounds(MISSIONS, createSeededRandom(12)));
}

function actionState() {
  return { ...initialState(), stage: "missionAction" as const, readingPresented: true };
}

function questionState() {
  return {
    ...initialState(),
    stage: "questionRound" as const,
    readingPresented: true,
    actionStatus: "correct" as const,
    selectedActionChoiceId: getMission("plaza-welcome").action.correctChoiceId
  };
}
