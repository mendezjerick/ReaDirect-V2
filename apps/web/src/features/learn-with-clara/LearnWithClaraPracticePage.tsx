import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import {
  playClaraSpeech,
  prepareClaraSpeech,
  type ClaraSpeechKey,
  type ClaraSpeechPlayback,
  unlockClaraAudio,
} from "../clara-audio/claraSpeech";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { ClaraStage } from "../intro/ClaraStage";
import { LearnWithClaraClassShell } from "./LearnWithClaraClassShell";
import { claraPracticeCopy, isFilipino } from "./learnWithClaraCopy";
import "./learn-with-clara-practice.css";

type PracticeKey = "phrases" | "sentences" | "comprehension";
type ViewPhase = "welcome" | "lesson";
type CheckState = "idle" | "incomplete" | "correct" | "incorrect";
type SpeechState = "idle" | "preparing" | "speaking" | "error";
type ClaraPracticeCopy =
  typeof claraPracticeCopy.en | typeof claraPracticeCopy.fil;

interface OrderToken {
  id: string;
  label: string;
}

interface OrderItem {
  prompt: string;
  answer: string;
  speechKey: ClaraSpeechKey;
  tokens: OrderToken[];
  shuffled: string[];
}

interface ComprehensionItem {
  title: string;
  story: string;
  question: string;
  choices: string[];
  answer: string;
  clue: string;
  speechKey: ClaraSpeechKey;
}

const phraseItems: OrderItem[] = [
  {
    prompt: "Put the words in order.",
    answer: "the red ball",
    speechKey: "learn-with-clara-phrases-item-1",
    tokens: [
      { id: "the", label: "the" },
      { id: "red", label: "red" },
      { id: "ball", label: "ball" },
    ],
    shuffled: ["ball", "the", "red"],
  },
  {
    prompt: "Make a phrase about a pet.",
    answer: "a small cat",
    speechKey: "learn-with-clara-phrases-item-2",
    tokens: [
      { id: "a", label: "a" },
      { id: "small", label: "small" },
      { id: "cat", label: "cat" },
    ],
    shuffled: ["small", "cat", "a"],
  },
  {
    prompt: "Build the phrase.",
    answer: "blue sky",
    speechKey: "learn-with-clara-phrases-item-3",
    tokens: [
      { id: "blue", label: "blue" },
      { id: "sky", label: "sky" },
    ],
    shuffled: ["sky", "blue"],
  },
  {
    prompt: "Put these words together.",
    answer: "my red hat",
    speechKey: "learn-with-clara-phrases-item-4",
    tokens: [
      { id: "my", label: "my" },
      { id: "red", label: "red" },
      { id: "hat", label: "hat" },
    ],
    shuffled: ["hat", "my", "red"],
  },
  {
    prompt: "Make the phrase.",
    answer: "big green tree",
    speechKey: "learn-with-clara-phrases-item-5",
    tokens: [
      { id: "big", label: "big" },
      { id: "green", label: "green" },
      { id: "tree", label: "tree" },
    ],
    shuffled: ["green", "tree", "big"],
  },
];

const sentenceItems: OrderItem[] = [
  {
    prompt: "Make a complete sentence.",
    answer: "The dog plays with the ball.",
    speechKey: "learn-with-clara-sentences-item-1",
    tokens: [
      { id: "subject", label: "The dog" },
      { id: "verb", label: "plays" },
      { id: "object", label: "with the ball." },
    ],
    shuffled: ["verb", "object", "subject"],
  },
  {
    prompt: "Put the sentence parts in order.",
    answer: "Mia reads a book.",
    speechKey: "learn-with-clara-sentences-item-2",
    tokens: [
      { id: "subject", label: "Mia" },
      { id: "verb", label: "reads" },
      { id: "object", label: "a book." },
    ],
    shuffled: ["object", "subject", "verb"],
  },
  {
    prompt: "Build the full thought.",
    answer: "The sun is warm.",
    speechKey: "learn-with-clara-sentences-item-3",
    tokens: [
      { id: "subject", label: "The sun" },
      { id: "verb", label: "is" },
      { id: "object", label: "warm." },
    ],
    shuffled: ["object", "verb", "subject"],
  },
  {
    prompt: "Make a sentence about the bird.",
    answer: "The bird can fly.",
    speechKey: "learn-with-clara-sentences-item-4",
    tokens: [
      { id: "subject", label: "The bird" },
      { id: "verb", label: "can fly." },
    ],
    shuffled: ["verb", "subject"],
  },
  {
    prompt: "Put the sentence together.",
    answer: "We walk to school.",
    speechKey: "learn-with-clara-sentences-item-5",
    tokens: [
      { id: "subject", label: "We" },
      { id: "verb", label: "walk" },
      { id: "object", label: "to school." },
    ],
    shuffled: ["object", "verb", "subject"],
  },
];

