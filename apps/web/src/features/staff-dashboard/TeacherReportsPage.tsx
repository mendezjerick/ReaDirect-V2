import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
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
      <div className="staff-workspace-page teacher-report-page">
        <StaffPageHeader
          eyebrow="Assessment review"
          title="Class Progress Report"
          description="A printable, read-only class record built from saved assessment, lesson, and progression evidence."
          badge={
            <BigButton
              variant="secondary"
              size="regular"
              disabled={!report}
              onClick={() => window.print()}
            >
              Print report
            </BigButton>
          }
        />

        {reportQuery.isLoading ? (
          <Surface
            kind="panel"
            padding="roomy"
            className="teacher-report-state"
          >
            Loading report…
          </Surface>
        ) : null}
        {reportQuery.isError ? (
          <Surface
            kind="notice"
            padding="normal"
            className="teacher-report-state"
            role="alert"
          >
            <strong>The report could not be loaded.</strong>
            <BigButton
              variant="secondary"
              size="regular"
              onClick={() => void reportQuery.refetch()}
            >
              Retry
            </BigButton>
          </Surface>
        ) : null}

        {report ? (
          <div className="teacher-report-print-region">
            <header className="teacher-report-print-header">
              <h2>{report.class_context.school.name}</h2>
              <p>
                Grade {report.class_context.grade_level} ·{" "}
                {report.class_context.section}
              </p>
            </header>
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

            <Surface
              kind="panel"
              padding="none"
              className="teacher-report-card"
            >
              <div className="teacher-report-toolbar">
                <label>
                  <span>Find Learner</span>
                  <input
                    type="search"
                    value={search}
                    placeholder="Name or Learner Code"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <span>{filteredLearners.length} rows</span>
              </div>
              <div className="teacher-report-table" role="table">
                <div className="teacher-report-table__header" role="row">
                  <span>Learner</span>
                  <span>Stage</span>
                  <span>Diagnostic</span>
                  <span>Lessons</span>
                  <span>Final</span>
                  <span>Review</span>
                  <span aria-hidden="true" />
                </div>
                {filteredLearners.map((learner) => (
                  <article
                    className="teacher-report-table__row"
                    role="row"
                    key={learner.learner_id}
                  >
                    <div data-label="Learner">
                      <strong>{learner.learner_name}</strong>
                      <span>{learner.learner_code}</span>
                    </div>
                    <div data-label="Stage">{learner.stage_label}</div>
                    <div data-label="Diagnostic">
                      <strong>
                        {assessmentLabel(learner.diagnostic.status)}
                      </strong>
                      <span>
                        {learner.diagnostic.score ?? "—"} ·{" "}
                        {learner.diagnostic.profile ?? "No profile"}
                      </span>
                    </div>
                    <div data-label="Lessons">
                      {learner.required_lessons_completed} of 6
                    </div>
                    <div data-label="Final">
                      <strong>{assessmentLabel(learner.final.status)}</strong>
                      <span>
                        {learner.final.score ?? "—"} ·{" "}
                        {learner.final.profile ?? "No profile"}
                      </span>
                    </div>
                    <div data-label="Review">
                      {learner.has_review_evidence
                        ? `${learner.skipped_items} skips · ${learner.review_recommended_items} flags`
                        : "No saved flags"}
                    </div>
                    <div className="teacher-report-table__action">
                      <BigButton
                        variant="secondary"
                        size="regular"
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
                      </BigButton>
                    </div>
                  </article>
                ))}
              </div>
            </Surface>
          </div>
        ) : null}
      </div>
    </StaffShell>
  );
}
