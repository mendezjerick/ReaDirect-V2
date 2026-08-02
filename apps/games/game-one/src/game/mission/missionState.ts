import { getMission, getMissions, MISSIONS, type MissionId } from "../content/missions";
import { getNpc, type NpcId } from "../content/npcs";
import { getLandmark, type LandmarkId } from "../content/landmarks";
import type { InteractionTarget } from "../interactions/interactionSystem";
import type { QuestionRound } from "../questions/questionRound";
import type { GameLanguage } from "../localization/language";

export type MissionStage =
  | "approachStoryCharacter"
  | "storyIntroduction"
  | "readingIntro"
  | "storyPresentation"
  | "storyReview"
  | "missionAction"
  | "missionActionFeedback"
  | "questionIntro"
  | "questionRound"
  | "answerSelected"
  | "questionFeedback"
  | "heartRecovery"
  | "deferredConfirmation"
  | "deferredResume"
  | "questionsCompleted"
  | "questionsRemaining"
  | "missionInProgress"
  | "missionCompleted"
  | "activityCompleted";

type ActiveDialogueBase = {
  speakerName: string;
  speakerRole: string;
  pages: readonly string[];
  pageIndex: number;
};

export type ActiveDialogue =
  | ActiveDialogueBase & {
      kind: "mission" | "optional";
      speakerId: NpcId;
    }
  | ActiveDialogueBase & {
      kind: "landmark";
      speakerId: LandmarkId;
    };

type ReviewReturnStage = "missionAction" | "missionActionFeedback" | "questionIntro" | "questionRound" | "answerSelected" | "questionFeedback" | "heartRecovery" | "deferredResume" | null;
type AnswerStatus = "idle" | "incorrect" | "correct";

export type MissionState = {
  language: GameLanguage;
  missionId: MissionId;
  missionIndex: number;
  stage: MissionStage;
  rounds: readonly QuestionRound[];
  round: QuestionRound;
  readingPresented: boolean;
  readingPageIndex: number;
  actionStatus: AnswerStatus;
  selectedActionChoiceId: string | null;
  rejectedActionChoiceIds: readonly string[];
  actionAttempts: number;
  currentQuestionIndex: number;
  completedQuestionIds: readonly string[];
  answerStatus: AnswerStatus;
  selectedChoiceId: string | null;
  rejectedChoiceIds: readonly string[];
  rejectedChoiceIdsByQuestion: Readonly<Record<string, readonly string[]>>;
  attemptsByQuestion: Readonly<Record<string, number>>;
  incorrectSubmissionsByQuestion: Readonly<Record<string, number>>;
  readingHeartsRemaining: number;
  recoveredQuestionIds: readonly string[];
  passageRereadCount: number;
  comprehensionRestartCount: number;
  savedQuestionIds: readonly string[];
  savedNotice: string;
  completedMissionIds: readonly MissionId[];
  reviewReturnStage: ReviewReturnStage;
  activeDialogue: ActiveDialogue | null;
  availableInteraction: InteractionTarget | null;
  helpOpen: boolean;
  helpRequestCount: number;
  activityCompleted: boolean;
  announcement: string;
};

export type MissionEvent =
  | { type: "SET_LANGUAGE"; language: GameLanguage }
  | { type: "START_ACTIVITY" }
  | { type: "TALK_TO_NPC"; npcId: NpcId }
  | { type: "ADVANCE_DIALOGUE" }
  | { type: "COMPLETE_DIALOGUE" }
  | { type: "SKIP_DIALOGUE" }
  | { type: "CLOSE_DIALOGUE" }
  | { type: "START_READING" }
  | { type: "PREVIOUS_READING_PAGE" }
  | { type: "NEXT_READING_PAGE" }
  | { type: "FINISH_STORY" }
  | { type: "BEGIN_MISSION_ACTION" }
  | { type: "SUBMIT_MISSION_ACTION"; choiceId: string }
  | { type: "CONTINUE_AFTER_ACTION" }
  | { type: "START_QUESTIONS" }
  | { type: "OPEN_STORY_REVIEW" }
  | { type: "CLOSE_STORY_REVIEW" }
  | { type: "SELECT_ANSWER"; choiceId: string }
  | { type: "SUBMIT_ANSWER"; choiceId: string }
  | { type: "TRY_QUESTION_AGAIN" }
  | { type: "READ_AND_RESTART" }
  | { type: "ANSWER_LATER" }
  | { type: "CONFIRM_ANSWER_LATER" }
  | { type: "CANCEL_ANSWER_LATER" }
  | { type: "ANSWER_SAVED_NOW" }
  | { type: "START_SAVED_QUESTIONS" }
  | { type: "CONTINUE_LATER" }
  | { type: "CONTINUE_AFTER_CORRECT" }
  | { type: "CONTINUE_AFTER_QUESTIONS" }
  | { type: "CONTINUE_TO_NEXT_MISSION" }
  | { type: "ACTIVATE_INTERACTION"; target: InteractionTarget }
  | { type: "SET_AVAILABLE_INTERACTION"; target: InteractionTarget | null }
  | { type: "REQUEST_HELP" }
  | { type: "CLOSE_HELP" }
  | { type: "RESET_ACTIVITY"; rounds: readonly QuestionRound[] };

