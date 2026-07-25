import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  playClaraSpeech,
  prepareClaraSpeech,
  type ClaraSpeechKey,
  type ClaraSpeechPlayback,
} from "../clara-audio/claraSpeech";
import { ClaraSpeechWarmupLoader } from "../clara-audio/ClaraSpeechWarmupLoader";
import {
  clearActivitySpeechPreparation,
  prepareActivitySpeech,
} from "../clara-audio/activitySpeechReadiness";
import { useActivitySpeechPreparation } from "../clara-audio/useActivitySpeechPreparation";
import { ClaraStage } from "../intro/ClaraStage";
import { PassageReadingResult } from "../learner-activity/PassageReadingResult";
import { readingJourneyAchievements } from "../achievements/readingJourneyAchievements";
import { PointerTrail } from "../intro/PointerTrail";
import { VectorCursor } from "../intro/VectorCursor";
import { ComprehensionChoiceGrid } from "../learner-activity/ComprehensionChoiceGrid";
import { loadLearnerSession } from "../learner-auth/learnerApi";

import {
  continuePartTwoResult,
  finishAssessment,
  getPartTwo,
  selectAssessmentStory,
  skipPartTwoItem,
  submitAssessmentComprehension,
  submitAssessmentPassage,
  type AssessmentPartTwoState,
  type ComprehensionChoice,
} from "./assessmentPartTwoApi";
import type { AssessmentType } from "./assessmentApi";
import {
  getNextPartTwoSpeechKey,
  getPartTwoSpeechKey,
} from "./assessmentPartTwoSpeech";
import {
  AssessmentDockActionIcon,
  AssessmentRecorder,
} from "./AssessmentRecorder";
import { useAudioRecorder } from "./useAudioRecorder";
import "./assessment.css";

type GuideState = "preparing" | "speaking" | "ready" | "error";
type SaveAction = "submit" | "skip" | "continue" | "finish" | null;

const SKIP_WARMUP_LOADER_DELAY_MS = 320;

const stageCopy = {
  "story-selection": { eyebrow: "Part 2", title: "Choose your story" },
  "task-3a": { eyebrow: "Part 2", title: "Read the passage" },
  "task-3b": { eyebrow: "Part 2", title: "Understanding" },
  "passage-results": { eyebrow: "Story review", title: "Your Passage" },
  "part-2-results": { eyebrow: "Milestone reached", title: "Part 2 Results" },
  "assessment-complete": { eyebrow: "Reading path", title: "Great work!" },
} as const;

function ProgressRail({ state }: { state: AssessmentPartTwoState }) {
  if (!state.progress) return null;

  return (
    <div
      className="assessment-progress"
      aria-label={`Item ${state.progress.current} of ${state.progress.total}`}
    >
      <span>
        Item {state.progress.current}/{state.progress.total}
      </span>
      <div className="assessment-progress__rail" aria-hidden="true">
        {Array.from({ length: state.progress.total }, (_, index) => (
          <i
            key={index}
            data-complete={index < state.progress!.completed || undefined}
            data-current={index === state.progress!.current - 1 || undefined}
          />
        ))}
      </div>
    </div>
  );
}

function StorySelection({
  state,
  selected,
  unavailable,
  onSelect,
}: {
  state: AssessmentPartTwoState;
  selected: string | null;
  unavailable: boolean;
  onSelect: (storyKey: string) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="assessment-story-choice"
      role="radiogroup"
      aria-label="Story choices"
    >
      {state.story_choices.map((story, index) => (
        <motion.button
          key={story.story_key}
          type="button"
          role="radio"
          aria-checked={selected === story.story_key}
          data-selected={selected === story.story_key || undefined}
          disabled={unavailable}
          initial={
            reduceMotion ? false : { opacity: 0, x: index === 0 ? -18 : 18 }
          }
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.28,
            delay: reduceMotion ? 0 : index * 0.08,
          }}
          onClick={() => onSelect(story.story_key)}
        >
          <span>Story {index + 1}</span>
          <strong>{story.title}</strong>
          <small>
            {selected === story.story_key ? "Selected" : "Tap to choose"}
          </small>
        </motion.button>
      ))}
    </div>
  );
}

