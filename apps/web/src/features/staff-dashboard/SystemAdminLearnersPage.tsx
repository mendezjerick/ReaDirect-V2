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
  getSystemAdminLearners,
} from "../staff-auth/staffApi";
import { readingPathStageLabel, readingPathSummary } from "./readingPathLabels";

type AccountFilter = "all" | "active" | "inactive";

function LearnersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m2 9 10-5 10 5-10 5L2 9Z" />
      <path d="M6 11.5V16c3.2 2.5 8.8 2.5 12 0v-4.5M22 9v6" />
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

function DiagnosticIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11 12 14 22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function FinalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4" />
    </svg>
  );
}

export function SystemAdminLearnersPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const learnersQuery = useQuery({
    queryKey: ["system-admin-learners"],
    queryFn: getSystemAdminLearners,
  });
  const filteredLearners = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return (learnersQuery.data?.learners ?? []).filter((learner) => {
      const matchesStatus =
        accountFilter === "all" ||
        (accountFilter === "active" && learner.is_active) ||
        (accountFilter === "inactive" && !learner.is_active);
      const searchableText = [
        learner.full_name,
        learner.learner_code,
        learner.school?.name,
        learner.teacher?.username,
        learner.grade_level === null ? null : `grade ${learner.grade_level}`,
        learner.section,
        readingPathStageLabel(learner.reading_path),
        readingPathSummary(learner.reading_path),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return (
        matchesStatus &&
        (!normalizedSearch || searchableText.includes(normalizedSearch))
      );
    });
  }, [accountFilter, learnersQuery.data?.learners, search]);
  const summary = learnersQuery.data?.summary;

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
          title="Learners"
          description="Review standard Learner accounts, assignments, and persisted reading-journey progress."
          badge={
            <StaffBadge>
              {summary?.total_learners ?? 0}{" "}
              {summary?.total_learners === 1 ? "Learner" : "Learners"}
            </StaffBadge>
          }
        />

        {learnersQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="The Learner directory could not be loaded."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void learnersQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API connection, then retry this request.</span>
          </StaffNotice>
        ) : null}

        {summary && summary.without_teacher > 0 ? (
          <StaffNotice
            tone="warning"
            title={`${summary.without_teacher} ${
              summary.without_teacher === 1 ? "Learner is" : "Learners are"
            } not assigned to a Teacher.`}
          >
            <span>
              Teacher assignment remains owned by the appropriate school-scoped
              staff workflow.
            </span>
          </StaffNotice>
        ) : null}

        <section
          className="staff-metric-grid"
          aria-label="Learner directory totals"
          aria-busy={learnersQuery.isLoading}
        >
          <MetricCard
            label="Standard Learners"
            value={summary?.total_learners ?? null}
            icon={<LearnersIcon />}
            detail={
              summary
                ? `${summary.schools_represented} ${
                    summary.schools_represented === 1 ? "school" : "schools"
                  } represented`
                : undefined
            }
          />
          <MetricCard
            label="Active Learners"
            value={summary?.active_learners ?? null}
            icon={<ActiveIcon />}
          />
          <MetricCard
            label="Diagnostic complete"
            value={summary?.diagnostic_completed ?? null}
            icon={<DiagnosticIcon />}
          />
          <MetricCard
            label="Final Assessment complete"
            value={summary?.final_assessment_completed ?? null}
            icon={<FinalIcon />}
          />
        </section>

        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="Global directory"
            title="Standard Learner accounts"
            meta={
              <StaffBadge tone="neutral">
                {filteredLearners.length} shown
              </StaffBadge>
            }
          />

          <div className="staff-directory-toolbar staff-directory-toolbar--filters">
            <TextField
              label="Search Learners"
              type="search"
              value={search}
              placeholder="Name, code, school, Teacher, class, or progress"
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

          {learnersQuery.isLoading ? (
            <StaffState compact aria-live="polite" title="Loading Learners…" />
          ) : null}

          {learnersQuery.data && learnersQuery.data.learners.length === 0 ? (
            <StaffState
              compact
              title="No standard Learner accounts yet."
              description="Learners created by Teachers will appear here. Portal-system accounts never appear."
            />
          ) : null}

          {learnersQuery.data && learnersQuery.data.learners.length > 0 ? (
            <StaffDataTable
              accessibleLabel="System standard Learner accounts"
              rows={filteredLearners}
              rowKey={(learner) => learner.id}
              empty={
                <StaffState
                  compact
                  title="No Learners match these filters."
                  description="Adjust the search or account status."
                />
              }
              columns={[
                {
                  key: "learner",
                  label: "Learner",
                  width: "minmax(8.5rem, 1.35fr)",
                  render: (learner) => (
                    <span className="staff-data-table__primary">
                      <strong>{learner.full_name}</strong>
                      <small>{learner.learner_code}</small>
                    </span>
                  ),
                },
                {
                  key: "school",
                  label: "School and class",
                  width: "minmax(7.5rem, 1.1fr)",
                  render: (learner) => (
                    <span className="staff-data-table__primary">
                      <strong>{learner.school?.name ?? "No school"}</strong>
                      <small>
                        Grade {learner.grade_level ?? "—"} ·{" "}
                        {learner.section ?? "No section"}
                      </small>
                    </span>
                  ),
                },
                {
                  key: "teacher",
                  label: "Teacher",
                  width: "minmax(6rem, 0.85fr)",
                  render: (learner) => (
                    <span className="staff-data-table__primary">
                      <strong>
                        {learner.teacher?.username ?? "Not assigned"}
                      </strong>
                      {learner.teacher && !learner.teacher.is_active ? (
                        <small>Inactive Teacher account</small>
                      ) : null}
                    </span>
                  ),
                },
                {
                  key: "progress",
                  label: "Progress",
                  width: "minmax(7rem, 0.9fr)",
                  render: (learner) => (
                    <span className="staff-data-table__primary">
                      <strong>
                        {readingPathStageLabel(learner.reading_path)}
                      </strong>
                      <small>{readingPathSummary(learner.reading_path)}</small>
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  width: "minmax(4.5rem, 0.65fr)",
                  render: (learner) => (
                    <StaffBadge tone={learner.is_active ? "success" : "muted"}>
                      {learner.is_active ? "Active" : "Inactive"}
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
