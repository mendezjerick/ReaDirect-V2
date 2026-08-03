import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { AchievementUnlockOverlay } from "../achievements/AchievementUnlockOverlay";
import { useReadingJourneyAchievementUnlock } from "../achievements/useReadingJourneyAchievementUnlock";
import {
  playClaraSpeech,
  prepareClaraSpeech,
  type ClaraSpeechKey,
  type ClaraSpeechPlayback,
} from "../clara-audio/claraSpeech";
import { ClaraSpeechWarmupLoader } from "../clara-audio/ClaraSpeechWarmupLoader";
import { useActivitySpeechPreparation } from "../clara-audio/useActivitySpeechPreparation";
import { AssessmentDockActionIcon as DockActionIcon } from "../assessment/AssessmentRecorder";
import { ComprehensionChoiceGrid } from "../learner-activity/ComprehensionChoiceGrid";
import { LearnerActivityShell } from "../learner-activity/LearnerActivityShell";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { LessonProgressRail } from "./LessonProgressRail";
import {
  advanceLessonSixItem,
  getLessonSix,
  skipLessonSixItem,
  startLessonSix,
  submitLessonSixChoice,
  type LessonSixChoiceKey,
  type LessonSixState,
} from "./lessonSixApi";
import "../assessment/assessment.css";
import "./lesson.css";

function HighlightedSentence({
  sentence,
  evidence,
}: {
  sentence: string;
  evidence: string | null;
}) {
  if (!evidence) return <p>{sentence}</p>;
  const start = sentence
    .toLocaleLowerCase()
    .indexOf(evidence.toLocaleLowerCase());
  if (start < 0) return <p>{sentence}</p>;

  return (
    <p>
      {sentence.slice(0, start)}
      <mark>{sentence.slice(start, start + evidence.length)}</mark>
      {sentence.slice(start + evidence.length)}
    </p>
  );
}

function AllLessonsComplete({ state }: { state: LessonSixState }) {
  return (
    <motion.div
      className="lesson-six-completion"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="lesson-six-completion__badge" aria-hidden="true">
        6
      </div>
      <h2>{state.completion?.title}</h2>
      <p>{state.completion?.message}</p>
      <div
        className="lesson-six-completion__path"
        aria-label="Reading lesson completion status"
      >
        {(state.completion?.lessons ?? []).map((lesson) => (
          <span
            key={lesson.lesson}
            data-complete={lesson.complete || undefined}
          >
            <strong>{lesson.lesson}</strong>
            <small>Lesson</small>
          </span>
        ))}
      </div>
      <div className="lesson-six-completion__achievement">
        <span aria-hidden="true">?</span>
        <div>
          <small>Achievement unlocked</small>
          <strong>{state.completion?.achievement_name}</strong>
        </div>
      </div>
    </motion.div>
  );
}

