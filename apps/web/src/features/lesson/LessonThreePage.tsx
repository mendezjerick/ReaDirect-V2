import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  playClaraSpeech,
  prepareClaraSpeech,
  type ClaraSpeechKey,
  type ClaraSpeechPlayback,
} from "../clara-audio/claraSpeech";
import { ClaraSpeechWarmupLoader } from "../clara-audio/ClaraSpeechWarmupLoader";
import { useActivitySpeechPreparation } from "../clara-audio/useActivitySpeechPreparation";
import {
  AssessmentDockActionIcon as DockActionIcon,
  AssessmentRecorder as Recorder,
} from "../assessment/AssessmentRecorder";
import { useAudioRecorder } from "../assessment/useAudioRecorder";
import { LearnerActivityResult } from "../learner-activity/LearnerActivityResult";
import { LearnerActivityShell } from "../learner-activity/LearnerActivityShell";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import {
  advanceLessonThreeItem,
  continueLessonThreeSupport,
  getLessonThree,
  prepareLessonDemonstration,
  prepareLessonFeedback,
  skipLessonThreeItem,
  startLessonThree,
  submitLessonThreeItem,
  type LessonThreeState,
} from "./lessonApi";
import { resolveLessonClaraPresentation } from "./lessonClaraPresentation";
import { LessonProgressRail } from "./LessonProgressRail";
import { LessonPracticeTriesToggle } from "./LessonPracticeTriesToggle";
import "../assessment/assessment.css";
import "./lesson.css";

const missionTitles = {
  "mission-1": "Read the phrase",
} as const;

function LessonThreeItem({ state }: { state: LessonThreeState }) {
  const item = state.item;
  if (!item) return null;

  const words = item.display_text.trim().split(/\s+/);

  return (
    <strong className="lesson-three-phrase" aria-label={item.display_text}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={{ opacity: 0, x: -18, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            delay: index * 0.11,
            type: "spring",
            stiffness: 250,
            damping: 20,
          }}
          aria-hidden="true"
        >
          {word}
        </motion.span>
      ))}
    </strong>
  );
}

