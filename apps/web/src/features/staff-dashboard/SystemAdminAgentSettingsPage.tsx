import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  updateSystemAdminLightweightMode,
} from "../staff-auth/staffApi";

type LightweightModeRequest = {
  enabled: boolean;
  static_clara: boolean;
  published_speech_only: boolean;
};

function effectiveModeLabel(mode: LightweightModeRequest): string {
  const display = mode.enabled && mode.static_clara ? "Static Clara" : "Live2D Clara";
  const speech = mode.enabled && mode.published_speech_only
    ? "published-only speech"
    : "hybrid speech";

  return `${display} + ${speech}`;
}

export function SystemAdminAgentSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exitCommit = useButtonCommit();
  const settingCommit = useButtonCommit();
  const [requestedLightweightMode, setRequestedLightweightMode] =
    useState<LightweightModeRequest | null>(null);
  const settingsQuery = useQuery({
    queryKey: ["system-admin-agents-ai", "settings"],
    queryFn: getSystemAdminAgentSettings,
  });
  const agent = settingsQuery.data?.agent;
  const lightweightMode = agent?.lightweight_mode;
  const lightweightModeMutation = useMutation({
    mutationFn: updateSystemAdminLightweightMode,
    onSuccess: () => {
      setRequestedLightweightMode(null);
      void queryClient.invalidateQueries({
        queryKey: ["system-admin-agents-ai", "settings"],
      });
    },
  });

  const requestLightweightMode = (next: LightweightModeRequest) => {
    lightweightModeMutation.reset();
    setRequestedLightweightMode(next);
  };

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

        {lightweightMode ? (
          <StaffCard className="staff-speech-setting staff-lightweight-mode">
            <div className="staff-speech-setting__copy">
              <p className="staff-speech-setting__eyebrow">Learner delivery</p>
              <div className="staff-speech-setting__title-row">
                <h2>Lightweight mode</h2>
                <span
                  className={`staff-setting-status staff-setting-status--${
                    lightweightMode.enabled ? "enabled" : "disabled"
                  }`}
                >
                  {lightweightMode.enabled ? "On" : "Off"}
                </span>
              </div>
              <p>
                Choose a lower-weight Clara display and/or published-only speech.
                Existing learner evidence is never changed; the selected mode is
                used when the learner next loads an activity.
              </p>
            </div>
            <button
              className="staff-setting-switch"
              type="button"
              role="switch"
              aria-checked={lightweightMode.enabled}
              aria-label="Lightweight mode"
              disabled={lightweightModeMutation.isPending}
              onClick={() =>
                requestLightweightMode({
                  enabled: !lightweightMode.enabled,
                  static_clara: lightweightMode.static_clara,
                  published_speech_only: lightweightMode.published_speech_only,
                })
              }
            >
              <span aria-hidden="true" />
            </button>

            {lightweightMode.enabled ? (
              <div className="staff-lightweight-mode__children">
                <div>
                  <div>
                    <strong>Static Clara image</strong>
                    <p>Use the approved PNG Clara render instead of Live2D.</p>
                  </div>
                  <button
                    className="staff-setting-switch"
                    type="button"
                    role="switch"
                    aria-checked={lightweightMode.static_clara}
                    aria-label="Static Clara image"
                    disabled={lightweightModeMutation.isPending}
                    onClick={() =>
                      requestLightweightMode({
                        enabled: true,
                        static_clara: !lightweightMode.static_clara,
                        published_speech_only:
                          lightweightMode.published_speech_only,
                      })
                    }
                  >
                    <span aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <div>
                    <strong>Published-only speech</strong>
                    <p>Use approved published audio instead of hybrid speech.</p>
                  </div>
                  <button
                    className="staff-setting-switch"
                    type="button"
                    role="switch"
                    aria-checked={lightweightMode.published_speech_only}
                    aria-label="Published-only speech"
                    disabled={lightweightModeMutation.isPending}
                    onClick={() =>
                      requestLightweightMode({
                        enabled: true,
                        static_clara: lightweightMode.static_clara,
                        published_speech_only:
                          !lightweightMode.published_speech_only,
                      })
                    }
                  >
                    <span aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}

            {requestedLightweightMode ? (
              <div className="staff-setting-confirmation" role="alertdialog">
                <div>
                  <strong>Apply this lightweight learner mode?</strong>
                  <p>
                    Effective mode: {effectiveModeLabel(requestedLightweightMode)}.
                    It applies on the next learner activity load and does not
                    alter existing learner evidence.
                  </p>
                </div>
                <div className="staff-setting-confirmation__actions">
                  <StaffButton
                    tone="quiet"
                    onClick={() => setRequestedLightweightMode(null)}
                  >
                    Cancel
                  </StaffButton>
                  <StaffButton
                    tone="primary"
                    busy={lightweightModeMutation.isPending}
                    busyLabel="Saving setting"
                    committing={settingCommit.committing}
                    onClick={() =>
                      settingCommit.commit(() =>
                        lightweightModeMutation.mutate(requestedLightweightMode),
                      )
                    }
                  >
                    Confirm change
                  </StaffButton>
                </div>
              </div>
            ) : null}

            {lightweightModeMutation.isError ? (
              <p className="staff-setting-message staff-setting-message--error">
                {lightweightModeMutation.error.message}
              </p>
            ) : null}
          </StaffCard>
        ) : null}

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
