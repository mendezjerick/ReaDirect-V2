import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import {
  StaffContentGrid,
  StaffSelectionButton,
  StaffSelectionList,
  StaffWorkspacePage,
} from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffDistributionList } from "../../components/staff/StaffDistributionList";
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
import {
  clearStaffSession,
  getSchoolAdminTeachers,
  loadStaffSession,
} from "../staff-auth/staffApi";
import { getSchoolAdminTeacherDashboard } from "./schoolAdminApi";

function DashboardIcon() {
  return <PixelIcon name="dashboard" />;
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
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="Review and reporting"
          title="Teacher Dashboards"
          description="Open a read-only class overview for a Teacher assigned to your school."
          badge={<StaffBadge tone="warning">No impersonation</StaffBadge>}
        />
        <StaffNotice tone="warning">
          <span>
            You remain signed in as the School Administrator. This review cannot
            acknowledge the Teacher’s assignment or change any learner-flow
            data.
          </span>
        </StaffNotice>
        <StaffContentGrid className="staff-content-grid--sidebar">
          <StaffCard padding="none">
            <StaffSectionHeader
              bordered
              eyebrow="School staff"
              title="Select a Teacher"
            />
            <StaffSelectionList>
              {teachersQuery.data?.map((teacher) => (
                <StaffSelectionButton
                  key={teacher.id}
                  selected={teacher.id === selectedTeacherId}
                  onClick={() => setSelectedTeacherId(teacher.id)}
                >
                  <span>
                    <strong>{teacher.username}</strong>
                    <small>
                      Grade {teacher.grade_level} · {teacher.section}
                    </small>
                  </span>
                  <StaffBadge tone={teacher.is_active ? "success" : "muted"}>
                    {teacher.is_active ? "Active" : "Inactive"}
                  </StaffBadge>
                </StaffSelectionButton>
              ))}
            </StaffSelectionList>
          </StaffCard>
          <StaffContentGrid>
            {dashboard ? (
              <>
                <StaffCard>
                  <StaffSectionHeader
                    eyebrow="Teacher class"
                    title={dashboard.teacher.username}
                    description={
                      <>
                        Grade {dashboard.teacher.grade_level} ·{" "}
                        {dashboard.teacher.section}
                      </>
                    }
                  />
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
                </StaffCard>
                <StaffContentGrid className="staff-content-grid--two">
                  <StaffCard>
                    <StaffSectionHeader
                      eyebrow="Diagnostic"
                      title="Part 1 levels"
                    />
                    <StaffDistributionList
                      items={dashboard.overview.part_one_distribution}
                    />
                  </StaffCard>
                  <StaffCard>
                    <StaffSectionHeader
                      eyebrow="Final Assessment"
                      title="Reading profiles"
                    />
                    <StaffDistributionList
                      items={
                        dashboard.overview.final_reading_profile_distribution
                      }
                    />
                  </StaffCard>
                </StaffContentGrid>
                <StaffCard padding="none">
                  <StaffSectionHeader
                    bordered
                    eyebrow="Class report"
                    title="Persisted Learner progress"
                  />
                  <StaffDataTable
                    accessibleLabel="Teacher class Learner progress"
                    rows={dashboard.report.learners}
                    rowKey={(learner) => learner.learner_id}
                    columns={[
                      {
                        key: "learner",
                        label: "Learner",
                        width: "minmax(12rem, 1.5fr)",
                        render: (learner) => (
                          <span className="staff-primary-value">
                            <strong>{learner.learner_name}</strong>
                            <small>{learner.learner_code}</small>
                          </span>
                        ),
                      },
                      {
                        key: "stage",
                        label: "Progress",
                        render: (learner) => learner.stage_label,
                      },
                      {
                        key: "lessons",
                        label: "Lessons",
                        width: "minmax(7rem, 0.7fr)",
                        render: (learner) =>
                          `${learner.required_lessons_completed}/6 lessons`,
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
              </>
            ) : (
              <StaffState
                title="Select a Teacher dashboard"
                description="Its read-only overview and class report will appear here."
              />
            )}
          </StaffContentGrid>
        </StaffContentGrid>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
