import { motion, useReducedMotion } from "motion/react";
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
import { ClaraStage } from "../intro/ClaraStage";
import { PointerTrail } from "../intro/PointerTrail";
import { VectorCursor } from "../intro/VectorCursor";
import { loadLearnerSession } from "../learner-auth/learnerApi";

import {
  advancePartOne,
  startPartOne,
  submitOrientation,
  submitRhyme,
  submitSpeech,
  type AssessmentItem,
  type AssessmentState,
} from "./assessmentApi";
import { useAudioRecorder } from "./useAudioRecorder";
import "./assessment.css";

type SaveState = "idle" | "processing" | "saved" | "error";
type GuideState = "preparing" | "speaking" | "ready" | "error";

const stageCopy = {
  orientation: { eyebrow: "Before we begin", title: "Microphone check" },
  "task-1a": { eyebrow: "Part 1", title: "Letters" },
  "task-2a": { eyebrow: "Part 1", title: "Rhyme check" },
  "task-2b": { eyebrow: "Part 1", title: "Words" },
  "part-1-results": { eyebrow: "Milestone reached", title: "Part 1 Results" },
} as const;

const speechKeys: Record<AssessmentState["stage"], ClaraSpeechKey> = {
  orientation: "assessment-orientation",
  "task-1a": "assessment-letters",
  "task-2a": "assessment-rhymes",
  "task-2b": "assessment-words",
  "part-1-results": "assessment-part-one-result",
};

function MicrophoneIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="17" y="7" width="14" height="24" rx="7" />
      <path d="M11 24c0 8 5 13 13 13s13-5 13-13M24 37v6M17 43h14" />
    </svg>
  );
}

function StopIcon() {
  return <span className="assessment-recorder__stop-icon" aria-hidden="true" />;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m16 10 24 14-24 14V10Z" />
    </svg>
  );
}

function DockActionIcon({ kind }: { kind: "submit" | "next" }) {
  return kind === "submit" ? (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m11 25 8 8 18-19" />
      <path d="M8 8h32v32H8z" />
    </svg>
  ) : (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9 24h28M27 13l11 11-11 11" />
    </svg>
  );
}

function isRhymeItem(
  item: AssessmentItem,
): item is Extract<AssessmentItem, { word_one: string }> {
  return "word_one" in item;
}

function Recorder({
  recorder,
  unavailable,
  committed,
  onAudioAction,
}: {
  recorder: ReturnType<typeof useAudioRecorder>;
  unavailable: boolean;
  committed: boolean;
  onAudioAction: () => void;
}) {
  const label =
    recorder.state === "recording"
      ? "Stop"
      : recorder.state === "playing"
        ? "Playing"
        : recorder.state === "recorded"
          ? "Play"
          : "Record";

  const useRecorder = () => {
    if (unavailable || committed) return;
    onAudioAction();
    if (recorder.state === "idle") void recorder.record();
    else if (recorder.state === "recording") recorder.stop();
    else if (recorder.state === "recorded") recorder.play();
  };

  return (
    <div className="assessment-recorder">
      <button
        type="button"
        className="assessment-recorder__control"
        data-state={recorder.state}
        disabled={unavailable || committed || recorder.state === "playing"}
        aria-label={label}
        onClick={useRecorder}
      >
        <span className="assessment-recorder__icon">
          {recorder.state === "recording" ? (
            <StopIcon />
          ) : recorder.state === "recorded" || recorder.state === "playing" ? (
            <PlayIcon />
          ) : (
            <MicrophoneIcon />
          )}
        </span>
        <strong>{label}</strong>
        <span className="assessment-recorder__bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </button>
      <div className="assessment-recorder__review-slot">
        {recorder.hasPlayed && !committed ? (
          <button
            type="button"
            className="assessment-recorder__retry"
            onClick={recorder.retry}
          >
            Retry?
          </button>
        ) : null}
      </div>
      <p className="assessment-recorder__error" aria-live="polite">
        {recorder.error}
      </p>
    </div>
  );
}

function ProgressRail({ state }: { state: AssessmentState }) {
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
          />
        ))}
      </div>
    </div>
  );
}