export function LessonThreePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduceMotion = useReducedMotion();
  const session = loadLearnerSession();
  const activityPreparation = useActivitySpeechPreparation(
    session?.token,
    "lesson-3",
    Boolean(session?.token),
  );
  const [lesson, setLesson] = useState<LessonThreeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [claraReady, setClaraReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [guideBusy, setGuideBusy] = useState(false);
  const [feedbackComplete, setFeedbackComplete] = useState(false);
  const [speechLevel, setSpeechLevel] = useState(0);
  const itemKey = lesson?.item?.item_key ?? lesson?.status ?? "loading";
  const recorderResetKey = [
    itemKey,
    lesson?.teaching.state ?? "loading",
    lesson?.response?.attempt_count ?? 0,
  ].join(":");
  const recorder = useAudioRecorder(recorderResetKey);
  const supportKeyRef = useRef<string | null>(null);
  const playbackRef = useRef<ClaraSpeechPlayback | null>(null);
  const submitCommit = useButtonCommit();
  const skipCommit = useButtonCommit();
  const nextCommit = useButtonCommit();

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
      return;
    }

    const requestedRun = Number(searchParams.get("run"));
    const request =
      Number.isInteger(requestedRun) && requestedRun > 0
        ? getLessonThree(session.token, requestedRun)
        : startLessonThree(session.token);

    void request
      .then(setLesson)
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Lesson 3 could not open.",
        ),
      );
  }, [navigate, searchParams, session?.token]);

  useEffect(() => {
    setFeedbackComplete(false);
  }, [lesson?.support.sequence_key]);

  useEffect(() => {
    if (
      !session?.token ||
      !lesson ||
      !claraReady ||
      (activityPreparation.status !== "ready" && lesson.status !== "completed")
    )
      return;

    const support = lesson.support;
    if (supportKeyRef.current === support.sequence_key) return;
    supportKeyRef.current = support.sequence_key;

    let cancelled = false;
    const playSupport = async () => {
      try {
        for (const speech of support.speech) {
          setGuideBusy(true);
          const audio =
            speech.kind === "published"
              ? await prepareClaraSpeech(
                  speech.speech_key as ClaraSpeechKey,
                  session.token,
                )
              : speech.kind === "runtime_demonstration"
                ? await prepareLessonDemonstration(
                    session.token,
                    speech.response_id,
                  )
                : await prepareLessonFeedback(
                    session.token,
                    speech.response_id,
                  );

          if (cancelled) return;
          setGuideBusy(false);
          setSpeaking(true);
          const playback = await playClaraSpeech(audio, setSpeechLevel, {
            modelState: "ready",
          });
          playbackRef.current = playback;
          await playback.finished;
          playbackRef.current = null;
          if (cancelled) return;
          setSpeaking(false);
        }

        if (
          support.after_speech === "continue_support" &&
          lesson.item !== null
        ) {
          setGuideBusy(true);
          const nextState = await continueLessonThreeSupport(
            session.token,
            lesson.run_id,
            lesson.item.item_key,
          );
          if (cancelled) return;
          setLesson(nextState);
        }

        if (!cancelled) setFeedbackComplete(true);
      } catch (cause) {
        if (cancelled) return;
        supportKeyRef.current = null;
        setError(
          cause instanceof Error
            ? cause.message
            : "Ma'am Clara could not finish that teaching step.",
        );
      } finally {
        if (!cancelled) {
          setGuideBusy(false);
          setSpeaking(false);
        }
      }
    };

    void playSupport();

    return () => {
      cancelled = true;
      playbackRef.current?.stop();
      playbackRef.current = null;
    };
  }, [activityPreparation.status, claraReady, lesson, session?.token]);

  const submit = async () => {
    if (!session?.token || !lesson?.item || !recorder.audio) return;
    setBusy(true);
    setError("");
    try {
      setLesson(
        await submitLessonThreeItem(
          session.token,
          lesson.run_id,
          lesson.item.item_key,
          recorder.audio,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your answer could not be checked.",
      );
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (!session?.token || !lesson?.item) return;
    setBusy(true);
    setError("");
    try {
      setLesson(
        await skipLessonThreeItem(
          session.token,
          lesson.run_id,
          lesson.item.item_key,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "That item could not be skipped.",
      );
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!session?.token || !lesson) return;
    setBusy(true);
    setError("");
    try {
      setLesson(await advanceLessonThreeItem(session.token, lesson.run_id));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The next item could not open.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!lesson) {
    const preparationError =
      activityPreparation.status === "error" ? activityPreparation.error : "";

    return (
      <main className="assessment-page assessment-page--loading learner-flow-page learner-typography-page">
        <p role={error || preparationError ? "alert" : undefined}>
          {error || preparationError || "Opening Lesson 3..."}
        </p>
        {preparationError ? (
          <BigButton size="regular" onClick={activityPreparation.retry}>
            Try again
          </BigButton>
        ) : null}
      </main>
    );
  }

  const controlsUnavailable =
    busy ||
    guideBusy ||
    speaking ||
    !claraReady ||
    (activityPreparation.status !== "ready" && lesson.status !== "completed");
  const canSubmit = Boolean(recorder.audio && recorder.hasPlayed);
  const claraPresentation = resolveLessonClaraPresentation({
    completed: lesson.status === "completed",
    processing: busy,
    guidePreparing: guideBusy,
    speaking,
    teachingState: lesson.teaching.state,
    outcome: lesson.teaching.outcome,
  });

  if (lesson.status === "completed") {
    return (
      <LearnerActivityShell
        overlay={
          <ClaraSpeechWarmupLoader
            active={activityPreparation.showRuntimeLoader || guideBusy}
            modelReady={claraReady}
          />
        }
        eyebrow="Milestone reached"
        title="Lesson 3 Results"
        itemPanelClassName="assessment-item-panel--result"
        itemContent={
          <LearnerActivityResult
            ariaLabel="Lesson 3 mission completion"
            segments={(lesson.completion?.segments ?? []).map((segment) => ({
              key: segment.mission_key,
              label: segment.label,
              value: `${segment.score}/${segment.maximum}`,
              status: segment.status,
            }))}
            score={lesson.completion?.score ?? 0}
            maximum={lesson.completion?.maximum ?? 0}
            level={lesson.completion?.achievement_name ?? "Phrase Pro"}
          />
        }
        primaryActionKey="reading-path"
        primaryAction={
          <BigButton
            variant={
              controlsUnavailable ? "unavailable-vertical" : "primary-vertical"
            }
            leadingIcon={<DockActionIcon kind="next" />}
            disabled={controlsUnavailable}
            onClick={() => navigate("/learner/dashboard")}
          >
            Continue
          </BigButton>
        }
        claraEmotion="happy"
        claraBehavior="celebrating"
        claraCue="none"
        claraSpeaking={speaking}
        claraSpeechLevel={speechLevel}
        onClaraReadyChange={setClaraReady}
        reduceMotion={Boolean(reduceMotion)}
      />
    );
  }

  const primaryActionKey = lesson.teaching.can_advance
    ? feedbackComplete
      ? "next"
      : "feedback"
    : lesson.teaching.can_record
      ? "submit"
      : "support";
  const primaryAction = lesson.teaching.can_advance ? (
    feedbackComplete ? (
      <BigButton
        variant={
          controlsUnavailable ? "unavailable-vertical" : "primary-vertical"
        }
        leadingIcon={<DockActionIcon kind="next" />}
        disabled={controlsUnavailable}
        busy={busy}
        committing={nextCommit.committing}
        onClick={() => nextCommit.commit(() => void next())}
      >
        Next
      </BigButton>
    ) : (
      <BigButton
        variant="unavailable-vertical"
        leadingIcon={<DockActionIcon kind="next" />}
        disabled
      >
        Listen
      </BigButton>
    )
  ) : lesson.teaching.can_record ? (
    <BigButton
      variant={
        canSubmit && !controlsUnavailable
          ? "primary-vertical"
          : "unavailable-vertical"
      }
      leadingIcon={<DockActionIcon kind="submit" />}
      disabled={!canSubmit || controlsUnavailable}
      busy={busy}
      busyLabel="Checking"
      committing={submitCommit.committing}
      onClick={() => submitCommit.commit(() => void submit())}
    >
      Submit
    </BigButton>
  ) : (
    <BigButton
      variant="unavailable-vertical"
      leadingIcon={<DockActionIcon kind="next" />}
      disabled
    >
      Listen
    </BigButton>
  );

  return (
    <LearnerActivityShell
      overlay={
        <>
          <ClaraSpeechWarmupLoader
            active={activityPreparation.showRuntimeLoader || busy || guideBusy}
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
          {error ? (
            <p className="lesson-error" role="alert">
              {error}
            </p>
          ) : null}
        </>
      }
      eyebrow={`Lesson 3 - Mission ${lesson.mission.number}`}
      title={missionTitles[lesson.mission.key]}
      headerAside={
        <LessonProgressRail
          current={lesson.progress.current}
          total={lesson.progress.total}
        />
      }
      itemContent={
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={itemKey}
            className="assessment-item lesson-item lesson-three-item"
            data-presentation={lesson.item?.presentation}
            data-support-mode={lesson.support.display_mode}
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
          >
            <small>Say the phrase</small>
            <LessonThreeItem state={lesson} />
          </motion.div>
        </AnimatePresence>
      }
      itemPanelAccessory={
        <LessonPracticeTriesToggle
          practiceTries={lesson.practice_tries}
          disabled={
            controlsUnavailable ||
            recorder.state === "recording" ||
            recorder.state === "playing"
          }
        />
      }
      recorderContent={
        <Recorder
          recorder={recorder}
          unavailable={controlsUnavailable || !lesson.teaching.can_record}
          committed={!lesson.teaching.can_record}
          onAudioAction={() => playbackRef.current?.stop()}
        />
      }
      primaryActionKey={primaryActionKey}
      primaryAction={primaryAction}
      secondaryAction={
        lesson.teaching.can_record ? (
          <BigButton
            variant="skip-vertical"
            disabled={controlsUnavailable}
            busy={busy}
            busyLabel="Skipping"
            committing={skipCommit.committing}
            onClick={() => skipCommit.commit(() => void skip())}
          >
            Skip
          </BigButton>
        ) : undefined
      }
      claraEmotion={claraPresentation.emotion}
      claraBehavior={claraPresentation.behavior}
      claraCue={claraPresentation.cue}
      claraSpeaking={speaking}
      claraSpeechLevel={speechLevel}
      onClaraReadyChange={setClaraReady}
      reduceMotion={Boolean(reduceMotion)}
    />
  );
}