const comprehensionItems: ComprehensionItem[] = [
  {
    title: "The Little Seed",
    story:
      "Lina plants a seed in soft soil. She gives it water each day. Soon, a green leaf pops up.",
    question: "What helps the seed grow?",
    choices: ["Water", "A toy", "A shoe"],
    answer: "Water",
    clue: "The story says Lina gives the seed water each day.",
    speechKey: "learn-with-clara-comprehension-item-1",
  },
  {
    title: "A Rainy Walk",
    story:
      "Noah sees dark clouds. He takes his yellow umbrella before he walks home. The rain starts on the way.",
    question: "What does Noah take?",
    choices: ["A red hat", "A yellow umbrella", "A blue kite"],
    answer: "A yellow umbrella",
    clue: "Noah takes his yellow umbrella before he walks home.",
    speechKey: "learn-with-clara-comprehension-item-2",
  },
  {
    title: "The Kind Friend",
    story:
      "Ana drops her crayons. Ben helps her pick them up. Ana smiles and says thank you.",
    question: "Why does Ana smile?",
    choices: ["Ben helps her", "She finds a ball", "It is bedtime"],
    answer: "Ben helps her",
    clue: "Ben helps Ana pick up her crayons.",
    speechKey: "learn-with-clara-comprehension-item-3",
  },
];

const practiceMeta: Record<
  PracticeKey,
  { label: string; description: string; count: number }
> = {
  phrases: {
    label: "Phrases",
    description: "Build short groups of words.",
    count: phraseItems.length,
  },
  sentences: {
    label: "Sentences",
    description: "Make a complete thought.",
    count: sentenceItems.length,
  },
  comprehension: {
    label: "Comprehension",
    description: "Read a mini story and find its meaning.",
    count: comprehensionItems.length,
  },
};

function isPracticeKey(value: string | undefined): value is PracticeKey {
  return (
    value === "phrases" || value === "sentences" || value === "comprehension"
  );
}

function Icon({
  name,
}: {
  name: "arrow" | "book" | "check" | "hint" | "retry" | "speaker";
}) {
  if (name === "arrow") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12h15M13 5l7 7-7 7" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }
  if (name === "retry") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 11a8 8 0 1 0 1 4" />
        <path d="M20 5v6h-6" />
      </svg>
    );
  }
  if (name === "speaker") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10v4h4l5 4V6l-5 4H4Z" />
        <path d="M17 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
      </svg>
    );
  }
  if (name === "hint") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 18h6M10 21h4M8.5 14.5A6 6 0 1 1 16 14c-.8.8-1.2 1.5-1.2 2H9.7c0-.6-.4-1.1-1.2-1.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h14v16H5z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function ProgressDots({
  complete = false,
  current,
  total,
}: {
  complete?: boolean;
  current: number;
  total: number;
}) {
  return (
    <ol
      className="letters-class__progress clara-practice__progress"
      aria-label={
        complete
          ? `All ${total} practice items complete`
          : `Practice item ${current + 1} of ${total}`
      }
    >
      {Array.from({ length: total }, (_, index) => (
        <li
          key={index}
          data-current={!complete && index === current ? true : undefined}
          data-complete={complete || index < current ? true : undefined}
        >
          <span>{index + 1}</span>
        </li>
      ))}
    </ol>
  );
}

function SpeakButton({
  onSpeak,
  state,
  copy,
}: {
  onSpeak: () => void;
  state: SpeechState;
  copy: ClaraPracticeCopy;
}) {
  return (
    <button
      className="clara-practice__listen"
      type="button"
      disabled={state === "preparing" || state === "speaking"}
      onClick={onSpeak}
    >
      <Icon name="speaker" />
      <span>
        {state === "preparing"
          ? copy.loading
          : state === "speaking"
            ? copy.playing
            : state === "error"
              ? copy.tryAudioAgain
              : copy.replay}
      </span>
    </button>
  );
}

