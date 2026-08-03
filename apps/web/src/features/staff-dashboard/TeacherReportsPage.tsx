import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import { StaffWorkspacePage } from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffSearchField } from "../../components/staff/StaffFormControls";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { teacherNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { clearStaffSession, loadStaffSession } from "../staff-auth/staffApi";
import { getTeacherReport } from "./teacherReportApi";

function ReportMetricIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4" />
    </svg>
  );
}

function assessmentLabel(status: "not_started" | "active" | "completed") {
  if (status === "completed") {
    return "Completed";
  }
  if (status === "active") {
    return "In progress";
  }
  return "Not started";
}

export function TeacherReportsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const reviewCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const [search, setSearch] = useState("");
  const teacherSession = session?.staff.role === "teacher" ? session : null;
  const teacher = teacherSession?.staff ?? null;
  const reportQuery = useQuery({
    queryKey: ["teacher-report", teacher?.id],
    queryFn: () => getTeacherReport(teacher!.id),
    enabled: Boolean(teacher),
  });
  const filteredLearners = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return reportQuery.data?.learners ?? [];
    }

    return (reportQuery.data?.learners ?? []).filter((learner) =>
      `${learner.learner_name} ${learner.learner_code}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [reportQuery.data?.learners, search]);

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

  const report = reportQuery.data;

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
          title="Class Progress Report"
          description="A printable, read-only class record built from saved assessment, lesson, and progression evidence."
          badge={
            <StaffButton
              tone="secondary"
              size="regular"
              disabled={!report}
              onClick={() => window.print()}
            >
              Print report
            </StaffButton>
          }
        />

        {reportQuery.isLoading ? <StaffState title="Loading report…" /> : null}
        {reportQuery.isError ? (
          <StaffState
            tone="danger"
            role="alert"
            title="The report could not be loaded."
            actionLabel="Retry"
            onAction={() => void reportQuery.refetch()}
          />
        ) : null}

        {report ? (
          <div className="staff-print-region">
            <StaffSectionHeader
              eyebrow="Class progress report"
              title={report.class_context.school.name}
              description={
                <>
                  Grade {report.class_context.grade_level} ·{" "}
                  {report.class_context.section}
                </>
              }
            />
            <section
              className="staff-metric-grid staff-metric-grid--teacher"
              aria-label="Report summary"
            >
              <MetricCard
                label="Learners"
                value={report.summary.learners}
                icon={<ReportMetricIcon />}
              />
              <MetricCard
                label="Diagnostic complete"
                value={report.summary.diagnostic_complete}
                icon={<ReportMetricIcon />}
              />
              <MetricCard
                label="All lessons complete"
                value={report.summary.all_lessons_complete}
                icon={<ReportMetricIcon />}
              />
              <MetricCard
                label="Final complete"
                value={report.summary.final_complete}
                icon={<ReportMetricIcon />}
              />
              <MetricCard
                label="Review evidence"
                value={report.summary.with_review_evidence}
                icon={<ReportMetricIcon />}
              />
            </section>

            <StaffCard padding="none">
              <StaffSectionHeader
                bordered
                eyebrow="Persisted evidence"
                title="Learner progress"
                meta={<StaffBadge>{filteredLearners.length} rows</StaffBadge>}
                actions={
                  <StaffSearchField
                    label="Find Learner"
                    value={search}
                    placeholder="Name or Learner Code"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                }
              />
              <StaffDataTable
                accessibleLabel="Teacher class progress report"
                rows={filteredLearners}
                rowKey={(learner) => learner.learner_id}
                columns={[
                  {
                    key: "learner",
                    label: "Learner",
                    width: "minmax(10rem, 1.2fr)",
                    render: (learner) => (
                      <span className="staff-primary-value">
                        <strong>{learner.learner_name}</strong>
                        <small>{learner.learner_code}</small>
                      </span>
                    ),
                  },
                  {
                    key: "stage",
                    label: "Stage",
                    render: (learner) => learner.stage_label,
                  },
                  {
                    key: "diagnostic",
                    label: "Diagnostic",
                    render: (learner) => (
                      <span className="staff-primary-value">
                        <strong>
                          {learner.diagnostic.completion_mode === "skipped"
                            ? "Skipped"
                            : assessmentLabel(learner.diagnostic.status)}
                        </strong>
                        <small>
                          {learner.diagnostic.completion_mode === "skipped"
                            ? `Score ${learner.diagnostic.score ?? 0} · Skipped`
                            : `${learner.diagnostic.score ?? "—"} · ${learner.diagnostic.profile ?? "No profile"}`}
                        </small>
                      </span>
                    ),
                  },
                  {
                    key: "lessons",
                    label: "Lessons",
                    width: "minmax(5rem, 0.6fr)",
                    render: (learner) =>
                      `${learner.required_lessons_completed} of 6`,
                  },
                  {
                    key: "final",
                    label: "Final",
                    render: (learner) => (
                      <span className="staff-primary-value">
                        <strong>{assessmentLabel(learner.final.status)}</strong>
                        <small>
                          {learner.final.score ?? "—"} ·{" "}
                          {learner.final.profile ?? "No profile"}
                        </small>
                      </span>
                    ),
                  },
                  {
                    key: "review",
                    label: "Review",
                    render: (learner) =>
                      learner.has_review_evidence
                        ? `${learner.skipped_items} skips · ${learner.review_recommended_items} flags`
                        : "No saved flags",
                  },
                  {
                    key: "action",
                    label: "Action",
                    width: "auto",
                    render: (learner) => (
                      <StaffButton
                        size="compact"
                        committing={reviewCommit.committing}
                        onClick={() =>
                          reviewCommit.commit(() =>
                            navigate(
                              `/staff/teacher/learners/${learner.learner_id}`,
                            ),
                          )
                        }
                      >
                        Review
                      </StaffButton>
                    ),
                  },
                ]}
              />
            </StaffCard>
          </div>
        ) : null}
      </StaffWorkspacePage>
    </StaffShell>
  );
}
