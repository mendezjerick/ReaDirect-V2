import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
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
  getTeacherAssessmentReview,
  type TeacherAssessmentType,
} from "./teacherAssessmentReviewApi";

function ReviewMetricIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5" />
    </svg>
  );
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
      getTeacherAssessmentReview(
        teacherSession!.staff.id,
        assessmentType,
      ),
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
            Sign in with a Teacher account that has a school, grade, and
            section assignment.
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
  const assessmentLabel = isFinal ? "Final Assessment" : "Diagnostic Assessment";
  const metricItems = isFinal
    ? [
        { label: "Not ready", value: metrics?.not_ready ?? null },
        { label: "Ready", value: metrics?.ready ?? null },
        { label: "In progress", value: metrics?.in_progress ?? null },
        { label: "Completed", value: metrics?.completed ?? null },
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
      <div className="staff-workspace-page teacher-assessment-review-page">
        <StaffPageHeader
          eyebrow="Assessment review"
          title={assessmentLabel}
          description={`Review each assigned Learner’s latest persisted ${assessmentLabel} readiness, status, and results.`}
          badge={
            <span className="staff-count-badge">
              {metrics?.total_learners ?? 0} learners
            </span>
          }
        />

        {reviewQuery.isError ? (
          <Surface
            kind="notice"
            padding="normal"
            className="staff-dashboard-error"
            role="alert"
          >
            <div>
              <strong>{assessmentLabel} review could not be loaded.</strong>
              <p>Check the API connection, then retry this request.</p>
            </div>
            <BigButton
              variant="secondary"
              size="regular"
              onClick={() => void reviewQuery.refetch()}
            >
              Retry
            </BigButton>
          </Surface>
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

        <Surface
          kind="panel"
          padding="none"
          className="staff-account-list-card teacher-assessment-review"
        >
          <header className="staff-section-header staff-section-header--list">
            <div>
              <p>Your class</p>
              <h2>Latest {isFinal ? "Final" : "Diagnostic"} results</h2>
            </div>
            <span>Alphabetical by Learner</span>
          </header>

          {reviewQuery.isLoading ? (
            <div className="staff-account-list-state" aria-live="polite">
              Loading {assessmentLabel} results…
            </div>
          ) : null}

          {reviewQuery.data?.learners.length === 0 ? (
            <div className="staff-account-list-state">
              <strong>No assigned Learners yet.</strong>
              <span>Learners will appear after their accounts are created.</span>
            </div>
          ) : null}

          {reviewQuery.data?.learners.length ? (
            <div className="teacher-assessment-table" role="table">
              <div className="teacher-assessment-table__header" role="row">
                <span role="columnheader">Learner</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Part 1 Score</span>
                <span role="columnheader">Reading profile</span>
                <span role="columnheader">Skipped</span>
                <span role="columnheader">Review</span>
              </div>
              {reviewQuery.data.learners.map((row) => (
                <article
                  className="teacher-assessment-table__row"
                  role="row"
                  key={row.learner.id}
                >
                  <div role="cell" data-label="Learner">
                    <strong>{row.learner.full_name}</strong>
                    <span>{row.learner.learner_code}</span>
                  </div>
                  <div role="cell" data-label="Status">
                    <span
                      className={`teacher-assessment-status teacher-assessment-status--${row.status}`}
                    >
                      {statusLabel(row.status)}
                    </span>
                    <small>{formatDate(row.last_activity_at)}</small>
                  </div>
                  <div role="cell" data-label="Part 1 Score">
                    <strong>{row.part_one_score ?? "—"}</strong>
                    <span>{row.part_one_level ?? "Not available"}</span>
                  </div>
                  <div role="cell" data-label="Reading profile">
                    {row.final_reading_profile ?? "Not available"}
                  </div>
                  <div role="cell" data-label="Skipped">
                    {row.skipped_items_count}
                  </div>
                  <div role="cell" data-label="Review">
                    <BigButton
                      className="teacher-assessment-table__review"
                      variant="secondary"
                      size="regular"
                      committing={reviewCommit.committing}
                      onClick={() =>
                        reviewCommit.commit(() =>
                          navigate(
                            `/staff/teacher/learners/${row.learner.id}`,
                          ),
                        )
                      }
                    >
                      View details
                    </BigButton>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </Surface>
      </div>
    </StaffShell>
  );
}
