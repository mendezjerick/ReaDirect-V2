import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  playClaraSpeech,
  prepareClaraSpeech,
  type ClaraSpeechKey,
  type ClaraSpeechPlayback,
  unlockClaraAudio,
} from "../clara-audio/claraSpeech";
import { ClaraStage } from "../intro/ClaraStage";
import type {
  ClaraEmotion,
  ClaraTeachingBehavior,
} from "../intro/live2d/ClaraPresentation";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { LearnWithClaraLetterParade } from "./LearnWithClaraLetterParade";
import {
  advanceLearnWithClaraLetters,
  restartLearnWithClaraLetters,
  startLearnWithClaraLetters,
  type LearnWithClaraLettersState,
} from "./learnWithClaraLettersApi";
import "./learn-with-clara-letters.css";

type ViewPhase = "welcome" | "lesson";
type LineState = "preparing" | "speaking" | "finished" | "error";
type CheckpointState = "loading" | "ready" | "error";

const classLetters = ["A", "B", "C", "D", "E"] as const;

function BackIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M26 16H7M14 9l-7 7 7 7" />
    </svg>
  );
}

function presentationFor(
  phase: ViewPhase,
  state: LearnWithClaraLettersState | null,
): { emotion: ClaraEmotion; behavior: ClaraTeachingBehavior } {
  if (phase === "welcome") {
    return { emotion: "happy", behavior: "encouraging" };
  }

  if (state?.scene.kind === "completion") {
    return { emotion: "happy", behavior: "celebrating" };
  }

  if (state?.scene.kind === "story" || state?.scene.kind === "find") {
    return { emotion: "thinking", behavior: "encouraging" };
  }

  return { emotion: "default", behavior: "demonstrating" };
}

function LessonProgress({
  current,
  complete,
}: {
  current: number;
  complete: boolean;
}) {
  return (
    <ol className="letters-class__progress" aria-label="Letter story progress">
      {classLetters.map((letter, index) => {
        const position = index + 1;
        const isComplete = complete || position < current;
        const isCurrent = !complete && position === current;

        return (
          <li
            key={letter}
            data-complete={isComplete || undefined}
            data-current={isCurrent || undefined}
            aria-label={`${letter}: ${
              isComplete ? "found" : isCurrent ? "current stop" : "not found"
            }`}
          >
            {letter}
          </li>
        );
      })}
    </ol>
  );
}

function WelcomeVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="letters-class__welcome-visual">
      <div className="letters-class__welcome-badge" aria-hidden="true">
        <motion.span
          animate={
            reduceMotion ? undefined : { rotate: [-7, 6, -7], y: [0, -5, 0] }
          }
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          Aa
        </motion.span>
      </div>
      <div>
        <p>Today&apos;s story</p>
        <h2 id="letters-class-title">The Little-Letter Parade</h2>
      </div>
      <div className="letters-class__preview-letters" aria-label="A B C D E">
        {classLetters.map((letter, index) => (
          <motion.span
            key={letter}
            initial={reduceMotion ? false : { opacity: 0, y: 18, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{
              delay: reduceMotion ? 0 : index * 0.08,
              duration: reduceMotion ? 0 : 0.3,
              ease: "easeOut",
            }}
          >
            {letter}
          </motion.span>
        ))}
      </div>
      <p>
        A gust scattered the little letters. Help Ma&apos;am Clara bring every
        partner back before the parade begins.
      </p>
    </div>
  );
}