export function createInitialMissionState(rounds: readonly QuestionRound[], language: GameLanguage = "en"): MissionState {
  if (rounds.length !== MISSIONS.length || rounds.some((round, index) => round.missionId !== MISSIONS[index].id)) {
    throw new Error("Mission rounds must match the complete ordered mission catalog.");
  }
  const first = getMissions(language)[0];
  return {
    language,
    missionId: first.id,
    missionIndex: 0,
    stage: "approachStoryCharacter",
    rounds,
    round: rounds[0],
    readingPresented: false,
    readingPageIndex: 0,
    actionStatus: "idle",
    selectedActionChoiceId: null,
    rejectedActionChoiceIds: [],
    actionAttempts: 0,
    currentQuestionIndex: 0,
    completedQuestionIds: [],
    answerStatus: "idle",
    selectedChoiceId: null,
    rejectedChoiceIds: [],
    rejectedChoiceIdsByQuestion: {},
    attemptsByQuestion: {},
    incorrectSubmissionsByQuestion: {},
    readingHeartsRemaining: READING_HEARTS_TOTAL,
    recoveredQuestionIds: [],
    passageRereadCount: 0,
    comprehensionRestartCount: 0,
    savedQuestionIds: [],
    savedNotice: "",
    completedMissionIds: [],
    reviewReturnStage: null,
    activeDialogue: null,
    availableInteraction: null,
    helpOpen: false,
    helpRequestCount: 0,
    activityCompleted: false,
    announcement: first.objective
  };
}

