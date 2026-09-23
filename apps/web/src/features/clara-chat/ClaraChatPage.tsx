import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PixelIcon } from "../../components/ui/PixelIcon";
import { Surface } from "../../components/ui/Surface";
import {
  playClaraSpeech,
  prepareClaraSpeech,
  stopAllClaraSpeech,
  unlockClaraAudio,
  type ClaraSpeechKey,
  type ClaraSpeechPlayback,
} from "../clara-audio/claraSpeech";
import { ClaraStage } from "../intro/ClaraStage";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import "./clara-chat.css";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const WORDS = [
  "bag",
  "bat",
  "bed",
  "big",
  "bun",
  "can",
  "cap",
  "cat",
  "cut",
  "dad",
  "den",
  "dig",
  "dog",
  "dot",
  "fan",
  "fat",
  "fin",
  "fit",
  "fun",
  "gap",
  "gas",
  "get",
  "got",
  "gum",
  "ham",
  "hat",
  "hen",
  "hip",
  "hot",
  "jam",
  "jet",
  "job",
  "jog",
  "jug",
  "lap",
  "leg",
  "lid",
  "lip",
  "log",
  "man",
  "map",
  "mat",
  "men",
  "mug",
  "pan",
  "pen",
  "pet",
  "pig",
  "pot",
] as const;

type ChatChoice = {
  label: string;
  value: string;
};

type ChatMessage = {
  id: number;
  sender: "clara" | "learner";
  text: string;
  choices?: ChatChoice[];
  speechKey?: ClaraSpeechKey;
};

type ClaraResponse = Omit<ChatMessage, "id" | "sender">;

