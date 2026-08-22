import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Surface } from "../../components/ui/Surface";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { unlockClaraAudio } from "../clara-audio/claraSpeech";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { claraMenuCopy, isFilipino } from "./learnWithClaraCopy";
import { useLearnWithClaraBackNavigation } from "./useLearnWithClaraBackNavigation";
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
  return <PixelIcon name="home" />;
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
    return <PixelIcon name="words" />;
  }

  if (topic === "phrases") {
    return <PixelIcon name="phrases" />;
  }

  if (topic === "sentences") {
    return <PixelIcon name="sentences" />;
  }

  return <PixelIcon name="comprehension" />;
}

export function LearnWithClaraMenuPage() {
  const navigate = useNavigate();
  useLearnWithClaraBackNavigation();
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
                  <PixelIcon name="arrow-right" />
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