export function missionReducer(state: MissionState, event: MissionEvent): MissionState {
  switch (event.type) {
    case "SET_LANGUAGE":
      return event.language === state.language ? state : localizeMissionState(state, event.language);
    case "RESET_ACTIVITY":
      return createInitialMissionState(event.rounds, state.language);
    case "SET_AVAILABLE_INTERACTION":
      return sameTarget(state.availableInteraction, event.target) ? state : { ...state, availableInteraction: event.target };
    case "ACTIVATE_INTERACTION":
      if (
        state.activeDialogue ||
        state.helpOpen ||
        !["approachStoryCharacter", "missionInProgress"].includes(state.stage) ||
        !event.target.enabled
      ) return state;
      if (event.target.kind === "landmark") {
        return inspectLandmark(state, event.target.landmarkId);
      }
      if (event.target.kind === "shop") return state;
      return missionReducer(state, { type: "TALK_TO_NPC", npcId: event.target.npcId });
    case "TALK_TO_NPC":
      return talkToNpc(state, event.npcId);
    case "START_ACTIVITY":
      return startMission(state);
    case "ADVANCE_DIALOGUE":
      if (!state.activeDialogue || state.activeDialogue.pageIndex >= state.activeDialogue.pages.length - 1) return state;
      return { ...state, activeDialogue: { ...state.activeDialogue, pageIndex: state.activeDialogue.pageIndex + 1 } };
    case "COMPLETE_DIALOGUE":
      return completeDialogue(state);
    case "SKIP_DIALOGUE":
      return state.activeDialogue
        ? completeDialogue({ ...state, activeDialogue: { ...state.activeDialogue, pageIndex: state.activeDialogue.pages.length - 1 } })
        : state;
    case "CLOSE_DIALOGUE":
      return state.activeDialogue?.kind !== "mission" ? { ...state, activeDialogue: null } : state;
    case "START_READING":
      if (state.stage !== "readingIntro") return state;
      return { ...state, stage: "storyPresentation", readingPageIndex: 0, announcement: stateText(state.language).readCarefully };
    case "PREVIOUS_READING_PAGE":
      if (state.stage !== "storyPresentation" || state.readingPageIndex === 0) return state;
      return { ...state, readingPageIndex: state.readingPageIndex - 1 };
    case "NEXT_READING_PAGE": {
      const pages = getMission(state.missionId, state.language).reading.pages;
      if (state.stage !== "storyPresentation" || state.readingPageIndex >= pages.length - 1) return state;
      return { ...state, readingPageIndex: state.readingPageIndex + 1 };
    }
    case "FINISH_STORY":
      if (state.stage !== "storyPresentation") return state;
      return {
        ...state,
        stage: "storyReview",
        readingPresented: true,
        reviewReturnStage: null,
        announcement: stateText(state.language).readingComplete
      };
    case "BEGIN_MISSION_ACTION":
      if (state.stage !== "storyReview" || !state.readingPresented || state.reviewReturnStage) return state;
      return { ...state, stage: "missionAction", announcement: stateText(state.language).useReading };
    case "SUBMIT_MISSION_ACTION":
      return submitMissionAction(state, event.choiceId);
    case "CONTINUE_AFTER_ACTION":
      if (state.stage !== "missionActionFeedback" || state.actionStatus !== "correct") return state;
      return {
        ...state,
        stage: "questionIntro",
        currentQuestionIndex: 0,
        answerStatus: "idle",
        readingHeartsRemaining: READING_HEARTS_TOTAL,
        announcement: stateText(state.language).questionsReady
      };
    case "START_QUESTIONS":
      if (state.stage !== "questionIntro") return state;
      return { ...state, stage: "questionRound", announcement: stateText(state.language).questionProgress(1, state.round.questions.length) };
    case "OPEN_STORY_REVIEW":
      if (!["missionAction", "missionActionFeedback", "questionIntro", "questionRound", "answerSelected", "questionFeedback", "deferredResume"].includes(state.stage)) return state;
      return {
        ...state,
        reviewReturnStage: state.stage as Exclude<ReviewReturnStage, null>,
        stage: "storyReview",
        helpOpen: false,
        passageRereadCount: isQuestionStage(state.stage) ? state.passageRereadCount + 1 : state.passageRereadCount
      };
    case "CLOSE_STORY_REVIEW":
      if (state.stage !== "storyReview" || !state.reviewReturnStage) return state;
      return { ...state, stage: state.reviewReturnStage, reviewReturnStage: null };
    case "SELECT_ANSWER":
      return selectAnswer(state, event.choiceId);
    case "SUBMIT_ANSWER":
      return submitAnswer(state, event.choiceId);
    case "TRY_QUESTION_AGAIN":
      if (state.stage !== "questionFeedback" || state.answerStatus !== "incorrect") return state;
      if (getReadingHearts(state) <= 0) return { ...state, stage: "heartRecovery" };
      return { ...state, stage: "questionRound", answerStatus: "idle", selectedChoiceId: null, announcement: stateText(state.language).tryQuestionAgain };
    case "READ_AND_RESTART":
      return restartComprehension(state);
    case "ANSWER_LATER":
      if (!["questionRound", "answerSelected", "questionFeedback"].includes(state.stage) || state.answerStatus === "correct") return state;
      return { ...state, stage: "deferredConfirmation", helpOpen: false };
    case "CANCEL_ANSWER_LATER":
      if (state.stage !== "deferredConfirmation") return state;
      return { ...state, stage: state.selectedChoiceId ? "answerSelected" : "questionRound" };
    case "CONFIRM_ANSWER_LATER":
      return answerLater(state);
    case "ANSWER_SAVED_NOW":
      return answerSavedNow(state);
    case "START_SAVED_QUESTIONS":
      if (state.stage !== "deferredResume") return state;
      return { ...state, stage: "questionRound", savedNotice: stateText(state.language).answerSavedQuestion, announcement: stateText(state.language).savedQuestionReady };
    case "CONTINUE_LATER":
      if (state.stage !== "questionsRemaining") return state;
      return {
        ...state,
        stage: "missionInProgress",
        helpOpen: false,
        announcement: stateText(state.language).questionsSaved
      };
    case "CONTINUE_AFTER_CORRECT":
      return continueAfterCorrect(state);
    case "CONTINUE_AFTER_QUESTIONS":
      if (state.stage !== "questionsCompleted" || unansweredQuestionIds(state).length > 0 || state.actionStatus !== "correct") return state;
      return {
        ...state,
        stage: "missionCompleted",
        completedMissionIds: addUnique(state.completedMissionIds, state.missionId),
        availableInteraction: null,
        helpOpen: false,
        announcement: getMission(state.missionId, state.language).worldResult
      };
    case "CONTINUE_TO_NEXT_MISSION":
      return continueToNextMission(state);
    case "REQUEST_HELP":
      return state.helpOpen ? state : { ...state, helpOpen: true, helpRequestCount: state.helpRequestCount + 1 };
    case "CLOSE_HELP":
      return state.helpOpen ? { ...state, helpOpen: false } : state;
  }
}

