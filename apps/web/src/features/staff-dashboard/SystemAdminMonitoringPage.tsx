import { useQuery } from "@tanstack/react-query";
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
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getSystemAdminOverview,
} from "../staff-auth/staffApi";

const statusLabels = {
  online: "Online",
  degraded: "Degraded",
  offline: "Offline",
  not_configured: "Not configured",
} as const;

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SystemAdminMonitoringPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const overviewQuery = useQuery({
    queryKey: ["system-admin-overview"],
    queryFn: getSystemAdminOverview,
  });
  const overview = overviewQuery.data;
  const onlineCount =
    overview?.system_health.filter((item) => item.status === "online").length ??
    0;
  const attentionCount =
    overview?.system_health.filter((item) =>
      ["degraded", "offline"].includes(item.status),
    ).length ?? 0;

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
          title="System monitoring"
          description="Inspect live service readiness and recent operational failures without running repair jobs or changing learner data."
          badge={
            <StaffBadge tone={attentionCount > 0 ? "warning" : "success"}>
              {attentionCount > 0
                ? `${attentionCount} need attention`
                : "Healthy"}
            </StaffBadge>
          }
        />

        {overviewQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="Monitoring data could not be loaded."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void overviewQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API and service connections, then retry.</span>
          </StaffNotice>
        ) : null}

        <section className="staff-metric-grid" aria-label="Monitoring summary">
          <MetricCard
            label="Services online"
            value={
              overview
                ? `${onlineCount}/${overview.system_health.length}`
                : null
            }
          />
          <MetricCard
            label="Need attention"
            value={overview ? attentionCount : null}
          />
          <MetricCard
            label="Recent speech failures"
            value={overview?.recent_speech_failures.length ?? null}
          />
          <MetricCard
            label="Recent audited actions"
            value={overview?.recent_actions.length ?? null}
          />
        </section>

        <div className="staff-content-grid staff-content-grid--two">
          <StaffCard padding="none">
            <StaffSectionHeader
              bordered
              eyebrow="Live readiness"
              title="Service health"
              actions={
                <StaffButton
                  size="compact"
                  tone="quiet"
                  onClick={() => void overviewQuery.refetch()}
                >
                  Refresh
                </StaffButton>
              }
            />
            {overviewQuery.isLoading ? (
              <StaffState compact title="Checking system health…" />
            ) : null}
            {overview ? (
              <div className="staff-health-list operations-health-list">
                {overview.system_health.map((item) => (
                  <div className="staff-health-item" key={item.service}>
                    <span
                      className={`staff-health-item__dot staff-health-item__dot--${item.status}`}
                      aria-hidden="true"
                    />
                    <div>
                      <strong>{item.service}</strong>
                      <p>{item.detail}</p>
                    </div>
                    <span
                      className={`staff-health-status staff-health-status--${item.status}`}
                    >
                      {statusLabels[item.status]}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </StaffCard>

          <StaffCard padding="none">
            <StaffSectionHeader
              bordered
              eyebrow="Speech operations"
              title="Recent service failures"
              meta={
                <StaffBadge
                  tone={
                    overview?.recent_speech_failures.length
                      ? "warning"
                      : "success"
                  }
                >
                  {overview?.recent_speech_failures.length ?? 0} recent
                </StaffBadge>
              }
            />
            {overview && overview.recent_speech_failures.length === 0 ? (
              <StaffState
                compact
                title="No recent speech service failures."
                description="Sandbox connection and HTTP failures will appear here."
              />
            ) : null}
            {overview?.recent_speech_failures.length ? (
              <StaffDataTable
                accessibleLabel="Recent speech service failures"
                rows={overview.recent_speech_failures}
                rowKey={(failure) => failure.id}
                columns={[
                  {
                    key: "source",
                    label: "Source",
                    width: "minmax(7rem, 0.7fr)",
                    render: (failure) => failure.source,
                  },
                  {
                    key: "summary",
                    label: "Failure",
                    width: "minmax(12rem, 1.5fr)",
                    render: (failure) => failure.summary,
                  },
                  {
                    key: "time",
                    label: "Occurred",
                    width: "minmax(8rem, 0.8fr)",
                    render: (failure) => formatDateTime(failure.occurred_at),
                  },
                ]}
              />
            ) : null}
          </StaffCard>
        </div>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