const welcomeMessage: ChatMessage = {
  id: 0,
  sender: "clara",
  text: "Hello, Reader! Choose a letter or one of our reading words to practice with me.",
  choices: [
    { label: "Show me A", value: "A" },
    { label: "Practice cat", value: "cat" },
    { label: "What can I practice?", value: "What can I practice?" },
  ],
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function letterResponse(letter: string): ClaraResponse {
  const uppercase = letter.toUpperCase();
  const nextLetter = LETTERS[(LETTERS.indexOf(uppercase) + 1) % LETTERS.length];

  return {
    text: `This is ${uppercase}. Say the letter name with me.`,
    speechKey: `lesson-1-letter-demo-${uppercase}` as ClaraSpeechKey,
    choices: [
      { label: `Try ${nextLetter}`, value: nextLetter },
      { label: "Practice a word", value: "cat" },
      { label: "Show all letters", value: "letters" },
    ],
  };
}

function wordResponse(word: string): ClaraResponse {
  const nextWord =
    WORDS[(WORDS.indexOf(word as (typeof WORDS)[number]) + 1) % WORDS.length];

  return {
    text: `Let’s read “${word}” together. Say the whole word.`,
    speechKey: `lesson-2-word-demo-${word}` as ClaraSpeechKey,
    choices: [
      { label: `Try ${nextWord}`, value: nextWord },
      { label: "Practice a letter", value: "A" },
      { label: "Show all words", value: "words" },
    ],
  };
}

function responseFor(value: string): ClaraResponse {
  const normalized = normalize(value);
  const letterCandidate = normalized.replace(
    /^(?:show me|letter|practice|try)\s+/,
    "",
  );

  if (
    letterCandidate.length === 1 &&
    LETTERS.includes(letterCandidate.toUpperCase())
  ) {
    return letterResponse(letterCandidate);
  }

  const wordCandidate = normalized.replace(
    /^(?:practice|word|read|try|show me)\s+/,
    "",
  );

  if (WORDS.includes(wordCandidate as (typeof WORDS)[number])) {
    return wordResponse(wordCandidate);
  }

  if (
    normalized === "letters" ||
    normalized === "show all letters" ||
    normalized.includes("what letters")
  ) {
    return {
      text: "We can practice all 26 letters. Pick one below, then I will say its letter name.",
      choices: LETTERS.slice(0, 8).map((letter) => ({
        label: letter,
        value: letter,
      })),
    };
  }

  if (
    normalized === "words" ||
    normalized === "show all words" ||
    normalized.includes("what words")
  ) {
    return {
      text: "We have 49 reading words ready. Start with one of these, or type another word you know.",
      choices: ["bag", "cat", "dog", "map", "pig", "pot"].map((word) => ({
        label: word,
        value: word,
      })),
    };
  }

  if (
    normalized === "help" ||
    normalized === "what can i practice" ||
    normalized === "what can i practice?"
  ) {
    return {
      text: "I can practice any letter from A to Z and the reading words in your lessons. Try typing A, cat, or dog.",
      choices: [
        { label: "Show me A", value: "A" },
        { label: "Practice dog", value: "dog" },
        { label: "Show all words", value: "words" },
      ],
    };
  }

  return {
    text: "I can help with one letter or one of our reading words. Try typing A, cat, or dog.",
    choices: [
      { label: "Show me A", value: "A" },
      { label: "Practice cat", value: "cat" },
      { label: "What can I practice?", value: "help" },
    ],
  };
}

export function ClaraChatPage() {
  const navigate = useNavigate();
  const session = loadLearnerSession();
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [claraReady, setClaraReady] = useState(false);
  const [speechLevel, setSpeechLevel] = useState(0);
  const [speechState, setSpeechState] = useState<
    "idle" | "preparing" | "speaking" | "error"
  >("idle");
  const [speechRequest, setSpeechRequest] = useState<{
    key: ClaraSpeechKey;
    nonce: number;
  } | null>(null);
  const [preparedSpeech, setPreparedSpeech] = useState<{
    key: ClaraSpeechKey;
    blob: Blob;
  } | null>(null);
  const playbackRef = useRef<ClaraSpeechPlayback | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(1);

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
    }
  }, [navigate, session?.token]);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!session?.token || !speechRequest) {
      return;
    }

    let active = true;
    setSpeechState("preparing");
    setPreparedSpeech(null);
    setSpeechLevel(0);

    void prepareClaraSpeech(speechRequest.key, session.token, {
      language: "en",
    })
      .then((speech) => {
        if (active) {
          setPreparedSpeech({ key: speechRequest.key, blob: speech });
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
  }, [session?.token, speechRequest]);

  useEffect(() => {
    if (
      !preparedSpeech ||
      !speechRequest ||
      preparedSpeech.key !== speechRequest.key ||
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
  }, [claraReady, preparedSpeech, speechRequest]);

  useEffect(
    () => () => {
      stopAllClaraSpeech();
    },
    [],
  );

  if (!session?.token) {
    return null;
  }

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    unlockClaraAudio();
    const response = responseFor(trimmed);
    const claraMessage: ChatMessage = {
      id: messageIdRef.current + 1,
      sender: "clara",
      ...response,
    };
    messageIdRef.current += 2;
    setMessages((current) => [
      ...current,
      { id: claraMessage.id - 1, sender: "learner", text: trimmed },
      claraMessage,
    ]);
    setInput("");

    if (response.speechKey) {
      setSpeechRequest({
        key: response.speechKey,
        nonce: claraMessage.id,
      });
    }
  };

  const speechStatus =
    speechState === "preparing"
      ? "Preparing Clara"
      : speechState === "speaking"
        ? "Clara is speaking"
        : speechState === "error"
          ? "Tap a word to try again"
          : "Ready to practice";

  return (
    <main
      className="clara-chat learner-flow-page learner-typography-page"
      aria-labelledby="clara-chat-title"
      data-route-focus
      tabIndex={-1}
    >
      <div className="clara-chat__shell">
        <Surface
          className="clara-chat__navbar"
          kind="panel"
          padding="compact"
          role="navigation"
          aria-label="Clara Chat navigation"
        >
          <button
            className="clara-chat__back"
            type="button"
            aria-label="Back to Clara modes"
            onClick={() => navigate("/learner/learn-with-clara")}
          >
            <PixelIcon name="arrow-left" />
          </button>
          <div className="clara-chat__title-copy">
            <p>Ma&apos;am Clara</p>
            <h1 id="clara-chat-title">Clara Chat</h1>
          </div>
          <span className="clara-chat__status" aria-live="polite">
            {speechStatus}
          </span>
        </Surface>

        <div className="clara-chat__workspace">
          <section
            className="clara-chat__stage"
            aria-label="Clara conversation"
          >
            <div className="clara-chat__clara" aria-hidden="true">
              <ClaraStage
                emotion={speechState === "speaking" ? "happy" : "default"}
                behavior={
                  speechState === "speaking" ? "demonstrating" : "listening"
                }
                speaking={speechState === "speaking"}
                speechLevel={speechLevel}
                onLoadStateChange={(state) => setClaraReady(state === "ready")}
              />
            </div>

            <div className="clara-chat__dialogue" ref={messageListRef}>
              {messages.slice(-5).map((message) => (
                <article
                  className={`clara-chat__bubble clara-chat__bubble--${message.sender}`}
                  key={message.id}
                >
                  <span className="clara-chat__bubble-label">
                    {message.sender === "clara" ? "Clara" : "You"}
                  </span>
                  <p>{message.text}</p>
                  {message.choices?.length ? (
                    <div className="clara-chat__bubble-choices">
                      {message.choices.map((choice) => (
                        <button
                          key={`${message.id}-${choice.value}`}
                          type="button"
                          onClick={() => submit(choice.value)}
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div
              className="clara-chat__suggestions"
              aria-label="Suggested prompts"
            >
              <span>Try a prompt</span>
              {[
                { label: "Show me A", value: "A" },
                { label: "Practice cat", value: "cat" },
                { label: "What can I practice?", value: "help" },
              ].map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => submit(choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </section>

          <Surface
            className="clara-chat__composer"
            kind="panel"
            padding="compact"
          >
            <form
              className="clara-chat__form"
              onSubmit={(event) => {
                event.preventDefault();
                submit(input);
              }}
            >
              <label className="visually-hidden" htmlFor="clara-chat-input">
                Type a letter or reading word
              </label>
              <input
                id="clara-chat-input"
                type="text"
                value={input}
                maxLength={48}
                autoComplete="off"
                placeholder="Type a letter or reading word..."
                onChange={(event) => setInput(event.target.value)}
              />
              <button
                className="clara-chat__send"
                type="submit"
                aria-label="Send to Clara"
                disabled={!input.trim()}
              >
                <PixelIcon name="arrow-right" />
              </button>
            </form>
            <p className="clara-chat__composer-note">
              Read-only practice: Clara uses letters and words from your
              lessons.
            </p>
          </Surface>
        </div>
      </div>
    </main>
  );
}
