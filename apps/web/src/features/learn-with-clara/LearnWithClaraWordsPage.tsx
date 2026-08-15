import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { ClaraStage } from "../intro/ClaraStage";
import {
  playClaraSpeech,
  prepareClaraSpeech,
  type ClaraSpeechKey,
  type ClaraSpeechPlayback,
  unlockClaraAudio,
} from "../clara-audio/claraSpeech";
import type {
  ClaraEmotion,
  ClaraTeachingBehavior,
} from "../intro/live2d/ClaraPresentation";
import {
  WordRescueIcon,
  type WordRescueWord,
} from "./wordRescueIcons";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import "./learn-with-clara-letters.css";
import "./learn-with-clara-words.css";

const storyMoments = [
  {
    word: "bat",
    title: "A Friend in the Sky",
    story:
      "At dusk, a little friend flaps above the word trail. Clara needs your help to rescue its first word.",
    choices: ["bat", "can", "hot"],
  },
  {
    word: "can",
    title: "The Rolling Clue",
    story:
      "A shiny clue rolls beside the path. It bumps, spins, and waits for the right little word.",
    choices: ["dot", "can", "gap"],
  },
  {
    word: "dot",
    title: "The Tiny Trail Mark",
    story:
      "A bright mark points the way through the grass. Clara says the next word is small but important.",
    choices: ["hot", "bat", "dot"],
  },
  {
    word: "gap",
    title: "Across the Bridge",
    story:
      "The bridge has a space in the middle. The rescued words make a path so everyone can cross safely.",
    choices: ["gap", "can", "bat"],
  },
  {
    word: "hot",
    title: "The Warm Welcome",
    story:
      "At the end of the trail, a warm welcome waits. One last word will bring the Word Rescue story home.",
    choices: ["dot", "hot", "gap"],
  },
] as const;

type StoryWord = WordRescueWord;
type ViewPhase = "welcome" | "story" | "completion";
type LineState = "preparing" | "speaking" | "finished" | "error";

const storySpeechKeys = {
  opening: "learn-with-clara-words-rescue-opening",
  bat: "learn-with-clara-words-find-bat",
  can: "learn-with-clara-words-find-can",
  dot: "learn-with-clara-words-find-dot",
  gap: "learn-with-clara-words-find-gap",
  hot: "learn-with-clara-words-find-hot",
  finale: "learn-with-clara-words-rescue-finale",
} as const satisfies Record<string, ClaraSpeechKey>;

function BackIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M26 16H7M14 9l-7 7 7 7" />
    </svg>
  );
}

function TrailProgress({
  current,
  complete,
}: {
  current: number;
  complete: boolean;
}) {
  const label = complete
    ? "Word trail complete"
    : `Rescue stop ${current} of 5`;

  return (
    <span className="words-class__trail-progress" aria-label={label}>
      {label}
    </span>
  );
}

function WelcomeVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="letters-class__welcome-visual words-class__welcome-visual">
      <div className="letters-class__welcome-badge" aria-hidden="true">
        <motion.span
          animate={
            reduceMotion ? undefined : { rotate: [-6, 5, -6], y: [0, -5, 0] }
          }
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          ABC
        </motion.span>
      </div>
      <div>
        <p>Today&apos;s story</p>
        <h2 id="words-story-title">The Word Rescue</h2>
      </div>
      <div className="words-class__trail-preview" aria-hidden="true">
        <span className="words-class__trail-preview-route" />
        {storyMoments.map((moment, index) => (
          <motion.div
            key={moment.word}
            className="words-class__trail-preview-stop"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduceMotion ? 0 : index * 0.08,
              duration: reduceMotion ? 0 : 0.3,
              ease: "easeOut",
            }}
          >
            <StoryPreviewAsset word={moment.word} />
          </motion.div>
        ))}
      </div>
      <p>
        Five little words are scattered along the trail. Help Ma&apos;am Clara
        rescue each one before the story reaches its happy ending.
      </p>
    </div>
  );
}

function StoryPreviewAsset({ word }: { word: StoryWord }) {
  return (
    <>
      <WordRescueIcon word={word} />
      <span>{word}</span>
    </>
  );
}

