import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { ClaraStage } from "../intro/ClaraStage";
import type {
  ClaraEmotion,
  ClaraTeachingBehavior,
} from "../intro/live2d/ClaraPresentation";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { LearnWithClaraLetterParade } from "./LearnWithClaraLetterParade";
import { claraLettersCopy, isFilipino } from "./learnWithClaraCopy";
import {
  advanceLearnWithClaraLetters,
  restartLearnWithClaraLetters,
  startLearnWithClaraLetters,
  type LearnWithClaraLettersState,
} from "./learnWithClaraLettersApi";
import "./learn-with-clara-letters.css";

type ViewPhase = "welcome" | "lesson";
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

function WelcomeVisual({
  copy,
}: {
  copy: typeof claraLettersCopy.en | typeof claraLettersCopy.fil;
}) {
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
        <p>{copy.welcomeLabel}</p>
        <h2 id="letters-class-title">{copy.welcomeTitle}</h2>
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
      <p>{copy.welcomeDescription}</p>
    </div>
  );
}

export function LearnWithClaraLettersPage() {
  const navigate = useNavigate();
  const actionCommit = useButtonCommit();
  const session = loadLearnerSession();
  const copy = isFilipino(session?.learner.speech_language)
    ? claraLettersCopy.fil
    : claraLettersCopy.en;
  const [phase, setPhase] = useState<ViewPhase>("welcome");
  const [checkpointState, setCheckpointState] =
    useState<CheckpointState>("loading");
  const [lettersState, setLettersState] =
    useState<LearnWithClaraLettersState | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [choicePending, setChoicePending] = useState(false);
  const [wrongChoice, setWrongChoice] = useState("");
  const [foundChoice, setFoundChoice] = useState("");
  const [actionError, setActionError] = useState("");
  const choiceTimerRef = useRef<number | null>(null);

  const scene = phase === "lesson" ? lettersState?.scene : null;
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

  useEffect(
    () => () => {
      if (choiceTimerRef.current !== null) {
        window.clearTimeout(choiceTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setWrongChoice("");
    setFoundChoice("");
    setChoicePending(false);
  }, [lettersState?.scene.key]);

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
      setLettersState(nextState);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : isFilipino(session?.learner.speech_language)
            ? "Hindi mai-save ni Ma'am Clara ang sandaling iyon ng kuwento."
            : "Ma'am Clara could not save that story moment.",
      );
    } finally {
      setActionPending(false);
    }
  };

  const chooseLetter = (choice: string) => {
    if (scene?.kind !== "find" || choicePending) {
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

    setActionPending(true);
    setActionError("");
    try {
      const nextState = await restartLearnWithClaraLetters(session.token);
      setLettersState(nextState);
      setPhase("lesson");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : isFilipino(session?.learner.speech_language)
            ? "Hindi ma-restart ni Ma'am Clara ang parada."
            : "Ma'am Clara could not restart the parade.",
      );
    } finally {
      setActionPending(false);
    }
  };

  const statusCopy = () => {
    if (phase === "welcome") {
      return copy.ready;
    }

    if (scene?.kind === "story") {
      return copy.storyHelp;
    }

    if (scene?.kind === "find") {
      if (foundChoice) {
        return copy.found(lowercaseLetter);
      }
      if (wrongChoice) {
        return copy.wrong;
      }
      return copy.find(lowercaseLetter, activeLetter);
    }

    if (scene?.kind === "teach") {
      return copy.teach(activeLetter);
    }

    return copy.complete;
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
            aria-label={copy.back}
            onClick={() => navigate("/learner/learn-with-clara")}
          >
            <BackIcon />
          </button>
          <div className="letters-class__header-copy">
            <p>{copy.heading}</p>
            <h1>{copy.title}</h1>
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
              />
            </div>
            <div className="letters-class__coaching">
              <p className="letters-class__status" aria-live="polite">
                {statusCopy()}
              </p>

              {phase === "welcome" ? (
                checkpointState === "error" ? (
                  <BigButton
                    className="letters-class__action"
                    variant="secondary"
                    size="regular"
                    onClick={retryCheckpoint}
                  >
                    {copy.tryLoading}
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
                      ? copy.seeParade
                      : lettersState?.scene.key === "parade-opening"
                        ? copy.startStory
                        : copy.continueStory}
                  </BigButton>
                )
              ) : null}

              {phase === "lesson" &&
              scene?.kind === "story" ? (
                <BigButton
                  className="letters-class__action"
                  size="regular"
                  busy={actionPending}
                  busyLabel={
                    isFilipino(session?.learner.speech_language)
                      ? "Binubuksan ang unang hintuan"
                      : "Opening the first stop"
                  }
                  committing={actionCommit.committing}
                  onClick={() => actionCommit.commit(() => void advance())}
                >
                  {copy.findFirst}
                </BigButton>
              ) : null}

              {phase === "lesson" &&
              scene?.kind === "teach" ? (
                <BigButton
                  className="letters-class__action"
                  size="regular"
                  busy={actionPending}
                  busyLabel={
                    isFilipino(session?.learner.speech_language)
                      ? "Inuusad ang parada"
                      : "Moving the parade"
                  }
                  committing={actionCommit.committing}
                  onClick={() => actionCommit.commit(() => void advance())}
                >
                  {scene.item_progress?.current === 5
                    ? copy.startParade
                    : copy.nextStop}
                </BigButton>
              ) : null}

              {phase === "lesson" &&
              classComplete ? (
                <div className="letters-class__completion-actions">
                  <BigButton
                    variant="secondary"
                    size="regular"
                    busy={actionPending}
                    onClick={() => void restart()}
                  >
                    {copy.playAgain}
                  </BigButton>
                  <BigButton
                    size="regular"
                    onClick={() => navigate("/learner/learn-with-clara")}
                  >
                    {copy.backToClasses}
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
              <WelcomeVisual copy={copy} />
            ) : (
              <LearnWithClaraLetterParade
                scene={scene}
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
