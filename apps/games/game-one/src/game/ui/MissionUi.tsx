import { useEffect, useMemo, useRef, useState } from "react";
import { getMission, getSkillLabels, MISSIONS } from "../content/missions";
import { getLoreAssignments } from "../content/lore";
import { getNpc } from "../content/npcs";
import {
  getCurrentObjective,
  getReadingHearts,
  READING_HEARTS_TOTAL,
  type MissionEvent,
  type MissionStage,
  type MissionState
} from "../mission/missionState";
import { useNarration } from "../narration/useNarration";
import { useTypewriterPreference, useTypewriterText } from "../narration/useTypewriterText";
import { getUiCopy } from "../localization/language";

type MissionDispatch = (event: MissionEvent) => void;

export function ObjectiveTracker({ state }: { state: MissionState }) {
  const [collapsed, setCollapsed] = useState(false);
  const current = getCurrentObjective(state);
  const copy = getUiCopy(state.language);

  return (
    <aside className="mission-objective" aria-label={copy.currentObjective}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-[#facc15]">{copy.mission} {state.missionIndex + 1} {copy.of} {MISSIONS.length}</p>
          {!collapsed && <p className="mt-1 text-sm font-bold leading-5 text-white sm:text-base">{current.label}</p>}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? copy.expandObjective : copy.collapseObjective}
          className="grid min-h-11 min-w-11 place-items-center rounded-md border border-white/40 bg-black/25 font-black text-white"
        >
          {collapsed ? "+" : "-"}
        </button>
      </div>
      {!collapsed && state.stage !== "approachStoryCharacter" && (
        <p className="mt-2 text-xs text-[#dcefe5]">
          {state.completedMissionIds.length} {copy.missionsComplete}
          {state.stage === "questionRound" || state.stage === "questionFeedback"
            ? ` | ${copy.question} ${state.currentQuestionIndex + 1} ${copy.of} ${state.round.questions.length}`
            : ""}
        </p>
      )}
    </aside>
  );
}

export function MissionAnnouncements({ message }: { message: string }) {
  return <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{message}</p>;
}

export function DeferredSavedNotice({ state }: { state: MissionState }) {
  if (state.stage !== "missionInProgress" || !state.savedNotice) return null;
  return (
    <div className="deferred-saved-toast" role="status" aria-live="polite">
      {state.savedNotice}
    </div>
  );
}

export function DialogueOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastAdvanceRef = useRef(Number.NEGATIVE_INFINITY);
  const active = state.activeDialogue;
  const copy = getUiCopy(state.language);
  const fullText = active?.pages[active.pageIndex] ?? "";
  const typewriterPreference = useTypewriterPreference();
  const typewriter = useTypewriterText(fullText, typewriterPreference.enabled);
  const narration = useNarration(fullText, Boolean(active), state.language);

  useEffect(() => {
    lastAdvanceRef.current = Number.NEGATIVE_INFINITY;
  }, [active?.pageIndex, active?.speakerId]);

  useEffect(() => {
    if (active) panelRef.current?.querySelector<HTMLButtonElement>("[data-dialogue-primary]")?.focus();
  }, [active]);

  if (!active) return null;
  const isLastPage = active.pageIndex === active.pages.length - 1;

  return (
    <div className="mission-overlay" role="presentation">
      <section ref={panelRef} role="dialog" aria-modal="true" aria-label={`${active.speakerName} dialogue`} tabIndex={-1} className="dialogue-panel">
        <div className="dialogue-speaker" aria-hidden="true"><span>{initials(active.speakerName)}</span></div>
        <div className="min-w-0 flex-1 overflow-y-auto pr-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase text-[#176b4d]">{active.speakerName}</p>
              <p className="mt-1 text-sm font-bold text-[#567064]">{active.speakerRole}</p>
              <p className="text-xs font-bold text-[#6b7f75]">{copy.page} {active.pageIndex + 1} {copy.of} {active.pages.length}</p>
            </div>
            {active.kind !== "mission" && (
              <button type="button" onClick={() => dispatch({ type: "CLOSE_DIALOGUE" })} className="min-h-11 rounded-md border-2 border-[#176b4d] px-3 font-extrabold text-[#176b4d]">{copy.close}</button>
            )}
          </div>
          <p aria-label={fullText} className="mt-3 text-lg font-semibold leading-7 text-[#13251d] sm:text-xl sm:leading-8">{typewriter.displayedText}</p>
        </div>
        <div className="dialogue-actions">
          <button type="button" aria-label={state.language === "fil" ? `Laktawan ang usapan kay ${active.speakerName}` : `Skip dialogue with ${active.speakerName}`} onClick={() => dispatch({ type: "SKIP_DIALOGUE" })} className="dialogue-skip">{copy.skip}</button>
          <button type="button" title={!narration.supported ? copy.noRecording : undefined} onClick={narration.replay} disabled={!narration.supported || narration.muted} className="dialogue-tool">{narration.supported ? copy.replayVoice : copy.narrationUnavailable}</button>
          {narration.supported && <button type="button" onClick={narration.toggleMute} className="dialogue-tool">{narration.muted ? copy.turnVoiceOn : copy.mute}</button>}
          <button type="button" onClick={typewriterPreference.toggle} className="dialogue-tool">{typewriterPreference.enabled ? copy.textEffectOff : copy.textEffectOn}</button>
          <button
            type="button"
            data-dialogue-primary="true"
            onClick={() => {
              const now = performance.now();
              if (now - lastAdvanceRef.current < 180) return;
              lastAdvanceRef.current = now;
              if (!typewriter.isComplete) {
                typewriter.complete();
                return;
              }
              dispatch({ type: isLastPage ? "COMPLETE_DIALOGUE" : "ADVANCE_DIALOGUE" });
            }}
            className="dialogue-next"
          >
            {isLastPage ? (active.kind === "mission" ? copy.readMessage : copy.close) : copy.next}
          </button>
        </div>
      </section>
    </div>
  );
}