function WordRescueBoard({
  moment,
  currentIndex,
}: {
  moment: (typeof storyMoments)[number];
  currentIndex: number;
}) {
  return (
    <div className="word-rescue-board">
      <div className="word-rescue-board__trail">
        <span className="word-rescue-board__route" aria-hidden="true" />
        <ol aria-label="Word rescue trail">
          {storyMoments.map((stop, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <li
                key={stop.word}
                data-complete={isComplete || undefined}
                data-current={isCurrent || undefined}
                aria-label={`${stop.word}: ${
                  isComplete
                    ? "rescued"
                    : isCurrent
                      ? "current rescue stop"
                      : "ahead on the trail"
                }`}
              >
                <span className="word-rescue-board__marker">{index + 1}</span>
                <WordRescueIcon word={stop.word} />
                <span>{stop.word}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="word-rescue-board__clue">
        <div className="word-rescue-board__clue-art">
          <WordRescueIcon word={moment.word} />
        </div>
        <div>
          <p>Clara&apos;s rescue clue</p>
          <p>{moment.story}</p>
        </div>
      </div>
    </div>
  );
}

function StoryVisual({
  moment,
  currentIndex,
  foundWord,
  wrongWord,
  lineState,
  onChoose,
}: {
  moment: (typeof storyMoments)[number];
  currentIndex: number;
  foundWord: string;
  wrongWord: string;
  lineState: LineState;
  onChoose: (word: string) => void;
}) {
  return (
    <div className="word-story" aria-labelledby="word-story-scene-title">
      <div className="word-story__heading">
        <div>
          <p>Rescue map</p>
          <h2 id="word-story-scene-title">{moment.title}</h2>
        </div>
        <span>Stop {currentIndex + 1}</span>
      </div>

      <WordRescueBoard moment={moment} currentIndex={currentIndex} />

      <div
        className="word-story__choices"
        role="group"
        aria-label="Story word choices"
      >
        {moment.choices.map((choice) => (
          <button
            key={choice}
            className="word-story__choice"
            type="button"
            aria-label={`Choose ${choice}`}
            data-found={foundWord === choice ? "" : undefined}
            data-wrong={wrongWord === choice ? "" : undefined}
            disabled={Boolean(foundWord) || lineState !== "finished"}
            onClick={() => onChoose(choice)}
          >
            {choice}
          </button>
        ))}
      </div>
      <p className="word-story__feedback" aria-live="polite">
        {foundWord
          ? `You rescued ${foundWord}.`
          : wrongWord
            ? "That word belongs somewhere else. Look at the story clue again."
            : "Choose the word that belongs in this story moment."}
      </p>
    </div>
  );
}

function CompletionVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="letters-class__welcome-visual words-class__welcome-visual">
      <div className="letters-class__welcome-badge" aria-hidden="true">
        <motion.span
          animate={
            reduceMotion ? undefined : { rotate: [-5, 5, -5], y: [0, -5, 0] }
          }
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          Yay!
        </motion.span>
      </div>
      <div>
        <p>The story is safe</p>
        <h2>Word Rescue complete!</h2>
      </div>
      <div className="words-class__trail-preview words-class__trail-preview--complete">
        <span className="words-class__trail-preview-route" />
        {storyMoments.map((moment) => (
          <div
            key={moment.word}
            className="words-class__trail-preview-stop"
            data-complete
          >
            <StoryPreviewAsset word={moment.word} />
          </div>
        ))}
      </div>
      <p>Every little word found its place along the trail.</p>
    </div>
  );
}

function presentationFor(phase: ViewPhase, foundWord: string) {
  if (phase === "completion") {
    return {
      emotion: "happy" as ClaraEmotion,
      behavior: "celebrating" as ClaraTeachingBehavior,
    };
  }

  if (phase === "story" && foundWord) {
    return {
      emotion: "happy" as ClaraEmotion,
      behavior: "encouraging" as ClaraTeachingBehavior,
    };
  }

  if (phase === "story") {
    return {
      emotion: "thinking" as ClaraEmotion,
      behavior: "encouraging" as ClaraTeachingBehavior,
    };
  }

  return {
    emotion: "happy" as ClaraEmotion,
    behavior: "encouraging" as ClaraTeachingBehavior,
  };
}

export function LearnWithClaraWordsPage() {
  const navigate = useNavigate();
  const actionCommit = useButtonCommit();
  const session = loadLearnerSession();
  const [phase, setPhase] = useState<ViewPhase>("welcome");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [foundWord, setFoundWord] = useState<StoryWord | "">("");
  const [wrongWord, setWrongWord] = useState("");
  const [openingPlayed, setOpeningPlayed] = useState(false);
  const [lineState, setLineState] = useState<LineState>("finished");
  const [preparedSpeech, setPreparedSpeech] = useState<{
    key: ClaraSpeechKey;
    blob: Blob;
  } | null>(null);
  const [speechLevel, setSpeechLevel] = useState(0);
  const [claraReady, setClaraReady] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const playbackRef = useRef<ClaraSpeechPlayback | null>(null);

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
    }
  }, [navigate, session?.token]);

  const currentMoment = storyMoments[currentIndex];
  const presentation = presentationFor(phase, foundWord);
  const activeSpeechKey: ClaraSpeechKey | null =
    phase === "welcome"
      ? null
      : phase === "completion"
        ? storySpeechKeys.finale
        : openingPlayed
          ? storySpeechKeys[currentMoment.word]
          : storySpeechKeys.opening;

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
          if (activeSpeechKey === storySpeechKeys.opening) {
            setOpeningPlayed(true);
          }
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

  if (!session?.token) {
    return null;
  }

  const startStory = () => {
    unlockClaraAudio();
    setPhase("story");
    setCurrentIndex(0);
    setFoundWord("");
    setWrongWord("");
    setOpeningPlayed(false);
    setLineState("preparing");
  };

  const chooseWord = (word: string) => {
    if (phase !== "story" || foundWord || lineState !== "finished") {
      return;
    }

    if (word === currentMoment.word) {
      setFoundWord(currentMoment.word);
      setWrongWord("");
      return;
    }

    setWrongWord(word);
  };

  const nextStoryMoment = () => {
    if (!foundWord) {
      return;
    }

    if (currentIndex === storyMoments.length - 1) {
      setPhase("completion");
      setLineState("preparing");
      return;
    }

    setCurrentIndex((index) => index + 1);
    setFoundWord("");
    setWrongWord("");
    setLineState("preparing");
  };

  const replay = () => {
    unlockClaraAudio();
    setPlayNonce((current) => current + 1);
  };

  const statusCopy = () => {
    if (phase === "welcome") {
      return "Your word story is ready.";
    }

    if (phase === "completion") {
      return "Every word found its place in the story.";
    }

    if (lineState === "preparing") {
      return "Ma'am Clara is getting the next story moment ready.";
    }

    if (lineState === "speaking") {
      return "Listen to Ma'am Clara's story clue.";
    }

    if (lineState === "error") {
      return "That story sound needs another try.";
    }

    if (foundWord) {
      return `You rescued ${foundWord}. The story can continue.`;
    }

    if (wrongWord) {
      return "Listen to the story clue and try another word.";
    }

    return "Listen to the story, then find the word that belongs.";
  };

  return (
    <main
      className="letters-class words-class learner-flow-page learner-typography-page"
      aria-labelledby="words-story-title"
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
            <h1 id="words-story-title">Word story</h1>
          </div>
          <TrailProgress
            current={phase === "welcome" ? 1 : currentIndex + 1}
            complete={phase === "completion"}
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

              {phase !== "welcome" && lineState === "error" ? (
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
                <BigButton
                  className="letters-class__action"
                  size="regular"
                  committing={actionCommit.committing}
                  onClick={() => actionCommit.commit(startStory)}
                >
                  Start Story
                </BigButton>
              ) : null}

              {phase === "story" && foundWord ? (
                <BigButton
                  className="letters-class__action"
                  size="regular"
                  committing={actionCommit.committing}
                  onClick={() => actionCommit.commit(nextStoryMoment)}
                >
                  {currentIndex === storyMoments.length - 1
                    ? "Finish Story"
                    : "Next Story Moment"}
                </BigButton>
              ) : null}

              {phase === "completion" ? (
                <div className="letters-class__completion-actions">
                  <BigButton
                    variant="secondary"
                    size="regular"
                    onClick={() => actionCommit.commit(startStory)}
                  >
                    Tell It Again
                  </BigButton>
                  <BigButton
                    size="regular"
                    onClick={() => navigate("/learner/learn-with-clara")}
                  >
                    Back to Classes
                  </BigButton>
                </div>
              ) : null}
            </div>
          </Surface>

          <Surface
            className="letters-class__lesson"
            kind="panel"
            padding="compact"
          >
            {phase === "welcome" ? <WelcomeVisual /> : null}
            {phase === "story" ? (
              <StoryVisual
                moment={currentMoment}
                currentIndex={currentIndex}
                foundWord={foundWord}
                wrongWord={wrongWord}
                lineState={lineState}
                onChoose={chooseWord}
              />
            ) : null}
            {phase === "completion" ? <CompletionVisual /> : null}
          </Surface>
        </div>
      </div>
    </main>
  );
}
