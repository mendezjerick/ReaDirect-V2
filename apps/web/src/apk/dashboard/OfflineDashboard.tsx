import { useMemo, useState } from "react";

import { readingJourneyAchievements } from "../../features/achievements/readingJourneyAchievements";
import {
  getOfflineJourneyStage,
  type OfflineLearnerState,
} from "../storage/offlineLearnerState";

const LESSON_NAMES = [
  "Letters",
  "Words",
  "Phrases",
  "Sentences",
  "Short Passage",
  "Comprehension",
] as const;

type ActivityStatus = OfflineLearnerState["journey"]["diagnostic"]["status"];

const statusLabels: Record<ActivityStatus, string> = {
  locked: "Locked",
  available: "Ready",
  in_progress: "Continue",
  completed: "Complete",
};

function JourneyIcon({ status }: { status: ActivityStatus }) {
  return (
    <span className="offline-dashboard__journey-icon" aria-hidden="true">
      {status === "completed" ? "✓" : status === "locked" ? "•" : "→"}
    </span>
  );
}

export function OfflineDashboard({
  learner,
  onOpenJourney,
  onSkipDiagnostic,
  onResetProgress,
}: {
  learner: OfflineLearnerState;
  onOpenJourney?: () => void;
  onSkipDiagnostic?: () => Promise<void>;
  onResetProgress?: () => Promise<void>;
}) {
  const [selectedAchievementKey, setSelectedAchievementKey] = useState<
    (typeof readingJourneyAchievements)[number]["key"]
  >(readingJourneyAchievements[0].key);
  const [confirmingSkip, setConfirmingSkip] = useState(false);
  const [skipPending, setSkipPending] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const earned = useMemo(
    () => new Set(learner.journey.achievements.map(({ key }) => key)),
    [learner.journey.achievements],
  );
  const selectedAchievement =
    readingJourneyAchievements.find(
      ({ key }) => key === selectedAchievementKey,
    ) ?? readingJourneyAchievements[0];
  const nextStage = getOfflineJourneyStage(learner);
  const completedLessons = learner.journey.lessons.filter(
    ({ status }) => status === "completed",
  ).length;
  const hasJourneyProgress =
    learner.journey.diagnostic.status !== "available" ||
    learner.journey.lessons.some(({ status }) => status !== "locked") ||
    learner.journey.finalAssessment.status !== "locked" ||
    learner.journey.achievements.length > 0;
  const milestones = [
    {
      key: "diagnostic",
      label: "Diagnostic Assessment",
      status: learner.journey.diagnostic.status,
    },
    ...learner.journey.lessons.map((lesson) => ({
      key: `lesson-${lesson.order}`,
      label: `Lesson ${lesson.order}: ${LESSON_NAMES[lesson.order - 1]}`,
      status: lesson.status,
    })),
    {
      key: "final-assessment",
      label: "Final Assessment",
      status: learner.journey.finalAssessment.status,
    },
  ];

  return (
    <main
      className="offline-dashboard"
      aria-label="Offline learner dashboard"
      data-screen="dashboard"
    >
      <div className="offline-dashboard__shell">
        <header className="offline-dashboard__header">
          <div>
            <p className="offline-dashboard__eyebrow">Your reading path</p>
            <h1>Welcome, {learner.profile.displayName}!</h1>
          </div>
          <div className="offline-dashboard__summary" aria-label="Progress">
            <strong>{completedLessons}/6</strong>
            <span>lessons complete</span>
          </div>
        </header>

        <section
          className="offline-dashboard__journey-card"
          aria-labelledby="offline-journey-title"
        >
          <div className="offline-dashboard__section-heading">
            <div>
              <p className="offline-dashboard__eyebrow">Continue offline</p>
              <h2 id="offline-journey-title">Your Reading Journey</h2>
            </div>
            {onOpenJourney ? (
              <button
                className="offline-button offline-dashboard__continue"
                type="button"
                disabled={nextStage === "complete"}
                onClick={onOpenJourney}
              >
                {nextStage === "complete" ? "Journey complete" : "Continue"}
              </button>
            ) : null}
          </div>

          <ol className="offline-dashboard__journey-list">
            {milestones.map((milestone, index) => (
              <li
                key={milestone.key}
                data-status={milestone.status}
                data-current={milestone.key === nextStage || undefined}
              >
                <JourneyIcon status={milestone.status} />
                <div>
                  <span>Step {index + 1}</span>
                  <strong>{milestone.label}</strong>
                </div>
                <span className="offline-dashboard__status">
                  {statusLabels[milestone.status]}
                </span>
              </li>
            ))}
          </ol>

          {nextStage === "diagnostic" && onSkipDiagnostic ? (
            <aside className="offline-dashboard__diagnostic-skip">
              <div>
                <strong>Need to begin lessons now?</strong>
                <p>
                  You can skip the Diagnostic Assessment and unlock Lesson 1.
                  Your diagnostic score will be recorded as skipped.
                </p>
              </div>
              {confirmingSkip ? (
                <div
                  className="offline-dashboard__skip-confirm"
                  role="group"
                  aria-label="Confirm skipping diagnostic"
                >
                  <button
                    className="offline-dashboard__skip-cancel"
                    type="button"
                    disabled={skipPending}
                    onClick={() => setConfirmingSkip(false)}
                  >
                    Keep Diagnostic
                  </button>
                  <button
                    className="offline-dashboard__skip-diagnostic"
                    type="button"
                    disabled={skipPending}
                    onClick={() => {
                      setSkipPending(true);
                      setSkipError(null);
                      void onSkipDiagnostic()
                        .catch((error: unknown) =>
                          setSkipError(
                            error instanceof Error
                              ? error.message
                              : "The Diagnostic could not be skipped.",
                          ),
                        )
                        .finally(() => setSkipPending(false));
                    }}
                  >
                    {skipPending ? "Saving…" : "Yes, skip Diagnostic"}
                  </button>
                </div>
              ) : (
                <button
                  className="offline-dashboard__skip-diagnostic"
                  type="button"
                  onClick={() => setConfirmingSkip(true)}
                >
                  Skip Diagnostic
                </button>
              )}
              {skipError ? <p role="alert">{skipError}</p> : null}
            </aside>
          ) : null}
        </section>

        <section
          className="offline-dashboard__achievements"
          aria-labelledby="offline-achievements-title"
        >
          <div className="offline-dashboard__section-heading">
            <div>
              <p className="offline-dashboard__eyebrow">Your collection</p>
              <h2 id="offline-achievements-title">Achievements</h2>
            </div>
            <strong className="offline-dashboard__achievement-count">
              {earned.size}/{readingJourneyAchievements.length}
            </strong>
          </div>

          <ul
            className="offline-dashboard__achievement-grid"
            aria-label="Reading Journey achievements"
          >
            {readingJourneyAchievements.map((achievement) => {
              const isEarned = earned.has(achievement.key);
              return (
                <li key={achievement.key} data-earned={isEarned || undefined}>
                  <button
                    type="button"
                    aria-label={`View ${achievement.name}: ${isEarned ? "Earned" : "Locked"}`}
                    aria-pressed={selectedAchievement.key === achievement.key}
                    onClick={() => setSelectedAchievementKey(achievement.key)}
                  >
                    <img src={achievement.iconPath} alt="" draggable="false" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div
            className="offline-dashboard__achievement-detail"
            data-earned={earned.has(selectedAchievement.key) || undefined}
            aria-live="polite"
          >
            <div>
              <strong>{selectedAchievement.name}</strong>
              <span>
                {earned.has(selectedAchievement.key) ? "Earned" : "Locked"}
              </span>
            </div>
            <p>{selectedAchievement.criteria}</p>
          </div>
        </section>

        {onResetProgress ? (
          <section
            className="offline-dashboard__reset"
            aria-labelledby="offline-reset-title"
          >
            <div>
              <p className="offline-dashboard__eyebrow">On this device</p>
              <h2 id="offline-reset-title">Reset progress</h2>
              <p>
                Start the Reading Journey again. This permanently removes your
                answers, scores, lesson checkpoints, and achievements.
              </p>
            </div>

            {confirmingReset ? (
              <div
                className="offline-dashboard__reset-confirm"
                role="group"
                aria-label="Confirm resetting progress"
              >
                <p>
                  Your reader name and device setup will stay saved. Journey
                  progress cannot be recovered after the reset.
                </p>
                <div>
                  <button
                    className="offline-dashboard__reset-cancel"
                    type="button"
                    disabled={resetPending}
                    onClick={() => {
                      setConfirmingReset(false);
                      setResetError(null);
                    }}
                  >
                    Keep my progress
                  </button>
                  <button
                    className="offline-dashboard__reset-confirm-button"
                    type="button"
                    disabled={resetPending}
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
                    {resetPending ? "Resetting…" : "Yes, reset progress"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="offline-dashboard__reset-open"
                type="button"
                disabled={!hasJourneyProgress}
                onClick={() => setConfirmingReset(true)}
              >
                {hasJourneyProgress ? "Reset progress" : "No progress to reset"}
              </button>
            )}
            {resetError ? <p role="alert">{resetError}</p> : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
