import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  playClaraSpeech,
  prepareClaraSpeech,
  type ClaraSpeechKey,
  type ClaraSpeechPlayback,
} from "../clara-audio/claraSpeech";
import { ClaraIntroStage } from "../intro/ClaraIntroStage";
import type {
  ClaraEmotion,
  ClaraTeachingBehavior,
} from "../intro/live2d/ClaraPresentation";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import {
  advanceLearnWithClaraLessonOne,
  restartLearnWithClaraLessonOne,
  startLearnWithClaraLessonOne,
  type LearnWithClaraAction,
  type LearnWithClaraListeningState,
} from "./learnWithClaraApi";
import { claraGreetingSpeechKeyForDate } from "./learnWithClaraGreeting";
import { LearnWithClaraStoryVignette } from "./LearnWithClaraStoryVignette";
import "./learn-with-clara.css";

type ViewPhase = "greeting" | "chapter";
type LineState = "preparing" | "speaking" | "finished" | "error";
type CheckpointState = "loading" | "ready" | "error";

function presentationFor(
  phase: ViewPhase,
  listeningState: LearnWithClaraListeningState | null,
): { emotion: ClaraEmotion; behavior: ClaraTeachingBehavior } {
  if (phase === "greeting") {
    return { emotion: "happy", behavior: "encouraging" };
  }

  if (listeningState?.scene.kind === "completion") {
    return { emotion: "happy", behavior: "celebrating" };
  }

  if (listeningState?.scene.kind === "story") {
    return listeningState.scene.key === "chapter-1-story-opening"
      ? { emotion: "thinking", behavior: "encouraging" }
      : { emotion: "happy", behavior: "encouraging" };
  }

  return { emotion: "default", behavior: "demonstrating" };
}

