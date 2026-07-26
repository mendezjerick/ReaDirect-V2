import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffCard } from "../../components/staff/StaffCard";
import {
  StaffContentGrid,
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
import { getTeacherAnalytics } from "./teacherAnalyticsApi";

export function TeacherAnalyticsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const teacherSession = session?.staff.role === "teacher" ? session : null;
  const teacher = teacherSession?.staff ?? null;
  const analyticsQuery = useQuery({
    queryKey: ["teacher-analytics", teacher?.id],
    queryFn: () => getTeacherAnalytics(teacher!.id),
    enabled: Boolean(teacher),
  });

  if (!teacherSession || !teacher) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>Teacher sign-in required</h1>
          <BigButton onClick={() => navigate("/staff/login")}>
            Go to staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  const analytics = analyticsQuery.data;

  return (
    <StaffShell
      accountLabel={teacher.username ?? teacher.display_name}
      accountMeta={`${teacher.school?.name ?? "School"} · Grade ${teacher.grade_level ?? "—"} ${teacher.section ?? ""}`}
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
          title="Class Analytics"
          description="Deterministic cohort counts from saved learner evidence. Values are separated by outcome and never used to rank Learners."
          badge={
            <StaffBadge>{analytics?.cohort_size ?? 0} Learners</StaffBadge>
          }
        />

        {analyticsQuery.isLoading ? (
          <StaffState title="Loading analytics…" />
        ) : null}
        {analyticsQuery.isError ? (
          <StaffState
            tone="danger"
            role="alert"
            title="Analytics could not be loaded."
            actionLabel="Retry"
            onAction={() => void analyticsQuery.refetch()}
          />
        ) : null}

        {analytics ? (
          <>
            <section
              className="staff-metric-grid"
              aria-label="Lesson evidence totals"
            >
              <MetricCard
                label="Independent success"
                value={analytics.lesson_evidence.independent_success}
                detail={`of ${analytics.lesson_evidence.recorded_items} recorded items`}
              />
              <MetricCard
                label="Supported success"
                value={analytics.lesson_evidence.supported_success}
                detail={`of ${analytics.lesson_evidence.recorded_items} recorded items`}
              />
              <MetricCard
                label="Demonstrated"
                value={analytics.lesson_evidence.demonstrated_items}
                detail={`of ${analytics.lesson_evidence.recorded_items} recorded items`}
              />
              <MetricCard
                label="Not yet correct"
                value={analytics.lesson_evidence.not_yet_correct}
                detail={`of ${analytics.lesson_evidence.recorded_items} recorded items`}
              />
              <MetricCard
                label="Unscorable audio"
                value={analytics.lesson_evidence.unscorable_recordings}
                detail={`of ${analytics.lesson_evidence.recorded_items} recorded items`}
              />
              <MetricCard
                label="Review recommended"
                value={analytics.lesson_evidence.review_recommended}
                detail={`of ${analytics.lesson_evidence.recorded_items} recorded items`}
              />
              <MetricCard
                label="Technical retries"
                value={analytics.lesson_evidence.technical_retries}
                detail="Persisted events"
              />
              <MetricCard
                label="Assessment skips"
                value={
                  analytics.assessment_skips.diagnostic +
                  analytics.assessment_skips.final
                }
                detail="Persisted events"
              />
            </section>

            <StaffContentGrid>
              <StaffCard padding="none">
                <StaffSectionHeader
                  bordered
                  eyebrow="Required lessons"
                  title="Completion and support evidence"
                  meta={<StaffBadge>Denominators shown</StaffBadge>}
                />
                <StaffDataTable
                  accessibleLabel="Required lesson completion and support evidence"
                  rows={analytics.lesson_breakdown}
                  rowKey={(lesson) => lesson.lesson_key}
                  columns={[
                    {
                      key: "lesson",
                      label: "Lesson",
                      width: "minmax(12rem, 1.3fr)",
                      render: (lesson) => (
                        <span className="staff-primary-value">
                          <strong>{lesson.title}</strong>
                          <small>
                            {lesson.learners_completed} of {lesson.cohort_size}{" "}
                            completed
                          </small>
                          <meter
                            min={0}
                            max={Math.max(lesson.cohort_size, 1)}
                            value={lesson.learners_completed}
                          >
                            {lesson.learners_completed} of {lesson.cohort_size}
                          </meter>
                        </span>
                      ),
                    },
                    {
                      key: "started",
                      label: "Started",
                      render: (lesson) => lesson.learners_started,
                    },
                    {
                      key: "items",
                      label: "Recorded items",
                      render: (lesson) => lesson.recorded_items,
                    },
                    {
                      key: "independent",
                      label: "Independent",
                      render: (lesson) => lesson.independent_success,
                    },
                    {
                      key: "supported",
                      label: "Supported",
                      render: (lesson) => lesson.supported_success,
                    },
                    {
                      key: "review",
                      label: "Review flags",
                      render: (lesson) => lesson.review_recommended,
                    },
                  ]}
                />
              </StaffCard>

              <StaffCard padding="none">
                <StaffSectionHeader
                  bordered
                  eyebrow="Saved diagnoses"
                  title="Recurring evidence"
                  description="Counts reflect persisted deterministic diagnosis keys, not conclusions about a Learner."
                />
                {analytics.diagnoses.length ? (
                  <StaffDataTable
                    accessibleLabel="Recurring saved diagnosis evidence"
                    rows={analytics.diagnoses}
                    rowKey={(diagnosis) => diagnosis.diagnosis_key}
                    columns={[
                      {
                        key: "evidence",
                        label: "Evidence",
                        render: (diagnosis) => diagnosis.label,
                      },
                      {
                        key: "items",
                        label: "Items",
                        width: "auto",
                        render: (diagnosis) => (
                          <strong>{diagnosis.items}</strong>
                        ),
                      },
                    ]}
                  />
                ) : (
                  <StaffState
                    title="No saved diagnosis evidence"
                    description="No deterministic diagnosis keys are persisted yet."
                  />
                )}
              </StaffCard>
            </StaffContentGrid>
          </>
        ) : null}
      </StaffWorkspacePage>
    </StaffShell>
  );
}
