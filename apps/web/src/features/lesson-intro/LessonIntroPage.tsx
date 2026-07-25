import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  playClaraSpeech,
  prepareClaraSpeech,
  type ClaraSpeechPlayback,
} from "../clara-audio/claraSpeech";
import { ClaraSpeechWarmupLoader } from "../clara-audio/ClaraSpeechWarmupLoader";
import { activitySpeechScopeForProgress } from "../clara-audio/activitySpeechReadiness";
import { useActivitySpeechPreparation } from "../clara-audio/useActivitySpeechPreparation";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { ClaraIntroStage } from "../intro/ClaraIntroStage";
import "./lesson-intro.css";

type LessonIntroSpeechState = "preparing" | "speaking" | "finished" | "error";

const speechStatusMessages: Record<LessonIntroSpeechState, string> = {
  preparing: "Ma'am Clara is getting ready...",
  speaking: "Listen to Ma'am Clara.",
  finished: "Ma'am Clara is preparing your activity...",
  error: "Ma'am Clara needs another try.",
};

export function LessonIntroPage() {
  const navigate = useNavigate();
  const continueCommit = useButtonCommit();
  const session = loadLearnerSession();
  const activityScope = session
    ? activitySpeechScopeForProgress(session.learner.progress)
    : "signed-out";
  const activityPreparation = useActivitySpeechPreparation(
    session?.token,
    activityScope,
    Boolean(session?.token),
  );
  const [speechState, setSpeechState] =
    useState<LessonIntroSpeechState>("preparing");
  const [speechLevel, setSpeechLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [claraReady, setClaraReady] = useState(false);
  const [preparedSpeech, setPreparedSpeech] = useState<Blob | null>(null);
  const nextRoute =
    session?.learner.progress.stage === "required_lessons"
      ? `/learner/lessons/${session.learner.progress.current_required_lesson_order ?? 1}`
      : session?.learner.progress.stage === "final_assessment"
        ? "/learner/final-assessment/part-one"
        : "/learner/assessment/part-one";

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
      return;
    }

    let active = true;
    const prepare = async () => {
      setSpeechState("preparing");
      setSpeechLevel(0);
      setPreparedSpeech(null);

      try {
        const speech = await prepareClaraSpeech("lesson-intro", session.token);

        if (active) {
          setPreparedSpeech(speech);
        }
      } catch {
        if (active) {
          setSpeechState("error");
          setSpeechLevel(0);
        }
      }
    };

    void prepare();

    return () => {
      active = false;
    };
  }, [attempt, navigate, session?.token]);

  useEffect(() => {
    if (!preparedSpeech || !claraReady) {
      return;
    }

    let active = true;
    let playback: ClaraSpeechPlayback | undefined;

    const speak = async () => {
      try {
        playback = await playClaraSpeech(
          preparedSpeech,
          (level) => {
            if (active) {
              setSpeechLevel(level);
            }
          },
          { modelState: "ready" },
        );

        if (!active) {
          playback.stop();
          return;
        }

        setSpeechState("speaking");
        await playback.finished;

        if (active) {
          setSpeechState("finished");
          setSpeechLevel(0);
        }
      } catch {
        if (active) {
          setSpeechState("error");
          setSpeechLevel(0);
        }
      }
    };

    void speak();

    return () => {
      active = false;
      playback?.stop();
    };
  }, [claraReady, preparedSpeech]);

  const ready =
    speechState === "finished" && activityPreparation.status === "ready";
  const hasError =
    speechState === "error" || activityPreparation.status === "error";
  const statusMessage = hasError
    ? "Ma'am Clara needs another try."
    : ready
      ? "Ready!"
      : speechState === "finished" && activityPreparation.status === "preparing"
        ? "Ma'am Clara is preparing your activity..."
        : speechStatusMessages[speechState];

  const retry = () => {
    activityPreparation.retry();
    setAttempt((current) => current + 1);
  };

  return (
    <>
      <ClaraSpeechWarmupLoader
        active={activityPreparation.showRuntimeLoader}
        modelReady={claraReady}
      />
      <ClaraIntroStage
        ariaLabelledBy="lesson-intro-title"
        className="lesson-intro-page"
        emotion="happy"
        speaking={speechState === "speaking"}
        speechLevel={speechLevel}
        onClaraLoadStateChange={(loadState) =>
          setClaraReady(loadState === "ready")
        }
        routeFocus
      >
        <div className="lesson-intro-page__action-panel">
          <h1 id="lesson-intro-title" className="visually-hidden">
            Get ready to read
          </h1>
          <p className="lesson-intro-page__status" aria-live="polite">
            {statusMessage}
          </p>
          <BigButton
            className="intro-page__continue lesson-intro-page__continue"
            variant={ready ? "primary" : "unavailable"}
            committing={continueCommit.committing}
            disabled={!ready}
            onClick={() => continueCommit.commit(() => navigate(nextRoute))}
          >
            Continue
          </BigButton>
          {hasError ? (
            <BigButton
              className="lesson-intro-page__retry"
              variant="secondary"
              size="regular"
              onClick={retry}
            >
              Try again
            </BigButton>
          ) : null}
        </div>
      </ClaraIntroStage>
    </>
  );
}
