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

export function SchoolAdminDashboardPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const setupCommit = useButtonCommit();
  const teacherCommit = useButtonCommit();
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
      <div className="staff-workspace-page school-admin-dashboard">
        <StaffPageHeader
          eyebrow="School workspace"
          title={overview?.school.name ?? assignedSchool.name}
          description="Manage your school, prepare Teacher accounts, and follow learner activity."
          badge={<span className="staff-count-badge">School Admin</span>}
        />

        {overviewQuery.isError ? (
          <Surface
            kind="notice"
            padding="normal"
            className="staff-dashboard-error"
            role="alert"
          >
            <div>
              <strong>The school dashboard could not be loaded.</strong>
              <p>Check the API connection, then retry this request.</p>
            </div>
            <BigButton
              variant="secondary"
              size="regular"
              onClick={() => void overviewQuery.refetch()}
            >
              Retry
            </BigButton>
          </Surface>
        ) : null}

        {(overview?.requires_credential_setup ??
        schoolAdminSession.staff.requires_credential_setup) ? (
          <Surface
            kind="notice"
            padding="compact"
            className="school-admin-credential-notice"
          >
            <strong>Temporary credentials are active.</strong>
            <span>
              Email linking and password conversion will be added in a later
              account setup pass.
            </span>
          </Surface>
        ) : null}

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

        <section className="staff-dashboard-grid school-admin-dashboard__grid">
          <Surface kind="panel" padding="normal" className="staff-data-card">
            <header className="staff-data-card__header">
              <div>
                <p>ReaDirect Assessment</p>
                <h2>Part 1 Score levels</h2>
              </div>
              <span>School scope</span>
            </header>
            {overview ? (
              <StaffDistributionList items={overview.part_one_distribution} />
            ) : (
              <div className="staff-loading-block" />
            )}
          </Surface>

          <Surface kind="panel" padding="normal" className="staff-data-card">
            <header className="staff-data-card__header">
              <div>
                <p>Learner activity</p>
                <h2>Recent assessments</h2>
              </div>
            </header>
            <div className="staff-empty-state">
              <span aria-hidden="true">0</span>
              <div>
                <strong>No assessment activity yet</strong>
                <p>School learner activity will appear here.</p>
              </div>
            </div>
          </Surface>
        </section>

        <Surface
          kind="panel"
          padding="normal"
          className="staff-data-card staff-quick-links"
        >
          <header className="staff-data-card__header">
            <div>
              <p>School management</p>
              <h2>Quick actions</h2>
            </div>
            <span>School tools</span>
          </header>
          <div className="staff-quick-links__grid">
            <BigButton
              variant="secondary"
              size="regular"
              committing={teacherCommit.committing}
              onClick={() =>
                teacherCommit.commit(() =>
                  navigate("/staff/school-admin/teachers"),
                )
              }
            >
              Create Teacher
            </BigButton>
            {["School profile", "Manage learners", "Create class"].map(
              (label) => (
                <BigButton
                  variant="secondary"
                  size="regular"
                  disabled
                  key={label}
                >
                  {label} · Next
                </BigButton>
              ),
            )}
          </div>
        </Surface>
      </div>
    </StaffShell>
  );
}
