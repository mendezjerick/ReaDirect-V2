import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { StaffDistributionList } from "../../components/staff/StaffDistributionList";
import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getSystemAdminOverview,
  loadStaffSession,
  updateConditionalMuNoiseReduction,
} from "../staff-auth/staffApi";

function SchoolsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M8 11h.01M12 11h.01M16 11h.01" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LearnerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m2 9 10-5 10 5-10 5L2 9Z" />
      <path d="M6 11.5V16c3.2 2.5 8.8 2.5 12 0v-4.5M22 9v6" />
    </svg>
  );
}

function SandboxIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </svg>
  );
}

function formatActionTime(value: string | null): string {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SystemAdminDashboardPage() {
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

  const exitStaffView = () => {
    exitCommit.commit(() => {
      clearStaffSession();
      navigate("/home");
    });
  };

  return (
    <StaffShell
      accountLabel="System Administrator"
      exitCommitting={exitCommit.committing}
      onExit={exitStaffView}
      brandIcon={<StaffBrandIcon />}
    >
      <div className="staff-workspace-page system-admin-dashboard">
        <StaffPageHeader
          eyebrow="Development workspace"
          title="System overview"
          description="Monitor ReaDirect and prepare schools for reading activities."
          badge={
            <span className="staff-environment-badge">Local development</span>
          }
        />

        {overviewQuery.isError ? (
          <Surface
            kind="notice"
            padding="normal"
            className="staff-dashboard-error"
            role="alert"
          >
            <div>
              <strong>The dashboard API is unavailable.</strong>
              <p>Start ReaDirect again, then retry this request.</p>
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

        <section
          className="staff-metric-grid"
          aria-label="System totals"
          aria-busy={overviewQuery.isLoading}
        >
          <MetricCard
            label="Total schools"
            value={overview?.metrics.total_schools ?? null}
            icon={<SchoolsIcon />}
          />
          <MetricCard
            label="Total teachers"
            value={overview?.metrics.total_teachers ?? null}
            icon={<PeopleIcon />}
          />
          <MetricCard
            label="Total learners"
            value={overview?.metrics.total_learners ?? null}
            icon={<LearnerIcon />}
          />
          <MetricCard
            label="Sandbox attempts"
            value={overview?.metrics.sandbox_attempts ?? null}
            icon={<SandboxIcon />}
          />
        </section>

        <Surface
          kind="panel"
          padding="normal"
          className="staff-data-card staff-speech-setting"
        >
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
              Mu always checks the original recording first. When this option is
              on, noisy or uncertain word, phrase, sentence, and passage
              submissions may receive a conservative second pass. Nu never uses
              noise reduction.
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
                  This affects new Mu submissions only. Nu recordings and
                  existing evidence are not changed.
                </p>
              </div>
              <div className="staff-setting-confirmation__actions">
                <BigButton
                  variant="quiet"
                  size="regular"
                  onClick={() => setRequestedNoiseReduction(null)}
                >
                  Cancel
                </BigButton>
                <BigButton
                  size="regular"
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
                </BigButton>
              </div>
            </div>
          ) : null}

          {noiseReductionMutation.isError ? (
            <p
              className="staff-setting-message staff-setting-message--error"
              role="alert"
            >
              {noiseReductionMutation.error.message}
            </p>
          ) : null}
          {noiseReductionMutation.isSuccess &&
          requestedNoiseReduction === null ? (
            <p className="staff-setting-message" role="status">
              Speech processing setting updated.
            </p>
          ) : null}
        </Surface>

        <section className="staff-dashboard-grid staff-dashboard-grid--primary">
          <Surface kind="panel" padding="normal" className="staff-data-card">
            <header className="staff-data-card__header">
              <div>
                <p>ReaDirect Assessment</p>
                <h2>Part 1 Score levels</h2>
              </div>
              <span>All learners</span>
            </header>
            {overview ? (
              <StaffDistributionList items={overview.part_one_distribution} />
            ) : (
              <div
                className="staff-loading-block"
                aria-label="Loading levels"
              />
            )}
          </Surface>

          <Surface kind="panel" padding="normal" className="staff-data-card">
            <header className="staff-data-card__header">
              <div>
                <p>ReaDirect Assessment</p>
                <h2>Final reading profiles</h2>
              </div>
              <span>All learners</span>
            </header>
            {overview ? (
              <StaffDistributionList
                items={overview.reading_profile_distribution}
              />
            ) : (
              <div
                className="staff-loading-block"
                aria-label="Loading profiles"
              />
            )}
          </Surface>

          <Surface kind="panel" padding="normal" className="staff-data-card">
            <header className="staff-data-card__header">
              <div>
                <p>Environment</p>
                <h2>System health</h2>
              </div>
            </header>
            <div className="staff-health-list">
              {overview?.system_health.map((item) => (
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
                    {item.status === "online" ? "Online" : "Not configured"}
                  </span>
                </div>
              )) ?? <div className="staff-loading-block" />}
            </div>
          </Surface>
        </section>

        <section className="staff-dashboard-grid staff-dashboard-grid--secondary">
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
                <p>Completed learner assessments will appear here.</p>
              </div>
            </div>
          </Surface>

          <Surface kind="panel" padding="normal" className="staff-data-card">
            <header className="staff-data-card__header">
              <div>
                <p>Administration</p>
                <h2>Recent actions</h2>
              </div>
            </header>
            <div className="staff-action-list">
              {overview?.recent_actions.map((action) => (
                <article className="staff-action-item" key={action.id}>
                  <span
                    className="staff-action-item__marker"
                    aria-hidden="true"
                  />
                  <div>
                    <strong>{action.description}</strong>
                    <p>
                      {action.actor} · {formatActionTime(action.occurred_at)}
                    </p>
                  </div>
                </article>
              )) ?? <div className="staff-loading-block" />}
            </div>
          </Surface>
        </section>
      </div>
    </StaffShell>
  );
}
