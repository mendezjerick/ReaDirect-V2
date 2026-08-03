import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  getLearnerSession,
  loadLearnerSession,
  saveLearnerSession,
  skipDiagnostic,
  type LearnerReadingPath,
} from "../learner-auth/learnerApi";
import { ThemeSelector } from "../theme/ThemeSelector";
import "./lesson-intro.css";

interface JourneyActivityProps {
  title: string;
  description: string;
  statusLabel: string;
  icon: ReactNode;
  completed?: boolean;
  locked?: boolean;
  onSelect?: () => void;
}

function AssessmentIcon({ final = false }: { final?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M14 6h20v6H14zM10 10h28v32H10z" />
      <path d="m17 23 4 4 9-10M17 34h14" />
      {final ? (
        <path d="m24 4 2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.8-3.7 5.2-.8z" />
      ) : null}
    </svg>
  );
}

function BookIcon() {
  return (
    <img
      className="reading-journey-card__book-icon"
      src="/assets/icons/book.png"
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}

function JourneyActivity({
  title,
  description,
  statusLabel,
  icon,
  completed = false,
  locked = false,
  onSelect,
}: JourneyActivityProps) {
  return (
    <BigButton
      className="reading-journey-card"
      variant={locked ? "unavailable" : completed ? "completed" : "primary"}
      size="large"
      data-status={completed ? "completed" : locked ? "locked" : "available"}
      disabled={locked}
      aria-label={`${title}. ${statusLabel}. ${description}`}
      onClick={onSelect}
    >
      <span className="reading-journey-card__layout">
        <span className="reading-journey-card__icon">{icon}</span>
        <span className="reading-journey-card__copy">
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className="reading-journey-card__status">
          <span className="reading-journey-card__state-icon">
            {completed ? <CheckIcon /> : locked ? <LockIcon /> : null}
          </span>
          <span>{statusLabel}</span>
        </span>
      </span>
    </BigButton>
  );
}

function diagnosticCard(path: LearnerReadingPath) {
  const status = path.diagnostic.status;
  const completed = status === "completed" || status === "skipped";

  return {
    completed,
    description:
      status === "skipped"
        ? "Skipped · Score 0"
        : status === "completed"
          ? `Completed${path.diagnostic.score === null ? "" : ` · Score ${path.diagnostic.score}`}`
          : "Find your best starting point",
    statusLabel:
      status === "required"
        ? "Start"
        : status === "in_progress"
          ? "Resume"
          : status === "skipped"
            ? "Skipped"
            : "Completed",
    route: completed
      ? "/learner/assessment/complete"
      : "/learner/assessment/part-one",
  };
}

function finalCard(path: LearnerReadingPath) {
  const status = path.final_assessment.status;
  const remaining = 6 - path.completed_lesson_count;

  return {
    completed: status === "completed",
    locked: status === "locked",
    description:
      status === "locked"
        ? `Complete ${remaining} more ${remaining === 1 ? "lesson" : "lessons"}`
        : status === "completed"
          ? "Reading Journey completed"
          : "Show how much your reading has grown",
    statusLabel:
      status === "locked"
        ? "Locked"
        : status === "available"
          ? "Start"
          : status === "in_progress"
            ? "Resume"
            : "Completed",
    route:
      status === "completed"
        ? "/learner/final-assessment/complete"
        : "/learner/final-assessment/part-one",
  };
}

export function ReadingJourneyMenuPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activityCommit = useButtonCommit();
  const skipCommit = useButtonCommit();
  const storedSession = loadLearnerSession();
  const queryKey = ["learner-session", storedSession?.token] as const;
  const [confirmingSkip, setConfirmingSkip] = useState(false);
  const sessionQuery = useQuery({
    queryKey,
    queryFn: () => getLearnerSession(storedSession?.token ?? ""),
    enabled: Boolean(storedSession?.token),
    initialData: storedSession
      ? {
          reading_path: storedSession.reading_path,
          learner: storedSession.learner,
          session: storedSession.session,
        }
      : undefined,
    refetchOnMount: "always",
  });
  const skipMutation = useMutation({
    mutationFn: () => skipDiagnostic(storedSession?.token ?? ""),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
    },
    onSuccess: (readingPath) => {
      if (!storedSession || !sessionQuery.data) return;
      const updatedSession = {
        ...sessionQuery.data,
        reading_path: readingPath,
      };
      queryClient.setQueryData(queryKey, updatedSession);
      saveLearnerSession({ token: storedSession.token, ...updatedSession });
      setConfirmingSkip(false);
    },
  });

  useEffect(() => {
    if (!storedSession?.token) {
      navigate("/learner/login", { replace: true });
    }
  }, [navigate, storedSession?.token]);

  useEffect(() => {
    if (storedSession?.token && sessionQuery.data) {
      saveLearnerSession({ token: storedSession.token, ...sessionQuery.data });
    }
  }, [sessionQuery.data, storedSession?.token]);

  if (!storedSession) {
    return null;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <main
        className="reading-journey-menu learner-flow-page"
        data-route-focus
        tabIndex={-1}
      >
        <ThemeSelector />
        <Surface
          className="reading-journey-menu__error"
          kind="frame"
          padding="roomy"
        >
          <p className="reading-journey-menu__eyebrow">My Reading Journey</p>
          <h1>Your journey could not load</h1>
          <p>Check your connection, then try again.</p>
          <BigButton size="regular" onClick={() => void sessionQuery.refetch()}>
            Try again
          </BigButton>
          <BigButton
            variant="quiet"
            size="regular"
            onClick={() => navigate("/learner/dashboard")}
          >
            Back to Dashboard
          </BigButton>
        </Surface>
      </main>
    );
  }

  const path = sessionQuery.data.reading_path;
  const diagnostic = diagnosticCard(path);
  const finalAssessment = finalCard(path);
  const lessonsUnlocked = ["completed", "skipped"].includes(
    path.diagnostic.status,
  );

  const selectActivity = (route: string) => {
    activityCommit.commit(() => navigate(route));
  };

  return (
    <main
      className="reading-journey-menu learner-flow-page"
      aria-labelledby="reading-journey-title"
      data-route-focus
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
                aria-label={`${path.completed_lesson_count} of 6 lessons complete`}
              >
                <strong>{path.completed_lesson_count} of 6</strong>
                <span>lessons complete</span>
              </div>
              <BigButton
                className="reading-journey-menu__back"
                variant="quiet"
                size="regular"
                onClick={() => navigate("/learner/dashboard")}
              >
                Back to Dashboard
              </BigButton>
            </div>
          </header>
        </Surface>

        <section
          className="reading-journey-menu__assessment"
          aria-label="Diagnostic Assessment"
        >
          <JourneyActivity
            title="Diagnostic Assessment"
            description={diagnostic.description}
            statusLabel={diagnostic.statusLabel}
            icon={<AssessmentIcon />}
            completed={diagnostic.completed}
            onSelect={() => selectActivity(diagnostic.route)}
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
              {path.lessons.map((lesson) => {
                const locked = !lessonsUnlocked;
                const completed = lesson.status === "completed";
                const statusLabel = locked
                  ? "Locked"
                  : lesson.status === "not_started"
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
                    onSelect={() =>
                      selectActivity(`/learner/lessons/${lesson.order}`)
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
            description={finalAssessment.description}
            statusLabel={finalAssessment.statusLabel}
            icon={<AssessmentIcon final />}
            completed={finalAssessment.completed}
            locked={finalAssessment.locked}
            onSelect={() => selectActivity(finalAssessment.route)}
          />
        </section>

        {["required", "in_progress"].includes(path.diagnostic.status) ? (
          <button
            className="reading-journey-menu__skip"
            type="button"
            onClick={() => setConfirmingSkip(true)}
          >
            Skip Diagnostic
          </button>
        ) : null}

        {sessionQuery.isFetching ? (
          <p className="reading-journey-menu__sync" role="status">
            Updating your journey…
          </p>
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
              This records the Diagnostic Assessment as skipped with a score of
              0. All six reading lessons will unlock.
            </p>
            {skipMutation.isError ? (
              <p className="reading-journey-dialog__error" role="alert">
                {skipMutation.error.message}
              </p>
            ) : null}
            <div className="reading-journey-dialog__actions">
              <BigButton
                variant="secondary"
                size="regular"
                autoFocus
                disabled={skipMutation.isPending}
                onClick={() => setConfirmingSkip(false)}
              >
                Keep Diagnostic
              </BigButton>
              <BigButton
                size="regular"
                busy={skipMutation.isPending}
                busyLabel="Skipping"
                committing={skipCommit.committing}
                onClick={() => skipCommit.commit(() => skipMutation.mutate())}
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

export const LessonIntroPage = ReadingJourneyMenuPage;
