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
  StaffWorkspacePage,
} from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffDistributionList } from "../../components/staff/StaffDistributionList";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { TemporaryCredentialsNotice } from "../../components/staff/TemporaryCredentialsNotice";
import { schoolAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getSchoolAdminOverview,
  loadStaffSession,
} from "../staff-auth/staffApi";

function TeachersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 8h5M19.5 5.5v5" />
    </svg>
  );
}

function LearnersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m2 9 10-5 10 5-10 5L2 9Z" />
      <path d="M6 11.5V16c3.2 2.5 8.8 2.5 12 0v-4.5M22 9v6" />
    </svg>
  );
}

function ActiveLearnersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 7 9 18l-5-5" />
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

function formatAssessmentDate(value: string | null): string {
  if (!value) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SchoolAdminDashboardPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const setupCommit = useButtonCommit();
  const teacherCommit = useButtonCommit();
  const toolCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const schoolAdminSession =
    session?.staff.role === "school_admin" ? session : null;
  const assignedSchool = schoolAdminSession?.staff.school ?? null;
  const canOpenDashboard =
    schoolAdminSession !== null &&
    !schoolAdminSession.staff.requires_school_setup &&
    assignedSchool !== null;
  const overviewQuery = useQuery({
    queryKey: ["school-admin-overview", schoolAdminSession?.staff.id],
    queryFn: () => getSchoolAdminOverview(schoolAdminSession!.staff.id),
    enabled: canOpenDashboard,
  });

  if (!schoolAdminSession) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>School Administrator sign-in required</h1>
          <p>Return to staff login to open this workspace.</p>
          <BigButton onClick={() => navigate("/staff/login")}>
            Go to staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  if (!canOpenDashboard || !assignedSchool) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>School setup required</h1>
          <p>Enter your school before opening the School Admin Dashboard.</p>
          <BigButton
            committing={setupCommit.committing}
            onClick={() =>
              setupCommit.commit(() =>
                navigate("/staff/school-admin/setup-school"),
              )
            }
          >
            Complete school setup
          </BigButton>
        </Surface>
      </main>
    );
  }

  const overview = overviewQuery.data;
  const accountLabel =
    schoolAdminSession.staff.username ?? schoolAdminSession.staff.display_name;

  return (
    <StaffShell
      accountLabel={accountLabel}
      accountMeta={assignedSchool.name}
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
          eyebrow="School workspace"
          title={overview?.school.name ?? assignedSchool.name}
          description="Manage your school, prepare Teacher accounts, and follow learner activity."
          badge={<StaffBadge>School Admin</StaffBadge>}
        />

        {overviewQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="The school dashboard could not be loaded."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void overviewQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <p>Check the API connection, then retry this request.</p>
          </StaffNotice>
        ) : null}

        <TemporaryCredentialsNotice
          active={
            overview?.requires_credential_setup ??
            schoolAdminSession.staff.requires_credential_setup
          }
        />

        <section
          className="staff-metric-grid staff-metric-grid--school"
          aria-label="School totals"
          aria-busy={overviewQuery.isLoading}
        >
          <MetricCard
            label="Total teachers"
            value={overview?.metrics.total_teachers ?? null}
            icon={<TeachersIcon />}
          />
          <MetricCard
            label="Total learners"
            value={overview?.metrics.total_learners ?? null}
            icon={<LearnersIcon />}
          />
          <MetricCard
            label="Active learners"
            value={overview?.metrics.active_learners ?? null}
            icon={<ActiveLearnersIcon />}
          />
        </section>

        <StaffContentGrid className="staff-content-grid--two">
          <StaffCard>
            <StaffSectionHeader
              eyebrow="ReaDirect Assessment"
              title="Part 1 Score levels"
              meta={<StaffBadge>School scope</StaffBadge>}
            />
            {overview ? (
              <StaffDistributionList items={overview.part_one_distribution} />
            ) : (
              <StaffState compact title="Loading score levels…" />
            )}
          </StaffCard>

          <StaffCard>
            <StaffSectionHeader
              eyebrow="Learner activity"
              title="Recent assessments"
            />
            {overview?.recent_assessment_activity.length ? (
              <StaffDataTable
                accessibleLabel="Recent assessment activity"
                rows={overview.recent_assessment_activity}
                rowKey={(activity) => activity.id}
                columns={[
                  {
                    key: "learner",
                    label: "Learner",
                    render: (activity) => (
                      <span className="staff-primary-value">
                        <strong>{activity.learner_name}</strong>
                        <small>
                          {activity.learner_code} ·{" "}
                          {activity.teacher_username ?? "Teacher unavailable"}
                        </small>
                      </span>
                    ),
                  },
                  {
                    key: "assessment",
                    label: "Assessment",
                    render: (activity) => (
                      <span className="staff-primary-value">
                        <strong>{activity.assessment_label}</strong>
                        <small>
                          {activity.completion_mode === "skipped"
                            ? "skipped · Score 0"
                            : activity.status.replaceAll("_", " ")}{" "}
                          · {formatAssessmentDate(activity.occurred_at)}
                        </small>
                      </span>
                    ),
                  },
                ]}
              />
            ) : (
              <StaffState
                title="No assessment activity yet"
                description="Persisted school Learner activity will appear here."
              />
            )}
          </StaffCard>
        </StaffContentGrid>

        <StaffCard>
          <StaffSectionHeader
            eyebrow="School management"
            title="Quick actions"
            meta={<StaffBadge>School tools</StaffBadge>}
          />
          <div className="staff-action-grid">
            <StaffButton
              tone="secondary"
              size="regular"
              committing={teacherCommit.committing}
              onClick={() =>
                teacherCommit.commit(() =>
                  navigate("/staff/school-admin/teachers"),
                )
              }
            >
              Create Teacher
            </StaffButton>
            {[
              ["School Profile", "/staff/school-admin/profile"],
              ["Manage Learners", "/staff/school-admin/learners"],
              ["Manage Classes", "/staff/school-admin/classes"],
              ["School Reports", "/staff/school-admin/reports"],
              ["Teacher Dashboards", "/staff/school-admin/teacher-dashboards"],
            ].map(([label, route]) => (
              <StaffButton
                tone="secondary"
                size="regular"
                key={label}
                committing={toolCommit.committing}
                onClick={() => toolCommit.commit(() => navigate(route))}
              >
                {label}
              </StaffButton>
            ))}
          </div>
        </StaffCard>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