export function getCurrentObjective(state: MissionState) {
  const mission = getMission(state.missionId, state.language);
  const copy = stateText(state.language);
  if (state.stage === "approachStoryCharacter") return { label: mission.objective, help: mission.objectiveHelp };
  if (["storyIntroduction", "readingIntro", "storyPresentation", "storyReview", "missionAction", "missionActionFeedback"].includes(state.stage)) {
    return { label: copy.useReadingTitle(mission.reading.title), help: copy.useReadingHelp(mission.reading.format.toLowerCase()) };
  }
  if (state.stage === "missionInProgress") {
    return {
      label: copy.returnToQuestions(getNpc(mission.npcId).displayName),
      help: copy.returnToQuestionsHelp
    };
  }
  if (["questionIntro", "questionRound", "answerSelected", "questionFeedback", "deferredConfirmation", "deferredResume", "questionsCompleted", "questionsRemaining"].includes(state.stage)) {
    return { label: copy.completeQuestions(mission.reading.format.toLowerCase()), help: copy.questionHelp };
  }
  if (state.stage === "missionCompleted") {
    return { label: mission.nextMissionId ? copy.continueMission(mission.order + 1) : copy.openCommunity, help: mission.worldResult };
  }
  return { label: copy.journeyComplete, help: copy.replayOrReturn };
}

function talkToNpc(state: MissionState, npcId: NpcId): MissionState {
  if (state.activeDialogue || state.helpOpen || !["approachStoryCharacter", "missionInProgress"].includes(state.stage)) return state;
  const mission = getMission(state.missionId, state.language);
  if (state.stage === "missionInProgress" && npcId === mission.npcId) return answerSavedNow(state);
  if (npcId === mission.npcId) return startMission(state);
  const speaker = getNpc(npcId);
  return {
    ...state,
    activeDialogue: {
      kind: "optional",
      speakerId: npcId,
      speakerName: speaker.displayName,
      speakerRole: speaker.roleTitle[state.language],
      pages: speaker.optionalDialogue[state.language],
      pageIndex: 0
    }
  };
}

function startMission(state: MissionState): MissionState {
  if (state.stage !== "approachStoryCharacter" || state.activeDialogue) return state;
  const mission = getMission(state.missionId, state.language);
  const npc = getNpc(mission.npcId);
  return {
    ...state,
    stage: "storyIntroduction",
    activeDialogue: {
      kind: "mission",
      speakerId: mission.npcId,
      speakerName: npc.displayName,
      speakerRole: npc.roleTitle[state.language],
      pages: mission.briefing,
      pageIndex: 0
    },
    helpOpen: false
  };
}

function completeDialogue(state: MissionState): MissionState {
  if (!state.activeDialogue || state.activeDialogue.pageIndex !== state.activeDialogue.pages.length - 1) return state;
  if (state.activeDialogue.kind !== "mission") return { ...state, activeDialogue: null };
  const mission = getMission(state.missionId, state.language);
  return {
    ...state,
    activeDialogue: null,
    stage: "readingIntro",
    announcement: stateText(state.language).readyToRead(mission.reading.title)
  };
}

function inspectLandmark(state: MissionState, landmarkId: LandmarkId): MissionState {
  if (state.activeDialogue || state.helpOpen || !["approachStoryCharacter", "missionInProgress"].includes(state.stage)) return state;
  const landmark = getLandmark(landmarkId);
  return {
    ...state,
    activeDialogue: {
      kind: "landmark",
      speakerId: landmark.id,
      speakerName: landmark.displayName[state.language],
      speakerRole: landmark.roleTitle[state.language],
      pages: landmark.pages[state.language],
      pageIndex: 0
    }
  };
}

