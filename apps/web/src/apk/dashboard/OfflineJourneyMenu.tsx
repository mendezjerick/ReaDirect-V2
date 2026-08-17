import { useState } from "react";

import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import {
  AssessmentIcon,
  BookIcon,
  JourneyActivity,
  SpeechLanguageSwitch,
} from "../../features/lesson-intro/LessonIntroPage";
import { ThemeSelector } from "../../features/theme/ThemeSelector";
import "../../features/lesson-intro/lesson-intro.css";

import type {
  OfflineJourneyStage,
  OfflineLearnerState,
} from "../storage/offlineLearnerState";
export function OfflineJourneyMenu({
  learner,
  onBack,
  onSelectActivity,
  onSkipDiagnostic,
  onLanguageChange,
}: {
  learner: OfflineLearnerState;
  onBack: () => void;
  onSelectActivity: (stage: OfflineJourneyStage) => void;
  onSkipDiagnostic: () => Promise<void>;
  onLanguageChange: (language: "en" | "fil-PH") => Promise<void>;
}) {
  const [confirmingSkip, setConfirmingSkip] = useState(false);
  const [skipPending, setSkipPending] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [languagePending, setLanguagePending] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const diagnostic = learner.journey.diagnostic;
  const finalAssessment = learner.journey.finalAssessment;
  const lessonsUnlocked = diagnostic.status === "completed";
  const completedLessonCount = learner.journey.lessons.filter(
    ({ status }) => status === "completed",
  ).length;
  const remainingLessons = 6 - completedLessonCount;

  return (
    <main
      className="reading-journey-menu learner-flow-page offline-journey-menu"
      aria-labelledby="reading-journey-title"
      data-screen="journey"
      data-diagnostic-skip-available={
        diagnostic.status === "available" || undefined
      }
      tabIndex={-1}
    >
      <ThemeSelector />
      <div className="reading-journey-menu__shell">
        <Surface
          className="reading-journey-menu__header-surface"
          kind="panel"
          padding="normal"
        >
          <header className="reading-journey-menu__header">
            <div className="reading-journey-menu__header-copy">
              <p className="reading-journey-menu__eyebrow">
                Choose your next activity
              </p>
              <h1 id="reading-journey-title">My Reading Journey</h1>
              <p>Choose what you want to work on.</p>
            </div>
            <div className="reading-journey-menu__header-actions">
              <div
                className="reading-journey-menu__count"
                aria-label={`${completedLessonCount} of 6 lessons complete`}
              >
                <strong>{completedLessonCount} of 6</strong>
                <span>lessons complete</span>
              </div>
              <BigButton
                className="reading-journey-menu__back"
                variant="quiet"
                size="regular"
                onClick={onBack}
              >
                Back to Dashboard
              </BigButton>
            </div>
          </header>
        </Surface>

        <section aria-labelledby="speech-language-title">
          <SpeechLanguageSwitch
            selectedLanguage={learner.setup.speechLanguage}
            filipinoAvailable
            checkingAvailability={false}
            saving={languagePending}
            errorMessage={languageError}
            onToggle={() => {
              const language =
                learner.setup.speechLanguage === "fil-PH" ? "en" : "fil-PH";
              setLanguagePending(true);
              setLanguageError(null);
              void onLanguageChange(language)
                .catch((error: unknown) =>
                  setLanguageError(
                    error instanceof Error
                      ? error.message
                      : "Clara's spoken language could not be saved.",
                  ),
                )
                .finally(() => setLanguagePending(false));
            }}
          />
        </section>

        <section
          className="reading-journey-menu__assessment"
          aria-label="Diagnostic Assessment"
        >
          <JourneyActivity
            title="Diagnostic Assessment"
            description={
              diagnostic.status === "completed"
                ? diagnostic.currentPhase === "skipped"
                  ? "Skipped · Score 0"
                  : `Completed${diagnostic.score === null ? "" : ` · Score ${diagnostic.score}`}`
                : diagnostic.status === "in_progress"
                  ? "Continue from your saved place"
                  : "Find your best starting point"
            }
            statusLabel={
              diagnostic.status === "completed"
                ? diagnostic.currentPhase === "skipped"
                  ? "Skipped"
                  : "Completed"
                : diagnostic.status === "in_progress"
                  ? "Resume"
                  : "Start"
            }
            icon={<AssessmentIcon />}
            completed={diagnostic.status === "completed"}
            onSelect={
              diagnostic.status === "completed"
                ? undefined
                : () => onSelectActivity("diagnostic")
            }
          />
        </section>

        <section
          className="reading-journey-menu__lessons"
          aria-labelledby="reading-lessons-title"
        >
          <Surface
            className="reading-journey-menu__lessons-surface"
            kind="panel"
            padding="normal"
          >
            <div className="reading-journey-menu__section-heading">
              <div>
                <p className="reading-journey-menu__eyebrow">Your lessons</p>
                <h2 id="reading-lessons-title">Reading Lessons</h2>
              </div>
              <span>
                {lessonsUnlocked
                  ? "Choose any lesson"
                  : "Complete or skip the Diagnostic first"}
              </span>
            </div>
            <div className="reading-journey-menu__lesson-grid">
              {learner.journey.lessons.map((lesson) => {
                const locked = !lessonsUnlocked;
                const completed = lesson.status === "completed";
                const statusLabel = locked
                  ? "Locked"
                  : lesson.status === "available"
                    ? "Start"
                    : lesson.status === "in_progress"
                      ? "Resume"
                      : "Completed";
                return (
                  <JourneyActivity
                    key={lesson.order}
                    title={`Lesson ${lesson.order}`}
                    description={
                      locked
                        ? "Waiting for your starting check"
                        : completed
                          ? "Lesson completed"
                          : lesson.status === "in_progress"
                            ? "Continue from your saved place"
                            : "Ready when you are"
                    }
                    statusLabel={statusLabel}
                    icon={<BookIcon />}
                    completed={completed}
                    locked={locked}
                    onSelect={
                      completed
                        ? undefined
                        : () =>
                            onSelectActivity(
                              `lesson-${lesson.order}` as OfflineJourneyStage,
                            )
                    }
                  />
                );
              })}
            </div>
          </Surface>
        </section>

        <section
          className="reading-journey-menu__assessment"
          aria-label="Final Assessment"
        >
          <JourneyActivity
            title="Final Assessment"
            description={
              finalAssessment.status === "locked"
                ? `Complete ${remainingLessons} more ${remainingLessons === 1 ? "lesson" : "lessons"}`
                : finalAssessment.status === "completed"
                  ? "Reading Journey completed"
                  : finalAssessment.status === "in_progress"
                    ? "Continue from your saved place"
                    : "Show how much your reading has grown"
            }
            statusLabel={
              finalAssessment.status === "locked"
                ? "Locked"
                : finalAssessment.status === "available"
                  ? "Start"
                  : finalAssessment.status === "in_progress"
                    ? "Resume"
                    : "Completed"
            }
            icon={<AssessmentIcon final />}
            completed={finalAssessment.status === "completed"}
            locked={finalAssessment.status === "locked"}
            onSelect={
              finalAssessment.status === "completed"
                ? undefined
                : () => onSelectActivity("final-assessment")
            }
          />
        </section>

        {diagnostic.status === "available" ? (
          <footer className="reading-journey-menu__footer">
            <BigButton
              className="reading-journey-menu__skip"
              variant="secondary"
              size="regular"
              onClick={() => setConfirmingSkip(true)}
            >
              Skip Diagnostic
            </BigButton>
          </footer>
        ) : null}
      </div>

      {confirmingSkip ? (
        <div className="reading-journey-dialog-backdrop">
          <Surface
            className="reading-journey-dialog"
            kind="frame"
            padding="roomy"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="skip-diagnostic-title"
            aria-describedby="skip-diagnostic-description"
          >
            <div className="reading-journey-dialog__icon" aria-hidden="true">
              !
            </div>
            <h2 id="skip-diagnostic-title">Skip the Diagnostic?</h2>
            <p id="skip-diagnostic-description">
              This records the Diagnostic as skipped with a score of 0 and
              unlocks all six reading lessons.
            </p>
            {skipError ? (
              <p className="reading-journey-dialog__error" role="alert">
                {skipError}
              </p>
            ) : null}
            <div className="reading-journey-dialog__actions">
              <BigButton
                variant="secondary"
                size="regular"
                autoFocus
                disabled={skipPending}
                onClick={() => setConfirmingSkip(false)}
              >
                Keep Diagnostic
              </BigButton>
              <BigButton
                size="regular"
                busy={skipPending}
                busyLabel="Skipping"
                onClick={() => {
                  setSkipPending(true);
                  setSkipError(null);
                  void onSkipDiagnostic()
                    .then(() => setConfirmingSkip(false))
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
                Skip and unlock lessons
              </BigButton>
            </div>
          </Surface>
        </div>
      ) : null}
    </main>
  );
}