export function StoryPresentationOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  if (state.stage !== "storyPresentation") return null;
  const copy = getUiCopy(state.language);
  const mission = getMission(state.missionId, state.language);
  const page = mission.reading.pages[state.readingPageIndex];
  const lastPage = state.readingPageIndex === mission.reading.pages.length - 1;
  const loreAssignments = getLoreAssignments(mission.id);
  return (
    <div className="mission-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="reading-title" className="story-panel pixel-reading-panel">
        <p className="story-eyebrow">{mission.reading.format}</p>
        <h2 id="reading-title">{mission.reading.title}</h2>
        <p className="mt-2 text-sm font-bold text-[#567064]">{copy.purpose}: {mission.situation}</p>
        <p className="reading-progress">{copy.page} {state.readingPageIndex + 1} {copy.of} {mission.reading.pages.length}</p>
        <div className="story-copy"><p>{page}</p></div>
        {state.readingPageIndex === 0 && loreAssignments.length > 0 && (
          <aside className="mt-4 border-l-4 border-[#facc15] bg-[#fff8d7] px-3 py-2 text-sm text-[#13251d]" aria-label={state.language === "fil" ? "Kasama sa misyon" : "Mission team"}>
            <p className="font-black uppercase text-[#176b4d]">{state.language === "fil" ? "Kasama sa Misyon" : "Mission Team"}</p>
            <ul className="mt-1 space-y-1">
              {loreAssignments.map((assignment) => <li key={assignment.npcId}><strong>{getNpc(assignment.npcId).displayName}:</strong> {assignment.task[state.language]}</li>)}
            </ul>
          </aside>
        )}
        <div className="reading-actions">
          <button type="button" onClick={() => dispatch({ type: "PREVIOUS_READING_PAGE" })} disabled={state.readingPageIndex === 0} className="question-secondary">{copy.previous}</button>
          {!lastPage && <button type="button" autoFocus onClick={() => dispatch({ type: "NEXT_READING_PAGE" })} className="story-primary">{copy.next}</button>}
          {lastPage && <button type="button" autoFocus onClick={() => dispatch({ type: "FINISH_STORY" })} className="story-primary">{copy.ready}</button>}
        </div>
      </section>
    </div>
  );
}

export function ReadingIntroOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  if (state.stage !== "readingIntro") return null;
  const copy = getUiCopy(state.language);
  const mission = getMission(state.missionId, state.language);
  return (
    <div className="mission-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="reading-intro-title" className="story-panel activity-intro-panel pixel-reading-panel">
        <p className="story-eyebrow">{copy.readingActivity}</p>
        <h2 id="reading-intro-title">{mission.reading.title}</h2>
        <p>{copy.readingIntro}</p>
        <button type="button" autoFocus onClick={() => dispatch({ type: "START_READING" })} className="story-primary">{copy.startReading}</button>
      </section>
    </div>
  );
}

