import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";

import { BigButton } from "../../components/ui/BigButton";
import {
  AssessmentDockActionIcon,
  AssessmentRecorderView,
} from "../../features/assessment/AssessmentRecorder";
import { LearnerActivityResult } from "../../features/learner-activity/LearnerActivityResult";
import { LearnerActivityShell } from "../../features/learner-activity/LearnerActivityShell";
import { LessonProgressRail } from "../../features/lesson/LessonProgressRail";
import "../../features/assessment/assessment.css";
import "../../features/lesson/lesson.css";
import { OfflineClaraStage } from "../clara/OfflineClaraStage";
import { offlineJourneyContent } from "../content/offlineJourneyContent";
import { offlineAsrBridge } from "../native/offlineAsrBridge";
import { offlineTtsBridge } from "../native/offlineTtsBridge";
import { offlineLearnerRepository } from "../storage/offlineLearnerRepository";
import {
  completeOfflineAssessment,
  completeOfflineLesson,
  getOfflineJourneyStage,
  saveOfflineAssessmentCheckpoint,
  saveOfflineLessonCheckpoint,
} from "../storage/offlineLearnerState";
import { scoreOfflineSpeech } from "./offlineSpeechScoring";

import type { ClaraSelection } from "../clara/claraCapability";
import type { OfflineAsrTranscription } from "../native/offlineAsrBridge";
import type {
  OfflineActivityAsr,
  OfflineActivityTts,
} from "../runtime/offlineAppRuntime";
import type {
  OfflineJourneyStage,
  OfflineLearnerState,
} from "../storage/offlineLearnerState";

type RunnerState =
  | "ready"
  | "recording"
  | "recorded"
  | "playing"
  | "processing"
  | "checking"
  | "saving";

function getActivity(
  learner: OfflineLearnerState,
  requestedStage?: OfflineJourneyStage,
) {
  const stage = requestedStage ?? getOfflineJourneyStage(learner);
  if (stage === "diagnostic") {
    return {
      stage,
      activity: offlineJourneyContent.assessments.diagnostic,
      progress: learner.journey.diagnostic,
    };
  }
  if (stage === "final-assessment") {
    return {
      stage,
      activity: offlineJourneyContent.assessments.final,
      progress: learner.journey.finalAssessment,
    };
  }
  if (stage.startsWith("lesson-")) {
    const order = Number(stage.slice("lesson-".length)) as
      1 | 2 | 3 | 4 | 5 | 6;
    return {
      stage,
      activity: offlineJourneyContent.lessons[order - 1],
      progress: learner.journey.lessons[order - 1],
      order,
    };
  }
  return null;
}

function progressResponses(
  learner: OfflineLearnerState,
  stage: ReturnType<typeof getOfflineJourneyStage>,
) {
  if (stage === "diagnostic") return learner.journey.diagnostic.responses;
  if (stage === "final-assessment") {
    return learner.journey.finalAssessment.responses;
  }
  if (stage.startsWith("lesson-")) {
    return learner.journey.lessons[Number(stage.slice(7)) - 1].responses;
  }
  return [];
}

