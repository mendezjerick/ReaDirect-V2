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
  getSystemAdminAuditLogs,
} from "../staff-auth/staffApi";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SystemAdminAuditLogsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const logsQuery = useQuery({
    queryKey: ["system-admin-operations", "audit-logs"],
    queryFn: getSystemAdminAuditLogs,
  });
  const summary = logsQuery.data?.summary;
  const roles = useMemo(
    () =>
      Array.from(
        new Set(
          (logsQuery.data?.logs ?? [])
            .map((log) => log.actor_role)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [logsQuery.data?.logs],
  );
  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return (logsQuery.data?.logs ?? []).filter((log) => {
      const matchesRole = role === "all" || log.actor_role === role;
      const searchable = [
        log.action_key,
        log.description,
        log.actor,
        log.actor_role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return (
        matchesRole &&
        (!normalizedSearch || searchable.includes(normalizedSearch))
      );
    });
  }, [logsQuery.data?.logs, role, search]);

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
      <StaffWorkspacePage className="operations-page">
        <StaffPageHeader
          eyebrow="Operations"
          title="Audit logs"
          description="Review global staff and system actions without exposing stored metadata, credentials, or private operational payloads."
          badge={<StaffBadge tone="neutral">Read-only history</StaffBadge>}
        />

        {logsQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="Audit history could not be loaded."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void logsQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API connection, then retry.</span>
          </StaffNotice>
        ) : null}

        <section className="staff-metric-grid" aria-label="Audit log summary">
          <MetricCard
            label="Total events"
            value={summary?.total_events ?? null}
          />
          <MetricCard
            label="Last 24 hours"
            value={summary?.events_last_24_hours ?? null}
          />
          <MetricCard
            label="Visible events"
            value={summary?.visible_events ?? null}
          />
          <MetricCard
            label="Recent actors"
            value={summary?.unique_actors ?? null}
          />
        </section>

        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="Global event trail"
            title="Recent audit events"
            description={summary?.retention_note}
            meta={
              <StaffBadge tone="neutral">
                {filteredLogs.length} matching
              </StaffBadge>
            }
          />
          <div className="staff-directory-toolbar staff-directory-toolbar--filters">
            <TextField
              label="Search audit events"
              type="search"
              value={search}
              placeholder="Action, actor, or description"
              onChange={(event) => setSearch(event.target.value)}
            />
            <SelectField
              label="Actor role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="all">All actor roles</option>
              {roles.map((actorRole) => (
                <option value={actorRole} key={actorRole}>
                  {actorRole.replaceAll("_", " ")}
                </option>
              ))}
            </SelectField>
          </div>

          {logsQuery.isLoading ? (
            <StaffState compact title="Loading audit history…" />
          ) : null}

          {logsQuery.data ? (
            <StaffDataTable
              accessibleLabel="System audit events"
              rows={filteredLogs}
              rowKey={(log) => log.id}
              empty={
                <StaffState
                  compact
                  title="No audit events match these filters."
                  description="Adjust the search or actor role."
                />
              }
              columns={[
                {
                  key: "event",
                  label: "Event",
                  width: "minmax(14rem, 1.6fr)",
                  render: (log) => (
                    <span className="staff-data-table__primary">
                      <strong>{log.description}</strong>
                      <small>{log.action_key}</small>
                    </span>
                  ),
                },
                {
                  key: "actor",
                  label: "Actor",
                  width: "minmax(8rem, 0.8fr)",
                  render: (log) => (
                    <span className="staff-data-table__primary">
                      <strong>{log.actor}</strong>
                      <small>
                        {log.actor_role?.replaceAll("_", " ") ?? "system"}
                      </small>
                    </span>
                  ),
                },
                {
                  key: "occurred",
                  label: "Occurred",
                  width: "minmax(8rem, 0.8fr)",
                  render: (log) => formatDateTime(log.occurred_at),
                },
              ]}
            />
          ) : null}
        </StaffCard>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