export function LessonSixPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduceMotion = useReducedMotion();
  const session = loadLearnerSession();
  const activityPreparation = useActivitySpeechPreparation(
    session?.token,
    "lesson-6",
    Boolean(session?.token),
  );
  const [lesson, setLesson] = useState<LessonSixState | null>(null);
  const [selectedChoice, setSelectedChoice] =
    useState<LessonSixChoiceKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [claraReady, setClaraReady] = useState(false);
  const [guideBusy, setGuideBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechLevel, setSpeechLevel] = useState(0);
  const [speechComplete, setSpeechComplete] = useState(false);
  const supportKeyRef = useRef<string | null>(null);
  const playbackRef = useRef<ClaraSpeechPlayback | null>(null);
  const submitCommit = useButtonCommit();
  const skipCommit = useButtonCommit();
  const nextCommit = useButtonCommit();
  const achievementUnlock = useReadingJourneyAchievementUnlock({
    sourceId: lesson ? `lesson-run:${lesson.run_id}` : null,
    achievementKey:
      lesson?.status === "completed"
        ? (lesson.completion?.achievement_key ?? null)
        : null,
    presentationReady: claraReady,
  });

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
      return;
    }

    const runId = Number(searchParams.get("run"));
    const request =
      Number.isInteger(runId) && runId > 0
        ? getLessonSix(session.token, runId)
        : startLessonSix(session.token);
    void request
      .then(setLesson)
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Lesson 6 could not open.",
        ),
      );
  }, [navigate, searchParams, session?.token]);

  useEffect(() => {
    setSelectedChoice(null);
    setSpeechComplete(false);
  }, [lesson?.support.sequence_key]);

  useEffect(() => {
    if (
      !session?.token ||
      !lesson ||
      !claraReady ||
      achievementUnlock.pending ||
      activityPreparation.status !== "ready" ||
      lesson.support.speech_keys.length === 0 ||
      supportKeyRef.current === lesson.support.sequence_key
    ) {
      return;
    }

    supportKeyRef.current = lesson.support.sequence_key;
    let cancelled = false;
    const play = async () => {
      try {
        for (const speechKey of lesson.support.speech_keys) {
          setGuideBusy(true);
          const audio = await prepareClaraSpeech(
            speechKey as ClaraSpeechKey,
            session.token,
          );
          if (cancelled) return;
          setGuideBusy(false);
          setSpeaking(true);
          const playback = await playClaraSpeech(audio, setSpeechLevel, {
            modelState: "ready",
          });
          playbackRef.current = playback;
          await playback.finished;
          if (cancelled) return;
          playbackRef.current = null;
          setSpeaking(false);
        }
        setSpeechComplete(true);
      } catch (cause) {
        if (cancelled) return;
        supportKeyRef.current = null;
        setGuideBusy(false);
        setSpeaking(false);
        setError(
          cause instanceof Error
            ? cause.message
            : "Ma'am Clara's voice could not play.",
        );
      }
    };
    void play();

    return () => {
      cancelled = true;
      playbackRef.current?.stop();
    };
  }, [
    achievementUnlock.pending,
    activityPreparation.status,
    claraReady,
    lesson,
    session?.token,
  ]);

  const save = async (action: () => Promise<LessonSixState>) => {
    setBusy(true);
    setError("");
    try {
      setLesson(await action());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "That answer could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  const controlsUnavailable =
    busy ||
    guideBusy ||
    speaking ||
    !claraReady ||
    activityPreparation.status !== "ready" ||
    !speechComplete;

  if (!lesson) {
    return (
      <main className="assessment-page assessment-page--loading learner-flow-page learner-typography-page">
        <p role={error ? "alert" : undefined}>
          {error || "Opening Lesson 6..."}
        </p>
      </main>
    );
  }

  const completed = lesson.status === "completed";
  const finalAssessmentReady = Boolean(
    lesson.completion?.final_assessment_ready,
  );
  const canAdvance = lesson.teaching.can_advance && speechComplete;
  const canSubmit =
    Boolean(selectedChoice) &&
    lesson.teaching.can_choose &&
    !controlsUnavailable;
  const primaryAction = completed ? (
    <BigButton
      variant={
        controlsUnavailable ? "unavailable-vertical" : "primary-vertical"
      }
      leadingIcon={<DockActionIcon kind="next" />}
      disabled={controlsUnavailable}
      onClick={() =>
        navigate(
          finalAssessmentReady
            ? "/learner/final-assessment/part-one"
            : "/learner/dashboard",
        )
      }
    >
      {finalAssessmentReady ? "Start Final Assessment" : "Continue"}
    </BigButton>
  ) : canAdvance ? (
    <BigButton
      variant={
        controlsUnavailable ? "unavailable-vertical" : "primary-vertical"
      }
      leadingIcon={<DockActionIcon kind="next" />}
      disabled={controlsUnavailable}
      committing={nextCommit.committing}
      onClick={() =>
        nextCommit.commit(
          () =>
            void save(() =>
              advanceLessonSixItem(session!.token, lesson.run_id),
            ),
        )
      }
    >
      Next
    </BigButton>
  ) : (
    <BigButton
      variant={canSubmit ? "primary-vertical" : "unavailable-vertical"}
      leadingIcon={<DockActionIcon kind="submit" />}
      disabled={!canSubmit}
      busy={busy}
      busyLabel="Checking"
      committing={submitCommit.committing}
      onClick={() =>
        submitCommit.commit(
          () =>
            void save(() =>
              submitLessonSixChoice(
                session!.token,
                lesson.run_id,
                lesson.item!.item_key,
                selectedChoice!,
              ),
            ),
        )
      }
    >
      Submit
    </BigButton>
  );

  const wrongChoice =
    lesson.response?.decision === "NEEDS_SUPPORT"
      ? lesson.response.last_selected_choice
      : null;
  const assistance = lesson.teaching.assistance_level;

  return (
    <LearnerActivityShell
      className="lesson-six-page"
      overlay={
        <>
          <ClaraSpeechWarmupLoader
            active={activityPreparation.showRuntimeLoader || guideBusy}
            modelReady={claraReady}
          />
          {achievementUnlock.achievement ? (
            <AchievementUnlockOverlay
              achievement={achievementUnlock.achievement}
              open={achievementUnlock.open}
              onDismiss={achievementUnlock.dismiss}
            />
          ) : null}
          {error ? (
            <div className="lesson-error" role="alert">
              <p>{error}</p>
              <BigButton
                variant="secondary"
                size="regular"
                onClick={() => {
                  setError("");
                  supportKeyRef.current = null;
                  activityPreparation.retry();
                }}
              >
                Try again
              </BigButton>
            </div>
          ) : null}
        </>
      }
      eyebrow={
        completed
          ? finalAssessmentReady
            ? "Reading path complete"
            : "Milestone reached"
          : "Lesson 6 - Mission 1"
      }
      title={
        completed
          ? (lesson.completion?.title ?? "Lesson 6 complete.")
          : "Answer the questions"
      }
      headerAside={
        completed ? undefined : (
          <LessonProgressRail
            current={lesson.progress.current}
            total={lesson.progress.total}
          />
        )
      }
      itemPanelClassName={completed ? "assessment-item-panel--result" : ""}
      itemContent={
        completed ? (
          <AllLessonsComplete state={lesson} />
        ) : lesson.item ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={lesson.item.item_key}
              className="lesson-six-item"
              data-support-level={assistance}
              initial={
                reduceMotion ? false : { opacity: 0, y: 14, scale: 0.97 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            >
              <span className="lesson-six-item__question-kind">
                {lesson.item.question_type}
              </span>
              <HighlightedSentence
                sentence={lesson.item.display_sentence}
                evidence={lesson.item.evidence_span}
              />
              <h2>{lesson.item.question_text}</h2>
            </motion.div>
          </AnimatePresence>
        ) : null
      }
      recorderAriaLabel="Answer choices"
      recorderContent={
        completed || !lesson.item ? undefined : (
          <ComprehensionChoiceGrid
            choices={lesson.item.choices}
            selectedChoice={selectedChoice}
            unavailable={controlsUnavailable || !lesson.teaching.can_choose}
            disabledChoices={lesson.response?.disabled_choices}
            correctChoice={lesson.item.correct_choice_key}
            lastWrongChoice={wrongChoice}
            onSelect={(choice) =>
              setSelectedChoice(choice as LessonSixChoiceKey)
            }
          />
        )
      }
      primaryActionKey={
        completed ? "dashboard" : canAdvance ? "next" : "submit"
      }
      primaryAction={primaryAction}
      secondaryAction={
        !completed && !canAdvance && lesson.item ? (
          <BigButton
            variant="skip-vertical"
            disabled={controlsUnavailable}
            busy={busy}
            busyLabel="Skipping"
            committing={skipCommit.committing}
            onClick={() =>
              skipCommit.commit(
                () =>
                  void save(() =>
                    skipLessonSixItem(
                      session!.token,
                      lesson.run_id,
                      lesson.item!.item_key,
                    ),
                  ),
              )
            }
          >
            Skip
          </BigButton>
        ) : undefined
      }
      claraEmotion={
        completed
          ? "happy"
          : assistance === "none"
            ? "thinking"
            : assistance === "demonstration"
              ? "default"
              : "confused"
      }
      claraBehavior={
        completed
          ? "celebrating"
          : assistance === "demonstration"
            ? "demonstrating"
            : assistance === "none"
              ? "listening"
              : "gentle_correction"
      }
      claraCue="none"
      claraSpeaking={speaking}
      claraSpeechLevel={speechLevel}
      onClaraReadyChange={setClaraReady}
      reduceMotion={Boolean(reduceMotion)}
    />
  );
}