export function LearnWithClaraLettersPage() {
  const navigate = useNavigate();
  const actionCommit = useButtonCommit();
  const session = loadLearnerSession();
  const [phase, setPhase] = useState<ViewPhase>("welcome");
  const [checkpointState, setCheckpointState] =
    useState<CheckpointState>("loading");
  const [lettersState, setLettersState] =
    useState<LearnWithClaraLettersState | null>(null);
  const [lineState, setLineState] = useState<LineState>("finished");
  const [preparedSpeech, setPreparedSpeech] = useState<{
    key: ClaraSpeechKey;
    blob: Blob;
  } | null>(null);
  const [speechLevel, setSpeechLevel] = useState(0);
  const [claraReady, setClaraReady] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const [actionPending, setActionPending] = useState(false);
  const [choicePending, setChoicePending] = useState(false);
  const [wrongChoice, setWrongChoice] = useState("");
  const [foundChoice, setFoundChoice] = useState("");
  const [actionError, setActionError] = useState("");
  const playbackRef = useRef<ClaraSpeechPlayback | null>(null);
  const choiceTimerRef = useRef<number | null>(null);

  const scene = phase === "lesson" ? lettersState?.scene : null;
  const activeSpeechKey: ClaraSpeechKey | null =
    phase === "welcome" ? null : (scene?.speech_key ?? null);
  const presentation = presentationFor(phase, lettersState);
  const currentProgress = scene?.item_progress?.current ?? 5;
  const classComplete = scene?.kind === "completion";
  const activeLetter = scene?.display_text.charAt(0) ?? "";
  const lowercaseLetter = scene?.display_text.split(" ")[1] ?? "";

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
      return;
    }

    let active = true;
    setCheckpointState("loading");

    void startLearnWithClaraLetters(session.token)
      .then((state) => {
        if (active) {
          setLettersState(state);
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
    setWrongChoice("");
    setFoundChoice("");
    setChoicePending(false);

    void prepareClaraSpeech(activeSpeechKey, session.token)
      .then((speech) => {
        if (active) {
          setPreparedSpeech({ key: activeSpeechKey, blob: speech });
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
    if (!session?.token || !lettersState) {
      return;
    }

    for (const speechKey of lettersState.prefetch_speech_keys) {
      void prepareClaraSpeech(speechKey, session.token).catch(() => undefined);
    }
  }, [lettersState, session?.token]);

  useEffect(() => {
    if (
      !preparedSpeech ||
      preparedSpeech.key !== activeSpeechKey ||
      !claraReady
    ) {
      return;
    }

    let active = true;

    const speak = async () => {
      try {
        const playback = await playClaraSpeech(
          preparedSpeech.blob,
          (level) => {
            if (active) {
              setSpeechLevel(level);
            }
          },
          { modelState: "ready" },
        );
        playbackRef.current = playback;

        if (!active) {
          playback.stop();
          return;
        }

        setLineState("speaking");
        await playback.finished;

        if (active) {
          setLineState("finished");
          setSpeechLevel(0);
          playbackRef.current = null;
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
      playbackRef.current?.stop();
      playbackRef.current = null;
    };
  }, [activeSpeechKey, claraReady, preparedSpeech]);

  useEffect(
    () => () => {
      if (choiceTimerRef.current !== null) {
        window.clearTimeout(choiceTimerRef.current);
      }
    },
    [],
  );

  const retryCheckpoint = () => {
    if (!session?.token) {
      return;
    }

    setCheckpointState("loading");
    void startLearnWithClaraLetters(session.token)
      .then((state) => {
        setLettersState(state);
        setCheckpointState("ready");
      })
      .catch(() => setCheckpointState("error"));
  };

  const beginLesson = () => {
    if (checkpointState === "ready") {
      unlockClaraAudio();
      setLineState("preparing");
      setPhase("lesson");
    }
  };

  const advance = async () => {
    if (!session?.token || !lettersState || actionPending) {
      return;
    }

    setActionPending(true);
    setActionError("");
    try {
      const nextState = await advanceLearnWithClaraLetters(
        session.token,
        lettersState.scene.key,
      );
      setLineState("preparing");
      setLettersState(nextState);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Ma'am Clara could not save that story moment.",
      );
    } finally {
      setActionPending(false);
    }
  };

  const chooseLetter = (choice: string) => {
    if (scene?.kind !== "find" || lineState !== "finished" || choicePending) {
      return;
    }

    if (choice !== lowercaseLetter) {
      setWrongChoice(choice);
      if (choiceTimerRef.current !== null) {
        window.clearTimeout(choiceTimerRef.current);
      }
      choiceTimerRef.current = window.setTimeout(() => {
        setWrongChoice("");
      }, 1800);
      return;
    }

    setFoundChoice(choice);
    setChoicePending(true);
    choiceTimerRef.current = window.setTimeout(() => {
      void advance();
    }, 720);
  };

  const restart = async () => {
    if (!session?.token || actionPending) {
      return;
    }

    unlockClaraAudio();
    setActionPending(true);
    setActionError("");
    try {
      const nextState = await restartLearnWithClaraLetters(session.token);
      setLettersState(nextState);
      setLineState("preparing");
      setPhase("lesson");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Ma'am Clara could not restart the parade.",
      );
    } finally {
      setActionPending(false);
    }
  };

  const replay = () => {
    unlockClaraAudio();
    setPlayNonce((current) => current + 1);
  };

  const statusCopy = () => {
    if (phase === "welcome") {
      return "Your letter story is ready.";
    }

    if (lineState === "preparing") {
      return "Ma'am Clara is getting the next story moment ready.";
    }

    if (lineState === "speaking") {
      return scene?.kind === "teach"
        ? "Watch the pair and listen to its letter name."
        : "Listen to Ma'am Clara's story.";
    }

    if (lineState === "error") {
      return "That story sound needs another try.";
    }

    if (scene?.kind === "story") {
      return "The little letters need your help.";
    }

    if (scene?.kind === "find") {
      if (foundChoice) {
        return `You found little ${lowercaseLetter}.`;
      }
      if (wrongChoice) {
        return "That letter has another partner. Look again.";
      }
      return `Tap the little ${lowercaseLetter} that belongs with big ${activeLetter}.`;
    }

    if (scene?.kind === "teach") {
      return `Your turn. Say ${activeLetter} out loud.`;
    }

    return "Every letter found its partner. The parade is ready.";
  };

  return (
    <main
      className="letters-class learner-flow-page learner-typography-page"
      aria-labelledby="letters-class-title"
      data-route-focus
      tabIndex={-1}
    >
      <div className="letters-class__shell">
        <Surface
          className="letters-class__header"
          kind="panel"
          padding="compact"
        >
          <button
            className="letters-class__back"
            type="button"
            aria-label="Back to Clara classes"
            onClick={() => navigate("/learner/learn-with-clara")}
          >
            <BackIcon />
          </button>
          <div className="letters-class__header-copy">
            <p>Learn with Ma&apos;am Clara</p>
            <h1>Letter story</h1>
          </div>
          <LessonProgress
            current={
              phase === "welcome"
                ? (lettersState?.scene.item_progress?.current ?? 5)
                : currentProgress
            }
            complete={
              phase === "welcome"
                ? lettersState?.status === "letters-complete"
                : Boolean(classComplete)
            }
          />
        </Surface>

        <div className="letters-class__workspace">
          <Surface
            className="letters-class__teacher"
            kind="frame"
            padding="none"
          >
            <div className="letters-class__clara-wrap">
              <ClaraStage
                emotion={presentation.emotion}
                behavior={presentation.behavior}
                speaking={lineState === "speaking"}
                speechLevel={speechLevel}
                onLoadStateChange={(state) => setClaraReady(state === "ready")}
              />
            </div>
            <div className="letters-class__coaching">
              <p className="letters-class__status" aria-live="polite">
                {statusCopy()}
              </p>

              {phase === "lesson" && lineState === "error" ? (
                <BigButton
                  className="letters-class__action"
                  variant="secondary"
                  size="regular"
                  onClick={replay}
                >
                  Try the sound again
                </BigButton>
              ) : null}

              {phase === "welcome" ? (
                checkpointState === "error" ? (
                  <BigButton
                    className="letters-class__action"
                    variant="secondary"
                    size="regular"
                    onClick={retryCheckpoint}
                  >
                    Try loading the story
                  </BigButton>
                ) : (
                  <BigButton
                    className="letters-class__action"
                    size="regular"
                    variant={
                      checkpointState === "ready" ? "primary" : "unavailable"
                    }
                    disabled={checkpointState !== "ready"}
                    committing={actionCommit.committing}
                    onClick={() => actionCommit.commit(beginLesson)}
                  >
                    {lettersState?.status === "letters-complete"
                      ? "See the Parade"
                      : lettersState?.scene.key === "parade-opening"
                        ? "Start Story"
                        : "Continue Story"}
                  </BigButton>
                )
              ) : null}

              {phase === "lesson" &&
              scene?.kind === "story" &&
              lineState === "finished" ? (
                <BigButton
                  className="letters-class__action"
                  size="regular"
                  busy={actionPending}
                  busyLabel="Opening the first stop"
                  committing={actionCommit.committing}
                  onClick={() => actionCommit.commit(() => void advance())}
                >
                  Find the First Letter
                </BigButton>
              ) : null}

              {phase === "lesson" &&
              scene?.kind === "teach" &&
              lineState === "finished" ? (
                <BigButton
                  className="letters-class__action"
                  size="regular"
                  busy={actionPending}
                  busyLabel="Moving the parade"
                  committing={actionCommit.committing}
                  onClick={() => actionCommit.commit(() => void advance())}
                >
                  {scene.item_progress?.current === 5
                    ? "Start the Parade"
                    : "Next Stop"}
                </BigButton>
              ) : null}

              {phase === "lesson" &&
              classComplete &&
              lineState === "finished" ? (
                <div className="letters-class__completion-actions">
                  <BigButton
                    variant="secondary"
                    size="regular"
                    busy={actionPending}
                    onClick={() => void restart()}
                  >
                    Play Again
                  </BigButton>
                  <BigButton
                    size="regular"
                    onClick={() => navigate("/learner/learn-with-clara")}
                  >
                    Back to Classes
                  </BigButton>
                </div>
              ) : null}

              {actionError ? (
                <p className="letters-class__error" role="alert">
                  {actionError}
                </p>
              ) : null}
            </div>
          </Surface>

          <Surface
            className="letters-class__lesson"
            kind="panel"
            padding="compact"
          >
            {phase === "welcome" || !scene ? (
              <WelcomeVisual />
            ) : (
              <LearnWithClaraLetterParade
                scene={scene}
                lineState={lineState}
                wrongChoice={wrongChoice}
                foundChoice={foundChoice}
                choosing={choicePending}
                onChoose={chooseLetter}
              />
            )}
          </Surface>
        </div>
      </div>
    </main>
  );
}
