import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import { StaffWorkspacePage } from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { teacherNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { clearStaffSession, loadStaffSession } from "../staff-auth/staffApi";
import {
  getTeacherAssessmentReview,
  type TeacherAssessmentType,
} from "./teacherAssessmentReviewApi";

function ReviewMetricIcon() {
  return <PixelIcon name="document" />;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No activity recorded";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(
  status: "pending" | "not_ready" | "ready" | "in_progress" | "completed",
) {
  if (status === "completed") {
    return "Completed";
  }

  if (status === "in_progress") {
    return "In progress";
  }

  if (status === "not_ready") {
    return "Not ready";
  }

  if (status === "ready") {
    return "Ready";
  }

  return "Pending";
}

interface TeacherAssessmentReviewPageProps {
  assessmentType: TeacherAssessmentType;
}

export function TeacherAssessmentReviewPage({
  assessmentType,
}: TeacherAssessmentReviewPageProps) {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const reviewCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const teacherSession = session?.staff.role === "teacher" ? session : null;
  const assignedSchool = teacherSession?.staff.school ?? null;
  const assignedGrade = teacherSession?.staff.grade_level ?? null;
  const assignedSection = teacherSession?.staff.section ?? null;
  const hasCompleteAssignment =
    teacherSession !== null &&
    assignedSchool !== null &&
    assignedGrade !== null &&
    assignedSection !== null;
  const reviewQuery = useQuery({
    queryKey: [
      "teacher-assessment-review",
      assessmentType,
      teacherSession?.staff.id,
    ],
    queryFn: () =>
      getTeacherAssessmentReview(teacherSession!.staff.id, assessmentType),
    enabled: hasCompleteAssignment,
  });

  if (!teacherSession || !hasCompleteAssignment || !assignedSchool) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>Teacher assignment required</h1>
          <p>
            Sign in with a Teacher account that has a school, grade, and section
            assignment.
          </p>
          <BigButton onClick={() => navigate("/staff/login")}>
            Go to staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  const accountLabel =
    teacherSession.staff.username ?? teacherSession.staff.display_name;
  const metrics = reviewQuery.data?.metrics;
  const isFinal = assessmentType === "final";
  const assessmentLabel = isFinal
    ? "Final Assessment"
    : "Diagnostic Assessment";
  const metricItems = isFinal
    ? [
        { label: "Not ready", value: metrics?.not_ready ?? null },
        { label: "Ready", value: metrics?.ready ?? null },
        { label: "In progress", value: metrics?.in_progress ?? null },
        { label: "Completed", value: metrics?.completed ?? null },
        {
          label: "Skipped assessments",
          value: metrics?.skipped_assessments ?? null,
        },
        {
          label: "With skipped items",
          value: metrics?.with_skipped_items ?? null,
        },
      ]
    : [
        { label: "Pending", value: metrics?.pending ?? null },
        { label: "In progress", value: metrics?.in_progress ?? null },
        { label: "Completed", value: metrics?.completed ?? null },
        {
          label: "Skipped assessments",
          value: metrics?.skipped_assessments ?? null,
        },
        {
          label: "With skipped items",
          value: metrics?.with_skipped_items ?? null,
        },
      ];

  return (
    <StaffShell
      accountLabel={accountLabel}
      accountMeta={`${assignedSchool.name} · Grade ${assignedGrade} ${assignedSection}`}
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
        <StaffPageHeader
          eyebrow="Assessment review"
          title={assessmentLabel}
          description={`Review each assigned Learner’s latest persisted ${assessmentLabel} readiness, status, and results.`}
          badge={
            <StaffBadge>{metrics?.total_learners ?? 0} learners</StaffBadge>
          }
        />

        {reviewQuery.isError ? (
          <StaffNotice
            tone="danger"
            title={`${assessmentLabel} review could not be loaded.`}
            actions={
              <StaffButton
                size="compact"
                onClick={() => void reviewQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <p>Check the API connection, then retry this request.</p>
          </StaffNotice>
        ) : null}

        <section
          className={[
            "staff-metric-grid",
            "staff-metric-grid--assessment-review",
            isFinal ? "staff-metric-grid--final-review" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={`${assessmentLabel} totals`}
          aria-busy={reviewQuery.isLoading}
        >
          {metricItems.map((item) => (
            <MetricCard
              label={item.label}
              value={item.value}
              icon={<ReviewMetricIcon />}
              key={item.label}
            />
          ))}
        </section>

        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="Your class"
            title={`Latest ${isFinal ? "Final" : "Diagnostic"} results`}
            meta={<StaffBadge>Alphabetical by Learner</StaffBadge>}
          />

          {reviewQuery.isLoading ? (
            <StaffState
              title={`Loading ${assessmentLabel} results…`}
              aria-live="polite"
            />
          ) : null}

          {reviewQuery.data?.learners.length === 0 ? (
            <StaffState
              title="No assigned Learners yet."
              description="Learners will appear after their accounts are created."
            />
          ) : null}

          {reviewQuery.data?.learners.length ? (
            <StaffDataTable
              accessibleLabel={`${assessmentLabel} Learner results`}
              rows={reviewQuery.data.learners}
              rowKey={(row) => row.learner.id}
              columns={[
                {
                  key: "learner",
                  label: "Learner",
                  width: "minmax(11rem, 1.25fr)",
                  render: (row) => (
                    <span className="staff-primary-value">
                      <strong>{row.learner.full_name}</strong>
                      <small>{row.learner.learner_code}</small>
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => (
                    <span className="staff-primary-value">
                      <StaffBadge
                        tone={
                          row.status === "completed"
                            ? row.completion_mode === "skipped"
                              ? "warning"
                              : "success"
                            : row.status === "pending"
                              ? "warning"
                              : row.status === "not_ready"
                                ? "muted"
                                : "accent"
                        }
                      >
                        {row.completion_mode === "skipped"
                          ? "Skipped"
                          : statusLabel(row.status)}
                      </StaffBadge>
                      <small>{formatDate(row.last_activity_at)}</small>
                    </span>
                  ),
                },
                {
                  key: "part-one",
                  label: "Part 1 Score",
                  render: (row) => (
                    <span className="staff-primary-value">
                      <strong>{row.part_one_score ?? "—"}</strong>
                      <small>{row.part_one_level ?? "Not available"}</small>
                    </span>
                  ),
                },
                {
                  key: "profile",
                  label: "Reading profile",
                  render: (row) => row.final_reading_profile ?? "Not available",
                },
                {
                  key: "skipped",
                  label: "Skipped",
                  width: "minmax(4rem, 0.5fr)",
                  render: (row) =>
                    row.completion_mode === "skipped"
                      ? "Whole assessment"
                      : row.skipped_items_count,
                },
                {
                  key: "review",
                  label: "Review",
                  width: "auto",
                  render: (row) => (
                    <StaffButton
                      size="compact"
                      committing={reviewCommit.committing}
                      onClick={() =>
                        reviewCommit.commit(() =>
                          navigate(`/staff/teacher/learners/${row.learner.id}`),
                        )
                      }
                    >
                      View details
                    </StaffButton>
                  ),
                },
              ]}
            />
          ) : null}
        </StaffCard>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