export function StoryReviewOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  if (state.stage !== "storyReview") return null;
  const copy = getUiCopy(state.language);
  const mission = getMission(state.missionId, state.language);
  const returning = state.reviewReturnStage !== null;
  return (
    <div className="mission-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="review-title" className="story-panel pixel-reading-panel">
        <p className="story-eyebrow">{returning ? `${copy.review}: ${mission.reading.format}` : copy.readingComplete}</p>
        <h2 id="review-title">{returning ? mission.reading.title : copy.useUnderstanding}</h2>
        {returning && <div className="story-copy">{mission.reading.pages.map((page) => <p key={page}>{page}</p>)}</div>}
        {!returning && <p className="activity-transition-copy">{copy.transition}</p>}
        <button type="button" autoFocus onClick={() => dispatch({ type: returning ? "CLOSE_STORY_REVIEW" : "BEGIN_MISSION_ACTION" })} className="story-primary">
          {returning ? copy.backActivity : copy.continue}
        </button>
      </section>
    </div>
  );
}

export function MissionActionOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  const isActive = state.stage === "missionAction" || state.stage === "missionActionFeedback";
  if (!isActive) return null;
  const copy = getUiCopy(state.language);
  const mission = getMission(state.missionId, state.language);
  const isCorrect = state.actionStatus === "correct";
  const isIncorrect = state.actionStatus === "incorrect";
  const feedback = isCorrect
    ? mission.action.correctFeedback
    : state.actionAttempts >= 2
      ? `${mission.action.incorrectFeedback} ${mission.action.hint}`
      : mission.action.incorrectFeedback;

  return (
    <div className="mission-overlay question-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="mission-action-title" className="question-panel pixel-reading-panel">
        <header className="question-header">
          <div><p className="story-eyebrow">{copy.missionDecision}</p><h2 id="mission-action-title">{copy.useWhatRead}</h2></div>
          <button type="button" data-tutorial="read-again" onClick={() => dispatch({ type: "OPEN_STORY_REVIEW" })} className="question-secondary">{copy.readAgain}</button>
        </header>
        <div className="question-scroll">
          <p className="question-prompt">{mission.action.prompt}</p>
          <ChoiceGrid
            choices={mission.action.choices}
            language={state.language}
            disabledIds={state.rejectedActionChoiceIds}
            locked={isCorrect}
            onChoose={(choiceId) => dispatch({ type: "SUBMIT_MISSION_ACTION", choiceId })}
          />
          {(isCorrect || isIncorrect) && (
            <div className={`answer-feedback ${isCorrect ? "is-correct" : "is-hint"}`} role="status" aria-live="polite">
              <strong>{isCorrect ? copy.missionActionComplete : copy.checkMessage}</strong><span>{feedback}</span>
            </div>
          )}
        </div>
        <footer className="question-footer">
          <button type="button" onClick={() => dispatch({ type: "REQUEST_HELP" })} className="question-secondary">{copy.help}</button>
          {isCorrect && <button type="button" data-tutorial="continue-questions" onClick={() => dispatch({ type: "CONTINUE_AFTER_ACTION" })} className="story-primary">{copy.continueQuestions}</button>}
        </footer>
      </section>
    </div>
  );
}