function submitMissionAction(state: MissionState, choiceId: string): MissionState {
  const canChoose = state.readingPresented &&
    (state.stage === "missionAction" || (state.stage === "missionActionFeedback" && state.actionStatus === "incorrect"));
  if (!canChoose || state.rejectedActionChoiceIds.includes(choiceId)) return state;
  const action = getMission(state.missionId, state.language).action;
  if (!action.choices.some((choice) => choice.id === choiceId)) return state;
  const isCorrect = choiceId === action.correctChoiceId;
  return {
    ...state,
    stage: "missionActionFeedback",
    actionStatus: isCorrect ? "correct" : "incorrect",
    selectedActionChoiceId: choiceId,
    rejectedActionChoiceIds: isCorrect ? state.rejectedActionChoiceIds : addUnique(state.rejectedActionChoiceIds, choiceId),
    actionAttempts: state.actionAttempts + 1,
    announcement: isCorrect ? action.correctFeedback : stateText(state.language).tryMissionAgain
  };
}

function selectAnswer(state: MissionState, choiceId: string): MissionState {
  if (!state.readingPresented || !["questionRound", "answerSelected"].includes(state.stage) || state.rejectedChoiceIds.includes(choiceId)) return state;
  const question = state.round.questions[state.currentQuestionIndex];
  if (!question?.choices.some((choice) => choice.id === choiceId)) return state;
  return { ...state, stage: "answerSelected", selectedChoiceId: choiceId, answerStatus: "idle", savedNotice: "" };
}

function submitAnswer(state: MissionState, choiceId: string): MissionState {
  if (!state.readingPresented || state.stage !== "answerSelected" || state.selectedChoiceId !== choiceId || state.rejectedChoiceIds.includes(choiceId)) return state;
  const question = state.round.questions[state.currentQuestionIndex];
  if (!question?.choices.some((choice) => choice.id === choiceId)) return state;
  const attempts = (state.attemptsByQuestion[question.id] ?? 0) + 1;
  const isCorrect = choiceId === question.correctChoiceId;
  const incorrectSubmissions = state.incorrectSubmissionsByQuestion[question.id] ?? 0;
  const hearts = getReadingHearts(state);
  const heartsAfterSubmission = isCorrect ? hearts : Math.max(0, hearts - 1);
  return {
    ...state,
    stage: !isCorrect && heartsAfterSubmission === 0 ? "heartRecovery" : "questionFeedback",
    answerStatus: isCorrect ? "correct" : "incorrect",
    selectedChoiceId: choiceId,
    rejectedChoiceIds: isCorrect ? state.rejectedChoiceIds : addUnique(state.rejectedChoiceIds, choiceId),
    attemptsByQuestion: { ...state.attemptsByQuestion, [question.id]: attempts },
    incorrectSubmissionsByQuestion: isCorrect
      ? state.incorrectSubmissionsByQuestion
      : { ...state.incorrectSubmissionsByQuestion, [question.id]: incorrectSubmissions + 1 },
    readingHeartsRemaining: heartsAfterSubmission,
    rejectedChoiceIdsByQuestion: isCorrect
      ? state.rejectedChoiceIdsByQuestion
      : {
          ...state.rejectedChoiceIdsByQuestion,
          [question.id]: addUnique(state.rejectedChoiceIdsByQuestion[question.id] ?? [], choiceId)
        },
    completedQuestionIds: isCorrect ? addUnique(state.completedQuestionIds, question.id) : state.completedQuestionIds,
    savedQuestionIds: isCorrect
      ? state.savedQuestionIds.filter((questionId) => questionId !== question.id)
      : state.savedQuestionIds,
    savedNotice: "",
    announcement: isCorrect
      ? question.correctFeedback
      : heartsAfterSubmission === 0 ? stateText(state.language).rechargeHeart : question.incorrectFeedback
  };
}

export const READING_HEARTS_TOTAL = 3;

export function getReadingHearts(state: MissionState) {
  return state.readingHeartsRemaining;
}

export function isMissionStageBlocking(stage: MissionStage) {
  return stage !== "approachStoryCharacter" && stage !== "missionInProgress";
}

export function getMissionTargetNpcId(state: MissionState): NpcId | null {
  return state.activityCompleted || !["approachStoryCharacter", "missionInProgress"].includes(state.stage)
    ? null
    : getMission(state.missionId, state.language).npcId;
}