export function LearnWithClaraLessonOnePage() {
  const navigate = useNavigate();
  const actionCommit = useButtonCommit();
  const session = loadLearnerSession();
  const greetingSpeechKey = useMemo(
    () => claraGreetingSpeechKeyForDate(new Date()),
    [],
  );
  const [phase, setPhase] = useState<ViewPhase>("greeting");
  const [checkpointState, setCheckpointState] =
    useState<CheckpointState>("loading");
  const [listeningState, setListeningState] =
    useState<LearnWithClaraListeningState | null>(null);
  const [lineState, setLineState] = useState<LineState>("preparing");
  const [preparedSpeech, setPreparedSpeech] = useState<Blob | null>(null);
  const [speechLevel, setSpeechLevel] = useState(0);
  const [claraReady, setClaraReady] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const autoAdvanceSceneRef = useRef("");

  const activeSpeechKey: ClaraSpeechKey | null =
    phase === "greeting"
      ? greetingSpeechKey
      : (listeningState?.scene.speech_key ?? null);
  const presentation = presentationFor(phase, listeningState);

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
      return;
    }

    let active = true;
    setCheckpointState("loading");

    void startLearnWithClaraLessonOne(session.token)
      .then((state) => {
        if (active) {
          setListeningState(state);
          setCheckpointState("ready");
        }
      })
      .catch(() => {
        if (active) {
          setCheckpointState("error");
        }
      });

    return () => {
      active = false;
    };
  }, [navigate, session?.token]);

  useEffect(() => {
    if (!session?.token || !activeSpeechKey) {
      return;
    }

    let active = true;
    setLineState("preparing");
    setPreparedSpeech(null);
    setSpeechLevel(0);

    void prepareClaraSpeech(activeSpeechKey, session.token)
      .then((speech) => {
        if (active) {
          setPreparedSpeech(speech);
        }
      })
      .catch(() => {
        if (active) {
          setLineState("error");
        }
      });

    return () => {
      active = false;
    };
  }, [activeSpeechKey, playNonce, session?.token]);

  useEffect(() => {
    if (!session?.token || !listeningState) {
      return;
    }

    for (const speechKey of listeningState.prefetch_speech_keys) {
      void prepareClaraSpeech(speechKey, session.token).catch(() => undefined);
    }
  }, [listeningState, session?.token]);

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

        setLineState("speaking");
        await playback.finished;

        if (active) {
          setLineState("finished");
          setSpeechLevel(0);
        }
      } catch {
        if (active) {
          setLineState("error");
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

  const retryCheckpoint = () => {
    if (!session?.token) {
      return;
    }

    setCheckpointState("loading");
    void startLearnWithClaraLessonOne(session.token)
      .then((state) => {
        setListeningState(state);
        setCheckpointState("ready");
      })
      .catch(() => setCheckpointState("error"));
  };

  const advance = useCallback(
    async (action: LearnWithClaraAction) => {
      if (!session?.token || !listeningState || actionPending) {
        return;
      }

      setActionPending(true);
      setActionError("");
      try {
        const state = await advanceLearnWithClaraLessonOne(
          session.token,
          listeningState.scene.key,
          action,
        );
        setLineState("preparing");
        setListeningState(state);
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Ma'am Clara could not save that place.",
        );
      } finally {
        setActionPending(false);
      }
    },
    [actionPending, listeningState, session?.token],
  );

  useEffect(() => {
    const scene = phase === "chapter" ? listeningState?.scene : null;
    const shouldAdvanceAutomatically =
      scene?.kind === "letter_pair" ||
      scene?.key === "chapter-1-story-detail" ||
      scene?.key === "chapter-1-story-close" ||
      scene?.key === "chapter-1-story-return";

    if (
      !listeningState ||
      !scene ||
      !shouldAdvanceAutomatically ||
      lineState !== "finished" ||
      actionPending
    ) {
      return;
    }

    const autoAdvanceKey = `${listeningState.visit_count}:${scene.key}`;
    if (autoAdvanceSceneRef.current === autoAdvanceKey) {
      return;
    }

    autoAdvanceSceneRef.current = autoAdvanceKey;
    const timeout = window.setTimeout(() => {
      void advance("continue");
    }, 750);

    return () => window.clearTimeout(timeout);
  }, [actionPending, advance, lineState, listeningState, phase]);

  const restart = async () => {
    if (!session?.token || actionPending) {
      return;
    }

    setActionPending(true);
    setActionError("");
    try {
      const state = await restartLearnWithClaraLessonOne(session.token);
      setLineState("preparing");
      setListeningState(state);
      setPhase("chapter");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Ma'am Clara could not restart that chapter.",
      );
    } finally {
      setActionPending(false);
    }
  };

  const startChapter = () => {
    if (checkpointState === "ready") {
      setLineState("preparing");
      setPhase("chapter");
    }
  };

  const replay = () => setPlayNonce((current) => current + 1);
  const scene = phase === "chapter" ? listeningState?.scene : null;
  const letterPair =
    scene?.kind === "letter_pair" ? scene.display_text.split(" ") : [];
  const controlsReady = lineState === "finished" && !actionPending;

  return (
    <ClaraIntroStage
      ariaLabelledBy="learn-with-clara-title"
      className="learn-with-clara-page"
      emotion={presentation.emotion}
      behavior={presentation.behavior}
      speaking={lineState === "speaking"}
      speechLevel={speechLevel}
      onClaraLoadStateChange={(loadState) =>
        setClaraReady(loadState === "ready")
      }
      routeFocus
    >
      <section className="learn-with-clara-page__stage">
        {phase === "greeting" ? (
          <>
            <p className="learn-with-clara-page__eyebrow">Lesson 1 · Letters</p>
            <h1 id="learn-with-clara-title">Learn with Ma&apos;am Clara</h1>
          </>
        ) : (
          <>
            <div className="learn-with-clara-page__scene-heading">
              <p className="learn-with-clara-page__eyebrow">
                {scene?.item_progress
                  ? `Letter ${scene.item_progress.current} of ${scene.item_progress.total}`
                  : "Clara time"}
              </p>
              <h1 id="learn-with-clara-title">{scene?.title}</h1>
            </div>
            <Surface
              className="learn-with-clara-page__display"
              kind="frame"
              padding="compact"
              data-scene-kind={scene?.kind}
              key={scene?.key}
            >
              {letterPair.length === 2 ? (
                <span className="learn-with-clara-page__letter-pair">
                  <span>{letterPair[0]}</span>
                  <span>{letterPair[1]}</span>
                </span>
              ) : scene?.kind === "story" ? (
                <LearnWithClaraStoryVignette sceneKey={scene.key} />
              ) : (
                scene?.display_text
              )}
            </Surface>
          </>
        )}

        <p className="learn-with-clara-page__status" aria-live="polite">
          {lineState === "preparing"
            ? "Ma'am Clara is getting ready..."
            : lineState === "speaking"
              ? "Listen to Ma'am Clara."
              : lineState === "error"
                ? "Ma'am Clara needs another try."
                : ""}
        </p>

        {lineState === "error" ? (
          <BigButton
            className="learn-with-clara-page__single-action"
            variant="secondary"
            size="regular"
            onClick={replay}
          >
            Try again
          </BigButton>
        ) : null}

        {phase === "greeting" && lineState === "finished" ? (
          checkpointState === "error" ? (
            <BigButton
              className="learn-with-clara-page__single-action"
              variant="secondary"
              size="regular"
              onClick={retryCheckpoint}
            >
              Try loading the class
            </BigButton>
          ) : (
            <BigButton
              className="learn-with-clara-page__single-action"
              variant={checkpointState === "ready" ? "primary" : "unavailable"}
              disabled={checkpointState !== "ready"}
              committing={actionCommit.committing}
              onClick={() => actionCommit.commit(startChapter)}
            >
              {listeningState?.status === "chapter-1-complete"
                ? "See Chapter"
                : listeningState?.scene.key === "chapter-1-item-a"
                  ? "Start Class"
                  : "Continue Class"}
            </BigButton>
          )
        ) : null}

        {phase === "chapter" &&
        controlsReady &&
        scene?.key === "chapter-1-story-opening" ? (
          <div className="learn-with-clara-page__choice-actions">
            {scene.choices?.map((choice, index) => (
              <BigButton
                key={choice.action}
                variant={index === 0 ? "primary" : "secondary"}
                size="regular"
                onClick={() => void advance(choice.action)}
              >
                {choice.label}
              </BigButton>
            ))}
          </div>
        ) : null}

        {phase === "chapter" &&
        controlsReady &&
        scene?.kind === "completion" ? (
          <div className="learn-with-clara-page__standard-actions">
            <BigButton variant="secondary" size="regular" onClick={restart}>
              Listen Again
            </BigButton>
            <BigButton
              size="regular"
              onClick={() => navigate("/learner/dashboard")}
            >
              Back to Dashboard
            </BigButton>
          </div>
        ) : null}

        {actionPending ? (
          <p className="learn-with-clara-page__notice" aria-live="polite">
            Saving your place...
          </p>
        ) : null}
        {actionError ? (
          <p
            className="learn-with-clara-page__notice learn-with-clara-page__notice--error"
            role="alert"
          >
            {actionError}
          </p>
        ) : null}
      </section>
    </ClaraIntroStage>
  );
}
