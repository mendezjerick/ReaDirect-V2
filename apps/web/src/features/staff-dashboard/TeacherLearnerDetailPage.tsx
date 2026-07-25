import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { teacherNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  loadStaffSession,
} from "../staff-auth/staffApi";
import {
  getTeacherLearnerDetail,
  type TeacherLearnerAssessment,
  type TeacherLearnerLesson,
  type TeacherLearnerLessonItem,
} from "./teacherLearnerDetailApi";

function formatDate(value: string | null): string {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function humanize(value: string | null): string {
  if (!value) {
    return "Not recorded";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function score(value: number | null, suffix = ""): string {
  return value === null ? "—" : `${value}${suffix}`;
}

interface AssessmentSummaryProps {
  label: string;
  assessment: TeacherLearnerAssessment | null;
}

function AssessmentSummary({
  label,
  assessment,
}: AssessmentSummaryProps) {
  return (
    <Surface
      kind="panel"
      padding="normal"
      className="teacher-learner-assessment-card"
    >
      <header>
        <div>
          <p>ReaDirect Assessment</p>
          <h2>{label}</h2>
        </div>
        <span
          className={`teacher-learner-status teacher-learner-status--${
            assessment?.status ?? "not-started"
          }`}
        >
          {assessment ? humanize(assessment.status) : "Not started"}
        </span>
      </header>

      {assessment ? (
        <>
          <dl className="teacher-learner-score-grid">
            <div>
              <dt>Part 1 Score</dt>
              <dd>{score(assessment.part_one_score, "/30")}</dd>
            </div>
            <div>
              <dt>Part 1 level</dt>
              <dd>{assessment.part_one_level ?? "Pending"}</dd>
            </div>
            <div>
              <dt>Reading accuracy</dt>
              <dd>{score(assessment.reading_accuracy_percent, "%")}</dd>
            </div>
            <div>
              <dt>Comprehension</dt>
              <dd>
                {assessment.comprehension_score === null
                  ? "—"
                  : `${assessment.comprehension_score}/5`}
              </dd>
            </div>
            <div>
              <dt>Final score</dt>
              <dd>{score(assessment.final_reading_score, "/100")}</dd>
            </div>
            <div>
              <dt>Reading profile</dt>
              <dd>{assessment.final_reading_profile ?? "Pending"}</dd>
            </div>
          </dl>

          <div className="teacher-learner-task-scores">
            <span>Task 1A: {score(assessment.task_scores.task_1a, "/10")}</span>
            <span>Task 2A: {score(assessment.task_scores.task_2a, "/10")}</span>
            <span>Task 2B: {score(assessment.task_scores.task_2b, "/10")}</span>
          </div>

          <footer>
            <span>{assessment.responses_recorded} responses recorded</span>
            <span>{assessment.skipped_items} skipped</span>
            <span>Completed {formatDate(assessment.completed_at)}</span>
          </footer>
        </>
      ) : (
        <p className="teacher-learner-empty-copy">
          No persisted {label.toLowerCase()} run is available.
        </p>
      )}
    </Surface>
  );
}

function LessonItemEvidence({ item }: { item: TeacherLearnerLessonItem }) {
  return (
    <article className="teacher-learner-item">
      <header>
        <div>
          <span>
            {humanize(item.mission_key)} · Item {item.item_order}
          </span>
          <h4>{item.target_label}</h4>
        </div>
        <span
          className={`teacher-learner-status teacher-learner-status--${
            item.review_recommended ? "review" : "recorded"
          }`}
        >
          {item.review_recommended ? "Review recommended" : humanize(item.outcome)}
        </span>
      </header>

      <dl className="teacher-learner-item-facts">
        <div>
          <dt>Final transcript</dt>
          <dd>{item.final_transcript ?? "Not persisted for this item type"}</dd>
        </div>
        <div>
          <dt>Outcome</dt>
          <dd>{humanize(item.outcome)}</dd>
        </div>
        <div>
          <dt>Academic attempts</dt>
          <dd>{item.academic_attempt_count}</dd>
        </div>
        <div>
          <dt>Technical retries</dt>
          <dd>{item.technical_retry_count}</dd>
        </div>
        <div>
          <dt>Highest scaffold</dt>
          <dd>{humanize(item.highest_scaffold_used)}</dd>
        </div>
        <div>
          <dt>Saved observation</dt>
          <dd>{humanize(item.diagnosis_key)}</dd>
        </div>
      </dl>

      {item.attempts.length > 0 ? (
        <div className="teacher-learner-attempts">
          <h5>Attempt evidence</h5>
          <ol>
            {item.attempts.map((attempt) => (
              <li
                className={
                  attempt.incorrect
                    ? "teacher-learner-attempt teacher-learner-attempt--incorrect"
                    : "teacher-learner-attempt"
                }
                key={attempt.attempt_id}
              >
                <div>
                  <strong>
                    Attempt {attempt.attempt_sequence} ·{" "}
                    {humanize(attempt.attempt_kind)}
                  </strong>
                  <span>{humanize(attempt.classification)}</span>
                </div>
                <p>
                  {attempt.final_transcript ??
                    attempt.selected_response ??
                    "No final transcript or selected answer was persisted."}
                </p>
                <small>
                  Scaffold: {humanize(attempt.scaffold_level)}
                  {attempt.incorrect ? " · Clear incorrect attempt" : ""}
                </small>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </article>
  );
}

function LessonEvidence({ lesson }: { lesson: TeacherLearnerLesson }) {
  const recorded = lesson.status !== "not_started";

  return (
    <details
      className="teacher-learner-lesson"
      open={lesson.performance.review_recommended > 0}
    >
      <summary>
        <div className="teacher-learner-lesson__identity">
          <span>Lesson {lesson.order}</span>
          <strong>{lesson.title}</strong>
        </div>
        <div className="teacher-learner-lesson__summary">
          <span
            className={`teacher-learner-status teacher-learner-status--${lesson.status.replace("_", "-")}`}
          >
            {humanize(lesson.status)}
          </span>
          <small>
            {recorded
              ? `${lesson.items_recorded}/${lesson.items_total} items recorded`
              : "No run"}
          </small>
        </div>
      </summary>

      <div className="teacher-learner-lesson__body">
        <dl className="teacher-learner-performance-grid">
          <div>
            <dt>Independent</dt>
            <dd>{lesson.performance.independent_correct}</dd>
          </div>
          <div>
            <dt>Supported</dt>
            <dd>{lesson.performance.supported_correct}</dd>
          </div>
          <div>
            <dt>Demonstrated</dt>
            <dd>{lesson.performance.demonstrated}</dd>
          </div>
          <div>
            <dt>Not yet correct</dt>
            <dd>{lesson.performance.not_yet_correct}</dd>
          </div>
          <div>
            <dt>Skipped</dt>
            <dd>{lesson.performance.skipped}</dd>
          </div>
          <div>
            <dt>Practice attempts</dt>
            <dd>{lesson.performance.practice_attempts}</dd>
          </div>
          <div>
            <dt>Technical retries</dt>
            <dd>{lesson.performance.technical_retries}</dd>
          </div>
          <div>
            <dt>Review items</dt>
            <dd>{lesson.performance.review_recommended}</dd>
          </div>
        </dl>

        {lesson.items.length > 0 ? (
          <div className="teacher-learner-items">
            {lesson.items.map((item) => (
              <LessonItemEvidence item={item} key={item.response_id} />
            ))}
          </div>
        ) : (
          <p className="teacher-learner-empty-copy">
            No persisted item evidence is available for this lesson.
          </p>
        )}
      </div>
    </details>
  );
}

export function TeacherLearnerDetailPage() {
  const navigate = useNavigate();
  const { learnerId } = useParams();
  const [session] = useState(loadStaffSession);
  const exitCommit = useButtonCommit();
  const backCommit = useButtonCommit();
  const teacherSession = session?.staff.role === "teacher" ? session : null;
  const parsedLearnerId = Number(learnerId);
  const validLearnerId =
    Number.isInteger(parsedLearnerId) && parsedLearnerId > 0
      ? parsedLearnerId
      : null;
  const detailQuery = useQuery({
    queryKey: [
      "teacher-learner-detail",
      teacherSession?.staff.id,
      validLearnerId,
    ],
    queryFn: () =>
      getTeacherLearnerDetail(
        teacherSession!.staff.id,
        validLearnerId as number,
      ),
    enabled: teacherSession !== null && validLearnerId !== null,
    retry: false,
  });

  if (!teacherSession) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>Teacher sign-in required</h1>
          <p>Return to staff login to review Learner progress.</p>
          <BigButton onClick={() => navigate("/staff/login")}>
            Go to staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  const accountLabel =
    teacherSession.staff.username ?? teacherSession.staff.display_name;
  const school = teacherSession.staff.school;
  const accountMeta = school
    ? `${school.name} · Grade ${teacherSession.staff.grade_level ?? "—"} ${
        teacherSession.staff.section ?? ""
      }`
    : "Teacher account";

  return (
    <StaffShell
      accountLabel={accountLabel}
      accountMeta={accountMeta}
      administrationLabel="Teacher workspace"
      avatarLabel="TR"
      brandIcon={<StaffBrandIcon />}
      exitCommitting={exitCommit.committing}
      navigationGroups={teacherNavigationGroups}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      workspaceLabel="Teacher"
    >
      <div className="staff-workspace-page teacher-learner-detail-page">
        <div className="teacher-learner-detail-toolbar">
          <BigButton
            variant="secondary"
            size="regular"
            committing={backCommit.committing}
            onClick={() =>
              backCommit.commit(() => navigate("/staff/teacher/learners"))
            }
          >
            Back to Learners
          </BigButton>
        </div>

        {validLearnerId === null ? (
          <Surface
            kind="notice"
            padding="normal"
            className="teacher-learner-load-state"
            role="alert"
          >
            <h1>Learner unavailable</h1>
            <p>The Learner identifier in this address is invalid.</p>
          </Surface>
        ) : null}

        {validLearnerId !== null && detailQuery.isLoading ? (
          <div
            className="teacher-learner-load-state"
            aria-live="polite"
            aria-busy="true"
          >
            Loading Learner workspace…
          </div>
        ) : null}

        {detailQuery.isError ? (
          <Surface
            kind="notice"
            padding="normal"
            className="teacher-learner-load-state"
            role="alert"
          >
            <h1>Learner workspace unavailable</h1>
            <p>
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "The Learner workspace could not be loaded."}
            </p>
            <BigButton
              variant="secondary"
              size="regular"
              onClick={() => void detailQuery.refetch()}
            >
              Retry
            </BigButton>
          </Surface>
        ) : null}

        {detailQuery.data ? (
          <>
            <StaffPageHeader
              eyebrow="Learner progress"
              title={detailQuery.data.learner.full_name}
              description={`${detailQuery.data.class_context.school?.name ?? "School not recorded"} · Grade ${
                detailQuery.data.class_context.grade_level ?? "—"
              } · ${detailQuery.data.class_context.section ?? "Section not recorded"}`}
              badge={
                <span className="staff-count-badge">
                  {detailQuery.data.learner.learner_code}
                </span>
              }
            />

            <section
              className="teacher-learner-context-grid"
              aria-label="Learner identity and progression"
            >
              <Surface kind="panel" padding="normal">
                <p className="teacher-learner-card-eyebrow">Identity</p>
                <dl className="teacher-learner-context-list">
                  <div>
                    <dt>Learner Code</dt>
                    <dd>{detailQuery.data.learner.learner_code}</dd>
                  </div>
                  <div>
                    <dt>LRN</dt>
                    <dd>{detailQuery.data.learner.lrn ?? "Not entered"}</dd>
                  </div>
                  <div>
                    <dt>Account</dt>
                    <dd>
                      {detailQuery.data.learner.is_active
                        ? "Active"
                        : "Inactive"}
                    </dd>
                  </div>
                </dl>
              </Surface>

              <Surface kind="panel" padding="normal">
                <p className="teacher-learner-card-eyebrow">
                  Persisted progression
                </p>
                <h2>{detailQuery.data.progression.stage_label}</h2>
                <dl className="teacher-learner-context-list">
                  <div>
                    <dt>Diagnostic completed</dt>
                    <dd>
                      {formatDate(
                        detailQuery.data.progression.diagnostic_completed_at,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Final completed</dt>
                    <dd>
                      {formatDate(
                        detailQuery.data.progression
                          .final_assessment_completed_at,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Last confirmed</dt>
                    <dd>
                      {formatDate(
                        detailQuery.data.progression.last_confirmed_at,
                      )}
                    </dd>
                  </div>
                </dl>
              </Surface>
            </section>

            <section
              className="teacher-learner-section"
              aria-labelledby="learner-assessments-title"
            >
              <header className="teacher-learner-section__header">
                <div>
                  <p>Assessment evidence</p>
                  <h2 id="learner-assessments-title">
                    Diagnostic and Final Assessment
                  </h2>
                </div>
                <span>Read-only persisted summaries</span>
              </header>
              <div className="teacher-learner-assessment-grid">
                <AssessmentSummary
                  label="Diagnostic Assessment"
                  assessment={detailQuery.data.assessments.diagnostic}
                />
                <AssessmentSummary
                  label="Final Assessment"
                  assessment={detailQuery.data.assessments.final}
                />
              </div>
            </section>

            {detailQuery.data.skipped_assessment_items.length > 0 ? (
              <section
                className="teacher-learner-section"
                aria-labelledby="skipped-assessment-title"
              >
                <header className="teacher-learner-section__header">
                  <div>
                    <p>Saved skips</p>
                    <h2 id="skipped-assessment-title">
                      Skipped assessment items
                    </h2>
                  </div>
                </header>
                <div className="teacher-learner-skip-list">
                  {detailQuery.data.skipped_assessment_items.map((item) => (
                    <article
                      key={`${item.assessment_type}:${item.task_key}:${item.item_key}`}
                    >
                      <div>
                        <strong>
                          {item.assessment_label} · {item.task_label}
                        </strong>
                        <span>
                          Item {item.item_order}: {item.item_label}
                        </span>
                      </div>
                      <small>{formatDate(item.recorded_at)}</small>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section
              className="teacher-learner-section"
              aria-labelledby="learner-lessons-title"
            >
              <header className="teacher-learner-section__header">
                <div>
                  <p>Lesson evidence</p>
                  <h2 id="learner-lessons-title">
                    Completion and performance
                  </h2>
                </div>
                <span>Open a lesson to inspect saved item evidence</span>
              </header>
              <div className="teacher-learner-lessons">
                {detailQuery.data.lessons.map((lesson) => (
                  <LessonEvidence lesson={lesson} key={lesson.lesson_key} />
                ))}
              </div>
            </section>

            <section
              className="teacher-learner-section"
              aria-labelledby="learner-recommendations-title"
            >
              <header className="teacher-learner-section__header">
                <div>
                  <p>Evidence-based follow-up</p>
                  <h2 id="learner-recommendations-title">
                    Review recommendations
                  </h2>
                </div>
                <span>Derived only from persisted review flags and skips</span>
              </header>
              {detailQuery.data.recommendations.length > 0 ? (
                <div className="teacher-learner-recommendations">
                  {detailQuery.data.recommendations.map((recommendation) => (
                    <article key={recommendation.key}>
                      <span aria-hidden="true">!</span>
                      <div>
                        <h3>{recommendation.title}</h3>
                        <p>{recommendation.reason}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <Surface kind="panel" padding="normal">
                  <p className="teacher-learner-empty-copy">
                    No persisted review flags or skipped items are available.
                    ReaDirect does not infer additional conclusions.
                  </p>
                </Surface>
              )}
            </section>
          </>
        ) : null}
      </div>
    </StaffShell>
  );
}
