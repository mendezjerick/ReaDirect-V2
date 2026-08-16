import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { LearnerActivityHomeButton } from "../learner-activity/LearnerActivityHomeButton";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { ClaraStage } from "../intro/ClaraStage";
import "./learn-with-clara-practice.css";

type PracticeKey = "phrases" | "sentences" | "comprehension";
type CheckState = "idle" | "incomplete" | "correct" | "incorrect";

interface OrderToken {
  id: string;
  label: string;
}

interface OrderItem {
  prompt: string;
  answer: string;
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
}

const phraseItems: OrderItem[] = [
  {
    prompt: "Put the words in order.",
    answer: "the red ball",
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
    tokens: [
      { id: "blue", label: "blue" },
      { id: "sky", label: "sky" },
    ],
    shuffled: ["sky", "blue"],
  },
  {
    prompt: "Put these words together.",
    answer: "my red hat",
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
    tokens: [
      { id: "subject", label: "The bird" },
      { id: "verb", label: "can fly." },
    ],
    shuffled: ["verb", "subject"],
  },
  {
    prompt: "Put the sentence together.",
    answer: "We walk to school.",
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
  },
  {
    title: "A Rainy Walk",
    story:
      "Noah sees dark clouds. He takes his yellow umbrella before he walks home. The rain starts on the way.",
    question: "What does Noah take?",
    choices: ["A red hat", "A yellow umbrella", "A blue kite"],
    answer: "A yellow umbrella",
    clue: "Noah takes his yellow umbrella before he walks home.",
  },
  {
    title: "The Kind Friend",
    story:
      "Ana drops her crayons. Ben helps her pick them up. Ana smiles and says thank you.",
    question: "Why does Ana smile?",
    choices: ["Ben helps her", "She finds a ball", "It is bedtime"],
    answer: "Ben helps her",
    clue: "Ben helps Ana pick up her crayons.",
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

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <ol
      className="clara-practice__progress"
      aria-label={`Practice item ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <li
          key={index}
          data-current={index === current || undefined}
          data-complete={index < current || undefined}
        >
          <span>{index + 1}</span>
        </li>
      ))}
    </ol>
  );
}

function SpeakButton({ text }: { text: string }) {
  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.86;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button className="clara-practice__listen" type="button" onClick={speak}>
      <Icon name="speaker" />
      <span>Listen</span>
    </button>
  );
}

function OrderPractice({
  item,
  kind,
  selected,
  checkState,
  onSelect,
}: {
  item: OrderItem;
  kind: "phrases" | "sentences";
  selected: string[];
  checkState: CheckState;
  onSelect: (id: string) => void;
}) {
  const selectedLabels = selected.map(
    (id) => item.tokens.find((token) => token.id === id)?.label ?? id,
  );
  const choose = (id: string) => {
    if (checkState === "correct") return;
    onSelect(id);
  };

  return (
    <div className="clara-practice__order">
      <div className="clara-practice__prompt-row">
        <p>{item.prompt}</p>
        <SpeakButton text={item.answer} />
      </div>
      <div className="clara-practice__answer" aria-label="Your answer">
        {selectedLabels.length ? (
          selectedLabels.map((label, index) => (
            <button
              key={selected[index]}
              type="button"
              className="clara-practice__answer-chip"
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
              disabled={chosen || checkState === "correct"}
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
          Choose every word first.
        </p>
      ) : null}
      {checkState === "incorrect" ? (
        <p
          className="clara-practice__feedback clara-practice__feedback--wrong"
          role="status"
        >
          Almost! Tap a word in your answer to try again.
        </p>
      ) : null}
      {checkState === "correct" ? (
        <p
          className="clara-practice__feedback clara-practice__feedback--correct"
          role="status"
        >
          That is right! Clara is proud of your reading.
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
}: {
  item: ComprehensionItem;
  choice: string | null;
  checkState: CheckState;
  onSelect: (choice: string) => void;
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
        <SpeakButton text={`${item.story} ${item.question}`} />
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
            disabled={checkState === "correct"}
            onClick={() => onSelect(answer)}
            aria-pressed={choice === answer}
          >
            {answer}
          </button>
        ))}
      </div>
      {checkState === "incomplete" ? (
        <p className="clara-practice__feedback" role="status">
          Choose one answer first.
        </p>
      ) : null}
      {checkState === "incorrect" ? (
        <p
          className="clara-practice__feedback clara-practice__feedback--wrong"
          role="status"
        >
          Good try. Look for the clue: {item.clue}
        </p>
      ) : null}
      {checkState === "correct" ? (
        <p
          className="clara-practice__feedback clara-practice__feedback--correct"
          role="status"
        >
          Correct! You found the clue in the story.
        </p>
      ) : null}
    </div>
  );
}

export function LearnWithClaraPracticePage() {
  const navigate = useNavigate();
  const { practiceKey } = useParams<{ practiceKey: string }>();
  const session = loadLearnerSession();
  const [current, setCurrent] = useState(0);
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
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
  const orderKind = validKey === "sentences" ? "sentences" : "phrases";
  const canAdvance = checkState === "correct";
  const isComplete = current >= items.length;

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
    } else if (!meta) {
      navigate("/learner/learn-with-clara", { replace: true });
    }
  }, [meta, navigate, session?.token]);

  if (!session?.token || !meta) return null;

  if (isComplete) {
    return (
      <main
        className="clara-practice learner-flow-page"
        data-route-focus
        tabIndex={-1}
      >
        <div className="clara-practice__shell clara-practice__shell--complete">
          <header className="clara-practice__header">
            <LearnerActivityHomeButton />
            <div>
              <p>Learn with Ma&apos;am Clara</p>
              <h1>{meta.label}</h1>
            </div>
          </header>
          <section
            className="clara-practice__complete"
            aria-labelledby="clara-practice-complete-title"
          >
            <span className="clara-practice__complete-icon">
              <Icon name="check" />
            </span>
            <p>Practice complete</p>
            <h2 id="clara-practice-complete-title">You did it!</h2>
            <span>
              Clara says: Every little step makes your reading stronger.
            </span>
            <BigButton
              variant="primary"
              size="regular"
              leadingIcon={<Icon name="arrow" />}
              onClick={() => navigate("/learner/learn-with-clara")}
            >
              Back to practice menu
            </BigButton>
          </section>
        </div>
      </main>
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
    setCurrent((value) => value + 1);
    setCheckState("idle");
    setSelectedTokens([]);
    setSelectedChoice(null);
  };

  return (
    <main
      className="clara-practice learner-flow-page"
      data-route-focus
      tabIndex={-1}
    >
      <div className="clara-practice__shell">
        <header className="clara-practice__header">
          <LearnerActivityHomeButton />
          <div>
            <p>Learn with Ma&apos;am Clara</p>
            <h1>{meta.label}</h1>
          </div>
          <ProgressDots current={current} total={meta.count} />
        </header>

        <section className="clara-practice__workspace">
          <div className="clara-practice__main-panel">
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
              <p>Ma&apos;am Clara says: Take your time and try your best.</p>
            </div>
            {validKey === "comprehension" ? (
              <ComprehensionPractice
                item={item as ComprehensionItem}
                choice={selectedChoice}
                checkState={checkState}
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
          </div>

          <aside
            className="clara-practice__teacher"
            aria-label="Ma'am Clara guidance"
          >
            <div className="clara-practice__clara">
              <ClaraStage
                emotion={
                  checkState === "correct"
                    ? "happy"
                    : checkState === "incorrect"
                      ? "thinking"
                      : "default"
                }
                behavior={
                  checkState === "correct" ? "celebrating" : "encouraging"
                }
              />
            </div>
            <div className="clara-practice__coach">
              <strong>
                {checkState === "correct"
                  ? "Wonderful work!"
                  : checkState === "incorrect"
                    ? "Let's look again."
                    : "You can do it!"}
              </strong>
              <span>
                {checkState === "incorrect"
                  ? "Use the clue and try one more time."
                  : "Tap an answer, then press Check."}
              </span>
            </div>
          </aside>
        </section>

        <footer className="clara-practice__actions">
          {checkState === "correct" ? (
            <BigButton
              variant="primary"
              size="regular"
              leadingIcon={<Icon name="arrow" />}
              onClick={next}
            >
              {current + 1 >= meta.count ? "Finish practice" : "Next"}
            </BigButton>
          ) : (
            <BigButton
              variant="primary"
              size="regular"
              leadingIcon={<Icon name="check" />}
              onClick={check}
              className="clara-practice__check"
            >
              Check answer
            </BigButton>
          )}
          {checkState === "incorrect" ? (
            <BigButton
              variant="quiet"
              size="regular"
              leadingIcon={<Icon name="retry" />}
              onClick={resetItem}
            >
              Retry
            </BigButton>
          ) : null}
        </footer>
      </div>
    </main>
  );
}
