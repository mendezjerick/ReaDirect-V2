import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearLearnerSession,
  getLearnerSession,
  loadLearnerSession,
  logoutLearner,
} from "../learner-auth/learnerApi";
import "./learner-dashboard.css";

const achievementSlots = [
  {
    key: "first-steps",
    name: "First Step",
    criteria: "Complete the Diagnostic Assessment",
  },
  {
    key: "lesson-one",
    name: "Lesson One",
    criteria: "Complete your first lesson",
  },
  { key: "word-helper", name: "Word Helper", criteria: "Practice ten words" },
  {
    key: "steady-reader",
    name: "Steady Reader",
    criteria: "Complete three lessons",
  },
  {
    key: "game-starter",
    name: "Game Starter",
    criteria: "Finish your first game session",
  },
  {
    key: "final-reader",
    name: "Final Reader",
    criteria: "Complete the Final Assessment",
  },
] as const;

function LearningIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 10c7-1 12 1 17 5v25c-5-4-10-6-17-5V10Z" />
      <path d="M41 10c-7-1-12 1-17 5v25c5-4 10-6 17-5V10Z" />
      <path d="M12 17c3 0 5 .6 8 2M12 23c3 0 5 .6 8 2M36 17c-3 0-5 .6-8 2M36 23c-3 0-5 .6-8 2" />
    </svg>
  );
}

function GamesIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M16 17h16c7 0 11 6 10 14l-1 5c-.7 4-5 5-8 2l-5-5h-8l-5 5c-3 3-7.3 2-8-2l-1-5c-1-8 3-14 10-14Z" />
      <path d="M14 25h8M18 21v8M31 24h.1M35 28h.1" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M15 8h18v8c0 8-4 13-9 13s-9-5-9-13V8Z" />
      <path d="M15 12H8v3c0 6 4 9 9 9M33 12h7v3c0 6-4 9-9 9M24 29v7M17 40h14M20 36h8" />
    </svg>
  );
}