function ResultView({ state }: { state: AssessmentState }) {
  const result = state.result;
  const reduceMotion = useReducedMotion();
  if (!result) return null;

  return (
    <motion.section
      className="assessment-result"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.32 }}
    >
      <div
        className="assessment-result__segments"
        aria-label="Part 1 task scores"
      >
        {result.segments.map((segment, index) => (
          <motion.div
            key={segment.task}
            initial={reduceMotion ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.22 + index * 0.1 }}
          >
            <span>{segment.task}</span>
            <strong>{segment.score}/10</strong>
            <small>
              {segment.status === "automatic"
                ? "Automatic"
                : segment.status === "not_administered"
                  ? "Not given"
                  : "Complete"}
            </small>
          </motion.div>
        ))}
      </div>
      <motion.div
        className="assessment-result__score"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: reduceMotion ? 0 : 0.55, duration: 0.35 }}
      >
        <strong>{result.score}</strong>
        <span>/ {result.maximum}</span>
      </motion.div>
      <motion.p
        className="assessment-result__level"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduceMotion ? 0 : 0.9 }}
      >
        {result.level}
      </motion.p>
      <div className="assessment-result__particles" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
    </motion.section>
  );
}

export function AssessmentPartOnePage() {
  const navigate = useNavigate();
  const storedSession = loadLearnerSession();
  const [assessment, setAssessment] = useState<AssessmentState | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [guideState, setGuideState] = useState<GuideState>("preparing");
  const [speechLevel, setSpeechLevel] = useState(0);
  const [claraReady, setClaraReady] = useState(false);
  const [preparedGuide, setPreparedGuide] = useState<{
    key: ClaraSpeechKey;
    speech: Blob;
  } | null>(null);
  const playbackRef = useRef<ClaraSpeechPlayback | null>(null);
  const nextCommit = useButtonCommit();
  const submitCommit = useButtonCommit();
  const resultCommit = useButtonCommit();

  useEffect(() => {
    if (!storedSession?.token) {
      navigate("/learner/login", { replace: true });
      return;
    }
    void startPartOne(storedSession.token)
      .then(setAssessment)
      .catch((error: unknown) =>
        setLoadingError(
          error instanceof Error
            ? error.message
            : "The assessment could not open.",
        ),
      );
  }, [navigate, storedSession?.token]);

  const speechKey = assessment ? speechKeys[assessment.stage] : null;
  useEffect(() => {
    if (!speechKey || !storedSession?.token) return;
    let active = true;
    setGuideState("preparing");
    setSpeechLevel(0);
    setPreparedGuide(null);
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
  }, [speechKey, storedSession?.token]);

  useEffect(() => {
    if (!claraReady || !speechKey || preparedGuide?.key !== speechKey) {
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
  }, [claraReady, preparedGuide, speechKey]);

  const resetKey = useMemo(
    () =>
      `${assessment?.stage ?? "loading"}:${assessment?.item?.item_key ?? "none"}`,
    [assessment?.item?.item_key, assessment?.stage],
  );
  const recorder = useAudioRecorder(resetKey);

  useEffect(() => {
    setChoice(null);
    setSaveState(assessment?.response_committed ? "saved" : "idle");
  }, [resetKey, assessment?.response_committed]);

  const save = async (request: Promise<AssessmentState>) => {
    setSaveState("processing");
    try {
      setAssessment(await request);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const submitAudio = (audio: Blob) => {
    if (!assessment || !storedSession?.token) return;
    if (assessment.stage === "orientation") {
      void save(
        submitOrientation(storedSession.token, assessment.run_id, audio),
      );
    } else if (assessment.item) {
      void save(
        submitSpeech(
          storedSession.token,
          assessment.run_id,
          assessment.item.item_key,
          audio,
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
      ),
    );
  };

  const advance = () => {
    if (!assessment || !storedSession?.token) return;
    nextCommit.commit(() => {
      setSaveState("processing");
      void advancePartOne(storedSession.token, assessment.run_id)
        .then((nextAssessment) => {
          if (nextAssessment.stage !== assessment.stage) {
            setGuideState("preparing");
          }
          setAssessment(nextAssessment);
        })
        .catch(() => {
          setSaveState("error");
        });
    });
  };

  if (!assessment) {
    return (
      <main className="assessment-page learner-flow-page learner-typography-page assessment-page--loading">
        <p>{loadingError || "Opening Part 1..."}</p>
        {loadingError ? (
          <BigButton
            size="regular"
            onClick={() => navigate("/learner/dashboard")}
          >
            Back to dashboard
          </BigButton>
        ) : null}
      </main>
    );
  }

  const copy = stageCopy[assessment.stage];
  const isResult = assessment.stage === "part-1-results";
  const isRhyme = assessment.stage === "task-2a";
  const committed =
    assessment.stage === "orientation"
      ? assessment.orientation_ready
      : assessment.response_committed;
  const controlsUnavailable =
    guideState !== "ready" || saveState === "processing" || committed;
  const canSubmitAudio = Boolean(recorder.audio && recorder.hasPlayed);
  const emotion = isResult ? "happy" : isRhyme ? "thinking" : "default";

  return (
    <main
      className="assessment-page learner-flow-page learner-typography-page"
      data-route-focus
      tabIndex={-1}
    >
      <PointerTrail />
      <VectorCursor />
      <header className="assessment-header">
        <div>
          <p>{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
        </div>
        <ProgressRail state={assessment} />
      </header>

      <section
        className={`assessment-item-panel${isResult ? " assessment-item-panel--result" : ""}`}
      >
        <section className="assessment-stage" aria-live="polite">
          {isResult ? (
            <ResultView state={assessment} />
          ) : (
            <div className="assessment-item" data-stage={assessment.stage}>
              {assessment.stage === "orientation" ? (
                <div className="assessment-item__prompt">
                  <small>Say</small>
                  <strong>READY</strong>
                </div>
              ) : assessment.item && isRhymeItem(assessment.item) ? (
                <>
                  <div className="assessment-rhyme__words">
                    <motion.strong
                      initial={{ x: -18, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                    >
                      {assessment.item.word_one}
                    </motion.strong>
                    <motion.strong
                      initial={{ x: 18, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                    >
                      {assessment.item.word_two}
                    </motion.strong>
                  </div>
                </>
              ) : assessment.item ? (
                <div className="assessment-item__prompt">
                  <strong>
                    {"uppercase_form" in assessment.item ? (
                      <>
                        <span>{assessment.item.uppercase_form}</span>{" "}
                        <span>{assessment.item.lowercase_form}</span>
                      </>
                    ) : (
                      assessment.item.display_text
                    )}
                  </strong>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </section>

      {!isResult ? (
        <section
          className="assessment-recorder-panel"
          aria-label={isRhyme ? "Answer choices" : "Voice recorder"}
        >
          {isRhyme ? (
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
              unavailable={controlsUnavailable}
              committed={committed}
              onAudioAction={() => playbackRef.current?.stop()}
            />
          )}
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

        <div className="assessment-action-slot">
          {!isResult && !committed && isRhyme ? (
            <BigButton
              variant={
                choice && !controlsUnavailable
                  ? "primary-vertical"
                  : "unavailable-vertical"
              }
              leadingIcon={<DockActionIcon kind="submit" />}
              disabled={!choice || controlsUnavailable}
              busy={saveState === "processing"}
              committing={submitCommit.committing}
              onClick={() => submitCommit.commit(submitChoice)}
            >
              Submit
            </BigButton>
          ) : null}
          {!isResult && !committed && !isRhyme ? (
            <BigButton
              variant={
                canSubmitAudio && !controlsUnavailable
                  ? "primary-vertical"
                  : "unavailable-vertical"
              }
              leadingIcon={<DockActionIcon kind="submit" />}
              disabled={!canSubmitAudio || controlsUnavailable}
              busy={saveState === "processing"}
              busyLabel="Saving"
              committing={submitCommit.committing}
              onClick={() =>
                recorder.audio &&
                submitCommit.commit(() => submitAudio(recorder.audio!))
              }
            >
              Submit
            </BigButton>
          ) : null}
          {committed && !isResult ? (
            <BigButton
              variant="primary-vertical"
              leadingIcon={<DockActionIcon kind="next" />}
              committing={nextCommit.committing}
              onClick={advance}
            >
              Next
            </BigButton>
          ) : isResult ? (
            <BigButton
              variant={
                guideState === "ready"
                  ? "primary-vertical"
                  : "unavailable-vertical"
              }
              leadingIcon={<DockActionIcon kind="next" />}
              disabled={guideState !== "ready"}
              committing={resultCommit.committing}
              onClick={() => resultCommit.commit(() => undefined)}
            >
              Continue
            </BigButton>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
