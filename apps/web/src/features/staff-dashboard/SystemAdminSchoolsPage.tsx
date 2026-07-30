import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { StaffWorkspacePage } from "../../components/staff/StaffContentPatterns";
import { systemAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getSystemAdminSchools,
} from "../staff-auth/staffApi";

function SchoolsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 21V10l8-6 8 6v11M9 21v-6h6v6M2 21h20" />
    </svg>
  );
}

function AdministratorsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M16 11h6" />
    </svg>
  );
}

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

function formatCount(active: number, total: number): string {
  return active === total
    ? `${total} active`
    : `${active} active · ${total} total`;
}

function formatCreatedDate(value: string | null): string {
  if (!value) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function SystemAdminSchoolsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const [search, setSearch] = useState("");
  const schoolsQuery = useQuery({
    queryKey: ["system-admin-schools"],
    queryFn: getSystemAdminSchools,
  });
  const filteredSchools = useMemo(() => {
    const schools = schoolsQuery.data?.schools ?? [];
    const normalizedSearch = search.trim().toLocaleLowerCase();

    if (!normalizedSearch) {
      return schools;
    }

    return schools.filter((school) =>
      school.name.toLocaleLowerCase().includes(normalizedSearch),
    );
  }, [schoolsQuery.data?.schools, search]);
  const summary = schoolsQuery.data?.summary;

  return (
    <StaffShell
      accountLabel="System Administrator"
      exitCommitting={exitCommit.committing}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      brandIcon={<StaffBrandIcon />}
      navigationGroups={systemAdminNavigationGroups}
    >
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="People and schools"
          title="Schools"
          description="Review every registered school and its active staff and learner accounts."
          badge={
            <StaffBadge>{summary?.total_schools ?? 0} registered</StaffBadge>
          }
        />

        {schoolsQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="The school directory could not be loaded."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void schoolsQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API connection, then retry this request.</span>
          </StaffNotice>
        ) : null}

        {summary && summary.unassigned_school_administrators > 0 ? (
          <StaffNotice
            tone="warning"
            title={`${summary.unassigned_school_administrators} School Administrator ${
              summary.unassigned_school_administrators === 1
                ? "account needs"
                : "accounts need"
            } school setup.`}
          >
            <span>
              These accounts will enter their school during their first-time
              setup and are not included in a school row yet.
            </span>
          </StaffNotice>
        ) : null}

        <section
          className="staff-metric-grid"
          aria-label="School directory totals"
          aria-busy={schoolsQuery.isLoading}
        >
          <MetricCard
            label="Registered schools"
            value={summary?.total_schools ?? null}
            icon={<SchoolsIcon />}
          />
          <MetricCard
            label="Active administrators"
            value={summary?.active_school_administrators ?? null}
            icon={<AdministratorsIcon />}
          />
          <MetricCard
            label="Active teachers"
            value={summary?.active_teachers ?? null}
            icon={<TeachersIcon />}
          />
          <MetricCard
            label="Active learners"
            value={summary?.active_learners ?? null}
            icon={<LearnersIcon />}
            detail="Standard learner accounts only"
          />
        </section>

        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="Global directory"
            title="Registered schools"
            meta={
              <StaffBadge tone="neutral">
                {filteredSchools.length} shown
              </StaffBadge>
            }
          />

          <div className="staff-directory-toolbar">
            <TextField
              label="Search schools"
              type="search"
              value={search}
              placeholder="Search by school name"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {schoolsQuery.isLoading ? (
            <StaffState compact aria-live="polite" title="Loading schools…" />
          ) : null}

          {schoolsQuery.data && schoolsQuery.data.schools.length === 0 ? (
            <StaffState
              compact
              title="No registered schools yet."
              description="A school will appear after a School Administrator completes first-time setup."
            />
          ) : null}

          {schoolsQuery.data && schoolsQuery.data.schools.length > 0 ? (
            <StaffDataTable
              accessibleLabel="Registered schools"
              rows={filteredSchools}
              rowKey={(school) => school.id}
              empty={
                <StaffState
                  compact
                  title="No schools match that search."
                  description="Try a shorter or different school name."
                />
              }
              columns={[
                {
                  key: "school",
                  label: "School",
                  width: "minmax(10rem, 1.4fr)",
                  render: (school) => (
                    <span className="staff-data-table__primary">
                      <strong>{school.name}</strong>
                      <small>
                        Registered {formatCreatedDate(school.created_at)}
                      </small>
                    </span>
                  ),
                },
                {
                  key: "administrators",
                  label: "Administrators",
                  width: "minmax(7.5rem, 1fr)",
                  render: (school) =>
                    formatCount(
                      school.school_administrators.active,
                      school.school_administrators.total,
                    ),
                },
                {
                  key: "teachers",
                  label: "Teachers",
                  width: "minmax(6rem, 0.75fr)",
                  render: (school) =>
                    formatCount(school.teachers.active, school.teachers.total),
                },
                {
                  key: "learners",
                  label: "Learners",
                  width: "minmax(6rem, 0.75fr)",
                  render: (school) =>
                    formatCount(school.learners.active, school.learners.total),
                },
                {
                  key: "status",
                  label: "Setup",
                  width: "minmax(7rem, 0.85fr)",
                  render: (school) => (
                    <StaffBadge
                      tone={
                        school.school_administrators.active > 0
                          ? "success"
                          : "warning"
                      }
                    >
                      {school.school_administrators.active > 0
                        ? "Admin assigned"
                        : "Admin needed"}
                    </StaffBadge>
                  ),
                },
              ]}
            />
          ) : null}
        </StaffCard>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