export function LearnerDashboardPage() {
  const navigate = useNavigate();
  const gamesCommit = useButtonCommit();
  const logoutCommit = useButtonCommit();
  const [assessmentNotice, setAssessmentNotice] = useState("");
  const storedSession = loadLearnerSession();
  const sessionQuery = useQuery({
    queryKey: ["learner-session", storedSession?.token],
    queryFn: () => getLearnerSession(storedSession?.token ?? ""),
    enabled: Boolean(storedSession?.token),
    initialData: storedSession
      ? { learner: storedSession.learner, session: storedSession.session }
      : undefined,
  });
  const logoutMutation = useMutation({
    mutationFn: () => logoutLearner(storedSession?.token ?? ""),
    onSettled: () => {
      clearLearnerSession();
      navigate("/learner/login");
    },
  });
  const learner = sessionQuery.data?.learner;

  useEffect(() => {
    if (sessionQuery.isError) {
      clearLearnerSession();
    }
  }, [sessionQuery.isError]);

  const openGames = () => {
    gamesCommit.commit(() => navigate("/learner/games"));
  };

  if (!storedSession || sessionQuery.isError) {
    return (
      <main
        className="learner-dashboard learner-dashboard--signed-out learner-flow-page"
        data-route-focus
        tabIndex={-1}
      >
        <Surface kind="frame" padding="roomy">
          <p className="learner-dashboard__eyebrow">Your reading path</p>
          <h1>
            {sessionQuery.isError
              ? "Your session ended"
              : "Reader sign-in needed"}
          </h1>
          <p>
            {sessionQuery.isError
              ? "Your account may have been reset. Sign in again to continue."
              : "Enter your Learner Code before opening your dashboard."}
          </p>
          <BigButton size="regular" onClick={() => navigate("/learner/login")}>
            Go to reader sign in
          </BigButton>
        </Surface>
      </main>
    );
  }

  return (
    <main
      className="learner-dashboard learner-flow-page"
      aria-label="Learner dashboard"
      data-route-focus
      tabIndex={-1}
    >
      <div className="learner-dashboard__shell">
        <Surface
          className="learner-dashboard__header-surface"
          kind="panel"
          padding="normal"
        >
          <header
            className="learner-dashboard__header"
            aria-label="Learner summary"
          >
            <div>
              <p className="learner-dashboard__eyebrow">Your reading path</p>
              <h1>Welcome, {learner?.first_name ?? "Reader"}!</h1>
            </div>
            <div className="learner-dashboard__header-actions">
              <div
                className="learner-dashboard__identity"
                aria-label="Learner identity"
              >
                <span>
                  {learner?.progress.stage === "before_diagnostic"
                    ? "Getting started"
                    : "Reading in progress"}
                </span>
                <strong>{learner?.learner_code}</strong>
              </div>
              <BigButton
                className="learner-dashboard__logout"
                variant="quiet"
                size="regular"
                committing={logoutCommit.committing}
                busy={logoutMutation.isPending}
                busyLabel="Signing out"
                onClick={() =>
                  logoutCommit.commit(() => logoutMutation.mutate())
                }
              >
                Sign out
              </BigButton>
            </div>
          </header>
        </Surface>

        <Surface
          className="learner-dashboard__primary-card learner-dashboard__entrance"
          kind="frame"
          padding="roomy"
        >
          <div className="learner-dashboard__primary-symbol">
            <LearningIcon />
          </div>
          <div className="learner-dashboard__primary-copy">
            <p className="learner-dashboard__next-label">Your next step</p>
            <h2>Find your reading starting point.</h2>
            <p>Complete this once to open your lessons.</p>
          </div>
          <BigButton
            className="learner-dashboard__primary-action"
            aria-label="Start Diagnostic Assessment"
            onClick={() =>
              setAssessmentNotice(
                "The Diagnostic Assessment will connect here next.",
              )
            }
          >
            Start Diagnostic
          </BigButton>
          <p className="learner-dashboard__notice" aria-live="polite">
            {assessmentNotice}
          </p>
        </Surface>

        <div className="learner-dashboard__quick-grid">
          <Surface
            className="learner-dashboard__utility-card learner-dashboard__entrance"
            kind="panel"
            padding="normal"
          >
            <div className="learner-dashboard__utility-heading">
              <span className="learner-dashboard__utility-icon">
                <GamesIcon />
              </span>
              <div>
                <p className="learner-dashboard__eyebrow">Play and practice</p>
                <h2>Games</h2>
              </div>
            </div>
            <p>Two quick games are ready for you.</p>
            <BigButton
              className="learner-dashboard__games-action"
              aria-label="Open Game Lobby"
              variant="secondary"
              size="regular"
              committing={gamesCommit.committing}
              onClick={openGames}
            >
              Open Games
            </BigButton>
          </Surface>

          <Surface
            className="learner-dashboard__utility-card learner-dashboard__entrance"
            kind="panel"
            padding="normal"
          >
            <div className="learner-dashboard__utility-heading">
              <span className="learner-dashboard__utility-icon">
                <TrophyIcon />
              </span>
              <div>
                <p className="learner-dashboard__eyebrow">Your collection</p>
                <h2>Achievements</h2>
              </div>
              <span className="learner-dashboard__achievement-count">
                0/{achievementSlots.length}
              </span>
            </div>

            <ul
              className="learner-dashboard__achievement-preview"
              aria-label="Locked achievements"
            >
              {achievementSlots.map((achievement) => (
                <li
                  key={achievement.key}
                  aria-label={`${achievement.name}: ${achievement.criteria}`}
                >
                  <span
                    className="learner-dashboard__achievement-star"
                    aria-hidden="true"
                  >
                    ★
                  </span>
                  <strong>{achievement.name}</strong>
                </li>
              ))}
            </ul>
          </Surface>
        </div>
      </div>
    </main>
  );
}
