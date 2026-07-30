import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import { StaffWorkspacePage } from "../../components/staff/StaffContentPatterns";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { systemAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getSystemAdminAssessmentCatalog,
} from "../staff-auth/staffApi";

export function SystemAdminAssessmentsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const catalogQuery = useQuery({
    queryKey: ["system-admin-learning-content", "assessments"],
    queryFn: getSystemAdminAssessmentCatalog,
  });
  const summary = catalogQuery.data?.summary;

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
      <StaffWorkspacePage className="learning-content-page">
        <StaffPageHeader
          eyebrow="Learning content"
          title="Assessments"
          description="Inspect the exact published assessment form, item readiness, and delivery contract without changing learner runs."
          badge={
            <StaffBadge tone="accent">
              Published {summary?.version ?? "v1"}
            </StaffBadge>
          }
        />

        <StaffNotice tone="neutral" title="Published form is protected.">
          <span>
            {catalogQuery.data?.governance.message ??
              "Assessment content is loading from the reviewed source."}
          </span>
        </StaffNotice>

        {catalogQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="Assessment content could not be inspected."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void catalogQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API and content files, then retry.</span>
          </StaffNotice>
        ) : null}

        <section
          className="staff-metric-grid"
          aria-label="Assessment catalog summary"
        >
          <MetricCard
            label="Published version"
            value={summary?.version ?? null}
            detail={summary?.publication_state}
          />
          <MetricCard
            label="Active authored items"
            value={summary?.active_items ?? null}
          />
          <MetricCard
            label="Ready tasks"
            value={
              summary ? `${summary.ready_tasks}/${summary.total_tasks}` : null
            }
            detail="Exact-count validation"
          />
          <MetricCard
            label="Delivery"
            value="Fixed"
            detail="No item randomization"
          />
        </section>

        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="Diagnostic and final"
            title="Published task form"
            description="Both assessment moments use this reviewed Version 1 content."
            meta={
              <StaffBadge
                tone={
                  summary?.ready_tasks === summary?.total_tasks
                    ? "success"
                    : "warning"
                }
              >
                {summary?.ready_tasks === summary?.total_tasks
                  ? "All tasks ready"
                  : "Review needed"}
              </StaffBadge>
            }
          />

          {catalogQuery.isLoading ? (
            <StaffState compact title="Checking assessment content…" />
          ) : null}

          {catalogQuery.data ? (
            <div className="learning-content-grid">
              {catalogQuery.data.tasks.map((task) => (
                <article className="learning-content-item" key={task.key}>
                  <header>
                    <span className="learning-content-item__key">
                      {task.key.toUpperCase()}
                    </span>
                    <StaffBadge
                      tone={task.status === "ready" ? "success" : "warning"}
                    >
                      {task.status === "ready" ? "Ready" : "Attention"}
                    </StaffBadge>
                  </header>
                  <h3>{task.label}</h3>
                  <dl className="learning-content-item__facts">
                    <div>
                      <dt>Active items</dt>
                      <dd>
                        {task.active_items} / {task.expected_items}
                      </dd>
                    </div>
                    <div>
                      <dt>Version</dt>
                      <dd>{task.version}</dd>
                    </div>
                  </dl>
                  <p>{task.delivery}</p>
                  <small>{task.source_file}</small>
                </article>
              ))}
            </div>
          ) : null}
        </StaffCard>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
