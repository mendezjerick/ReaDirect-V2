import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { PILOT_MODE } from "../../deployment/pilot";
import {
  playClaraSpeech,
  prepareClaraSpeech,
  type ClaraSpeechKey,
  type ClaraSpeechPlayback,
} from "../clara-audio/claraSpeech";
import { ClaraSpeechWarmupLoader } from "../clara-audio/ClaraSpeechWarmupLoader";
import { useActivitySpeechPreparation } from "../clara-audio/useActivitySpeechPreparation";
import { LearnerActivityResult } from "../learner-activity/LearnerActivityResult";
import { LearnerActivityShell } from "../learner-activity/LearnerActivityShell";
import { loadLearnerSession } from "../learner-auth/learnerApi";

import {
  continuePartOneResult,
  skipAssessmentItem,
  startPartOne,
  submitOrientation,
  submitRhyme,
  submitSpeech,
  type AssessmentItem,
  type AssessmentState,
  type AssessmentType,
} from "./assessmentApi";
import {
  getAssessmentSpeechKey,
  getNextAssessmentSpeechKey,
} from "./assessmentSpeech";
import {
  AssessmentDockActionIcon as DockActionIcon,
  AssessmentRecorder as Recorder,
} from "./AssessmentRecorder";
import { useAudioRecorder } from "./useAudioRecorder";
import "./assessment.css";

type SaveState = "idle" | "processing" | "saved" | "error";
type SaveAction = "submit" | "skip" | null;
type GuideState = "preparing" | "speaking" | "ready" | "error";

const SKIP_WARMUP_LOADER_DELAY_MS = 320;

const stageCopy = {
  orientation: { eyebrow: "Before we begin", title: "Microphone check" },
  "task-1a": { eyebrow: "Part 1", title: "Letters" },
  "task-2a": { eyebrow: "Part 1", title: "Rhyme check" },
  "task-2b": { eyebrow: "Part 1", title: "Words" },
  "part-1-results": { eyebrow: "Milestone reached", title: "Part 1 Results" },
} as const;

function isRhymeItem(
  item: AssessmentItem,
): item is Extract<AssessmentItem, { word_one: string }> {
  return "word_one" in item;
}

function ProgressRail({ state }: { state: AssessmentState }) {
  const reduceMotion = useReducedMotion();
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
        {Array.from({ length: state.progress.total }, (_, index) => {
          const complete = index < state.progress!.completed;

          return (
            <motion.i
              key={index}
              data-complete={complete || undefined}
              initial={false}
              animate={
                reduceMotion
                  ? undefined
                  : {
                      y: complete ? -2 : 0,
                      scaleY: complete ? 1 : 0.82,
                    }
              }
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
          );
        })}
      </div>
    </div>
  );
}

