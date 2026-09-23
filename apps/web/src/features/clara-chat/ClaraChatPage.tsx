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

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function speechKeyFor(value: string): ClaraSpeechKey | null {
  const normalized = normalize(value);
  const letterCandidate = normalized.replace(
    /^(?:show me|letter|practice|try)\s+/,
    "",
  );
  const uppercase = letterCandidate.toUpperCase();

  if (
    letterCandidate.length === 1 &&
    LETTERS.includes(letterCandidate.toUpperCase())
  ) {
    return `lesson-1-letter-demo-${uppercase}` as ClaraSpeechKey;
  }

  const wordCandidate = normalized.replace(
    /^(?:practice|word|read|try|show me)\s+/,
    "",
  );

  if (WORDS.includes(wordCandidate as (typeof WORDS)[number])) {
    return `lesson-2-word-demo-${wordCandidate}` as ClaraSpeechKey;
  }

  return null;
}

export function ClaraChatPage() {
  const navigate = useNavigate();
  const session = loadLearnerSession();
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
  const speechNonceRef = useRef(0);

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
    }
  }, [navigate, session?.token]);

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

    setInput("");

    const speechKey = speechKeyFor(trimmed);
    if (speechKey) {
      unlockClaraAudio();
      speechNonceRef.current += 1;
      setSpeechRequest({
        key: speechKey,
        nonce: speechNonceRef.current,
      });
    }
  };

  const speechStatus =
    speechState === "preparing"
      ? "Preparing"
      : speechState === "speaking"
        ? "Speaking"
        : speechState === "error"
          ? "Try again"
          : "Ready";

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
          <section className="clara-chat__stage" aria-label="Clara">
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
          </Surface>
        </div>
      </div>
    </main>
  );
}