export function QuestionOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  const panelRef = useRef<HTMLElement | null>(null);
  const isActive = state.stage === "questionRound" || state.stage === "answerSelected" || state.stage === "questionFeedback";
  const question = state.round.questions[state.currentQuestionIndex];
  const copy = getUiCopy(state.language);
  const narration = useNarration(question?.prompt ?? "", isActive && Boolean(question), state.language);
  useEffect(() => {
    if (isActive) panelRef.current?.querySelector<HTMLButtonElement>("[data-first-choice]")?.focus();
  }, [isActive, question?.id]);
  if (!isActive || !question) return null;

  const mission = getMission(state.missionId, state.language);
  const attemptCount = state.attemptsByQuestion[question.id] ?? 0;
  const isCorrect = state.answerStatus === "correct";
  const isIncorrect = state.answerStatus === "incorrect";
  const feedback = isCorrect
    ? question.correctFeedback
    : attemptCount >= 2
      ? `${question.incorrectFeedback} ${question.hint} ${question.explanation}`
      : `${question.incorrectFeedback} ${question.hint}`;
  const completedInRound = state.round.questions.filter(({ id }) => state.completedQuestionIds.includes(id)).length;
  const savedInRound = state.round.questions.filter(({ id }) => state.savedQuestionIds.includes(id)).length;
  const hearts = getReadingHearts(state);

  return (
    <div className="mission-overlay question-overlay">
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="question-title" className="question-panel pixel-reading-panel">
        <header className="question-header">
          <div>
            <p className="story-eyebrow">{mission.reading.title}</p>
            <h2 id="question-title">{copy.question} {state.currentQuestionIndex + 1} {copy.of} {state.round.questions.length}</h2>
            {savedInRound > 0 && <p className="saved-question-count">{state.language === "fil" ? `${savedInRound} ${savedInRound === 1 ? "tanong" : "mga tanong"} ang ${copy.savedLater}` : `${savedInRound} ${savedInRound === 1 ? "question" : "questions"} ${copy.savedLater}`}</p>}
          </div>
          <button type="button" data-tutorial="read-again" onClick={() => dispatch({ type: "OPEN_STORY_REVIEW" })} className="question-secondary">{copy.readAgain}</button>
        </header>
        <div className="question-status-strip">
          <progress aria-label={`${completedInRound} ${copy.of} ${state.round.questions.length} ${copy.questionsCompleted}`} value={completedInRound} max={state.round.questions.length} />
          <ReadingHearts hearts={hearts} language={state.language} />
        </div>
        <div className="question-scroll">
          {state.savedNotice && <p className="saved-question-notice" role="status">{state.savedNotice}</p>}
          <p className="question-prompt">{question.prompt}</p>
          <ChoiceGrid
            choices={question.choices}
            language={state.language}
            disabledIds={state.rejectedChoiceIds}
            locked={isCorrect}
            selectedId={state.selectedChoiceId}
            onChoose={(choiceId) => dispatch({ type: "SELECT_ANSWER", choiceId })}
          />
          {(isCorrect || isIncorrect) && (
            <div className={`answer-feedback ${isCorrect ? "is-correct" : "is-hint"}`} role="status" aria-live="polite">
              <strong>{isCorrect ? copy.correct : copy.passageAgain}</strong><span>{feedback}</span>
              {isIncorrect && <span className="heart-feedback">{copy.heartLost} {hearts} {copy.heartsRemaining}.</span>}
            </div>
          )}
        </div>
        <footer className="question-footer">
          <button type="button" title={!narration.supported ? copy.noRecording : undefined} onClick={narration.replay} disabled={!narration.supported || narration.muted} className="question-secondary">{narration.supported ? copy.replayVoice : copy.narrationUnavailable}</button>
          {narration.supported && <button type="button" onClick={narration.toggleMute} className="question-secondary">{narration.muted ? copy.turnVoiceOn : copy.mute}</button>}
          <button type="button" onClick={() => dispatch({ type: "REQUEST_HELP" })} className="question-secondary">{copy.help}</button>
          {(state.stage === "questionRound" || state.stage === "answerSelected") && (
            <button type="button" data-tutorial="answer-later" onClick={() => dispatch({ type: "ANSWER_LATER" })} className="answer-later-button">
              {copy.answerLater}
            </button>
          )}
          {state.stage === "answerSelected" && state.selectedChoiceId && <button type="button" onClick={() => dispatch({ type: "SUBMIT_ANSWER", choiceId: state.selectedChoiceId! })} className="story-primary">{copy.submitAnswer}</button>}
          {isIncorrect && <button type="button" onClick={() => dispatch({ type: "TRY_QUESTION_AGAIN" })} className="story-primary">{copy.tryAgain}</button>}
          {isCorrect && <button type="button" onClick={() => dispatch({ type: "CONTINUE_AFTER_CORRECT" })} className="story-primary">{copy.nextQuestion}</button>}
        </footer>
      </section>
    </div>
  );
}

export function QuestionIntroOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  if (state.stage !== "questionIntro") return null;
  const copy = getUiCopy(state.language);
  return (
    <div className="mission-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="question-intro-title" className="story-panel activity-intro-panel pixel-reading-panel">
        <p className="story-eyebrow">{copy.checkUnderstanding}</p>
        <h2 id="question-intro-title">{copy.checkTitle}</h2>
        <p>{copy.checkHelp}</p>
        <button type="button" autoFocus onClick={() => dispatch({ type: "START_QUESTIONS" })} className="story-primary">{copy.startQuestions}</button>
      </section>
    </div>
  );
}

