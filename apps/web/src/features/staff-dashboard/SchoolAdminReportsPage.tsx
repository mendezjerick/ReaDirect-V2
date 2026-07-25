import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { schoolAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { clearStaffSession, loadStaffSession } from "../staff-auth/staffApi";
import { getSchoolAdminReport } from "./schoolAdminApi";

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4" />
    </svg>
  );
}

export function SchoolAdminReportsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const reviewCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const [search, setSearch] = useState("");
  const administrator =
    session?.staff.role === "school_admin" ? session.staff : null;
  const reportQuery = useQuery({
    queryKey: ["school-admin-report", administrator?.id],
    queryFn: () => getSchoolAdminReport(administrator!.id),
    enabled: Boolean(administrator?.school),
  });
  const learners = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reportQuery.data?.learners ?? [];

    return (reportQuery.data?.learners ?? []).filter((learner) =>
      [
        learner.learner_name,
        learner.learner_code,
        learner.teacher.username ?? "",
        learner.section,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [reportQuery.data?.learners, search]);

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

  const report = reportQuery.data;

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
      <div className="staff-workspace-page school-admin-report-page">
        <StaffPageHeader
          eyebrow="Review and reporting"
          title="School Progress Report"
          description="A printable, read-only rollup of persisted class reports."
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
        <Surface kind="notice" padding="compact">
          Opening, filtering, or printing this report writes no learner-flow or
          audit data.
        </Surface>
        {report ? (
          <div className="school-admin-report-print-region">
            <section
              className="staff-metric-grid staff-metric-grid--teacher"
              aria-label="School report summary"
            >
              {[
                ["Classes", report.summary.classes ?? 0],
                ["Learners", report.summary.learners],
                ["Diagnostic complete", report.summary.diagnostic_complete],
                ["All lessons complete", report.summary.all_lessons_complete],
                ["Final complete", report.summary.final_complete],
                ["Review evidence", report.summary.with_review_evidence],
              ].map(([label, value]) => (
                <MetricCard
                  key={label}
                  label={String(label)}
                  value={Number(value)}
                  icon={<ReportIcon />}
                />
              ))}
            </section>
            <Surface kind="panel" padding="none">
              <header className="staff-section-header staff-section-header--list">
                <div>
                  <p>{report.school.name}</p>
                  <h2>Persisted Learner progress</h2>
                </div>
                <label className="school-admin-learner-search">
                  <span>Search report</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Learner, code, Teacher, or section"
                  />
                </label>
              </header>
              <div className="school-admin-report-table" role="table">
                {learners.map((learner) => (
                  <article role="row" key={learner.learner_id}>
                    <span role="cell">
                      <strong>{learner.learner_name}</strong>
                      <small>{learner.learner_code}</small>
                    </span>
                    <span role="cell">
                      Grade {learner.grade_level} · {learner.section}
                      <small>{learner.teacher.username}</small>
                    </span>
                    <span role="cell">
                      <strong>{learner.stage_label}</strong>
                      <small>
                        Diagnostic {learner.diagnostic.status.replace("_", " ")}
                      </small>
                    </span>
                    <span role="cell">
                      {learner.required_lessons_completed}/6 lessons
                      <small>
                        Final {learner.final.status.replace("_", " ")}
                      </small>
                    </span>
                    <span role="cell">
                      {learner.has_review_evidence
                        ? `${learner.skipped_items} skips · ${learner.review_recommended_items} flags`
                        : "No saved flags"}
                    </span>
                    <BigButton
                      variant="secondary"
                      size="regular"
                      committing={reviewCommit.committing}
                      onClick={() =>
                        reviewCommit.commit(() =>
                          navigate(
                            `/staff/school-admin/learners/${learner.learner_id}`,
                          ),
                        )
                      }
                    >
                      Review
                    </BigButton>
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