function restartComprehension(state: MissionState): MissionState {
  if (state.stage !== "heartRecovery") return state;
  const question = state.round.questions[state.currentQuestionIndex];
  if (!question) return state;
  const firstQuestion = state.round.questions[0];
  return {
    ...state,
    stage: "storyReview",
    reviewReturnStage: "questionIntro",
    currentQuestionIndex: 0,
    answerStatus: "idle",
    selectedChoiceId: null,
    rejectedChoiceIds: firstQuestion?.id === question.id
      ? []
      : state.rejectedChoiceIdsByQuestion[firstQuestion?.id ?? ""] ?? [],
    rejectedChoiceIdsByQuestion: omitRecordKey(state.rejectedChoiceIdsByQuestion, question.id),
    attemptsByQuestion: omitRecordKey(state.attemptsByQuestion, question.id),
    incorrectSubmissionsByQuestion: omitRecordKey(state.incorrectSubmissionsByQuestion, question.id),
    readingHeartsRemaining: READING_HEARTS_TOTAL,
    recoveredQuestionIds: addUnique(state.recoveredQuestionIds, question.id),
    comprehensionRestartCount: state.comprehensionRestartCount + 1,
    helpOpen: false,
    savedNotice: "",
    announcement: stateText(state.language).challengeRestarted
  };
}

function isQuestionStage(stage: MissionStage) {
  return ["questionIntro", "questionRound", "answerSelected", "questionFeedback", "heartRecovery", "deferredResume"].includes(stage);
}

function continueAfterCorrect(state: MissionState): MissionState {
  if (state.stage !== "questionFeedback" || state.answerStatus !== "correct") return state;
  const nextIndex = findNextQuestionIndex(state, state.currentQuestionIndex, true);
  if (nextIndex === null) {
    const unanswered = unansweredQuestionIds(state);
    if (unanswered.length > 0) {
      return {
        ...state,
        stage: "questionsRemaining",
        answerStatus: "idle",
        selectedChoiceId: null,
        rejectedChoiceIds: [],
        savedNotice: "",
        announcement: stateText(state.language).savedCount(unanswered.length)
      };
    }
    return {
      ...state,
      stage: "questionsCompleted",
      answerStatus: "idle",
      selectedChoiceId: null,
      announcement: stateText(state.language).questionsCompleted
    };
  }
  return {
    ...state,
    stage: "questionRound",
    currentQuestionIndex: nextIndex,
    answerStatus: "idle",
    selectedChoiceId: null,
    rejectedChoiceIds: state.rejectedChoiceIdsByQuestion[state.round.questions[nextIndex].id] ?? [],
    savedNotice: "",
    announcement: stateText(state.language).questionProgress(nextIndex + 1, state.round.questions.length)
  };
}

function continueToNextMission(state: MissionState): MissionState {
  if (state.stage !== "missionCompleted") return state;
  const mission = getMission(state.missionId, state.language);
  if (!mission.nextMissionId) {
    return {
      ...state,
      stage: "activityCompleted",
      activityCompleted: true,
      announcement: stateText(state.language).communityOpen
    };
  }
  const nextIndex = state.missionIndex + 1;
  const next = getMissions(state.language)[nextIndex];
  return {
    ...state,
    missionId: next.id,
    missionIndex: nextIndex,
    stage: "approachStoryCharacter",
    round: state.rounds[nextIndex],
    readingPresented: false,
    readingPageIndex: 0,
    actionStatus: "idle",
    selectedActionChoiceId: null,
    rejectedActionChoiceIds: [],
    actionAttempts: 0,
    currentQuestionIndex: 0,
    answerStatus: "idle",
    selectedChoiceId: null,
    rejectedChoiceIds: [],
    readingHeartsRemaining: READING_HEARTS_TOTAL,
    savedNotice: "",
    reviewReturnStage: null,
    activeDialogue: null,
    availableInteraction: null,
    helpOpen: false,
    announcement: next.objective
  };
}

function answerLater(state: MissionState): MissionState {
  if (state.stage !== "deferredConfirmation") return state;
  const question = state.round.questions[state.currentQuestionIndex];
  if (!question || state.completedQuestionIds.includes(question.id)) return state;
  const savedQuestionIds = addUnique(state.savedQuestionIds, question.id);
  return {
    ...state,
    savedQuestionIds,
    stage: "missionInProgress",
    answerStatus: "idle",
    selectedChoiceId: null,
    rejectedChoiceIds: state.rejectedChoiceIdsByQuestion[question.id] ?? state.rejectedChoiceIds,
    savedNotice: stateText(state.language).questionSaved,
    helpOpen: false,
    announcement: stateText(state.language).questionSaved
  };
}

