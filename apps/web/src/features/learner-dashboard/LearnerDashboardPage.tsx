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
  { key: "first-steps", criteria: "Complete the Diagnostic Assessment" },
  { key: "lesson-one", criteria: "Complete your first lesson" },
  { key: "word-helper", criteria: "Practice ten words" },
  { key: "steady-reader", criteria: "Complete three lessons" },
  { key: "game-starter", criteria: "Finish your first game session" },
  { key: "final-reader", criteria: "Complete the Final Assessment" },
] as const;

function LearningIcon() {
  return (
    <span className="learner-dashboard__button-icon" aria-hidden="true">
      Aa
    </span>
  );
}

function GamesIcon() {
  return (
    <span className="learner-dashboard__button-icon" aria-hidden="true">
      Play
    </span>
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
        className="learner-dashboard learner-dashboard--signed-out"
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
      className="learner-dashboard"
      aria-label="Learner dashboard"
      data-route-focus
      tabIndex={-1}
    >
      <div className="learner-dashboard__shell">
        <header className="learner-dashboard__header">
          <div>
            <p className="learner-dashboard__eyebrow">Your reading path</p>
            <h1>Welcome, {learner?.first_name ?? "Reader"}!</h1>
          </div>
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
            onClick={() => logoutCommit.commit(() => logoutMutation.mutate())}
          >
            Sign out
          </BigButton>
        </header>

        <Surface
          className="learner-dashboard__primary-card"
          kind="frame"
          padding="roomy"
        >
          <p className="learner-dashboard__next-label">Your next step</p>
          <h2>Let&apos;s find your reading starting point.</h2>
          <BigButton
            className="learner-dashboard__primary-action"
            leadingIcon={<LearningIcon />}
            onClick={() =>
              setAssessmentNotice(
                "The Diagnostic Assessment will connect here next.",
              )
            }
          >
            Start Diagnostic Assessment
          </BigButton>
          <p className="learner-dashboard__support-copy">
            Finish this first to unlock your lessons.
          </p>
          <p className="learner-dashboard__notice" aria-live="polite">
            {assessmentNotice}
          </p>
        </Surface>

        <section
          className="learner-dashboard__games"
          aria-labelledby="learner-games-title"
        >
          <div>
            <p className="learner-dashboard__eyebrow">Take a playful break</p>
            <h2 id="learner-games-title">Games</h2>
            <p>Visit the Game Lobby and choose a game.</p>
          </div>
          <BigButton
            className="learner-dashboard__games-action"
            variant="secondary"
            size="regular"
            leadingIcon={<GamesIcon />}
            committing={gamesCommit.committing}
            onClick={openGames}
          >
            Open Game Lobby
          </BigButton>
        </section>

        <Surface
          className="learner-dashboard__achievements"
          kind="frame"
          padding="roomy"
        >
          <div className="learner-dashboard__section-heading">
            <div>
              <p className="learner-dashboard__eyebrow">Your collection</p>
              <h2>Achievements</h2>
            </div>
            <span>0 of {achievementSlots.length}</span>
          </div>

          <ul
            className="learner-dashboard__achievement-grid"
            aria-label="Locked achievements"
          >
            {achievementSlots.map((achievement, index) => (
              <li key={achievement.key}>
                <span
                  className="learner-dashboard__achievement-star"
                  aria-hidden="true"
                >
                  ★
                </span>
                <strong>Achievement {index + 1}</strong>
                <span>{achievement.criteria}</span>
              </li>
            ))}
          </ul>
        </Surface>
      </div>
    </main>
  );
}
