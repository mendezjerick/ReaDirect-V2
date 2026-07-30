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
  getSystemAdminAgentSettings,
} from "../staff-auth/staffApi";

export function SystemAdminAgentSettingsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const settingsQuery = useQuery({
    queryKey: ["system-admin-agents-ai", "settings"],
    queryFn: getSystemAdminAgentSettings,
  });
  const agent = settingsQuery.data?.agent;

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
      <StaffWorkspacePage className="agents-ai-page">
        <StaffPageHeader
          eyebrow="Agents and AI"
          title="Agent settings"
          description="Review Ma'am Clara's approved display, typography, voice publication, and speech-processing contracts."
          badge={
            <StaffBadge tone="accent">
              {agent?.voice.status === "published"
                ? "Published voice"
                : "Voice unavailable"}
            </StaffBadge>
          }
        />

        <StaffNotice tone="neutral" title="Runtime ownership is explicit.">
          <span>
            {settingsQuery.data?.governance.message ??
              "Loading the approved agent contracts."}
          </span>
        </StaffNotice>

        {settingsQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="Agent settings could not be inspected."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void settingsQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API connection, then retry.</span>
          </StaffNotice>
        ) : null}

        <section className="staff-metric-grid" aria-label="Agent summary">
          <MetricCard
            label="Agent"
            value={agent?.name ?? null}
            detail={agent?.role}
          />
          <MetricCard
            label="Display mode"
            value={agent?.display.mode ?? null}
            detail={agent?.display.ownership}
          />
          <MetricCard
            label="Voice stage"
            value={agent?.voice.stable_key ?? null}
            detail={agent?.voice.engine ?? "No published engine"}
          />
          <MetricCard
            label="Published lines"
            value={agent?.voice.published_lines ?? null}
            detail={agent?.voice.reference_set ?? undefined}
          />
        </section>

        {settingsQuery.isLoading ? (
          <StaffState title="Loading agent contracts…" />
        ) : null}

        {agent ? (
          <div className="staff-content-grid staff-content-grid--two agent-contract-grid">
            <StaffCard padding="none">
              <StaffSectionHeader
                bordered
                eyebrow="Presentation"
                title="Display and typography"
              />
              <dl className="agent-contract-list">
                <div>
                  <dt>Primary character mode</dt>
                  <dd>{agent.display.mode}</dd>
                  <small>{agent.display.fallback}</small>
                </div>
                <div>
                  <dt>Learner interface</dt>
                  <dd>{agent.typography.learner_interface}</dd>
                  <small>
                    Navigation, prompts, buttons, and learner chrome
                  </small>
                </div>
                <div>
                  <dt>Authored reading content</dt>
                  <dd>{agent.typography.authored_reading_content}</dd>
                  <small>
                    Letters, words, passages, and comprehension text
                  </small>
                </div>
              </dl>
            </StaffCard>

            <StaffCard padding="none">
              <StaffSectionHeader
                bordered
                eyebrow="Published voice"
                title={agent.voice.stable_key ?? "No published voice"}
                meta={
                  <StaffBadge
                    tone={
                      agent.voice.status === "published" ? "success" : "warning"
                    }
                  >
                    {agent.voice.status}
                  </StaffBadge>
                }
              />
              <dl className="agent-contract-list">
                <div>
                  <dt>Engine</dt>
                  <dd>{agent.voice.engine ?? "Unavailable"}</dd>
                  <small>
                    Conditioning{" "}
                    {agent.voice.conditioning_version ?? "not published"}
                  </small>
                </div>
                {agent.voice.reference_roles.map((reference) => (
                  <div key={reference.role}>
                    <dt>{reference.role} reference</dt>
                    <dd>{reference.published_lines} lines</dd>
                    <small>Approved and published</small>
                  </div>
                ))}
              </dl>
            </StaffCard>
          </div>
        ) : null}
      </StaffWorkspacePage>
    </StaffShell>
  );
}