export function HeartRecoveryOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  if (state.stage !== "heartRecovery" || state.helpOpen) return null;
  const copy = getUiCopy(state.language);
  const question = state.round.questions[state.currentQuestionIndex];
  if (!question) return null;
  return (
    <div className="mission-overlay question-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="heart-recovery-title" className="heart-recovery-panel pixel-reading-panel">
        <ReadingHearts hearts={0} language={state.language} />
        <p className="story-eyebrow">{copy.readingHearts}</p>
        <h2 id="heart-recovery-title">{copy.recoveryTitle}</h2>
        <p>{copy.recoveryHelp}</p>
        <div className="heart-recovery-actions">
          <button type="button" autoFocus onClick={() => dispatch({ type: "READ_AND_RESTART" })} className="story-primary">{copy.rereadToRecover}</button>
        </div>
      </section>
    </div>
  );
}

export function DeferredQuestionOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  if (state.stage !== "deferredConfirmation") return null;
  const copy = getUiCopy(state.language);
  return (
    <div className="mission-overlay mission-overlay-top">
      <section role="dialog" aria-modal="true" aria-labelledby="defer-title" className="help-panel deferred-panel">
        <p className="story-eyebrow">{copy.answerLater}</p>
        <h2 id="defer-title">{copy.deferTitle}</h2>
        <p>{copy.deferHelp}</p>
        <div className="completion-actions">
          <button type="button" onClick={() => dispatch({ type: "CANCEL_ANSWER_LATER" })} className="question-secondary">{copy.keepAnswering}</button>
          <button type="button" autoFocus data-tutorial="save-for-later" onClick={() => dispatch({ type: "CONFIRM_ANSWER_LATER" })} className="story-primary">{copy.saveLater}</button>
        </div>
      </section>
    </div>
  );
}

export function DeferredResumeOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  if (state.stage !== "deferredResume") return null;
  const copy = getUiCopy(state.language);
  const mission = getMission(state.missionId, state.language);
  return (
    <div className="mission-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="resume-questions-title" className="completion-panel">
        <p className="story-eyebrow">{copy.questionsToAnswer}</p>
        <h2 id="resume-questions-title">{copy.returnTo} {mission.reading.title}</h2>
        <p>{copy.savedQuestionHelp}</p>
        <div className="completion-actions">
          <button type="button" onClick={() => dispatch({ type: "OPEN_STORY_REVIEW" })} className="question-secondary">{copy.readAgain}</button>
          <button type="button" autoFocus onClick={() => dispatch({ type: "START_SAVED_QUESTIONS" })} className="story-primary">{copy.returnQuestions}</button>
        </div>
      </section>
    </div>
  );
}

export function QuestionsCompletedOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  if (state.stage !== "questionsCompleted") return null;
  const copy = getUiCopy(state.language);
  return (
    <div className="mission-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="questions-complete-title" className="completion-panel">
        <p className="story-eyebrow">{copy.activityComplete}</p>
        <h2 id="questions-complete-title">{copy.completedQuestions}</h2>
        <p>{copy.completedQuestionsHelp}</p>
        <button type="button" autoFocus onClick={() => dispatch({ type: "CONTINUE_AFTER_QUESTIONS" })} className="story-primary">{copy.continueMission}</button>
      </section>
    </div>
  );
}

export function RemainingQuestionsOverlay({
  state,
  dispatch,
  onDashboard
}: {
  state: MissionState;
  dispatch: MissionDispatch;
  onDashboard: () => void;
}) {
  if (state.stage !== "questionsRemaining") return null;
  const copy = getUiCopy(state.language);
  const count = state.round.questions.filter(({ id }) => state.savedQuestionIds.includes(id)).length;
  return (
    <div className="mission-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="remaining-title" className="completion-panel">
        <p className="story-eyebrow">{copy.questionsSaved}</p>
        <h2 id="remaining-title">{state.language === "fil" ? `May ${count} ka pang ${count === 1 ? "tanong" : "mga tanong"} na sasagutin.` : `You still have ${count} ${count === 1 ? "question" : "questions"} to answer.`}</h2>
        {state.savedNotice && <p className="saved-question-notice" role="status">{state.savedNotice}</p>}
        <p>{copy.answerRemainingHelp}</p>
        <div className="completion-actions">
          <button type="button" onClick={() => dispatch({ type: "ANSWER_SAVED_NOW" })} className="story-primary">{copy.answerNow}</button>
          <button type="button" onClick={() => dispatch({ type: "CONTINUE_LATER" })} className="question-secondary">{copy.continueLater}</button>
          <button type="button" onClick={onDashboard} className="question-secondary">{copy.returnDashboard}</button>
        </div>
      </section>
    </div>
  );
}