function answerSavedNow(state: MissionState): MissionState {
  if (state.stage !== "questionsRemaining" && state.stage !== "missionInProgress") return state;
  const firstSavedId = state.savedQuestionIds.find((id) => !state.completedQuestionIds.includes(id));
  if (!firstSavedId) return state;
  const questionIndex = state.round.questions.findIndex(({ id }) => id === firstSavedId);
  if (questionIndex < 0) return state;
  return {
    ...state,
    stage: "deferredResume",
    currentQuestionIndex: questionIndex,
    answerStatus: "idle",
    selectedChoiceId: null,
    rejectedChoiceIds: state.rejectedChoiceIdsByQuestion[firstSavedId] ?? [],
    savedNotice: stateText(state.language).answerSavedQuestion,
    announcement: stateText(state.language).answerSavedQuestion
  };
}

function unansweredQuestionIds(state: MissionState) {
  return state.round.questions
    .map(({ id }) => id)
    .filter((id) => !state.completedQuestionIds.includes(id));
}

function findNextQuestionIndex(state: MissionState, currentIndex: number, excludeSaved: boolean) {
  const indexes = [
    ...state.round.questions.map((_, index) => index).slice(currentIndex + 1),
    ...state.round.questions.map((_, index) => index).slice(0, currentIndex)
  ];
  return indexes.find((index) => {
    const id = state.round.questions[index].id;
    return !state.completedQuestionIds.includes(id) && (!excludeSaved || !state.savedQuestionIds.includes(id));
  }) ?? null;
}

function addUnique<T>(items: readonly T[], item: T): readonly T[] {
  return items.includes(item) ? items : [...items, item];
}

function omitRecordKey<T>(record: Readonly<Record<string, T>>, key: string): Readonly<Record<string, T>> {
  const rest = { ...record };
  delete rest[key];
  return rest;
}

function sameTarget(a: InteractionTarget | null, b: InteractionTarget | null) {
  return a?.id === b?.id && a?.enabled === b?.enabled;
}

function localizeMissionState(state: MissionState, language: GameLanguage): MissionState {
  const rounds = state.rounds.map((round) => localizeRound(round, language));
  const mission = getMission(state.missionId, language);
  const activeDialogue = state.activeDialogue
    ? localizeActiveDialogue(state.activeDialogue, language, mission)
    : null;
  const localized = {
    ...state,
    language,
    rounds,
    round: rounds[state.missionIndex],
    activeDialogue,
    savedNotice: state.savedNotice
      ? state.savedQuestionIds.length > 0 ? stateText(language).answerLater : ""
      : ""
  };
  return { ...localized, announcement: getCurrentObjective(localized).label };
}

function localizeActiveDialogue(
  dialogue: ActiveDialogue,
  language: GameLanguage,
  mission: ReturnType<typeof getMission>
): ActiveDialogue {
  if (dialogue.kind === "landmark") {
    const landmark = getLandmark(dialogue.speakerId);
    return {
      ...dialogue,
      speakerName: landmark.displayName[language],
      speakerRole: landmark.roleTitle[language],
      pages: landmark.pages[language]
    };
  }
  const npc = getNpc(dialogue.speakerId);
  return {
    ...dialogue,
    speakerName: npc.displayName,
    speakerRole: npc.roleTitle[language],
    pages: dialogue.kind === "mission" ? mission.briefing : npc.optionalDialogue[language]
  };
}

function localizeRound(round: QuestionRound, language: GameLanguage): QuestionRound {
  const mission = getMission(round.missionId, language);
  const questionsById = new Map(mission.questions.map((question) => [question.id, question]));
  return {
    ...round,
    questions: round.questions.map((question) => {
      const localized = questionsById.get(question.id);
      if (!localized) throw new Error(`Missing localized question ${question.id}.`);
      const choicesById = new Map(localized.choices.map((choice) => [choice.id, choice]));
      return {
        ...localized,
        // The prepared round owns the stable choice IDs and answer key. The
        // localized catalog only supplies the visible text and feedback.
        correctChoiceId: question.correctChoiceId,
        choices: question.choices.map((choice, index) => {
          const localizedChoice = choicesById.get(choice.id) ?? localized.choices[index];
          if (!localizedChoice) throw new Error(`Missing localized choice ${index} for ${question.id}.`);
          return { ...choice, ...localizedChoice, id: choice.id };
        })
      };
    })
  };
}

