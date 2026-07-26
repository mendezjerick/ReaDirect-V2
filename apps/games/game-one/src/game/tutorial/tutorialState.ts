export const TUTORIAL_PROGRESS_KEY = "readirect-rpg:tutorial-progress:v1";

export const TUTORIAL_STEPS = [
  "missionPanel",
  "directionArrow",
  "navigationTrail",
  "minimap",
  "movement",
  "interaction",
  "reading",
  "readAgain",
  "choice",
  "answerLater",
  "ready"
] as const;

export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

export type TutorialState = {
  active: boolean;
  step: TutorialStep;
  completedSteps: readonly TutorialStep[];
  skipConfirmationOpen: boolean;
  finished: boolean;
};

export type StoredTutorialProgress = {
  version: 2;
  finished: boolean;
  completedSteps: readonly TutorialStep[];
};

export type TutorialEvent =
  | { type: "COMPLETE_STEP"; step: TutorialStep }
  | { type: "REQUEST_SKIP" }
  | { type: "KEEP_LEARNING" }
  | { type: "CONFIRM_SKIP" }
  | { type: "REOPEN"; step?: TutorialStep }
  | { type: "FINISH" };

export function createInitialTutorialState(): TutorialState {
  return restoreTutorialProgress(null);
}

export function restoreTutorialProgress(value: unknown): TutorialState {
  const saved = parseTutorialProgress(value);
  if (saved?.finished) {
    return {
      active: false,
      step: "ready",
      completedSteps: saved.completedSteps,
      skipConfirmationOpen: false,
      finished: true
    };
  }
  const completedSteps = saved?.completedSteps ?? [];
  const nextStep = TUTORIAL_STEPS.find((step) => !completedSteps.includes(step)) ?? "ready";
  return {
    active: true,
    step: nextStep,
    completedSteps,
    skipConfirmationOpen: false,
    finished: false
  };
}

export function tutorialReducer(state: TutorialState, event: TutorialEvent): TutorialState {
  switch (event.type) {
    case "COMPLETE_STEP": {
      if (!state.active || state.step !== event.step) return state;
      const completedSteps = addUnique(state.completedSteps, event.step);
      const index = TUTORIAL_STEPS.indexOf(event.step);
      const next = TUTORIAL_STEPS[index + 1];
      return next
        ? { ...state, step: next, completedSteps, skipConfirmationOpen: false }
        : { ...state, active: false, completedSteps, finished: true, skipConfirmationOpen: false };
    }
    case "REQUEST_SKIP":
      return state.active ? { ...state, skipConfirmationOpen: true } : state;
    case "KEEP_LEARNING":
      return state.skipConfirmationOpen ? { ...state, skipConfirmationOpen: false } : state;
    case "CONFIRM_SKIP":
      return state.skipConfirmationOpen
        ? { ...state, active: false, finished: true, skipConfirmationOpen: false }
        : state;
    case "REOPEN":
      return { ...state, active: true, step: event.step ?? "movement", skipConfirmationOpen: false };
    case "FINISH":
      return state.step === "ready"
        ? { ...state, active: false, finished: true, completedSteps: addUnique(state.completedSteps, "ready") }
        : state;
  }
}

export function createStoredTutorialProgress(state: TutorialState): StoredTutorialProgress {
  return {
    version: 2,
    finished: state.finished,
    completedSteps: state.completedSteps
  };
}

export function tutorialAllowsMissionEvent(step: TutorialStep, eventType: string) {
  if (["ADVANCE_DIALOGUE", "COMPLETE_DIALOGUE", "SKIP_DIALOGUE", "CLOSE_DIALOGUE"].includes(eventType)) return true;
  switch (step) {
    case "missionPanel":
    case "directionArrow":
    case "navigationTrail":
    case "minimap":
    case "movement": return false;
    case "interaction": return eventType === "ACTIVATE_INTERACTION";
    case "reading": return ["START_READING", "PREVIOUS_READING_PAGE", "NEXT_READING_PAGE", "FINISH_STORY", "BEGIN_MISSION_ACTION"].includes(eventType);
    case "readAgain": return eventType === "OPEN_STORY_REVIEW" || eventType === "CLOSE_STORY_REVIEW";
    case "choice": return ["SUBMIT_MISSION_ACTION", "CONTINUE_AFTER_ACTION", "START_QUESTIONS"].includes(eventType);
    case "answerLater": return ["START_QUESTIONS", "SELECT_ANSWER", "ANSWER_LATER", "CANCEL_ANSWER_LATER", "CONFIRM_ANSWER_LATER"].includes(eventType);
    case "ready": return false;
  }
}

function parseTutorialProgress(value: unknown): StoredTutorialProgress | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Partial<StoredTutorialProgress>;
  if (stored.version !== 2 || !Array.isArray(stored.completedSteps)) return null;
  return {
    version: 2,
    finished: Boolean(stored.finished),
    completedSteps: stored.completedSteps.filter((step): step is TutorialStep => TUTORIAL_STEPS.includes(step))
  };
}

function addUnique<T>(items: readonly T[], item: T): readonly T[] {
  return items.includes(item) ? items : [...items, item];
}