export function HelpOverlay({
  state,
  dispatch,
  onOpenMap,
  onShowTutorial
}: {
  state: MissionState;
  dispatch: MissionDispatch;
  onOpenMap: () => void;
  onShowTutorial: () => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (state.helpOpen) panelRef.current?.focus({ preventScroll: true });
  }, [state.helpOpen]);
  if (!state.helpOpen) return null;
  const copy = getUiCopy(state.language);
  const mission = getMission(state.missionId, state.language);
  const question = state.round.questions[state.currentQuestionIndex];
  const objective = getCurrentObjective(state);
  const help = ["questionRound", "questionFeedback", "heartRecovery"].includes(state.stage) && question
    ? question.hint
    : ["missionAction", "missionActionFeedback", "storyReview"].includes(state.stage)
      ? mission.action.hint
      : objective.help;
  const steps = getHelpSteps(state.stage, copy);
  const closeHelp = () => dispatch({ type: "CLOSE_HELP" });
  return (
    <div className="mission-overlay mission-overlay-top help-guide-overlay">
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="help-panel help-guide-panel"
        tabIndex={-1}
      >
        <header className="help-guide-header">
          <span className="help-guide-code" aria-hidden="true">HLP</span>
          <div>
            <p className="story-eyebrow">{copy.readingSupport}</p>
            <h2 id="help-title">{copy.needHint}</h2>
          </div>
          <button type="button" className="help-guide-close" onClick={closeHelp} aria-label={copy.close}>
            <span aria-hidden="true">{"\u00D7"}</span>
          </button>
        </header>

        <div className="help-guide-body">
          <section className="help-objective-band" aria-labelledby="help-objective-title">
            <span className="help-band-code" aria-hidden="true">OBJ</span>
            <div>
              <h3 id="help-objective-title">{copy.helpCurrentStep}</h3>
              <strong>{objective.label}</strong>
              <p>{objective.help}</p>
            </div>
          </section>

          <div className="help-guide-grid">
            <section className="help-clue-section" aria-labelledby="help-clue-title">
              <p className="help-section-label" id="help-clue-title">{copy.helpClue}</p>
              <p className="help-clue-copy">{help}</p>
            </section>
            <section className="help-strategy-section" aria-labelledby="help-strategy-title">
              <p className="help-section-label" id="help-strategy-title">{copy.helpTryThis}</p>
              <ol>
                {steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </section>
          </div>

          <section className="help-controls-strip" aria-labelledby="help-controls-title">
            <p className="help-section-label" id="help-controls-title">{copy.helpControls}</p>
            <span><kbd>KEY</kbd>{copy.helpKeyboardMove}</span>
            <span><kbd>MOB</kbd>{copy.helpTouchMove}</span>
            <span><kbd>ACT</kbd>{copy.helpInteractionControl}</span>
          </section>
        </div>

        <footer className="help-guide-actions">
          <button type="button" className="question-secondary" onClick={() => {
            closeHelp();
            onOpenMap();
          }}>{copy.openMap}</button>
          <button type="button" className="question-secondary" onClick={() => {
            closeHelp();
            onShowTutorial();
          }}>{copy.showTutorial}</button>
          <button type="button" onClick={closeHelp} className="story-primary">{copy.backActivity}</button>
        </footer>
      </section>
    </div>
  );
}

function getHelpSteps(stage: MissionStage, copy: ReturnType<typeof getUiCopy>) {
  if (["questionIntro", "questionRound", "answerSelected", "questionFeedback", "heartRecovery", "deferredConfirmation", "deferredResume", "questionsRemaining", "questionsCompleted"].includes(stage)) {
    return copy.helpQuestionSteps;
  }
  if (["missionAction", "missionActionFeedback"].includes(stage)) {
    return copy.helpActionSteps;
  }
  if (["storyIntroduction", "readingIntro", "storyPresentation", "storyReview"].includes(stage)) {
    return copy.helpReadSteps;
  }
  return copy.helpExploreSteps;
}

