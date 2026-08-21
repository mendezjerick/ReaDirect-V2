import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import { StaffWorkspacePage } from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffSearchField } from "../../components/staff/StaffFormControls";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { schoolAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { clearStaffSession, loadStaffSession } from "../staff-auth/staffApi";
import { getSchoolAdminReport } from "./schoolAdminApi";

function ReportIcon() {
  return <PixelIcon name="document" />;
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
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="Review and reporting"
          title="School Progress Report"
          description="A printable, read-only rollup of persisted class reports."
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
        <StaffNotice tone="accent">
          <span>
            Opening, filtering, or printing this report writes no learner-flow
            or audit data.
          </span>
        </StaffNotice>
        {report ? (
          <div className="staff-print-region">
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
            <StaffCard padding="none">
              <StaffSectionHeader
                bordered
                eyebrow={report.school.name}
                title="Persisted Learner progress"
                actions={
                  <StaffSearchField
                    label="Search report"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Learner, code, Teacher, or section"
                  />
                }
              />
              <StaffDataTable
                accessibleLabel="Persisted school Learner progress"
                rows={learners}
                rowKey={(learner) => learner.learner_id}
                columns={[
                  {
                    key: "learner",
                    label: "Learner",
                    width: "minmax(11rem, 1.25fr)",
                    render: (learner) => (
                      <span className="staff-primary-value">
                        <strong>{learner.learner_name}</strong>
                        <small>{learner.learner_code}</small>
                      </span>
                    ),
                  },
                  {
                    key: "class",
                    label: "Class",
                    render: (learner) => (
                      <span className="staff-primary-value">
                        <span>
                          Grade {learner.grade_level} · {learner.section}
                        </span>
                        <small>{learner.teacher.username}</small>
                      </span>
                    ),
                  },
                  {
                    key: "progress",
                    label: "Progress",
                    render: (learner) => (
                      <span className="staff-primary-value">
                        <strong>{learner.stage_label}</strong>
                        <small>
                          Diagnostic{" "}
                          {learner.diagnostic.completion_mode === "skipped"
                            ? "skipped · Score 0"
                            : learner.diagnostic.status.replace("_", " ")}
                        </small>
                      </span>
                    ),
                  },
                  {
                    key: "lessons",
                    label: "Lessons",
                    width: "minmax(8rem, 0.8fr)",
                    render: (learner) => (
                      <span className="staff-primary-value">
                        <span>
                          {learner.required_lessons_completed}/6 lessons
                        </span>
                        <small>
                          Final {learner.final.status.replace("_", " ")}
                        </small>
                      </span>
                    ),
                  },
                  {
                    key: "evidence",
                    label: "Review evidence",
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
                              `/staff/school-admin/learners/${learner.learner_id}`,
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