function stateText(language: GameLanguage) {
  if (language === "fil") {
    return {
      readCarefully: "Basahing mabuti ang teksto.",
      readingComplete: "Tapos na ang pagbasa. Balikan ang mga detalye bago magpasya sa misyon.",
      useReading: "Gamitin ang binasa upang magpasya sa misyon.",
      questionsReady: "Handa na ang mga tanong.",
      questionProgress: (current: number, total: number) => `Tanong ${current} sa ${total}.`,
      tryQuestionAgain: "Subukang sagutin muli ang tanong.",
      answerSavedQuestion: "Sagutin natin ang inilaan mong tanong.",
      savedQuestionReady: "Handa na ang inilaan mong tanong.",
      questionsSaved: "Naitala ang mga tanong. Maaari mo silang sagutin mamaya.",
      useReadingTitle: (title: string) => `Basahin: ${title}`,
      useReadingHelp: (format: string) => `Basahin ang ${format}. Hanapin ang mahahalagang detalye.`,
      completeQuestions: (format: string) => `Sagutin ang mga tanong sa ${format}.`,
      questionHelp: "Pumili ng isang sagot. Basahin muli kung kailangan.",
      continueMission: (number: number) => `Magpatuloy sa misyon ${number}`,
      openCommunity: "Buksan ang gawaing pagbasa ng komunidad",
      journeyComplete: "Tapos na ang paglalakbay sa pagbasa ng komunidad",
      replayOrReturn: "Ulitin ang paglalakbay o bumalik sa dashboard.",
      waiting: (name: string, location: string) => `Naghihintay sa iyo si ${name} sa ${location}.`,
      readyToRead: (title: string) => `Handa nang basahin ang ${title}.`,
      tryMissionAgain: "Subukang muli ang pasya sa misyon.",
      savedCount: (count: number) => `${count} ${count === 1 ? "tanong ang inilaan" : "mga tanong ang inilaan"} para mamaya.`,
      questionsCompleted: "Nasagot mo ang lahat ng tanong!",
      communityOpen: "Bukas na ang gawaing pagbasa ng komunidad.",
      answerLater: "Ayos lang! Maaari mong sagutin ang tanong na ito mamaya.",
      questionSaved: "Naitala ang tanong! Maaari mo itong balikan mamaya.",
      returnToQuestions: (name: string) => `Bumalik kay ${name}. Ituloy ang tanong.`,
      returnToQuestionsHelp: "Maglibot kung gusto mo. Kausapin siya kapag handa ka na.",
      rechargeHeart: "Simulan nating muli ang hamon. Basahin ang kuwento, saka subukan muli!",
      challengeRestarted: "Naibalik ang tatlong puso. Basahin muli ang kuwento bago magsimula."
    };
  }
  return {
    readCarefully: "Read the passage carefully.",
    readingComplete: "Reading complete. Review the details before making the mission decision.",
    useReading: "Use the reading to make the mission decision.",
    questionsReady: "The questions are ready.",
    questionProgress: (current: number, total: number) => `Question ${current} of ${total}.`,
    tryQuestionAgain: "Try the question again.",
    answerSavedQuestion: "Let's answer your saved question.",
    savedQuestionReady: "Your saved question is ready.",
    questionsSaved: "Your questions are saved. You can answer them later.",
    useReadingTitle: (title: string) => `Read: ${title}`,
    useReadingHelp: (format: string) => `Read the ${format}. Find the key details.`,
    completeQuestions: (format: string) => `Answer the ${format} questions.`,
    questionHelp: "Pick one answer. Read again if you need help.",
    continueMission: (number: number) => `Continue to mission ${number}`,
    openCommunity: "Open the community reading activity",
    journeyComplete: "Community reading journey complete",
    replayOrReturn: "Replay the journey or return to the dashboard.",
    waiting: (name: string, location: string) => `${name} is waiting for you in the ${location}.`,
    readyToRead: (title: string) => `${title} is ready to read.`,
    tryMissionAgain: "Try the mission decision again.",
    savedCount: (count: number) => `${count} ${count === 1 ? "question is" : "questions are"} saved for later.`,
    questionsCompleted: "You completed the questions!",
    communityOpen: "The community reading activity is open.",
    answerLater: "That's okay! You can answer this question later.",
    questionSaved: "Question saved! You can return to it later.",
    returnToQuestions: (name: string) => `Go back to ${name}. Continue your question.`,
    returnToQuestionsHelp: "Explore if you want. Talk when you are ready.",
    rechargeHeart: "Let's start this challenge again. Read the story, then try once more!",
    challengeRestarted: "Three hearts restored. Read the story again before you begin."
  };
}
