import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffDistributionList } from "../../components/staff/StaffDistributionList";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { schoolAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getSchoolAdminTeachers,
  loadStaffSession,
} from "../staff-auth/staffApi";
import { getSchoolAdminTeacherDashboard } from "./schoolAdminApi";

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />
    </svg>
  );
}

export function SchoolAdminTeacherDashboardsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const reviewCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(
    null,
  );
  const administrator =
    session?.staff.role === "school_admin" ? session.staff : null;
  const teachersQuery = useQuery({
    queryKey: ["school-admin-teachers", administrator?.id],
    queryFn: () => getSchoolAdminTeachers(administrator!.id),
    enabled: Boolean(administrator?.school),
  });
  const dashboardQuery = useQuery({
    queryKey: [
      "school-admin-teacher-dashboard",
      administrator?.id,
      selectedTeacherId,
    ],
    queryFn: () =>
      getSchoolAdminTeacherDashboard(administrator!.id, selectedTeacherId!),
    enabled: Boolean(administrator?.school && selectedTeacherId),
    retry: false,
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

  const dashboard = dashboardQuery.data;

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
      <div className="staff-workspace-page school-admin-teacher-dashboard-page">
        <StaffPageHeader
          eyebrow="Review and reporting"
          title="Teacher Dashboards"
          description="Open a read-only class overview for a Teacher assigned to your school."
          badge={<span className="staff-count-badge">No impersonation</span>}
        />
        <Surface kind="notice" padding="compact">
          You remain signed in as the School Administrator. This review cannot
          acknowledge the Teacher’s assignment or change any learner-flow data.
        </Surface>
        <div className="school-admin-teacher-dashboard-layout">
          <Surface kind="panel" padding="none">
            <header className="staff-section-header staff-section-header--list">
              <div>
                <p>School staff</p>
                <h2>Select a Teacher</h2>
              </div>
            </header>
            <div className="school-admin-teacher-picker">
              {teachersQuery.data?.map((teacher) => (
                <button
                  type="button"
                  key={teacher.id}
                  className={
                    teacher.id === selectedTeacherId ? "is-selected" : undefined
                  }
                  aria-pressed={teacher.id === selectedTeacherId}
                  onClick={() => setSelectedTeacherId(teacher.id)}
                >
                  <span>
                    <strong>{teacher.username}</strong>
                    <small>
                      Grade {teacher.grade_level} · {teacher.section}
                    </small>
                  </span>
                  <span>{teacher.is_active ? "Active" : "Inactive"}</span>
                </button>
              ))}
            </div>
          </Surface>
          <div className="school-admin-teacher-dashboard-content">
            {dashboard ? (
              <>
                <Surface kind="panel" padding="normal">
                  <header className="staff-section-header">
                    <p>Teacher class</p>
                    <h2>{dashboard.teacher.username}</h2>
                    <span>
                      Grade {dashboard.teacher.grade_level} ·{" "}
                      {dashboard.teacher.section}
                    </span>
                  </header>
                  <section
                    className="staff-metric-grid staff-metric-grid--teacher"
                    aria-label="Teacher class summary"
                  >
                    {[
                      ["Learners", dashboard.overview.metrics.total_learners],
                      [
                        "Diagnostic complete",
                        dashboard.overview.metrics.diagnostic_complete,
                      ],
                      [
                        "Ready for Final",
                        dashboard.overview.metrics.ready_for_final,
                      ],
                      [
                        "Final complete",
                        dashboard.overview.metrics.final_complete,
                      ],
                    ].map(([label, value]) => (
                      <MetricCard
                        key={label}
                        label={String(label)}
                        value={Number(value)}
                        icon={<DashboardIcon />}
                      />
                    ))}
                  </section>
                </Surface>
                <div className="school-admin-teacher-distributions">
                  <Surface kind="panel" padding="normal">
                    <header className="staff-data-card__header">
                      <div>
                        <p>Diagnostic</p>
                        <h2>Part 1 levels</h2>
                      </div>
                    </header>
                    <StaffDistributionList
                      items={dashboard.overview.part_one_distribution}
                    />
                  </Surface>
                  <Surface kind="panel" padding="normal">
                    <header className="staff-data-card__header">
                      <div>
                        <p>Final Assessment</p>
                        <h2>Reading profiles</h2>
                      </div>
                    </header>
                    <StaffDistributionList
                      items={
                        dashboard.overview.final_reading_profile_distribution
                      }
                    />
                  </Surface>
                </div>
                <Surface kind="panel" padding="none">
                  <header className="staff-section-header staff-section-header--list">
                    <div>
                      <p>Class report</p>
                      <h2>Persisted Learner progress</h2>
                    </div>
                  </header>
                  <div className="school-admin-teacher-review-list">
                    {dashboard.report.learners.map((learner) => (
                      <article key={learner.learner_id}>
                        <span>
                          <strong>{learner.learner_name}</strong>
                          <small>{learner.learner_code}</small>
                        </span>
                        <span>{learner.stage_label}</span>
                        <span>
                          {learner.required_lessons_completed}/6 lessons
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
              </>
            ) : (
              <Surface kind="panel" padding="normal">
                <div className="staff-empty-state">
                  <span aria-hidden="true">TD</span>
                  <div>
                    <strong>Select a Teacher dashboard</strong>
                    <p>
                      Its read-only overview and class report will appear here.
                    </p>
                  </div>
                </div>
              </Surface>
            )}
          </div>
        </div>
      </div>
    </StaffShell>
  );
}
