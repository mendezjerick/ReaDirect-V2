import { useEffect, useMemo, useState } from "react";

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
import { offlineJourneyContent } from "../content/offlineJourneyContent";
import { scoreOfflineSpeech } from "./offlineSpeechScoring";

import type { OfflineAsrTranscription } from "../native/offlineAsrBridge";
import type { OfflineLearnerState } from "../storage/offlineLearnerState";

type RunnerState = "ready" | "recording" | "processing" | "saving";

function getActivity(learner: OfflineLearnerState) {
  const stage = getOfflineJourneyStage(learner);
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
  onLearnerChange,
  onExit,
  repository = offlineLearnerRepository,
  asr = offlineAsrBridge,
  tts = offlineTtsBridge,
}: {
  learner: OfflineLearnerState;
  onLearnerChange: (learner: OfflineLearnerState) => void;
  onExit: () => void;
  repository?: Pick<typeof offlineLearnerRepository, "update">;
  asr?: Pick<
    typeof offlineAsrBridge,
    "startRecording" | "stopAndTranscribe" | "cancelRecording"
  >;
  tts?: Pick<typeof offlineTtsBridge, "play" | "stop">;
}) {
  const resolved = useMemo(() => getActivity(learner), [learner]);
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

  useEffect(
    () => () => {
      void tts.stop().catch(() => undefined);
      void asr.cancelRecording().catch(() => undefined);
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

  if (!resolved || finishedTitle) {
    return (
      <main className="offline-activity offline-activity--complete">
        <section className="offline-activity__complete-card">
          <p className="offline-dashboard__eyebrow">Milestone saved</p>
          <h1>{finishedTitle ?? "Reading Journey complete"}</h1>
          <p>Your progress and achievement are stored on this device.</p>
          <button className="offline-button" type="button" onClick={onExit}>
            Return to dashboard
          </button>
        </section>
      </main>
    );
  }

  const { activity, stage } = resolved;
  const item = activity.items[itemIndex];
  const answered = feedback !== null;
  const progressPercent = Math.round(
    ((itemIndex + (answered ? 1 : 0)) / activity.items.length) * 100,
  );

  const playPrompt = async () => {
    if (runnerState !== "ready") return;
    setErrorMessage(null);
    setRunnerState("processing");
    try {
      await tts.play(item.ttsKey);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Clara's prompt could not play.",
      );
    } finally {
      setRunnerState("ready");
    }
  };

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
        void tts.play(activity.completionTtsKey).catch(() => undefined);
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
      await asr.startRecording(item.long ? 60_000 : 30_000);
      setRunnerState("recording");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Recording could not start.",
      );
    }
  };

  const stopAndCheck = async () => {
    if (item.kind !== "speech" || runnerState !== "recording") return;
    setRunnerState("processing");
    try {
      const result: OfflineAsrTranscription = await asr.stopAndTranscribe();
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
      setRunnerState("ready");
    }
  };

  const nextItem = () => {
    setItemIndex((current) => current + 1);
    setSelectedChoice(null);
    setFeedback(null);
    setLastTranscript(null);
    setErrorMessage(null);
  };

  return (
    <main className="offline-activity" data-screen="journey-activity">
      <header className="offline-activity__header">
        <button type="button" onClick={onExit} aria-label="Back to dashboard">
          ←
        </button>
        <div>
          <p>{item.phase}</p>
          <h1>{activity.title}</h1>
        </div>
        <strong>
          {itemIndex + 1}/{activity.items.length}
        </strong>
      </header>

      <div
        className="offline-activity__progress"
        role="progressbar"
        aria-label={`${activity.title} progress`}
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${progressPercent}%` }} />
      </div>

      <section
        className="offline-activity__card"
        aria-labelledby="activity-prompt"
      >
        <button
          className="offline-activity__listen"
          type="button"
          disabled={runnerState !== "ready" || answered}
          onClick={() => void playPrompt()}
        >
          Listen to Clara
        </button>
        <p id="activity-prompt">{item.prompt}</p>
        <strong
          className={
            item.kind === "speech" && item.long
              ? "offline-activity__passage"
              : undefined
          }
        >
          {item.display}
        </strong>

        {item.kind === "choice" ? (
          <div className="offline-activity__choices">
            {item.choices.map((choice) => (
              <button
                key={choice.key}
                type="button"
                disabled={answered || runnerState !== "ready"}
                aria-pressed={selectedChoice === choice.key}
                onClick={() => setSelectedChoice(choice.key)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="offline-activity__speech">
            <button
              className="offline-activity__record"
              type="button"
              data-recording={runnerState === "recording" || undefined}
              aria-pressed={runnerState === "recording"}
              disabled={
                answered || !["ready", "recording"].includes(runnerState)
              }
              onClick={() =>
                runnerState === "recording"
                  ? void stopAndCheck()
                  : void startRecording()
              }
            >
              {runnerState === "recording" ? "Stop and check" : "Record answer"}
            </button>
            {lastTranscript ? <p>You said: “{lastTranscript}”</p> : null}
          </div>
        )}

        {feedback ? (
          <p className="offline-activity__feedback" role="status">
            {feedback}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="offline-activity__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="offline-activity__actions">
          {answered ? (
            <button className="offline-button" type="button" onClick={nextItem}>
              Next
            </button>
          ) : item.kind === "choice" ? (
            <button
              className="offline-button"
              type="button"
              disabled={!selectedChoice || runnerState !== "ready"}
              onClick={() =>
                void saveAnswer(
                  selectedChoice,
                  selectedChoice === item.correctChoice
                    ? "correct"
                    : "needs_support",
                )
              }
            >
              Submit answer
            </button>
          ) : null}
          {!answered ? (
            <button
              className="offline-activity__skip-item"
              type="button"
              disabled={runnerState !== "ready"}
              onClick={() => void saveAnswer(null, "skipped")}
            >
              Skip this item
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
