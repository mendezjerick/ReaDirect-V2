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
  getSystemAdminOverview,
  loadStaffSession,
  updateConditionalMuNoiseReduction,
} from "../staff-auth/staffApi";

const statusLabels = {
  online: "Online",
  degraded: "Degraded",
  offline: "Offline",
  not_configured: "Not configured",
} as const;

export function SystemAdminAiServicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const staffSession = loadStaffSession();
  const exitCommit = useButtonCommit();
  const settingCommit = useButtonCommit();
  const [requestedNoiseReduction, setRequestedNoiseReduction] = useState<
    boolean | null
  >(null);
  const overviewQuery = useQuery({
    queryKey: ["system-admin-overview"],
    queryFn: getSystemAdminOverview,
  });
  const overview = overviewQuery.data;
  const health = overview?.system_health ?? [];
  const onlineCount = health.filter((item) => item.status === "online").length;
  const attentionCount = health.filter((item) =>
    ["degraded", "offline"].includes(item.status),
  ).length;
  const noiseReductionMutation = useMutation({
    mutationFn: (enabled: boolean) => {
      if (!staffSession) {
        throw new Error("Your system administrator session is unavailable.");
      }

      return updateConditionalMuNoiseReduction(staffSession.staff.id, enabled);
    },
    onSuccess: (speechProcessing) => {
      queryClient.setQueryData(
        ["system-admin-overview"],
        (current: typeof overview) =>
          current
            ? { ...current, speech_processing: speechProcessing }
            : current,
      );
      setRequestedNoiseReduction(null);
    },
  });

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
          title="AI services"
          description="Check the live application, speech, voice, queue, and database services that support ReaDirect."
          badge={
            <StaffBadge tone={attentionCount > 0 ? "warning" : "success"}>
              {attentionCount > 0
                ? `${attentionCount} need attention`
                : "All ready"}
            </StaffBadge>
          }
        />

        {overviewQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="AI service health could not be loaded."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void overviewQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API connection, then retry this request.</span>
          </StaffNotice>
        ) : null}

        <section className="staff-metric-grid" aria-label="AI service summary">
          <MetricCard
            label="Services online"
            value={overview ? `${onlineCount}/${health.length}` : null}
          />
          <MetricCard
            label="Need attention"
            value={overview ? attentionCount : null}
            detail="Degraded or offline"
          />
          <MetricCard
            label="Mu processing"
            value={overview ? "Raw first" : null}
            detail="Original audio first"
          />
          <MetricCard
            label="Noise reduction"
            value={
              overview
                ? overview.speech_processing
                    .conditional_mu_noise_reduction_enabled
                  ? "On"
                  : "Off"
                : null
            }
            detail="Mu only · conditional"
          />
        </section>

        <div className="staff-content-grid staff-content-grid--two">
          <StaffCard padding="none">
            <StaffSectionHeader
              bordered
              eyebrow="Live readiness"
              title="Service matrix"
              description="Each row is checked when this workspace loads."
            />
            {overviewQuery.isLoading ? (
              <StaffState compact title="Checking services…" />
            ) : null}
            {overview ? (
              <div className="staff-health-list agents-ai-health-list">
                {health.map((item) => (
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

          <StaffCard className="staff-speech-setting agents-ai-processing-card">
            <div className="staff-speech-setting__copy">
              <p className="staff-speech-setting__eyebrow">Speech processing</p>
              <div className="staff-speech-setting__title-row">
                <h2>Conditional Mu noise reduction</h2>
                <span
                  className={`staff-setting-status staff-setting-status--${
                    overview?.speech_processing
                      .conditional_mu_noise_reduction_enabled
                      ? "enabled"
                      : "disabled"
                  }`}
                >
                  {overview?.speech_processing
                    .conditional_mu_noise_reduction_enabled
                    ? "On"
                    : "Off"}
                </span>
              </div>
              <p>
                Mu checks original audio first. Only a noisy or uncertain new
                submission may receive the conservative second pass. Nu and
                stored evidence never use this option.
              </p>
            </div>
            <button
              className="staff-setting-switch"
              type="button"
              role="switch"
              aria-checked={
                overview?.speech_processing
                  .conditional_mu_noise_reduction_enabled ?? false
              }
              aria-label="Conditional Mu noise reduction"
              disabled={
                !overview || !staffSession || noiseReductionMutation.isPending
              }
              onClick={() => {
                noiseReductionMutation.reset();
                setRequestedNoiseReduction(
                  !overview?.speech_processing
                    .conditional_mu_noise_reduction_enabled,
                );
              }}
            >
              <span aria-hidden="true" />
            </button>

            {requestedNoiseReduction !== null ? (
              <div className="staff-setting-confirmation" role="alertdialog">
                <div>
                  <strong>
                    {requestedNoiseReduction
                      ? "Enable conditional Mu noise reduction?"
                      : "Return to original-audio processing only?"}
                  </strong>
                  <p>
                    This affects new Mu submissions only. Existing recordings
                    and learner results stay unchanged.
                  </p>
                </div>
                <div className="staff-setting-confirmation__actions">
                  <StaffButton
                    tone="quiet"
                    onClick={() => setRequestedNoiseReduction(null)}
                  >
                    Cancel
                  </StaffButton>
                  <StaffButton
                    tone="primary"
                    busy={noiseReductionMutation.isPending}
                    busyLabel="Saving setting"
                    committing={settingCommit.committing}
                    onClick={() =>
                      settingCommit.commit(() =>
                        noiseReductionMutation.mutate(requestedNoiseReduction),
                      )
                    }
                  >
                    Confirm change
                  </StaffButton>
                </div>
              </div>
            ) : null}

            {noiseReductionMutation.isError ? (
              <p className="staff-setting-message staff-setting-message--error">
                {noiseReductionMutation.error.message}
              </p>
            ) : null}
          </StaffCard>
        </div>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
