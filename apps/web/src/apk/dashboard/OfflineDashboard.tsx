import { useMemo, useState } from "react";

import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { ReadingJourneyAchievementIcon } from "../../features/achievements/ReadingJourneyAchievementIcon";
import { readingJourneyAchievements } from "../../features/achievements/readingJourneyAchievements";
import "../../features/learner-dashboard/learner-dashboard.css";

import type { OfflineLearnerState } from "../storage/offlineLearnerState";

function LearningIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 10c7-1 12 1 17 5v25c-5-4-10-6-17-5V10Z" />
      <path d="M41 10c-7-1-12 1-17 5v25c5-4 10-6 17-5V10Z" />
      <path d="M12 17c3 0 5 .6 8 2M12 23c3 0 5 .6 8 2M36 17c-3 0-5 .6-8 2M36 23c-3 0-5 .6-8 2" />
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

export function OfflineDashboard({
  learner,
  onOpenJourney,
  onResetProgress,
}: {
  learner: OfflineLearnerState;
  onOpenJourney?: () => void;
  onResetProgress?: () => Promise<void>;
}) {
  const [selectedAchievementKey, setSelectedAchievementKey] = useState<
    (typeof readingJourneyAchievements)[number]["key"]
  >("reading.ready_reader");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const earnedAchievements = useMemo(
    () => new Set(learner.journey.achievements.map(({ key }) => key)),
    [learner.journey.achievements],
  );
  const selectedAchievement =
    readingJourneyAchievements.find(
      ({ key }) => key === selectedAchievementKey,
    ) ?? readingJourneyAchievements[0];
  const selectedAchievementIsEarned = earnedAchievements.has(
    selectedAchievement.key,
  );
  const completedLessonCount = learner.journey.lessons.filter(
    ({ status }) => status === "completed",
  ).length;
  const journeyComplete =
    learner.journey.finalAssessment.status === "completed";
  const hasJourneyProgress =
    learner.journey.diagnostic.status !== "available" ||
    learner.journey.lessons.some(({ status }) => status !== "locked") ||
    learner.journey.finalAssessment.status !== "locked" ||
    learner.journey.achievements.length > 0;

  return (
    <main
      className="learner-dashboard learner-flow-page"
      aria-label="Learner dashboard"
      data-screen="dashboard"
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
              <h1>Welcome, {learner.profile.displayName}!</h1>
            </div>
            <div className="learner-dashboard__header-actions">
              <div
                className="learner-dashboard__identity"
                aria-label="Journey status"
              >
                <span>
                  {journeyComplete ? "Journey complete" : "Reading in progress"}
                </span>
                <strong>{completedLessonCount} of 6</strong>
              </div>
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
            <p className="learner-dashboard__next-label">
              Your Reading Journey
            </p>
            <h2>
              {journeyComplete
                ? "Your Reading Journey is complete."
                : "Choose your next reading activity."}
            </h2>
            <p>
              {journeyComplete
                ? "You completed all eight reading milestones. You can still review your journey."
                : completedLessonCount > 0
                  ? `${completedLessonCount} of 6 lessons complete. Choose any available activity.`
                  : "Start with the Diagnostic Assessment, then choose any available lesson."}
            </p>
          </div>
          <BigButton
            className="learner-dashboard__primary-action"
            aria-label="Open Reading Journey"
            variant="primary"
            onClick={onOpenJourney}
          >
            Open Journey
          </BigButton>
        </Surface>

        <div className="learner-dashboard__quick-grid offline-dashboard__quick-grid">
          <Surface
            className="learner-dashboard__utility-card learner-dashboard__achievement-card learner-dashboard__entrance"
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
                {earnedAchievements.size}/{readingJourneyAchievements.length}
              </span>
            </div>

            <div className="learner-dashboard__achievement-case">
              <ul
                className="learner-dashboard__achievement-preview"
                aria-label="Reading Journey achievements"
              >
                {readingJourneyAchievements.map((achievement) => {
                  const isEarned = earnedAchievements.has(achievement.key);
                  const isSelected =
                    selectedAchievement.key === achievement.key;
                  return (
                    <li
                      key={achievement.key}
                      data-earned={isEarned || undefined}
                      data-selected={isSelected || undefined}
                      aria-label={`${achievement.name}: ${achievement.criteria}. ${isEarned ? "Earned" : "Locked"}`}
                    >
                      <button
                        type="button"
                        aria-label={`View ${achievement.name} achievement`}
                        aria-pressed={isSelected}
                        onClick={() =>
                          setSelectedAchievementKey(achievement.key)
                        }
                      >
                        <ReadingJourneyAchievementIcon
                          achievement={achievement}
                          className="learner-dashboard__achievement-icon"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div
                className="learner-dashboard__achievement-detail"
                data-earned={selectedAchievementIsEarned || undefined}
                aria-live="polite"
              >
                <div>
                  <strong>{selectedAchievement.name}</strong>
                  <span>
                    {selectedAchievementIsEarned ? "Earned" : "Locked"}
                  </span>
                </div>
                <p>{selectedAchievement.criteria}</p>
              </div>
            </div>
          </Surface>
        </div>

        {onResetProgress ? (
          <Surface
            className="learner-dashboard__utility-card learner-dashboard__entrance offline-dashboard__reset-card"
            kind="panel"
            padding="normal"
          >
            <div>
              <p className="learner-dashboard__eyebrow">On this device</p>
              <h2 id="offline-reset-title">Reset progress</h2>
              <p>
                Start the Reading Journey again. This removes your answers,
                scores, lesson checkpoints, and achievements from this device.
              </p>
            </div>
            {confirmingReset ? (
              <div
                className="offline-dashboard__reset-confirm"
                role="group"
                aria-label="Confirm resetting progress"
              >
                <p>
                  Your device setup stays saved. Journey progress cannot be
                  recovered.
                </p>
                <div>
                  <BigButton
                    variant="secondary"
                    size="regular"
                    disabled={resetPending}
                    onClick={() => {
                      setConfirmingReset(false);
                      setResetError(null);
                    }}
                  >
                    Keep my progress
                  </BigButton>
                  <BigButton
                    size="regular"
                    busy={resetPending}
                    busyLabel="Resetting"
                    onClick={() => {
                      setResetPending(true);
                      setResetError(null);
                      void onResetProgress()
                        .then(() => setConfirmingReset(false))
                        .catch((error: unknown) =>
                          setResetError(
                            error instanceof Error
                              ? error.message
                              : "Progress could not be reset.",
                          ),
                        )
                        .finally(() => setResetPending(false));
                    }}
                  >
                    Yes, reset progress
                  </BigButton>
                </div>
              </div>
            ) : (
              <BigButton
                variant="secondary"
                size="regular"
                disabled={!hasJourneyProgress}
                onClick={() => setConfirmingReset(true)}
              >
                Reset progress
              </BigButton>
            )}
            {resetError ? <p role="alert">{resetError}</p> : null}
          </Surface>
        ) : null}
      </div>
    </main>
  );
}