function PassageItem({
  state,
  remainingSeconds,
}: {
  state: AssessmentPartTwoState;
  remainingSeconds: number;
}) {
  const reduceMotion = useReducedMotion();
  if (state.item?.kind !== "passage") return null;

  return (
    <motion.article
      className="assessment-passage"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3 }}
    >
      <div className="assessment-passage__heading">
        <span>{state.item.title}</span>
        <strong>{remainingSeconds}s</strong>
      </div>
      <p>{state.item.authored_pages[0]}</p>
    </motion.article>
  );
}

function ComprehensionItem({ state }: { state: AssessmentPartTwoState }) {
  const reduceMotion = useReducedMotion();
  if (state.item?.kind !== "comprehension") return null;

  return (
    <motion.div
      className="assessment-comprehension-question"
      key={state.item.item_key}
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: reduceMotion ? 0 : 0.24 }}
    >
      <small>{state.item.question_type}</small>
      <strong>{state.item.question_text}</strong>
    </motion.div>
  );
}

function PassageResult({ state }: { state: AssessmentPartTwoState }) {
  const result = state.result;
  const reduceMotion = useReducedMotion();
  if (!result) return null;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.34 }}
    >
      <PassageReadingResult
        review={{
          ...result.passage_review,
          reading_accuracy_percent: result.reading_accuracy_percent,
        }}
        accuracyPercent={result.reading_accuracy_percent}
      />
    </motion.section>
  );
}

function PartTwoResult({ state }: { state: AssessmentPartTwoState }) {
  const result = state.result;
  const reduceMotion = useReducedMotion();
  if (!result) return null;

  return (
    <motion.section
      className="assessment-result assessment-result--part-two"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.34 }}
    >
      <p>Reading and Understanding</p>
      <div className="assessment-result__score">
        <strong>{result.score}</strong>
        <span>/ {result.maximum}</span>
      </div>
      <strong className="assessment-result__level">{result.profile}</strong>
      <div className="assessment-result__part-two-facts">
        <div>
          <span>Reading accuracy</span>
          <strong>{result.reading_accuracy_percent}%</strong>
        </div>
        <div>
          <span>Understanding</span>
          <strong>{result.comprehension_percent}%</strong>
        </div>
      </div>
      <div className="assessment-result__particles" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
    </motion.section>
  );
}

