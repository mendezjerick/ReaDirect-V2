import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
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
import { LearnWithClaraClassShell } from "./LearnWithClaraClassShell";
import { claraLettersCopy, isFilipino } from "./learnWithClaraCopy";
import {
  advanceLearnWithClaraLetters,
  startLearnWithClaraLetters,
  type LearnWithClaraLettersState,
} from "./learnWithClaraLettersFlow";
import { useLearnWithClaraBackNavigation } from "./useLearnWithClaraBackNavigation";

type ViewPhase = "welcome" | "lesson";
type LineState = "preparing" | "speaking" | "finished" | "error";

const classLetters = ["A", "B", "C", "D", "E"] as const;

function presentationFor(
  phase: ViewPhase,
  state: LearnWithClaraLettersState,
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
        <h2>{copy.welcomeTitle}</h2>
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
  useLearnWithClaraBackNavigation();
  const actionCommit = useButtonCommit();
  const session = loadLearnerSession();
  const copy = isFilipino(session?.learner.speech_language)
    ? claraLettersCopy.fil
    : claraLettersCopy.en;
  const [phase, setPhase] = useState<ViewPhase>("welcome");
  const [lettersState, setLettersState] = useState<LearnWithClaraLettersState>(
    startLearnWithClaraLetters,
  );
  const [lineState, setLineState] = useState<LineState>("finished");
  const [preparedSpeech, setPreparedSpeech] = useState<{
    key: ClaraSpeechKey;
    blob: Blob;
  } | null>(null);
  const [speechLevel, setSpeechLevel] = useState(0);
  const [claraReady, setClaraReady] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const [choicePending, setChoicePending] = useState(false);
  const [wrongChoice, setWrongChoice] = useState("");
  const [foundChoice, setFoundChoice] = useState("");
  const playbackRef = useRef<ClaraSpeechPlayback | null>(null);
  const choiceTimerRef = useRef<number | null>(null);

  const scene = phase === "lesson" ? lettersState.scene : null;
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
    }
  }, [navigate, session?.token]);

  useEffect(() => {
    if (!session?.token || !activeSpeechKey) {
      return;
    }

    let active = true;
    setLineState("preparing");
    setPreparedSpeech(null);
    setSpeechLevel(0);

    void prepareClaraSpeech(activeSpeechKey, session.token, { language: "en" })
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
    if (!session?.token) {
      return;
    }

    for (const speechKey of lettersState.prefetch_speech_keys) {
      void prepareClaraSpeech(speechKey, session.token, {
        language: "en",
      }).catch(() => undefined);
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

  useEffect(() => {
    setWrongChoice("");
    setFoundChoice("");
    setChoicePending(false);
  }, [lettersState.scene.key]);

  const beginLesson = () => {
    unlockClaraAudio();
    setLineState("preparing");
    setPhase("lesson");
  };

  const advance = () => {
    setLineState("preparing");
    setLettersState(advanceLearnWithClaraLetters);
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
      advance();
    }, 720);
  };

  const restart = () => {
    unlockClaraAudio();
    setLettersState(startLearnWithClaraLetters());
    setLineState("preparing");
    setPhase("lesson");
  };

  const replay = () => {
    unlockClaraAudio();
    setPlayNonce((current) => current + 1);
  };

  const statusCopy = () => {
    if (phase === "welcome") {
      return copy.ready;
    }

    if (lineState === "preparing") {
      return copy.preparing;
    }

    if (lineState === "speaking") {
      return scene?.kind === "teach" ? copy.speakingTeach : copy.speakingStory;
    }

    if (lineState === "error") {
      return copy.audioError;
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
    <LearnWithClaraClassShell
      titleId="letters-class-title"
      eyebrow={copy.heading}
      title={copy.title}
      backLabel={copy.back}
      onBack={() => navigate("/learner/learn-with-clara")}
      progress={
        <LessonProgress
          current={
            phase === "welcome"
              ? (lettersState.scene.item_progress?.current ?? 5)
              : currentProgress
          }
          complete={
            phase === "welcome"
              ? lettersState.status === "letters-complete"
              : Boolean(classComplete)
          }
        />
      }
      clara={
        <ClaraStage
          emotion={presentation.emotion}
          behavior={presentation.behavior}
          speaking={lineState === "speaking"}
          speechLevel={speechLevel}
          onLoadStateChange={(state) => setClaraReady(state === "ready")}
        />
      }
      coaching={
        <>
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
              {copy.retryAudio}
            </BigButton>
          ) : null}

          {phase === "welcome" ? (
            <BigButton
              className="letters-class__action"
              size="regular"
              committing={actionCommit.committing}
              onClick={() => actionCommit.commit(beginLesson)}
            >
              {copy.startStory}
            </BigButton>
          ) : null}

          {phase === "lesson" &&
          scene?.kind === "story" &&
          lineState === "finished" ? (
            <BigButton
              className="letters-class__action"
              size="regular"
              committing={actionCommit.committing}
              onClick={() => actionCommit.commit(advance)}
            >
              {copy.findFirst}
            </BigButton>
          ) : null}

          {phase === "lesson" &&
          scene?.kind === "teach" &&
          lineState === "finished" ? (
            <BigButton
              className="letters-class__action"
              size="regular"
              committing={actionCommit.committing}
              onClick={() => actionCommit.commit(advance)}
            >
              {scene.item_progress?.current === 5
                ? copy.startParade
                : copy.nextStop}
            </BigButton>
          ) : null}

          {phase === "lesson" && classComplete && lineState === "finished" ? (
            <div className="letters-class__completion-actions">
              <BigButton
                variant="secondary"
                size="regular"
                onClick={restart}
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

        </>
      }
      lesson={
        phase === "welcome" || !scene ? (
          <WelcomeVisual copy={copy} />
        ) : (
          <LearnWithClaraLetterParade
            scene={scene}
            copy={copy}
            interactive={lineState === "finished"}
            wrongChoice={wrongChoice}
            foundChoice={foundChoice}
            choosing={choicePending}
            onChoose={chooseLetter}
          />
        )
      }
    />
  );
}
