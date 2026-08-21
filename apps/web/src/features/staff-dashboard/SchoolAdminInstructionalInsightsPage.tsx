import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import {
  StaffContentGrid,
  StaffFactGrid,
  StaffWorkspacePage,
} from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { schoolAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { clearStaffSession, loadStaffSession } from "../staff-auth/staffApi";
import { getSchoolAdminInstructionalInsights } from "./schoolAdminApi";

function InsightIcon() {
  return <PixelIcon name="lightbulb" />;
}

export function SchoolAdminInstructionalInsightsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const administrator =
    session?.staff.role === "school_admin" ? session.staff : null;
  const insightsQuery = useQuery({
    queryKey: ["school-admin-instructional-insights", administrator?.id],
    queryFn: () => getSchoolAdminInstructionalInsights(administrator!.id),
    enabled: Boolean(administrator?.school),
  });

  if (!administrator || !administrator.school) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>School setup required</h1>
          <BigButton
            onClick={() => navigate("/staff/school-admin/setup-school")}
          >
            Complete school setup
          </BigButton>
        </Surface>
      </main>
    );
  }

  const insights = insightsQuery.data;

  return (
    <StaffShell
      accountLabel={administrator.username ?? administrator.display_name}
      accountMeta={administrator.school.name}
      administrationLabel="School administration"
      avatarLabel="SC"
      brandIcon={<StaffBrandIcon />}
      exitCommitting={exitCommit.committing}
      navigationGroups={schoolAdminNavigationGroups}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      workspaceLabel="School Admin"
    >
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="Review and reporting"
          title="Instructional Insights"
          description="School-scoped teaching priorities derived from persisted assessment and lesson evidence."
          badge={<StaffBadge tone="accent">Read only</StaffBadge>}
        />

        <StaffNotice tone="accent" title="Evidence-based guidance only">
          <span>
            Recommendations use explicit skips and saved lesson review flags.
            They do not use generated conclusions and never change learner
            progress, scores, or activity records.
          </span>
        </StaffNotice>

        {insightsQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="Instructional insights could not be loaded."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void insightsQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            Check the API connection, then retry this request.
          </StaffNotice>
        ) : null}

        {insights ? (
          <>
            <section
              className="staff-metric-grid"
              aria-label="Instructional evidence summary"
            >
              {[
                ["Active learners", insights.summary.active_learners],
                [
                  "Diagnostics skipped",
                  insights.summary.whole_diagnostic_skips,
                ],
                ["Assessment-item skips", insights.summary.assessment_skips],
                ["Lesson-item skips", insights.summary.lesson_skips],
                [
                  "Saved review flags",
                  insights.summary.review_recommended_items,
                ],
              ].map(([label, value]) => (
                <MetricCard
                  key={label}
                  label={String(label)}
                  value={Number(value)}
                  icon={<InsightIcon />}
                />
              ))}
            </section>

            <StaffCard>
              <StaffSectionHeader
                eyebrow="Face-to-face planning"
                title="Teaching priorities"
                meta={
                  <StaffBadge tone="neutral">
                    {insights.summary.teaching_priorities} priorities
                  </StaffBadge>
                }
              />
              {insights.priorities.length ? (
                <div className="staff-content-section">
                  {insights.priorities.map((priority) => (
                    <StaffCard
                      depth="flat"
                      tone="muted"
                      className="staff-insight-priority"
                      key={priority.key}
                    >
                      <StaffSectionHeader
                        eyebrow={`Priority ${priority.rank} · ${priority.topic}`}
                        title={priority.title}
                        meta={
                          <StaffBadge tone="warning">
                            {priority.affected_learners} affected
                          </StaffBadge>
                        }
                      />
                      <p className="staff-insight-priority__reason">
                        {priority.reason}
                      </p>
                      <StaffFactGrid
                        facts={[
                          {
                            label: "Assessment skips",
                            value: priority.assessment_skips,
                          },
                          {
                            label: "Lesson-item skips",
                            value: priority.lesson_skips,
                          },
                          {
                            label: "Saved review flags",
                            value: priority.review_recommended_items,
                          },
                          {
                            label: "Affected classes",
                            value: priority.affected_classes,
                          },
                        ]}
                      />
                    </StaffCard>
                  ))}
                </div>
              ) : (
                <StaffState
                  title="No teaching priorities identified"
                  description="No active standard Learner currently has an explicit assessment skip, lesson-item skip, or saved lesson review flag."
                />
              )}
            </StaffCard>

            <StaffContentGrid className="staff-content-grid--two">
              <StaffCard padding="none">
                <StaffSectionHeader
                  bordered
                  eyebrow="Assessment evidence"
                  title="Skipped assessment items"
                />
                <StaffDataTable
                  accessibleLabel="Skipped assessment items by task"
                  rows={insights.assessment_breakdown}
                  rowKey={(row) => row.task_key}
                  columns={[
                    {
                      key: "task",
                      label: "Task",
                      width: "minmax(10rem, 1.4fr)",
                      render: (row) => (
                        <span className="staff-primary-value">
                          <strong>{row.title}</strong>
                          <small>{row.task_key}</small>
                        </span>
                      ),
                    },
                    {
                      key: "diagnostic",
                      label: "Diagnostic",
                      render: (row) => row.diagnostic_skips,
                    },
                    {
                      key: "final",
                      label: "Final",
                      render: (row) => row.final_skips,
                    },
                    {
                      key: "learners",
                      label: "Affected",
                      render: (row) => row.affected_learners,
                    },
                  ]}
                />
              </StaffCard>

              <StaffCard padding="none">
                <StaffSectionHeader
                  bordered
                  eyebrow="Lesson evidence"
                  title="Skipped and review-marked items"
                />
                <StaffDataTable
                  accessibleLabel="Lesson instructional evidence"
                  rows={insights.lesson_breakdown}
                  rowKey={(row) => row.lesson_key}
                  columns={[
                    {
                      key: "lesson",
                      label: "Lesson",
                      width: "minmax(10rem, 1.4fr)",
                      render: (row) => (
                        <span className="staff-primary-value">
                          <strong>
                            Lesson {row.order} · {row.title}
                          </strong>
                          <small>{row.lesson_key}</small>
                        </span>
                      ),
                    },
                    {
                      key: "skips",
                      label: "Skipped",
                      render: (row) => row.skipped_items,
                    },
                    {
                      key: "review",
                      label: "Review flags",
                      render: (row) => row.review_recommended_items,
                    },
                    {
                      key: "learners",
                      label: "Affected",
                      render: (row) => row.affected_learners,
                    },
                  ]}
                />
              </StaffCard>
            </StaffContentGrid>

            <StaffCard padding="none">
              <StaffSectionHeader
                bordered
                eyebrow="Class context"
                title="Evidence by class"
                meta={
                  <StaffBadge tone="neutral">
                    {insights.summary.learners_with_evidence} learners with
                    evidence
                  </StaffBadge>
                }
              />
              <StaffDataTable
                accessibleLabel="Instructional evidence by class"
                rows={insights.class_breakdown}
                rowKey={(row) => row.key}
                columns={[
                  {
                    key: "class",
                    label: "Class",
                    width: "minmax(10rem, 1.2fr)",
                    render: (row) => (
                      <span className="staff-primary-value">
                        <strong>
                          Grade {row.grade_level ?? "—"} ·{" "}
                          {row.section ?? "Unassigned"}
                        </strong>
                        <small>
                          {row.teacher?.username ??
                            row.teacher?.name ??
                            "Teacher unavailable"}
                        </small>
                      </span>
                    ),
                  },
                  {
                    key: "cohort",
                    label: "Cohort",
                    render: (row) => row.cohort_size,
                  },
                  {
                    key: "affected",
                    label: "Affected",
                    render: (row) => row.affected_learners,
                  },
                  {
                    key: "assessment",
                    label: "Assessment skips",
                    render: (row) => row.assessment_skips,
                  },
                  {
                    key: "lesson",
                    label: "Lesson signals",
                    render: (row) =>
                      row.lesson_skips + row.review_recommended_items,
                  },
                  {
                    key: "evidence",
                    label: "Evidence items",
                    render: (row) => row.evidence_items,
                  },
                ]}
                empty={
                  <StaffState
                    title="No active classes"
                    description="Class evidence appears after an active standard Learner is assigned."
                  />
                }
              />
            </StaffCard>
          </>
        ) : insightsQuery.isLoading ? (
          <StaffState title="Loading instructional insights…" />
        ) : null}
      </StaffWorkspacePage>
    </StaffShell>
  );
}