function OrderPractice({
  item,
  kind,
  selected,
  checkState,
  onSelect,
  onSpeak,
  speechState,
  interactive,
  copy,
}: {
  item: OrderItem;
  kind: "phrases" | "sentences";
  selected: string[];
  checkState: CheckState;
  onSelect: (id: string) => void;
  onSpeak: () => void;
  speechState: SpeechState;
  interactive: boolean;
  copy: ClaraPracticeCopy;
}) {
  const selectedLabels = selected.map(
    (id) => item.tokens.find((token) => token.id === id)?.label ?? id,
  );
  const choose = (id: string) => {
    if (!interactive || checkState === "correct") return;
    onSelect(id);
  };

  return (
    <div className="clara-practice__order">
      <div className="clara-practice__prompt-row">
        <p>{item.prompt}</p>
        <SpeakButton onSpeak={onSpeak} state={speechState} copy={copy} />
      </div>
      <div className="clara-practice__answer" aria-label="Your answer">
        {selectedLabels.length ? (
          selectedLabels.map((label, index) => (
            <button
              key={selected[index]}
              type="button"
              className="clara-practice__answer-chip"
              disabled={!interactive}
              onClick={() => choose(selected[index])}
              aria-label={`Remove ${label}`}
            >
              {label}
            </button>
          ))
        ) : (
          <span className="clara-practice__answer-placeholder">
            Tap words below to build your{" "}
            {kind === "phrases" ? "phrase" : "sentence"}.
          </span>
        )}
      </div>
      <div className="clara-practice__token-grid" aria-label="Word choices">
        {item.shuffled.map((id) => {
          const token = item.tokens.find((entry) => entry.id === id);
          if (!token) return null;
          const chosen = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              className="clara-practice__token"
              data-chosen={chosen || undefined}
              disabled={!interactive || chosen || checkState === "correct"}
              onClick={() => choose(id)}
              aria-pressed={chosen}
            >
              {token.label}
            </button>
          );
        })}
      </div>
      {checkState === "incomplete" ? (
        <p className="clara-practice__feedback" role="status">
          {copy.feedback.chooseWords}
        </p>
      ) : null}
      {checkState === "incorrect" ? (
        <p
          className="clara-practice__feedback clara-practice__feedback--wrong"
          role="status"
        >
          {copy.feedback.almost}
        </p>
      ) : null}
      {checkState === "correct" ? (
        <p
          className="clara-practice__feedback clara-practice__feedback--correct"
          role="status"
        >
          {copy.feedback.correctPhrase}
        </p>
      ) : null}
    </div>
  );
}

function ComprehensionPractice({
  item,
  choice,
  checkState,
  onSelect,
  onSpeak,
  speechState,
  interactive,
  copy,
}: {
  item: ComprehensionItem;
  choice: string | null;
  checkState: CheckState;
  onSelect: (choice: string) => void;
  onSpeak: () => void;
  speechState: SpeechState;
  interactive: boolean;
  copy: ClaraPracticeCopy;
}) {
  return (
    <div className="clara-practice__comprehension">
      <div className="clara-practice__story-heading">
        <span className="clara-practice__icon-badge">
          <Icon name="book" />
        </span>
        <div>
          <p>Mini story</p>
          <h2>{item.title}</h2>
        </div>
        <SpeakButton onSpeak={onSpeak} state={speechState} copy={copy} />
      </div>
      <p className="clara-practice__story">{item.story}</p>
      <div className="clara-practice__question">
        <span className="clara-practice__icon-badge">
          <Icon name="hint" />
        </span>
        <p>{item.question}</p>
      </div>
      <div
        className="clara-practice__choice-grid"
        role="group"
        aria-label="Answer choices"
      >
        {item.choices.map((answer) => (
          <button
            key={answer}
            type="button"
            className="clara-practice__choice"
            data-selected={choice === answer || undefined}
            disabled={!interactive || checkState === "correct"}
            onClick={() => onSelect(answer)}
            aria-pressed={choice === answer}
          >
            {answer}
          </button>
        ))}
      </div>
      {checkState === "incomplete" ? (
        <p className="clara-practice__feedback" role="status">
          {copy.feedback.chooseAnswer}
        </p>
      ) : null}
      {checkState === "incorrect" ? (
        <p
          className="clara-practice__feedback clara-practice__feedback--wrong"
          role="status"
        >
          {copy.feedback.goodTry(item.clue)}
        </p>
      ) : null}
      {checkState === "correct" ? (
        <p
          className="clara-practice__feedback clara-practice__feedback--correct"
          role="status"
        >
          {copy.feedback.correctComprehension}
        </p>
      ) : null}
    </div>
  );
}