function AssessmentCompletion({ state }: { state: AssessmentPartTwoState }) {
  const reduceMotion = useReducedMotion();
  if (!state.completion) return null;
  const isFinale = state.completion.kind === "reading-journey-finale";
  const earned = new Set(state.completion.achievement_keys);

  return (
    <motion.section
      className={`assessment-completion${isFinale ? " assessment-completion--finale" : ""}`}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.34 }}
    >
      <span className="assessment-completion__seal" aria-hidden="true">
        ✓
      </span>
      <h2>{state.completion.title}</h2>
      <p>{state.completion.message}</p>
      {isFinale ? (
        <>
          <strong className="assessment-completion__count">
            {earned.size} of {readingJourneyAchievements.length}
          </strong>
          <ol
            className="assessment-completion__journey"
            aria-label="Completed Reading Journey achievements"
          >
            {readingJourneyAchievements.map((achievement) => (
              <li
                key={achievement.key}
                data-earned={earned.has(achievement.key) || undefined}
                tabIndex={0}
                aria-label={`${achievement.name}. ${achievement.criteria}. ${
                  earned.has(achievement.key) ? "Earned" : "Not earned"
                }`}
              >
                <span aria-hidden="true">★</span>
                <strong>{achievement.name}</strong>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      <div className="assessment-result__particles" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
    </motion.section>
  );
}

export function AssessmentPartTwoPage({
  assessmentType = "diagnostic",
}: {
  assessmentType?: AssessmentType;
}) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const session = loadLearnerSession();
  const activityPreparation = useActivitySpeechPreparation(
    session?.token,
    assessmentType === "final"
      ? "assessment-final-part-two"
      : "assessment-part-two",
    Boolean(session?.token),
  );
  const [state, setState] = useState<AssessmentPartTwoState | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [guideState, setGuideState] = useState<GuideState>("preparing");
  const [speechLevel, setSpeechLevel] = useState(0);
  const [claraReady, setClaraReady] = useState(false);
  const [preparedGuide, setPreparedGuide] = useState<{
    key: ClaraSpeechKey;
    speech: Blob;
  } | null>(null);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] =
    useState<ComprehensionChoice | null>(null);
  const [saveAction, setSaveAction] = useState<SaveAction>(null);
  const [showSkipLoader, setShowSkipLoader] = useState(false);
  const prefetchedGuideRef = useRef<{
    key: ClaraSpeechKey;
    speech: Blob;
  } | null>(null);
  const playbackRef = useRef<ClaraSpeechPlayback | null>(null);
  const submitCommit = useButtonCommit();
  const skipCommit = useButtonCommit();

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
      return;
    }
    void getPartTwo(session.token, assessmentType)
      .then(setState)
      .catch((error: unknown) =>
        setLoadingError(
          error instanceof Error ? error.message : "Part 2 could not open.",
        ),
      );
  }, [assessmentType, navigate, session?.token]);

  const speechKey = state ? getPartTwoSpeechKey(state) : null;
  const nextSpeechKey = state ? getNextPartTwoSpeechKey(state) : null;

  useEffect(() => {
    if (speechKey !== null) return;
    playbackRef.current?.stop();
    playbackRef.current = null;
    setPreparedGuide(null);
    setSpeechLevel(0);
    setGuideState("ready");
  }, [speechKey]);

  useEffect(() => {
    if (!speechKey || !session?.token || activityPreparation.status !== "ready")
      return;
    setGuideState("preparing");
    setSpeechLevel(0);
    const prefetched =
      prefetchedGuideRef.current?.key === speechKey
        ? prefetchedGuideRef.current
        : null;
    setPreparedGuide(prefetched);
    if (prefetched) return;

    let active = true;
    void prepareClaraSpeech(speechKey, session.token)
      .then((speech) => active && setPreparedGuide({ key: speechKey, speech }))
      .catch(() => active && setGuideState("error"));
    return () => {
      active = false;
    };
  }, [activityPreparation.status, session?.token, speechKey]);

  useEffect(() => {
    if (
      activityPreparation.status !== "ready" ||
      guideState !== "ready" ||
      !nextSpeechKey ||
      !session?.token
    )
      return;
    let active = true;
    void prepareClaraSpeech(nextSpeechKey, session.token)
      .then((speech) => {
        if (active) prefetchedGuideRef.current = { key: nextSpeechKey, speech };
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [activityPreparation.status, guideState, nextSpeechKey, session?.token]);

  useEffect(() => {
    if (
      activityPreparation.status !== "ready" ||
      !claraReady ||
      !speechKey ||
      preparedGuide?.key !== speechKey
    )
      return;
    let active = true;
    void playClaraSpeech(
      preparedGuide.speech,
      (level) => active && setSpeechLevel(level),
      { modelState: "ready" },
    )
      .then(async (playback) => {
        if (!active) return playback.stop();
        playbackRef.current = playback;
        setGuideState("speaking");
        await playback.finished;
        if (active) {
          playbackRef.current = null;
          setSpeechLevel(0);
          setGuideState("ready");
        }
      })
      .catch(() => active && setGuideState("error"));
    return () => {
      active = false;
      playbackRef.current?.stop();
      playbackRef.current = null;
    };
  }, [activityPreparation.status, claraReady, preparedGuide, speechKey]);

  const resetKey = useMemo(
    () => `${state?.stage ?? "loading"}:${state?.item?.item_key ?? "none"}`,
    [state?.item?.item_key, state?.stage],
  );
  const recorder = useAudioRecorder(resetKey, { maximumDurationMs: 60_000 });

  useEffect(() => {
    setSelectedChoice(null);
    setSelectedStory(null);
  }, [resetKey]);

  useEffect(() => {
    if (
      saveAction !== "skip" ||
      !nextSpeechKey ||
      prefetchedGuideRef.current?.key === nextSpeechKey
    ) {
      setShowSkipLoader(false);
      return;
    }
    const timeout = window.setTimeout(
      () => setShowSkipLoader(true),
      SKIP_WARMUP_LOADER_DELAY_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [nextSpeechKey, saveAction]);

  const save = async (
    request: Promise<AssessmentPartTwoState>,
    action: Exclude<SaveAction, null>,
  ) => {
    setSaveAction(action);
    try {
      const next = await request;
      playbackRef.current?.stop();
      setGuideState("preparing");
      setState(next);
    } catch (error) {
      setLoadingError(
        error instanceof Error
          ? error.message
          : "That answer could not be saved.",
      );
    } finally {
      setSaveAction(null);
    }
  };

  if (!state) {
    const preparationError =
      activityPreparation.status === "error" ? activityPreparation.error : "";

    return (
      <main className="assessment-page learner-flow-page learner-typography-page assessment-page--loading">
        <p role={loadingError || preparationError ? "alert" : undefined}>
          {loadingError || preparationError || "Opening Part 2..."}
        </p>
        {loadingError || preparationError ? (
          <BigButton
            size="regular"
            onClick={
              preparationError
                ? activityPreparation.retry
                : () => navigate("/learner/dashboard")
            }
          >
            {preparationError ? "Try again" : "Back to dashboard"}
          </BigButton>
        ) : null}
      </main>
    );
  }

  const unavailable =
    activityPreparation.status !== "ready" ||
    guideState !== "ready" ||
    saveAction !== null;
  const isPassage = state.stage === "task-3a";
  const isComprehension = state.stage === "task-3b";
  const isPassageResult = state.stage === "passage-results";
  const isPartTwoResult = state.stage === "part-2-results";
  const isResult = isPassageResult || isPartTwoResult;
  const isCompletion = state.stage === "assessment-complete";
  const remainingSeconds = Math.max(
    0,
    60 - Math.floor(recorder.recordingElapsedMs / 1000),
  );
  const canSubmit =
    state.stage === "story-selection"
      ? selectedStory !== null
      : isPassage
        ? recorder.audio !== null &&
          recorder.state !== "recording" &&
          recorder.state !== "playing"
        : isComprehension
          ? selectedChoice !== null
          : isResult || isCompletion;
  const canSkip = isPassage || isComprehension;
  const skipUnavailable =
    unavailable ||
    recorder.state === "recording" ||
    recorder.state === "playing";
  const copy = stageCopy[state.stage];
  const emotion =
    isResult || isCompletion
      ? "happy"
      : state.stage === "story-selection" || isComprehension
        ? "thinking"
        : "default";

  const submitCurrent = () => {
    if (!session?.token || !canSubmit) return;
    if (state.stage === "story-selection" && selectedStory) {
      void save(
        selectAssessmentStory(
          session.token,
          state.run_id,
          selectedStory,
          assessmentType,
        ),
        "submit",
      );
    } else if (isPassage && state.item && recorder.audio) {
      void save(
        submitAssessmentPassage(
          session.token,
          state.run_id,
          state.item.item_key,
          recorder.audio,
          assessmentType,
        ),
        "submit",
      );
    } else if (isComprehension && state.item && selectedChoice) {
      void save(
        submitAssessmentComprehension(
          session.token,
          state.run_id,
          state.item.item_key,
          selectedChoice,
          assessmentType,
        ),
        "submit",
      );
    } else if (isResult) {
      void save(
        continuePartTwoResult(session.token, state.run_id, assessmentType),
        "continue",
      );
    } else if (isCompletion) {
      setSaveAction("finish");
      void finishAssessment(session.token, state.run_id, assessmentType)
        .then(({ next_route }) => {
          clearActivitySpeechPreparation(session.token);
          if (assessmentType === "diagnostic") {
            void prepareActivitySpeech(session.token, "lesson-1").catch(
              () => undefined,
            );
          }
          navigate(next_route);
        })
        .catch(() => {
          setSaveAction(null);
          setLoadingError("The assessment could not finish yet.");
        });
    }
  };

  const skipCurrent = () => {
    if (!session?.token || !state.item) return;
    recorder.retry();
    void save(
      skipPartTwoItem(
        session.token,
        state.run_id,
        state.item.item_key,
        assessmentType,
      ),
      "skip",
    );
  };

  return (
    <main
      className={`assessment-page assessment-part-two learner-flow-page learner-typography-page assessment-part-two--${state.stage}`}
      data-route-focus
      tabIndex={-1}
    >
      <ClaraSpeechWarmupLoader
        active={
          activityPreparation.showRuntimeLoader ||
          (guideState === "preparing" && preparedGuide?.key !== speechKey) ||
          showSkipLoader
        }
        modelReady={claraReady}
      />
      <PointerTrail />
      <VectorCursor />
      <header className="assessment-header">
        <div>
          <p>{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
        </div>
        <ProgressRail state={state} />
      </header>

      <section
        className={`assessment-item-panel${isResult || isCompletion ? " assessment-item-panel--result" : ""}`}
      >
        <section className="assessment-stage" aria-live="polite">
          <AnimatePresence mode="wait">
            {state.stage === "story-selection" ? (
              <StorySelection
                state={state}
                selected={selectedStory}
                unavailable={unavailable}
                onSelect={setSelectedStory}
              />
            ) : isPassage ? (
              <PassageItem state={state} remainingSeconds={remainingSeconds} />
            ) : isComprehension ? (
              <ComprehensionItem state={state} />
            ) : isPassageResult ? (
              <PassageResult state={state} />
            ) : isPartTwoResult ? (
              <PartTwoResult state={state} />
            ) : (
              <AssessmentCompletion state={state} />
            )}
          </AnimatePresence>
        </section>
      </section>

      {isPassage || isComprehension ? (
        <section
          className="assessment-recorder-panel"
          aria-label={isPassage ? "Voice recorder" : "Answer choices"}
        >
          {isPassage ? (
            <AssessmentRecorder
              recorder={recorder}
              unavailable={unavailable}
              submitAvailableAfterCapture
              onAudioAction={() => playbackRef.current?.stop()}
            />
          ) : state.item?.kind === "comprehension" ? (
            <ComprehensionChoiceGrid
              choices={state.item.choices}
              selectedChoice={selectedChoice}
              unavailable={unavailable}
              onSelect={(choice) =>
                setSelectedChoice(choice as ComprehensionChoice)
              }
            />
          ) : null}
        </section>
      ) : null}

      <footer className="assessment-action-dock">
        <div className="assessment-clara">
          <ClaraStage
            emotion={emotion}
            speaking={guideState === "speaking"}
            speechLevel={speechLevel}
            onLoadStateChange={(loadState) =>
              setClaraReady(loadState === "ready")
            }
          />
        </div>
        <div
          className="assessment-action-slot"
          data-assessment-action-split={canSkip || undefined}
        >
          <motion.div
            className="assessment-action-primary"
            layout={!reduceMotion}
          >
            <BigButton
              variant={
                canSubmit && !unavailable
                  ? "primary-vertical"
                  : "unavailable-vertical"
              }
              leadingIcon={
                <AssessmentDockActionIcon
                  kind={isResult || isCompletion ? "next" : "submit"}
                />
              }
              disabled={!canSubmit || unavailable}
              busy={saveAction !== null && saveAction !== "skip"}
              busyLabel={isCompletion ? "Finishing" : "Saving"}
              committing={submitCommit.committing}
              onClick={() => submitCommit.commit(submitCurrent)}
            >
              {isPassageResult
                ? "Next"
                : isPartTwoResult
                  ? "Continue"
                  : isCompletion
                    ? "My reading path"
                    : "Submit"}
            </BigButton>
          </motion.div>
          {canSkip ? (
            <BigButton
              variant="skip-vertical"
              disabled={skipUnavailable}
              busy={saveAction === "skip"}
              busyLabel="Skipping"
              committing={skipCommit.committing}
              onClick={() => skipCommit.commit(skipCurrent)}
            >
              Skip
            </BigButton>
          ) : null}
        </div>
      </footer>

      {activityPreparation.status === "error" ? (
        <div className="assessment-save-error" role="alert">
          <p>{activityPreparation.error}</p>
          <BigButton
            variant="secondary"
            size="regular"
            onClick={activityPreparation.retry}
          >
            Try again
          </BigButton>
        </div>
      ) : null}
      {loadingError ? (
        <p className="assessment-save-error" role="alert">
          {loadingError}
        </p>
      ) : null}
    </main>
  );
}