function ActiveAssessmentItem({
  state,
  committed,
  processing,
}: {
  state: AssessmentState;
  committed: boolean;
  processing: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const itemKey = `${state.stage}:${state.item?.item_key ?? "orientation"}`;
  const responseState = processing
    ? "processing"
    : committed
      ? "committed"
      : "active";
  const settleTransition = {
    duration: reduceMotion ? 0 : 0.28,
    ease: "easeOut" as const,
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={itemKey}
        className="assessment-item"
        data-stage={state.stage}
        data-response-state={responseState}
        initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
        animate={{
          opacity: processing ? 0.82 : 1,
          y: committed ? 4 : 0,
          scale: processing ? 0.985 : 1,
        }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -10, scale: 0.98 }}
        transition={settleTransition}
      >
        {state.stage === "orientation" ? (
          <div className="assessment-item__prompt">
            <small>Say</small>
            <motion.strong
              initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={settleTransition}
            >
              READY
            </motion.strong>
          </div>
        ) : state.item && isRhymeItem(state.item) ? (
          <div className="assessment-rhyme__words">
            <motion.strong
              initial={reduceMotion ? false : { x: -24, opacity: 0 }}
              animate={{ x: 0, y: committed ? 3 : 0, opacity: 1 }}
              transition={{
                ...settleTransition,
                delay: reduceMotion ? 0 : 0.04,
              }}
            >
              {state.item.word_one}
            </motion.strong>
            <motion.strong
              initial={reduceMotion ? false : { x: 24, opacity: 0 }}
              animate={{ x: 0, y: committed ? 3 : 0, opacity: 1 }}
              transition={{
                ...settleTransition,
                delay: reduceMotion ? 0 : 0.1,
              }}
            >
              {state.item.word_two}
            </motion.strong>
          </div>
        ) : state.item ? (
          <div className="assessment-item__prompt">
            {"uppercase_form" in state.item ? (
              <strong
                className="assessment-letter-pair"
                aria-label={state.item.display_text}
              >
                {[state.item.uppercase_form, state.item.lowercase_form].map(
                  (letter, index) => (
                    <motion.span
                      key={`${letter}:${index}`}
                      className="assessment-letter-tile"
                      aria-hidden="true"
                      initial={
                        reduceMotion
                          ? false
                          : { opacity: 0, y: -18, rotate: index ? 3 : -3 }
                      }
                      animate={{
                        opacity: 1,
                        y: committed ? 4 : 0,
                        rotate: 0,
                      }}
                      transition={{
                        ...settleTransition,
                        delay: reduceMotion ? 0 : 0.05 + index * 0.08,
                      }}
                    >
                      {letter}
                    </motion.span>
                  ),
                )}
              </strong>
            ) : (
              <strong
                className="assessment-word-assembly"
                aria-label={state.item.display_text}
              >
                {Array.from(state.item.display_text).map((letter, index) => (
                  <motion.span
                    key={`${letter}:${index}`}
                    aria-hidden="true"
                    initial={
                      reduceMotion ? false : { opacity: 0, y: 12, scale: 0.86 }
                    }
                    animate={{
                      opacity: 1,
                      y: committed ? 3 : 0,
                      scale: 1,
                    }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.2,
                      delay: reduceMotion ? 0 : index * 0.035,
                      ease: "easeOut",
                    }}
                  >
                    {letter === " " ? "\u00a0" : letter}
                  </motion.span>
                ))}
              </strong>
            )}
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}

function ResultView({ state }: { state: AssessmentState }) {
  const result = state.result;
  if (!result) return null;

  return (
    <LearnerActivityResult
      ariaLabel="Part 1 task scores"
      segments={result.segments.map((segment) => ({
        key: segment.task,
        label: segment.task,
        value: `${segment.score}/10`,
        status:
          segment.status === "automatic"
            ? "Automatic"
            : segment.status === "not_administered"
              ? "Not given"
              : "Complete",
      }))}
      score={result.score}
      maximum={result.maximum}
      level={result.level}
    />
  );
}

export function AssessmentPartOnePage({
  assessmentType = "diagnostic",
}: {
  assessmentType?: AssessmentType;
}) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const storedSession = loadLearnerSession();
  const activityPreparation = useActivitySpeechPreparation(
    storedSession?.token,
    "assessment-part-one",
    Boolean(storedSession?.token),
  );
  const [assessment, setAssessment] = useState<AssessmentState | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveAction, setSaveAction] = useState<SaveAction>(null);
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [guideState, setGuideState] = useState<GuideState>("preparing");
  const [speechLevel, setSpeechLevel] = useState(0);
  const [claraReady, setClaraReady] = useState(false);
  const [preparedGuide, setPreparedGuide] = useState<{
    key: ClaraSpeechKey;
    speech: Blob;
  } | null>(null);
  const [prefetchedSpeechKey, setPrefetchedSpeechKey] =
    useState<ClaraSpeechKey | null>(null);
  const [showSkipWarmupLoader, setShowSkipWarmupLoader] = useState(false);
  const prefetchedGuideRef = useRef<{
    key: ClaraSpeechKey;
    speech: Blob;
  } | null>(null);
  const playbackRef = useRef<ClaraSpeechPlayback | null>(null);
  const submitCommit = useButtonCommit();
  const skipCommit = useButtonCommit();
  const resultCommit = useButtonCommit();

  useEffect(() => {
    if (!storedSession?.token) {
      navigate("/learner/login", { replace: true });
      return;
    }
    void startPartOne(storedSession.token, assessmentType)
      .then(setAssessment)
      .catch((error: unknown) =>
        setLoadingError(
          error instanceof Error
            ? error.message
            : "The assessment could not open.",
        ),
      );
  }, [assessmentType, navigate, storedSession?.token]);

  const speechKey = assessment
    ? getAssessmentSpeechKey(assessment.stage, assessment.progress?.current)
    : null;
  const nextSpeechKey = assessment
    ? getNextAssessmentSpeechKey(
        assessment.stage,
        assessment.progress?.current,
        assessment.progress?.total,
      )
    : null;

  const skipIsWaitingForSpeech =
    saveState === "processing" &&
    saveAction === "skip" &&
    nextSpeechKey !== null &&
    prefetchedSpeechKey !== nextSpeechKey;

  useEffect(() => {
    if (!skipIsWaitingForSpeech) {
      setShowSkipWarmupLoader(false);
      return;
    }

    const timeout = window.setTimeout(
      () => setShowSkipWarmupLoader(true),
      SKIP_WARMUP_LOADER_DELAY_MS,
    );

    return () => window.clearTimeout(timeout);
  }, [skipIsWaitingForSpeech]);

  useEffect(() => {
    if (
      !speechKey ||
      !storedSession?.token ||
      activityPreparation.status !== "ready"
    )
      return;
    setGuideState("preparing");
    setSpeechLevel(0);
    const prefetchedGuide =
      prefetchedGuideRef.current?.key === speechKey
        ? prefetchedGuideRef.current
        : null;
    setPreparedGuide(prefetchedGuide);

    if (prefetchedGuide) {
      return;
    }

    let active = true;
    void prepareClaraSpeech(speechKey, storedSession.token)
      .then((speech) => {
        if (active) {
          setPreparedGuide({ key: speechKey, speech });
        }
      })
      .catch(() => active && setGuideState("error"));

    return () => {
      active = false;
    };
  }, [activityPreparation.status, speechKey, storedSession?.token]);

  useEffect(() => {
    if (
      activityPreparation.status !== "ready" ||
      guideState !== "ready" ||
      !nextSpeechKey ||
      !storedSession?.token
    ) {
      return;
    }

    let active = true;
    void prepareClaraSpeech(nextSpeechKey, storedSession.token)
      .then((speech) => {
        if (active) {
          prefetchedGuideRef.current = { key: nextSpeechKey, speech };
          setPrefetchedSpeechKey(nextSpeechKey);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [
    activityPreparation.status,
    guideState,
    nextSpeechKey,
    storedSession?.token,
  ]);

  useEffect(() => {
    if (
      activityPreparation.status !== "ready" ||
      !claraReady ||
      !speechKey ||
      preparedGuide?.key !== speechKey
    ) {
      return;
    }

    let active = true;
    void playClaraSpeech(
      preparedGuide.speech,
      (level) => active && setSpeechLevel(level),
      { modelState: "ready" },
    )
      .then(async (playback) => {
        if (!active) {
          playback.stop();
          return;
        }
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
    () =>
      `${assessment?.stage ?? "loading"}:${assessment?.item?.item_key ?? "none"}`,
    [assessment?.item?.item_key, assessment?.stage],
  );
  const recorder = useAudioRecorder(resetKey);

  useEffect(() => {
    setChoice(null);
    setSaveAction(null);
    setSaveState(assessment?.response_committed ? "saved" : "idle");
  }, [resetKey, assessment?.response_committed]);

  const save = async (
    request: Promise<AssessmentState>,
    action: Exclude<SaveAction, null> = "submit",
  ) => {
    recorder.stopPlayback();
    playbackRef.current?.stop();
    setSaveAction(action);
    setSaveState("processing");
    try {
      const nextAssessment = await request;
      if (
        assessment &&
        (nextAssessment.stage !== assessment.stage ||
          nextAssessment.item?.item_key !== assessment.item?.item_key)
      ) {
        playbackRef.current?.stop();
        setGuideState("preparing");
      }
      setAssessment(nextAssessment);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    } finally {
      setSaveAction(null);
    }
  };

  const submitAudio = (audio: Blob) => {
    if (!assessment || !storedSession?.token) return;
    if (assessment.stage === "orientation") {
      void save(
        submitOrientation(
          storedSession.token,
          assessment.run_id,
          audio,
          assessmentType,
        ),
      );
    } else if (assessment.item) {
      void save(
        submitSpeech(
          storedSession.token,
          assessment.run_id,
          assessment.item.item_key,
          audio,
          assessmentType,
        ),
      );
    }
  };

  const submitChoice = () => {
    if (!assessment?.item || !choice || !storedSession?.token) return;
    void save(
      submitRhyme(
        storedSession.token,
        assessment.run_id,
        assessment.item.item_key,
        choice,
        assessmentType,
      ),
    );
  };

  const skipCurrentItem = () => {
    if (!assessment || !storedSession?.token) return;
    const itemKey =
      assessment.stage === "orientation"
        ? "orientation"
        : assessment.item?.item_key;
    if (!itemKey) return;
    recorder.retry();
    void save(
      skipAssessmentItem(
        storedSession.token,
        assessment.run_id,
        itemKey,
        assessmentType,
      ),
      "skip",
    );
  };

  const continueFromResult = () => {
    if (!assessment || !storedSession?.token) return;
    recorder.stopPlayback();
    playbackRef.current?.stop();
    setSaveState("processing");
    void continuePartOneResult(
      storedSession.token,
      assessment.run_id,
      assessmentType,
    )
      .then(({ next_route }) => navigate(next_route))
      .catch(() => setSaveState("error"));
  };

  if (!assessment) {
    const preparationError =
      activityPreparation.status === "error" ? activityPreparation.error : "";

    return (
      <main className="assessment-page learner-flow-page learner-typography-page assessment-page--loading">
        <p role={loadingError || preparationError ? "alert" : undefined}>
          {loadingError || preparationError || "Opening Part 1..."}
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

  const copy = stageCopy[assessment.stage];
  const isResult = assessment.stage === "part-1-results";
  const isRhyme = assessment.stage === "task-2a";
  const asrUnavailable = PILOT_MODE && !isResult && !isRhyme;
  const committed =
    assessment.stage === "orientation"
      ? assessment.orientation_ready
      : assessment.response_committed;
  const controlsUnavailable =
    activityPreparation.status !== "ready" ||
    guideState !== "ready" ||
    saveState === "processing" ||
    committed;
  const canSubmitAudio = Boolean(recorder.audio && recorder.hasPlayed);
  const canSkip =
    !isResult &&
    (!committed || (PILOT_MODE && assessment.stage === "orientation"));
  const skipUnavailable =
    controlsUnavailable ||
    recorder.state === "recording" ||
    recorder.state === "playing";
  const emotion = isResult ? "happy" : isRhyme ? "thinking" : "default";
  const primaryActionKey = isResult
    ? "continue"
    : isRhyme
      ? "submit-choice"
      : "submit-speech";
  const primaryAction = isResult ? (
    <BigButton
      variant={
        !controlsUnavailable ? "primary-vertical" : "unavailable-vertical"
      }
      leadingIcon={<DockActionIcon kind="next" />}
      disabled={controlsUnavailable}
      busy={saveState === "processing"}
      busyLabel="Opening"
      committing={resultCommit.committing}
      onClick={() => resultCommit.commit(continueFromResult)}
    >
      Continue
    </BigButton>
  ) : isRhyme ? (
    <BigButton
      variant={
        choice && !controlsUnavailable
          ? "primary-vertical"
          : "unavailable-vertical"
      }
      leadingIcon={<DockActionIcon kind="submit" />}
      disabled={!choice || controlsUnavailable}
      busy={saveState === "processing" && saveAction === "submit"}
      committing={submitCommit.committing}
      onClick={() => submitCommit.commit(submitChoice)}
    >
      Submit
    </BigButton>
  ) : (
    <BigButton
      variant={
        canSubmitAudio && !controlsUnavailable && !asrUnavailable
          ? "primary-vertical"
          : "unavailable-vertical"
      }
      leadingIcon={<DockActionIcon kind="submit" />}
      disabled={!canSubmitAudio || controlsUnavailable || asrUnavailable}
      busy={saveState === "processing" && saveAction === "submit"}
      busyLabel="Saving"
      committing={submitCommit.committing}
      onClick={() =>
        recorder.audio &&
        submitCommit.commit(() => submitAudio(recorder.audio!))
      }
    >
      Submit
    </BigButton>
  );

  return (
    <LearnerActivityShell
      overlay={
        <>
          <ClaraSpeechWarmupLoader
            active={
              activityPreparation.showRuntimeLoader ||
              (guideState === "preparing" &&
                preparedGuide?.key !== speechKey &&
                prefetchedGuideRef.current?.key !== speechKey) ||
              showSkipWarmupLoader
            }
            modelReady={claraReady}
          />
          {activityPreparation.status === "error" ? (
            <div className="lesson-error" role="alert">
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
        </>
      }
      eyebrow={copy.eyebrow}
      title={copy.title}
      headerAside={<ProgressRail state={assessment} />}
      itemPanelClassName={isResult ? "assessment-item-panel--result" : ""}
      itemContent={
        <>
          {isResult ? (
            <ResultView state={assessment} />
          ) : (
            <ActiveAssessmentItem
              state={assessment}
              committed={committed}
              processing={saveState === "processing"}
            />
          )}
        </>
      }
      recorderAriaLabel={isRhyme ? "Answer choices" : "Voice recorder"}
      recorderContent={
        !isResult ? (
          isRhyme ? (
            <div className="assessment-rhyme__choices">
              {(["yes", "no"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  data-selected={choice === value || undefined}
                  disabled={controlsUnavailable}
                  onClick={() => setChoice(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : (
            <Recorder
              recorder={recorder}
              unavailable={controlsUnavailable || asrUnavailable}
              pilotUnavailable={asrUnavailable}
              committed={committed}
              onAudioAction={() => playbackRef.current?.stop()}
            />
          )
        ) : undefined
      }
      primaryActionKey={primaryActionKey}
      primaryAction={primaryAction}
      secondaryAction={
        canSkip ? (
          <BigButton
            variant="skip-vertical"
            disabled={skipUnavailable}
            busy={saveState === "processing" && saveAction === "skip"}
            busyLabel="Skipping"
            committing={skipCommit.committing}
            onClick={() => skipCommit.commit(skipCurrentItem)}
          >
            Skip
          </BigButton>
        ) : undefined
      }
      claraEmotion={emotion}
      claraSpeaking={guideState === "speaking"}
      claraSpeechLevel={speechLevel}
      onClaraReadyChange={setClaraReady}
      reduceMotion={Boolean(reduceMotion)}
    />
  );
}