export function MissionResultOverlay({ state, dispatch }: { state: MissionState; dispatch: MissionDispatch }) {
  if (state.stage !== "missionCompleted") return null;
  const copy = getUiCopy(state.language);
  const mission = getMission(state.missionId, state.language);
  return (
    <div className="mission-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="mission-result-title" className="completion-panel">
        <p className="story-eyebrow">{copy.mission} {mission.order} {copy.missionComplete}</p>
        <h2 id="mission-result-title">{mission.worldResult}</h2>
        <p>{mission.completionCondition}</p>
        <dl className="completion-summary">
          <div><dt>{copy.journeyResult}</dt><dd>{mission.worldResult}</dd></div>
          <div><dt>{copy.reward}</dt><dd>{mission.reward}</dd></div>
        </dl>
        <button type="button" autoFocus onClick={() => dispatch({ type: "CONTINUE_TO_NEXT_MISSION" })} className="story-primary">
          {mission.nextMissionId ? copy.continueJourney : copy.openCommunity}
        </button>
      </section>
    </div>
  );
}

export function CompletionOverlay({ state, onReplay, onDashboard }: { state: MissionState; onReplay: () => void; onDashboard: () => void }) {
  const copy = getUiCopy(state.language);
  const localizedSkillLabels = getSkillLabels(state.language);
  const skillsUsed = useMemo(
    () => [...new Set(state.rounds.flatMap((round) => round.questions.map((question) => localizedSkillLabels[question.skill])))],
    [localizedSkillLabels, state.rounds]
  );
  if (!state.activityCompleted) return null;
  return (
    <div className="mission-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="completion-title" className="completion-panel">
        <p className="story-eyebrow">{copy.communityReady}</p>
        <h2 id="completion-title">{copy.journeyOpen}</h2>
        <p>{copy.completionText}</p>
        <dl className="completion-summary">
          <div><dt>{copy.missionsCompleted}</dt><dd>{state.completedMissionIds.length} {copy.of} {MISSIONS.length}</dd></div>
          <div><dt>{copy.skillsUsed}</dt><dd>{skillsUsed.join(", ")}</dd></div>
        </dl>
        <div className="completion-actions">
          <button type="button" onClick={onReplay} className="question-secondary">{copy.replayJourney}</button>
          <button type="button" onClick={onDashboard} className="story-primary">{copy.returnDashboard}</button>
        </div>
      </section>
    </div>
  );
}

function ChoiceGrid({ choices, disabledIds, locked, selectedId, onChoose, language }: { choices: readonly { id: string; text: string }[]; disabledIds: readonly string[]; locked: boolean; selectedId?: string | null; onChoose: (choiceId: string) => void; language: MissionState["language"] }) {
  const copy = getUiCopy(language);
  return (
    <div className="answer-grid" aria-label={copy.answerChoices}>
      {choices.map((choice, index) => {
        const rejected = disabledIds.includes(choice.id);
        return (
          <button key={choice.id} type="button" data-first-choice={index === 0 ? "true" : undefined} onClick={() => onChoose(choice.id)} disabled={locked || rejected} aria-pressed={selectedId ? selectedId === choice.id : undefined} aria-label={`${String.fromCharCode(65 + index)}. ${choice.text}`} className={`answer-choice ${selectedId === choice.id ? "is-selected" : ""}`}>
            <span aria-hidden="true" className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{choice.text}</span>{rejected && <span className="answer-tried">{copy.tryAnother}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ReadingHearts({ hearts, language }: { hearts: number; language: MissionState["language"] }) {
  const copy = getUiCopy(language);
  return (
    <div className="reading-hearts" role="img" aria-label={`${hearts} ${copy.heartsRemaining}`} title={copy.readingHearts}>
      {Array.from({ length: READING_HEARTS_TOTAL }, (_, index) => (
        <span key={index} className={`reading-heart ${index < hearts ? "is-full" : "is-empty"}`} aria-hidden="true">{"\u2665"}</span>
      ))}
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").map((word) => word[0]).join("").slice(0, 2);
}