export function OfflineJourneyActivity({
  learner,
  stage: requestedStage,
  claraSelection,
  onLearnerChange,
  onExit,
  repository = offlineLearnerRepository,
  asr = offlineAsrBridge,
  tts = offlineTtsBridge,
}: {
  learner: OfflineLearnerState;
  stage?: OfflineJourneyStage;
  claraSelection?: ClaraSelection;
  onLearnerChange: (learner: OfflineLearnerState) => void;
  onExit: () => void;
  repository?: Pick<typeof offlineLearnerRepository, "update">;
  asr?: OfflineActivityAsr;
  tts?: OfflineActivityTts;
}) {
  const reduceMotion = useReducedMotion();
  const resolved = useMemo(
    () => getActivity(learner, requestedStage),
    [learner, requestedStage],
  );
  const initialIndex = resolved
    ? resolved.activity.items.findIndex(
        ({ key }) => !resolved.progress.completedItemKeys.includes(key),
      )
    : -1;
  const [itemIndex, setItemIndex] = useState(Math.max(0, initialIndex));
  const [runnerState, setRunnerState] = useState<RunnerState>("ready");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [finishedTitle, setFinishedTitle] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [hasCapture, setHasCapture] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [claraSpeaking, setClaraSpeaking] = useState(false);
  const activeItem = resolved?.activity.items[itemIndex] ?? null;
  const activeItemKey = activeItem?.key;
  const activeTtsKey = activeItem?.ttsKey;

  useEffect(() => {
    if (!activeItemKey || !activeTtsKey) return;
    let active = true;
    setErrorMessage(null);
    setClaraSpeaking(true);
    void tts
      .play(activeTtsKey, learner.setup.speechLanguage)
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Clara's prompt could not play.",
        );
      })
      .finally(() => {
        if (active) setClaraSpeaking(false);
      });
    return () => {
      active = false;
      void tts.stop().catch(() => undefined);
    };
  }, [activeItemKey, activeTtsKey, learner.setup.speechLanguage, tts]);

  useEffect(
    () => () => {
      void tts.stop().catch(() => undefined);
      void asr.cancelRecording().catch(() => undefined);
      void asr.clearRecording().catch(() => undefined);
    },
    [asr, tts],
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden || runnerState !== "recording") return;
      void asr.cancelRecording().catch(() => undefined);
      void tts.stop().catch(() => undefined);
      setRunnerState("ready");
      setErrorMessage(
        "Recording stopped when ReaDirect moved to the background. Please try again.",
      );
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [asr, runnerState, tts]);

  const effectiveClaraSelection: ClaraSelection = claraSelection ?? {
    mode: learner.setup.clara.mode === "dynamic" ? "dynamic" : "static",
    displayName: learner.setup.clara.mode === "dynamic" ? "Dynamic" : "Static",
    reason:
      learner.setup.clara.mode === "dynamic" ? "supported" : "memory_limit",
    dynamicLocked: learner.setup.clara.mode !== "dynamic",
    requiresAcknowledgement: true,
    acknowledgementLabel: "I understand",
  };
  const clara = (
    <OfflineClaraStage
      useMainUi
      savedMode={learner.setup.clara.mode}
      selection={effectiveClaraSelection}
      speaking={claraSpeaking}
    />
  );

  if (!resolved || finishedTitle) {
    return (
      <LearnerActivityShell
        className="offline-main-activity"
        eyebrow="Milestone reached"
        title={finishedTitle ?? "Reading Journey complete"}
        itemPanelClassName="assessment-item-panel--result"
        itemContent={
          <LearnerActivityResult
            ariaLabel="Saved offline activity result"
            segments={[
              {
                key: "saved",
                label: "Progress",
                value: "Saved",
                status: "On this device",
              },
            ]}
            level="Your progress and achievement are ready offline."
          />
        }
        primaryActionKey="return-journey"
        primaryAction={
          <BigButton
            variant="primary-vertical"
            leadingIcon={<AssessmentDockActionIcon kind="next" />}
            onClick={onExit}
          >
            Return to Journey
          </BigButton>
        }
        claraEmotion="happy"
        claraSpeaking={false}
        claraSpeechLevel={0}
        onClaraReadyChange={() => undefined}
        reduceMotion={Boolean(reduceMotion)}
        onHome={onExit}
        homeLabel="Back to Reading Journey"
        claraContent={clara}
      />
    );
  }

  const { activity, stage } = resolved;
  const item = activity.items[itemIndex];
  const answered = feedback !== null;

  const saveAnswer = async (
    value: string | null,
    outcome: "correct" | "needs_support" | "skipped",
  ) => {
    setRunnerState("saving");
    setErrorMessage(null);
    try {
      const responses = progressResponses(learner, stage);
      const attempts =
        (responses.find(({ itemKey }) => itemKey === item.key)?.attempts ?? 0) +
        1;
      const checkpoint = {
        currentPhase: item.phase,
        currentMissionKey: item.phase,
        currentItemKey: item.key,
        completedItemKeys: [
          ...new Set([...resolved.progress.completedItemKeys, item.key]),
        ],
        response: {
          itemKey: item.key,
          kind:
            item.kind === "choice" ? ("choice" as const) : ("speech" as const),
          value,
          outcome,
          attempts,
        },
      };

      let updated = await repository.update((state, now) =>
        stage === "diagnostic" || stage === "final-assessment"
          ? saveOfflineAssessmentCheckpoint(
              state,
              stage === "diagnostic" ? "diagnostic" : "final",
              checkpoint,
              now,
            )
          : saveOfflineLessonCheckpoint(
              state,
              resolved.order!,
              checkpoint,
              now,
            ),
      );
      onLearnerChange(updated);

      if (itemIndex === activity.items.length - 1) {
        updated = await repository.update((state, now) => {
          if (stage === "diagnostic" || stage === "final-assessment") {
            const assessment =
              stage === "diagnostic"
                ? state.journey.diagnostic
                : state.journey.finalAssessment;
            return completeOfflineAssessment(
              state,
              stage === "diagnostic" ? "diagnostic" : "final",
              {
                score: assessment.responses.filter(
                  (response) => response.outcome === "correct",
                ).length,
                maximum: activity.items.length,
              },
              now,
            );
          }
          return completeOfflineLesson(state, resolved.order!, now);
        });
        onLearnerChange(updated);
        setFinishedTitle(`${activity.title} complete`);
        void tts
          .play(activity.completionTtsKey, learner.setup.speechLanguage)
          .catch(() => undefined);
      } else {
        setFeedback(
          outcome === "correct"
            ? "Correct — nicely done!"
            : outcome === "skipped"
              ? "Skipped. You can keep moving."
              : "Answer saved. Clara will help you keep practicing.",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Progress could not be saved.",
      );
    } finally {
      setRunnerState("ready");
    }
  };

  const startRecording = async () => {
    if (item.kind !== "speech" || runnerState !== "ready" || answered) return;
    setErrorMessage(null);
    try {
      await tts.stop();
      setClaraSpeaking(false);
      await asr.clearRecording();
      await asr.startRecording(item.long ? 60_000 : 30_000, {
        expectedTranscript: item.expected,
      });
      setHasCapture(false);
      setHasPlayed(false);
      setRunnerState("recording");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Recording could not start.",
      );
    }
  };

  const stopRecording = async () => {
    if (item.kind !== "speech" || runnerState !== "recording") return;
    setRunnerState("processing");
    try {
      await asr.stopRecording();
      setHasCapture(true);
      setHasPlayed(false);
      setRunnerState("recorded");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Recording could not stop.",
      );
      setRunnerState("ready");
    }
  };

  const playRecording = async () => {
    if (item.kind !== "speech" || runnerState !== "recorded" || !hasCapture)
      return;
    setErrorMessage(null);
    setRunnerState("playing");
    try {
      await asr.playRecording();
      setHasPlayed(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Your recording could not play. Try recording again.",
      );
    } finally {
      setRunnerState("recorded");
    }
  };

  const retryRecording = async () => {
    if (item.kind !== "speech" || answered) return;
    await asr.clearRecording().catch(() => undefined);
    setHasCapture(false);
    setHasPlayed(false);
    setLastTranscript(null);
    setErrorMessage(null);
    setRunnerState("ready");
  };

  const submitSpeech = async () => {
    if (
      item.kind !== "speech" ||
      runnerState !== "recorded" ||
      !hasCapture ||
      !hasPlayed ||
      answered
    )
      return;
    setErrorMessage(null);
    setRunnerState("checking");
    try {
      const result: OfflineAsrTranscription = await asr.transcribeRecording();
      const score = scoreOfflineSpeech(
        result.transcript,
        item.expected,
        item.long,
      );
      setLastTranscript(result.transcript);
      await saveAnswer(
        result.transcript,
        score.correct ? "correct" : "needs_support",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Speech could not be checked.",
      );
      setRunnerState("recorded");
    }
  };

  const nextItem = () => {
    void asr.clearRecording().catch(() => undefined);
    setItemIndex((current) => current + 1);
    setSelectedChoice(null);
    setFeedback(null);
    setLastTranscript(null);
    setErrorMessage(null);
    setHasCapture(false);
    setHasPlayed(false);
    setRunnerState("ready");
  };

  const primaryAction = answered ? (
    <BigButton
      variant="primary-vertical"
      leadingIcon={<AssessmentDockActionIcon kind="next" />}
      onClick={nextItem}
    >
      Next
    </BigButton>
  ) : item.kind === "choice" ? (
    <BigButton
      variant={
        selectedChoice && runnerState === "ready"
          ? "primary-vertical"
          : "unavailable-vertical"
      }
      leadingIcon={<AssessmentDockActionIcon kind="submit" />}
      disabled={!selectedChoice || runnerState !== "ready"}
      busy={runnerState === "saving"}
      onClick={() =>
        void saveAnswer(
          selectedChoice,
          selectedChoice === item.correctChoice ? "correct" : "needs_support",
        )
      }
    >
      Submit
    </BigButton>
  ) : (
    <BigButton
      variant={
        runnerState === "recorded" && hasCapture && hasPlayed
          ? "primary-vertical"
          : "unavailable-vertical"
      }
      leadingIcon={<AssessmentDockActionIcon kind="submit" />}
      disabled={
        runnerState !== "recorded" || !hasCapture || !hasPlayed || answered
      }
      busy={runnerState === "checking" || runnerState === "saving"}
      busyLabel={runnerState === "checking" ? "Checking" : "Saving"}
      onClick={() => void submitSpeech()}
    >
      Submit
    </BigButton>
  );

  const isLongSpeech = item.kind === "speech" && item.long;
  const displayClass = isLongSpeech
    ? "assessment-passage offline-main-activity__passage"
    : "assessment-item__prompt offline-main-activity__display";

  return (
    <LearnerActivityShell
      className={`offline-main-activity ${item.kind === "speech" ? "offline-main-activity--speech" : "offline-main-activity--choice"} ${isLongSpeech ? "lesson-five-page" : ""}`}
      eyebrow={item.phase}
      title={activity.title}
      headerAside={
        <LessonProgressRail
          current={itemIndex + 1}
          total={activity.items.length}
        />
      }
      itemContent={
        <div
          className="assessment-item offline-main-activity__item"
          data-stage={item.kind === "choice" ? "task-2a" : "task-2b"}
          data-response-state={answered ? "committed" : "active"}
        >
          <p className="offline-main-activity__prompt">{item.prompt}</p>
          {isLongSpeech ? (
            <article className={displayClass}>
              <div className="assessment-passage__heading">
                <span>{item.phase}</span>
                <strong>Read aloud</strong>
              </div>
              <p>{item.display}</p>
            </article>
          ) : (
            <div className={displayClass}>
              <strong>{item.display}</strong>
            </div>
          )}
          {lastTranscript ? (
            <p className="offline-main-activity__transcript">
              You said: “{lastTranscript}”
            </p>
          ) : null}
          {feedback ? (
            <p className="offline-main-activity__feedback" role="status">
              {feedback}
            </p>
          ) : null}
          {errorMessage && item.kind === "choice" ? (
            <p className="offline-main-activity__error" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
      }
      recorderAriaLabel={
        item.kind === "choice" ? "Answer choices" : "Voice recorder"
      }
      recorderContent={
        item.kind === "choice" ? (
          <div className="assessment-rhyme__choices">
            {item.choices.map((choice) => (
              <button
                key={choice.key}
                type="button"
                data-selected={selectedChoice === choice.key || undefined}
                disabled={answered || runnerState !== "ready" || claraSpeaking}
                onClick={() => setSelectedChoice(choice.key)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        ) : (
          <AssessmentRecorderView
            state={
              runnerState === "recording"
                ? "recording"
                : runnerState === "playing"
                  ? "playing"
                  : runnerState === "recorded" ||
                      runnerState === "checking" ||
                      runnerState === "saving"
                    ? "recorded"
                    : runnerState === "processing"
                      ? "processing"
                      : "idle"
            }
            unavailable={
              answered ||
              runnerState === "checking" ||
              runnerState === "saving" ||
              runnerState === "processing" ||
              claraSpeaking
            }
            committed={answered}
            hasCapture={hasCapture}
            hasPlayed={hasPlayed}
            error={errorMessage ?? ""}
            recordLabel="Record answer"
            stopLabel="Stop"
            onControl={() =>
              runnerState === "recording"
                ? void stopRecording()
                : runnerState === "recorded"
                  ? void playRecording()
                  : void startRecording()
            }
            onRetry={() => void retryRecording()}
          />
        )
      }
      primaryActionKey={answered ? "next" : "submit"}
      primaryAction={primaryAction}
      secondaryAction={
        !answered ? (
          <BigButton
            variant="skip-vertical"
            disabled={
              !["ready", "recorded"].includes(runnerState) ||
              runnerState === "playing" ||
              claraSpeaking
            }
            busy={runnerState === "saving"}
            busyLabel="Skipping"
            onClick={() => {
              void asr.clearRecording().catch(() => undefined);
              void saveAnswer(null, "skipped");
            }}
          >
            Skip
          </BigButton>
        ) : undefined
      }
      claraEmotion={feedback?.startsWith("Correct") ? "happy" : "default"}
      claraSpeaking={claraSpeaking}
      claraSpeechLevel={0}
      onClaraReadyChange={() => undefined}
      reduceMotion={Boolean(reduceMotion)}
      onHome={onExit}
      homeLabel="Back to Reading Journey"
      claraContent={clara}
    />
  );
}
