import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import { StaffWorkspacePage } from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { systemAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getSystemAdminTeachers,
} from "../staff-auth/staffApi";

type AccountFilter = "all" | "active" | "inactive";

function TeachersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 8h5M19.5 5.5v5" />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 7 9 18l-5-5" />
      <path d="M12 3a9 9 0 1 0 9 9" />
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

function AssignmentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11 12 14 22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function formatCreatedDate(value: string | null): string {
  if (!value) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatLearnerCount(active: number, total: number): string {
  return active === total
    ? `${total} active`
    : `${active} active · ${total} total`;
}

export function SystemAdminTeachersPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const teachersQuery = useQuery({
    queryKey: ["system-admin-teachers"],
    queryFn: getSystemAdminTeachers,
  });
  const filteredTeachers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return (teachersQuery.data?.teachers ?? []).filter((teacher) => {
      const matchesStatus =
        accountFilter === "all" ||
        (accountFilter === "active" && teacher.is_active) ||
        (accountFilter === "inactive" && !teacher.is_active);
      const searchableText = [
        teacher.username,
        teacher.display_name,
        teacher.school?.name,
        teacher.grade_level === null ? null : `grade ${teacher.grade_level}`,
        teacher.section,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return (
        matchesStatus &&
        (!normalizedSearch || searchableText.includes(normalizedSearch))
      );
    });
  }, [accountFilter, search, teachersQuery.data?.teachers]);
  const summary = teachersQuery.data?.summary;

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
          title="Teachers"
          description="Review Teacher accounts, school and class assignments, and assigned standard Learners."
          badge={
            <StaffBadge>
              {summary?.total_teachers ?? 0}{" "}
              {summary?.total_teachers === 1 ? "account" : "accounts"}
            </StaffBadge>
          }
        />

        {teachersQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="The Teacher directory could not be loaded."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void teachersQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API connection, then retry this request.</span>
          </StaffNotice>
        ) : null}

        {summary && summary.incomplete_assignments > 0 ? (
          <StaffNotice
            tone="warning"
            title={`${summary.incomplete_assignments} Teacher ${
              summary.incomplete_assignments === 1
                ? "account has"
                : "accounts have"
            } an incomplete assignment.`}
          >
            <span>
              The responsible School Administrator must provide a school, grade,
              and section before the Teacher Dashboard can open.
            </span>
          </StaffNotice>
        ) : null}

        <section
          className="staff-metric-grid"
          aria-label="Teacher directory totals"
          aria-busy={teachersQuery.isLoading}
        >
          <MetricCard
            label="Teacher accounts"
            value={summary?.total_teachers ?? null}
            icon={<TeachersIcon />}
            detail={
              summary
                ? `${summary.schools_represented} ${
                    summary.schools_represented === 1 ? "school" : "schools"
                  } represented`
                : undefined
            }
          />
          <MetricCard
            label="Active teachers"
            value={summary?.active_teachers ?? null}
            icon={<ActiveIcon />}
          />
          <MetricCard
            label="Active learners"
            value={summary?.active_standard_learners ?? null}
            icon={<LearnersIcon />}
            detail="Assigned standard Learners only"
          />
          <MetricCard
            label="Awaiting acknowledgement"
            value={summary?.pending_assignment_acknowledgements ?? null}
            icon={<AssignmentIcon />}
          />
        </section>

        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="Global directory"
            title="Teacher accounts"
            meta={
              <StaffBadge tone="neutral">
                {filteredTeachers.length} shown
              </StaffBadge>
            }
          />

          <div className="staff-directory-toolbar staff-directory-toolbar--filters">
            <TextField
              label="Search teachers"
              type="search"
              value={search}
              placeholder="Name, username, school, grade, or section"
              onChange={(event) => setSearch(event.target.value)}
            />
            <SelectField
              label="Account status"
              value={accountFilter}
              onChange={(event) =>
                setAccountFilter(event.target.value as AccountFilter)
              }
            >
              <option value="all">All accounts</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </SelectField>
          </div>

          {teachersQuery.isLoading ? (
            <StaffState compact aria-live="polite" title="Loading Teachers…" />
          ) : null}

          {teachersQuery.data && teachersQuery.data.teachers.length === 0 ? (
            <StaffState
              compact
              title="No Teacher accounts yet."
              description="Teacher accounts created by School Administrators will appear here."
            />
          ) : null}

          {teachersQuery.data && teachersQuery.data.teachers.length > 0 ? (
            <StaffDataTable
              accessibleLabel="System Teacher accounts"
              rows={filteredTeachers}
              rowKey={(teacher) => teacher.id}
              empty={
                <StaffState
                  compact
                  title="No Teachers match these filters."
                  description="Adjust the search or account status."
                />
              }
              columns={[
                {
                  key: "teacher",
                  label: "Teacher",
                  width: "minmax(9rem, 1.35fr)",
                  render: (teacher) => (
                    <span className="staff-data-table__primary">
                      <strong>
                        {teacher.username ?? `Account ${teacher.id}`}
                      </strong>
                      <small>
                        {teacher.requires_credential_setup
                          ? "Temporary credentials"
                          : `Created ${formatCreatedDate(teacher.created_at)}`}
                      </small>
                    </span>
                  ),
                },
                {
                  key: "school",
                  label: "School",
                  width: "minmax(7rem, 1fr)",
                  render: (teacher) =>
                    teacher.school?.name ?? "School not assigned",
                },
                {
                  key: "class",
                  label: "Class",
                  width: "minmax(5rem, 0.7fr)",
                  render: (teacher) =>
                    teacher.assignment_complete
                      ? `Grade ${teacher.grade_level} · ${teacher.section}`
                      : "Incomplete",
                },
                {
                  key: "learners",
                  label: "Learners",
                  width: "minmax(5rem, 0.65fr)",
                  render: (teacher) =>
                    formatLearnerCount(
                      teacher.learners.active,
                      teacher.learners.total,
                    ),
                },
                {
                  key: "status",
                  label: "Status",
                  width: "minmax(7rem, 0.9fr)",
                  render: (teacher) => (
                    <span className="staff-directory-statuses">
                      <StaffBadge
                        tone={teacher.is_active ? "success" : "muted"}
                      >
                        {teacher.is_active ? "Active" : "Inactive"}
                      </StaffBadge>
                      <StaffBadge
                        tone={
                          !teacher.assignment_complete
                            ? "warning"
                            : teacher.requires_assignment_acknowledgement
                              ? "accent"
                              : "success"
                        }
                      >
                        {!teacher.assignment_complete
                          ? "Assignment incomplete"
                          : teacher.requires_assignment_acknowledgement
                            ? "Awaiting acknowledgement"
                            : "Acknowledged"}
                      </StaffBadge>
                    </span>
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
