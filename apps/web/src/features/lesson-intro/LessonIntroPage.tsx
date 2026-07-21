import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  playClaraSpeech,
  prepareClaraSpeech,
  type ClaraSpeechPlayback,
} from "../clara-audio/claraSpeech";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { ClaraIntroStage } from "../intro/ClaraIntroStage";
import "./lesson-intro.css";

type LessonIntroState = "preparing" | "speaking" | "ready" | "error";

const statusMessages: Record<LessonIntroState, string> = {
  preparing: "Ma'am Clara is getting ready...",
  speaking: "Listen to Ma'am Clara.",
  ready: "Ready!",
  error: "Ma'am Clara needs another try.",
};

export function LessonIntroPage() {
  const navigate = useNavigate();
  const continueCommit = useButtonCommit();
  const session = loadLearnerSession();
  const [state, setState] = useState<LessonIntroState>("preparing");
  const [speechLevel, setSpeechLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [claraReady, setClaraReady] = useState(false);
  const [preparedSpeech, setPreparedSpeech] = useState<Blob | null>(null);

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
      return;
    }

    let active = true;
    const prepare = async () => {
      setState("preparing");
      setSpeechLevel(0);
      setPreparedSpeech(null);

      try {
        const speech = await prepareClaraSpeech("lesson-intro", session.token);

        if (active) {
          setPreparedSpeech(speech);
        }
      } catch {
        if (active) {
          setState("error");
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

        setState("speaking");
        await playback.finished;

        if (active) {
          setState("ready");
          setSpeechLevel(0);
        }
      } catch {
        if (active) {
          setState("error");
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

  return (
    <ClaraIntroStage
      ariaLabelledBy="lesson-intro-title"
      className="lesson-intro-page"
      emotion="happy"
      speaking={state === "speaking"}
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
          {statusMessages[state]}
        </p>
        <BigButton
          className="intro-page__continue lesson-intro-page__continue"
          variant={state === "ready" ? "primary" : "unavailable"}
          committing={continueCommit.committing}
          disabled={state !== "ready"}
          onClick={() =>
            continueCommit.commit(() =>
              navigate("/learner/assessment/part-one"),
            )
          }
        >
          Continue
        </BigButton>
        {state === "error" ? (
          <BigButton
            className="lesson-intro-page__retry"
            variant="secondary"
            size="regular"
            onClick={() => setAttempt((current) => current + 1)}
          >
            Try again
          </BigButton>
        ) : null}
      </div>
    </ClaraIntroStage>
  );
}
