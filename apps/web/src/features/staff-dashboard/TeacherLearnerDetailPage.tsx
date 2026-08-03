import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import {
  StaffContentGrid,
  StaffDisclosure,
  StaffFactGrid,
  StaffWorkspacePage,
} from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { teacherNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { clearStaffSession, loadStaffSession } from "../staff-auth/staffApi";
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

function AssessmentSummary({ label, assessment }: AssessmentSummaryProps) {
  return (
    <StaffCard>
      <StaffSectionHeader
        eyebrow="ReaDirect Assessment"
        title={label}
        meta={
          <StaffBadge
            tone={
              assessment?.completion_mode === "skipped"
                ? "warning"
                : assessment?.status === "completed"
                  ? "success"
                  : assessment
                    ? "accent"
                    : "muted"
            }
          >
            {assessment?.completion_mode === "skipped"
              ? "Skipped"
              : assessment
                ? humanize(assessment.status)
                : "Not started"}
          </StaffBadge>
        }
      />

      {assessment ? (
        <>
          <StaffFactGrid
            facts={[
              {
                label: "Part 1 Score",
                value: score(assessment.part_one_score, "/30"),
              },
              {
                label: "Part 1 level",
                value: assessment.part_one_level ?? "Pending",
              },
              {
                label: "Reading accuracy",
                value: score(assessment.reading_accuracy_percent, "%"),
              },
              {
                label: "Comprehension",
                value:
                  assessment.comprehension_score === null
                    ? "—"
                    : `${assessment.comprehension_score}/5`,
              },
              {
                label: "Final score",
                value: score(assessment.final_reading_score, "/100"),
              },
              {
                label: "Reading profile",
                value:
                  assessment.completion_mode === "skipped"
                    ? "Not measured · Diagnostic skipped"
                    : (assessment.final_reading_profile ?? "Pending"),
              },
            ]}
          />

          <div className="staff-badge-row">
            <StaffBadge>
              Task 1A: {score(assessment.task_scores.task_1a, "/10")}
            </StaffBadge>
            <StaffBadge>
              Task 2A: {score(assessment.task_scores.task_2a, "/10")}
            </StaffBadge>
            <StaffBadge>
              Task 2B: {score(assessment.task_scores.task_2b, "/10")}
            </StaffBadge>
          </div>

          <div className="staff-badge-row">
            <StaffBadge>
              {assessment.responses_recorded} responses recorded
            </StaffBadge>
            <StaffBadge tone={assessment.skipped_items ? "warning" : "muted"}>
              {assessment.skipped_items} skipped
            </StaffBadge>
            <StaffBadge>
              Completed {formatDate(assessment.completed_at)}
            </StaffBadge>
          </div>
        </>
      ) : (
        <StaffState
          compact
          title={`No persisted ${label.toLowerCase()} run is available.`}
        />
      )}
    </StaffCard>
  );
}

function LessonItemEvidence({ item }: { item: TeacherLearnerLessonItem }) {
  return (
    <StaffCard depth="flat">
      <StaffSectionHeader
        eyebrow={`${humanize(item.mission_key)} · Item ${item.item_order}`}
        title={item.target_label}
        meta={
          <StaffBadge tone={item.review_recommended ? "warning" : "neutral"}>
            {item.review_recommended
              ? "Review recommended"
              : humanize(item.outcome)}
          </StaffBadge>
        }
      />

      <StaffFactGrid
        facts={[
          {
            label: "Final transcript",
            value: item.final_transcript ?? "Not persisted for this item type",
          },
          { label: "Outcome", value: humanize(item.outcome) },
          {
            label: "Academic attempts",
            value: item.academic_attempt_count,
          },
          {
            label: "Technical retries",
            value: item.technical_retry_count,
          },
          {
            label: "Highest scaffold",
            value: humanize(item.highest_scaffold_used),
          },
          {
            label: "Saved observation",
            value: humanize(item.diagnosis_key),
          },
        ]}
      />

      {item.attempts.length > 0 ? (
        <StaffDataTable
          accessibleLabel="Attempt evidence"
          rows={item.attempts}
          rowKey={(attempt) => attempt.attempt_id}
          columns={[
            {
              key: "attempt",
              label: "Attempt",
              width: "minmax(10rem, 0.8fr)",
              render: (attempt) => (
                <span className="staff-primary-value">
                  <strong>
                    Attempt {attempt.attempt_sequence} ·{" "}
                    {humanize(attempt.attempt_kind)}
                  </strong>
                  <small>{humanize(attempt.classification)}</small>
                </span>
              ),
            },
            {
              key: "response",
              label: "Saved response",
              render: (attempt) =>
                attempt.final_transcript ??
                attempt.selected_response ??
                "No final transcript or selected answer was persisted.",
            },
            {
              key: "support",
              label: "Support",
              render: (attempt) => (
                <span className="staff-primary-value">
                  <span>Scaffold: {humanize(attempt.scaffold_level)}</span>
                  {attempt.incorrect ? (
                    <StaffBadge tone="danger">
                      Clear incorrect attempt
                    </StaffBadge>
                  ) : null}
                </span>
              ),
            },
          ]}
        />
      ) : null}
    </StaffCard>
  );
}

function LessonEvidence({ lesson }: { lesson: TeacherLearnerLesson }) {
  const recorded = lesson.status !== "not_started";

  return (
    <StaffDisclosure
      eyebrow={`Lesson ${lesson.order}`}
      title={lesson.title}
      open={lesson.performance.review_recommended > 0}
      status={
        <StaffBadge
          tone={
            lesson.status === "completed"
              ? "success"
              : lesson.status === "not_started"
                ? "muted"
                : "accent"
          }
        >
          {humanize(lesson.status)}
        </StaffBadge>
      }
      meta={
        recorded
          ? `${lesson.items_recorded}/${lesson.items_total} items recorded`
          : "No run"
      }
    >
      <StaffFactGrid
        facts={[
          {
            label: "Independent",
            value: lesson.performance.independent_correct,
          },
          {
            label: "Supported",
            value: lesson.performance.supported_correct,
          },
          {
            label: "Demonstrated",
            value: lesson.performance.demonstrated,
          },
          {
            label: "Not yet correct",
            value: lesson.performance.not_yet_correct,
          },
          { label: "Skipped", value: lesson.performance.skipped },
          {
            label: "Practice attempts",
            value: lesson.performance.practice_attempts,
          },
          {
            label: "Technical retries",
            value: lesson.performance.technical_retries,
          },
          {
            label: "Review items",
            value: lesson.performance.review_recommended,
          },
        ]}
      />

      {lesson.items.length > 0 ? (
        <StaffContentGrid>
          {lesson.items.map((item) => (
            <LessonItemEvidence item={item} key={item.response_id} />
          ))}
        </StaffContentGrid>
      ) : (
        <StaffState
          compact
          title="No persisted item evidence is available for this lesson."
        />
      )}
    </StaffDisclosure>
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
      <StaffWorkspacePage>
        <StaffButton
          tone="secondary"
          size="regular"
          committing={backCommit.committing}
          onClick={() =>
            backCommit.commit(() => navigate("/staff/teacher/learners"))
          }
        >
          Back to Learners
        </StaffButton>

        {validLearnerId === null ? (
          <StaffState
            tone="danger"
            role="alert"
            title="Learner unavailable"
            description="The Learner identifier in this address is invalid."
          />
        ) : null}

        {validLearnerId !== null && detailQuery.isLoading ? (
          <StaffState
            title="Loading Learner workspace…"
            aria-live="polite"
            aria-busy="true"
          />
        ) : null}

        {detailQuery.isError ? (
          <StaffState
            tone="danger"
            role="alert"
            title="Learner workspace unavailable"
            description={
              detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "The Learner workspace could not be loaded."
            }
            actionLabel="Retry"
            onAction={() => void detailQuery.refetch()}
          />
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
                <StaffBadge>{detailQuery.data.learner.learner_code}</StaffBadge>
              }
            />

            <StaffContentGrid
              className="staff-content-grid--two"
              aria-label="Learner identity and progression"
            >
              <StaffCard>
                <StaffSectionHeader
                  eyebrow="Learner context"
                  title="Identity"
                />
                <StaffFactGrid
                  facts={[
                    {
                      label: "Learner Code",
                      value: detailQuery.data.learner.learner_code,
                    },
                    {
                      label: "LRN",
                      value: detailQuery.data.learner.lrn ?? "Not entered",
                    },
                    {
                      label: "Account",
                      value: detailQuery.data.learner.is_active
                        ? "Active"
                        : "Inactive",
                    },
                  ]}
                />
              </StaffCard>

              <StaffCard>
                <StaffSectionHeader
                  eyebrow="Persisted progression"
                  title={detailQuery.data.progression.stage_label}
                />
                <StaffFactGrid
                  facts={[
                    {
                      label: "Diagnostic status",
                      value:
                        detailQuery.data.reading_path.diagnostic.status ===
                        "skipped"
                          ? "Skipped · Score 0"
                          : humanize(
                              detailQuery.data.reading_path.diagnostic.status,
                            ),
                    },
                    {
                      label: "Lessons completed",
                      value: `${detailQuery.data.reading_path.completed_lesson_count} of 6`,
                    },
                    {
                      label: "Final completed",
                      value: formatDate(
                        detailQuery.data.progression
                          .final_assessment_completed_at,
                      ),
                    },
                    {
                      label: "Last confirmed",
                      value: formatDate(
                        detailQuery.data.progression.last_confirmed_at,
                      ),
                    },
                  ]}
                />
              </StaffCard>
            </StaffContentGrid>

            <section
              className="staff-content-section"
              aria-labelledby="learner-assessments-title"
            >
              <StaffSectionHeader
                eyebrow="Assessment evidence"
                title="Diagnostic and Final Assessment"
                id="learner-assessments-title"
                meta={<StaffBadge>Read-only persisted summaries</StaffBadge>}
              />
              <StaffContentGrid className="staff-content-grid--two">
                <AssessmentSummary
                  label="Diagnostic Assessment"
                  assessment={detailQuery.data.assessments.diagnostic}
                />
                <AssessmentSummary
                  label="Final Assessment"
                  assessment={detailQuery.data.assessments.final}
                />
              </StaffContentGrid>
            </section>

            {detailQuery.data.skipped_assessment_items.length > 0 ? (
              <section
                className="staff-content-section"
                aria-labelledby="skipped-assessment-title"
              >
                <StaffSectionHeader
                  eyebrow="Saved skips"
                  title="Skipped assessment items"
                  id="skipped-assessment-title"
                />
                <StaffCard padding="none">
                  <StaffDataTable
                    accessibleLabel="Skipped assessment items"
                    rows={detailQuery.data.skipped_assessment_items}
                    rowKey={(item) =>
                      `${item.assessment_type}:${item.task_key}:${item.item_key}`
                    }
                    columns={[
                      {
                        key: "item",
                        label: "Assessment item",
                        render: (item) => (
                          <span className="staff-primary-value">
                            <strong>
                              {item.assessment_label} · {item.task_label}
                            </strong>
                            <small>
                              Item {item.item_order}: {item.item_label}
                            </small>
                          </span>
                        ),
                      },
                      {
                        key: "recorded",
                        label: "Recorded",
                        width: "auto",
                        render: (item) => formatDate(item.recorded_at),
                      },
                    ]}
                  />
                </StaffCard>
              </section>
            ) : null}

            <section
              className="staff-content-section"
              aria-labelledby="learner-lessons-title"
            >
              <StaffSectionHeader
                eyebrow="Lesson evidence"
                title="Completion and performance"
                id="learner-lessons-title"
                meta={
                  <StaffBadge>
                    Open a lesson to inspect saved item evidence
                  </StaffBadge>
                }
              />
              <StaffContentGrid>
                {detailQuery.data.lessons.map((lesson) => (
                  <LessonEvidence lesson={lesson} key={lesson.lesson_key} />
                ))}
              </StaffContentGrid>
            </section>

            <section
              className="staff-content-section"
              aria-labelledby="learner-recommendations-title"
            >
              <StaffSectionHeader
                eyebrow="Evidence-based follow-up"
                title="Review recommendations"
                id="learner-recommendations-title"
                meta={
                  <StaffBadge>
                    Derived only from persisted review flags and skips
                  </StaffBadge>
                }
              />
              {detailQuery.data.recommendations.length > 0 ? (
                <StaffCard padding="none">
                  <StaffDataTable
                    accessibleLabel="Review recommendations"
                    rows={detailQuery.data.recommendations}
                    rowKey={(recommendation) => recommendation.key}
                    columns={[
                      {
                        key: "recommendation",
                        label: "Recommendation",
                        width: "minmax(12rem, 0.8fr)",
                        render: (recommendation) => (
                          <h3 className="staff-data-table__title">
                            {recommendation.title}
                          </h3>
                        ),
                      },
                      {
                        key: "evidence",
                        label: "Persisted evidence",
                        render: (recommendation) => recommendation.reason,
                      },
                    ]}
                  />
                </StaffCard>
              ) : (
                <StaffState
                  compact
                  title="No persisted review flags or skipped items are available."
                  description="ReaDirect does not infer additional conclusions."
                />
              )}
            </section>
          </>
        ) : null}
      </StaffWorkspacePage>
    </StaffShell>
  );
}
