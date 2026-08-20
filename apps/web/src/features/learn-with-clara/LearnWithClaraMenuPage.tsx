import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Surface } from "../../components/ui/Surface";
import { unlockClaraAudio } from "../clara-audio/claraSpeech";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { claraMenuCopy, isFilipino } from "./learnWithClaraCopy";
import "./learn-with-clara-menu.css";

const claraTopics = [
  {
    key: "letters",
    label: "Letters",
    description: "Meet letters and their sounds.",
  },
  {
    key: "words",
    label: "Words",
    description: "Read and build little words.",
  },
  {
    key: "phrases",
    label: "Phrases",
    description: "Join words smoothly.",
  },
  {
    key: "sentences",
    label: "Sentences",
    description: "Read a complete thought.",
  },
  {
    key: "comprehension",
    label: "Comprehension",
    description: "Find meaning in what you read.",
  },
] as const;

type ClaraTopicKey = (typeof claraTopics)[number]["key"];

function HomeIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="m5 15 11-9 11 9" />
      <path d="M8 13v13h16V13M13 26v-8h6v8" />
    </svg>
  );
}

function TopicIcon({ topic }: { topic: ClaraTopicKey }) {
  if (topic === "letters") {
    return (
      <span className="clara-menu__letter-mark" aria-hidden="true">
        Aa
      </span>
    );
  }

  if (topic === "words") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="7" y="18" width="50" height="29" rx="7" />
        <path d="M16 28h8M28 28h8M40 28h8M16 38h12M32 38h16" />
      </svg>
    );
  }

  if (topic === "phrases") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M9 20h30M9 30h46M9 44h36" />
        <circle cx="49" cy="20" r="4" />
      </svg>
    );
  }

  if (topic === "sentences") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M9 18h46M9 31h39M9 44h30" />
        <circle cx="48" cy="44" r="3.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M12 12h40v34H30L18 55v-9h-6V12Z" />
      <path d="M25 25c.5-5 4-8 9-8 5.5 0 9 3 9 7.5 0 6-7 6-7 11" />
      <circle cx="36" cy="41" r="2" />
    </svg>
  );
}

export function LearnWithClaraMenuPage() {
  const navigate = useNavigate();
  const session = loadLearnerSession();
  const copy = isFilipino(session?.learner.speech_language)
    ? claraMenuCopy.fil
    : claraMenuCopy.en;

  useEffect(() => {
    if (!session?.token) {
      navigate("/learner/login", { replace: true });
    }
  }, [navigate, session?.token]);

  if (!session?.token) {
    return null;
  }

  const chooseTopic = (topic: ClaraTopicKey) => {
    if (topic === "letters") {
      unlockClaraAudio();
      navigate("/learner/learn-with-clara/letters");
      return;
    }

    if (topic === "words") {
      unlockClaraAudio();
      navigate("/learner/learn-with-clara/words");
      return;
    }

    unlockClaraAudio();
    navigate(`/learner/learn-with-clara/practice/${topic}`);
  };

  return (
    <main
      className="clara-menu learner-flow-page"
      aria-labelledby="clara-menu-title"
      data-route-focus
      tabIndex={-1}
    >
      <div className="clara-menu__shell">
        <Surface className="clara-menu__header" kind="panel" padding="compact">
          <button
            className="clara-menu__home"
            type="button"
            aria-label={copy.backToDashboard}
            onClick={() => navigate("/learner/dashboard")}
          >
            <HomeIcon />
          </button>
          <div className="clara-menu__heading">
            <p>{copy.heading}</p>
            <h1 id="clara-menu-title">{copy.title}</h1>
          </div>
          <span className="clara-menu__pick-badge" aria-hidden="true">
            {copy.pickOne}
          </span>
        </Surface>

        <Surface className="clara-menu__lessons" kind="panel" padding="compact">
          <div className="clara-menu__lesson-heading">
            <div>
              <p className="clara-menu__eyebrow">{copy.chooseLesson}</p>
              <h2>{copy.readingSkill}</h2>
            </div>
            <span>{copy.choices}</span>
          </div>

          <div
            className="clara-menu__topic-grid"
            role="group"
            aria-label={copy.readingSkills}
          >
            {claraTopics.map((topic) => (
              <button
                key={topic.key}
                className="clara-menu__topic"
                type="button"
                aria-pressed={false}
                onClick={() => chooseTopic(topic.key)}
              >
                <span className="clara-menu__topic-icon">
                  <TopicIcon topic={topic.key} />
                </span>
                <span className="clara-menu__topic-copy">
                  <strong>{copy.topics[topic.key].label}</strong>
                  <span>{copy.topics[topic.key].description}</span>
                </span>
                <span className="clara-menu__topic-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>

          <p className="clara-menu__status" aria-live="polite">
            {copy.status}
          </p>
        </Surface>
      </div>
    </main>
  );
}