export function LearnWithClaraPracticePage() {
  const navigate = useNavigate();
  const { practiceKey } = useParams<{ practiceKey: string }>();
  const session = loadLearnerSession();
  const copy = isFilipino(session?.learner.speech_language)
    ? claraPracticeCopy.fil
    : claraPracticeCopy.en;
  const [phase, setPhase] = useState<ViewPhase>("welcome");
  const [current, setCurrent] = useState(0);
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [speechState, setSpeechState] = useState<SpeechState>("idle");
  const [preparedSpeech, setPreparedSpeech] = useState<{
    key: ClaraSpeechKey;
    blob: Blob;
  } | null>(null);
  const [speechLevel, setSpeechLevel] = useState(0);
  const [claraReady, setClaraReady] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const playbackRef = useRef<ClaraSpeechPlayback | null>(null);
  const validKey = isPracticeKey(practiceKey) ? practiceKey : null;
  const meta = validKey ? practiceMeta[validKey] : null;
  const items = useMemo(
    () =>
      validKey === "comprehension"
        ? comprehensionItems
        : validKey === "sentences"
          ? sentenceItems
          : phraseItems,
    [validKey],
  );
  const item = items[current];
  const activeSpeechKey = phase === "lesson" ? (item?.speechKey ?? null) : null;
  const orderKind = validKey === "sentences" ? "sentences" : "phrases";
  const canAdvance = checkState === "correct";
  const isComplete = current >= items.length;
  const interactionReady = phase === "lesson" && speechState === "idle";

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
    } else if (!meta) {
      navigate("/learner/learn-with-clara", { replace: true });
    }
  }, [meta, navigate, session?.token]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    const preloadItem = phase === "welcome" ? items[0] : items[current + 1];
    if (preloadItem) {
      void prepareClaraSpeech(preloadItem.speechKey, session.token).catch(
        () => undefined,
      );
    }
  }, [current, items, phase, session?.token]);

  useEffect(() => {
    if (!session?.token || !activeSpeechKey) {
      return;
    }

    let active = true;
    setSpeechState("preparing");
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
          setSpeechState("error");
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

        setSpeechState("speaking");
        await playback.finished;

        if (active) {
          setSpeechState("idle");
          setSpeechLevel(0);
          playbackRef.current = null;
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
      playbackRef.current?.stop();
      playbackRef.current = null;
    };
  }, [activeSpeechKey, claraReady, preparedSpeech]);

  const replayItemSpeech = () => {
    unlockClaraAudio();
    playbackRef.current?.stop();
    playbackRef.current = null;
    setPlayNonce((value) => value + 1);
  };

  const beginPractice = () => {
    unlockClaraAudio();
    setSpeechState("preparing");
    setPhase("lesson");
  };

  if (!session?.token || !meta) return null;

  if (phase === "lesson" && isComplete) {
    return (
      <LearnWithClaraClassShell
        className="clara-practice"
        titleId="clara-practice-title"
        eyebrow={copy.heading}
        title={meta.label}
        backLabel={copy.back}
        onBack={() => navigate("/learner/learn-with-clara")}
        progress={
          <ProgressDots complete current={meta.count} total={meta.count} />
        }
        clara={<ClaraStage emotion="happy" behavior="celebrating" />}
        coaching={
          <>
            <p className="letters-class__status">{copy.completedMessage}</p>
            <BigButton
              className="letters-class__action"
              variant="primary"
              size="regular"
              leadingIcon={<Icon name="arrow" />}
              onClick={() => navigate("/learner/learn-with-clara")}
            >
              {copy.back}
            </BigButton>
          </>
        }
        lesson={
          <section className="clara-practice__complete">
            <span className="clara-practice__complete-icon">
              <Icon name="check" />
            </span>
            <p>{copy.complete}</p>
            <h2>{copy.completedTitle}</h2>
            <span>{copy.completedMessage}</span>
          </section>
        }
      />
    );
  }

  if (!item) return null;

  const selectedLabels =
    "tokens" in item
      ? selectedTokens.map(
          (id) => item.tokens.find((token) => token.id === id)?.label ?? id,
        )
      : [];
  const check = () => {
    if (!interactionReady) {
      return;
    }

    if (validKey === "comprehension") {
      if (!selectedChoice) {
        setCheckState("incomplete");
        return;
      }
      setCheckState(
        selectedChoice === (item as ComprehensionItem).answer
          ? "correct"
          : "incorrect",
      );
      return;
    }
    if (selectedTokens.length !== (item as OrderItem).tokens.length) {
      setCheckState("incomplete");
      return;
    }
    setCheckState(
      selectedLabels.join(" ") === (item as OrderItem).answer
        ? "correct"
        : "incorrect",
    );
  };

  const resetItem = () => {
    setCheckState("idle");
    setSelectedTokens([]);
    setSelectedChoice(null);
  };
  const next = () => {
    if (!canAdvance) return;
    setSpeechState("preparing");
    setCurrent((value) => value + 1);
    setCheckState("idle");
    setSelectedTokens([]);
    setSelectedChoice(null);
  };

  return (
    <LearnWithClaraClassShell
      className="clara-practice"
      titleId="clara-practice-title"
      eyebrow={copy.heading}
      title={meta.label}
      backLabel={copy.back}
      onBack={() => navigate("/learner/learn-with-clara")}
      progress={<ProgressDots current={current} total={meta.count} />}
      clara={
        <ClaraStage
          emotion={
            phase === "welcome"
              ? "happy"
              : checkState === "correct"
                ? "happy"
                : checkState === "incorrect"
                  ? "thinking"
                  : "default"
          }
          behavior={
            phase === "lesson" && checkState === "correct"
              ? "celebrating"
              : "encouraging"
          }
          speaking={speechState === "speaking"}
          speechLevel={speechLevel}
          onLoadStateChange={(state) => setClaraReady(state === "ready")}
        />
      }
      coaching={
        phase === "welcome" ? (
          <>
            <p className="letters-class__status">{copy.ready}</p>
            <BigButton
              className="letters-class__action"
              variant="primary"
              size="regular"
              leadingIcon={<Icon name="arrow" />}
              onClick={beginPractice}
            >
              {copy.startPractice}
            </BigButton>
          </>
        ) : (
          <>
            <div className="clara-practice__coach" aria-live="polite">
              <strong>
                {speechState === "preparing"
                  ? copy.preparing
                  : speechState === "speaking"
                    ? copy.speaking
                    : speechState === "error"
                      ? copy.audioError
                      : checkState === "correct"
                        ? copy.wonderful
                        : checkState === "incorrect"
                          ? copy.again
                          : copy.encouragement}
              </strong>
              <span>
                {speechState === "preparing" || speechState === "speaking"
                  ? copy.listenHint
                  : speechState === "error"
                    ? copy.retryAudioHint
                    : checkState === "incorrect"
                      ? copy.retryHint
                      : copy.answerHint}
              </span>
            </div>

            <div className="clara-practice__actions">
              {checkState === "correct" ? (
                <BigButton
                  variant="primary"
                  size="regular"
                  leadingIcon={<Icon name="arrow" />}
                  onClick={next}
                >
                  {current + 1 >= meta.count ? copy.finish : copy.next}
                </BigButton>
              ) : (
                <BigButton
                  variant="primary"
                  size="regular"
                  leadingIcon={<Icon name="check" />}
                  onClick={check}
                  className="clara-practice__check"
                  disabled={!interactionReady}
                >
                  {copy.check}
                </BigButton>
              )}
              {checkState === "incorrect" ? (
                <BigButton
                  variant="quiet"
                  size="regular"
                  leadingIcon={<Icon name="retry" />}
                  onClick={resetItem}
                >
                  {copy.retry}
                </BigButton>
              ) : null}
            </div>
          </>
        )
      }
      lesson={
        phase === "welcome" ? (
          <section className="clara-practice__welcome">
            <span className="clara-practice__welcome-icon">
              <Icon name={validKey === "comprehension" ? "book" : "hint"} />
            </span>
            <p>{meta.description}</p>
            <h2>{copy.welcomeTitle}</h2>
            <span>{copy.welcomeMessage(meta.count)}</span>
          </section>
        ) : (
          <section className="clara-practice__main-panel">
            <div className="clara-practice__section-heading">
              <span>{meta.description}</span>
              <span>
                {Math.min(current + 1, meta.count)} of {meta.count}
              </span>
            </div>
            <div className="clara-practice__instruction">
              <span className="clara-practice__icon-badge">
                <Icon name={validKey === "comprehension" ? "book" : "hint"} />
              </span>
              <p>{copy.instruction}</p>
            </div>
            {validKey === "comprehension" ? (
              <ComprehensionPractice
                item={item as ComprehensionItem}
                choice={selectedChoice}
                checkState={checkState}
                copy={copy}
                speechState={speechState}
                interactive={interactionReady}
                onSpeak={replayItemSpeech}
                onSelect={(choice) => {
                  setSelectedChoice(choice);
                  setCheckState("idle");
                }}
              />
            ) : (
              <OrderPractice
                key={`${validKey}-${current}`}
                item={item as OrderItem}
                kind={orderKind}
                selected={selectedTokens}
                checkState={checkState}
                copy={copy}
                speechState={speechState}
                interactive={interactionReady}
                onSpeak={replayItemSpeech}
                onSelect={(id) => {
                  setSelectedTokens((values) =>
                    values.includes(id)
                      ? values.filter((value) => value !== id)
                      : [...values, id],
                  );
                  setCheckState("idle");
                }}
              />
            )}
          </section>
        )
      }
    />
  );
}
