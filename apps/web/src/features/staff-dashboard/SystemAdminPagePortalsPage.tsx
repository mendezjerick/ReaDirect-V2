import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getPortalSystemLearner,
  loadStaffSession,
  resetPortalSystemLearner,
} from "../staff-auth/staffApi";

function formatDate(value: string | null): string {
  if (!value) {
    return "Not reset yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function readableStage(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SystemAdminPagePortalsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = loadStaffSession();
  const staffUserId =
    session?.staff.role === "system_admin" ? session.staff.id : null;
  const staffDisplayName =
    session?.staff.display_name ?? "System Administrator";
  const exitCommit = useButtonCommit();
  const resetCommit = useButtonCommit();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const portalQuery = useQuery({
    queryKey: ["system-admin-page-portals", staffUserId],
    queryFn: () => getPortalSystemLearner(staffUserId as number),
    enabled: staffUserId !== null,
  });
  const resetMutation = useMutation({
    mutationFn: () => resetPortalSystemLearner(staffUserId as number),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["system-admin-page-portals", staffUserId],
        data,
      );
      setConfirmingReset(false);
    },
  });
  const learner = portalQuery.data?.learner;

  if (staffUserId === null) {
    return (
      <main className="staff-session-required" data-route-focus tabIndex={-1}>
        <Surface kind="panel" padding="roomy">
          <h1>System Administrator sign-in required</h1>
          <p>
            Sign in with the System Administrator account to use Page Portals.
          </p>
          <BigButton size="regular" onClick={() => navigate("/staff/login")}>
            Staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  return (
    <StaffShell
      accountLabel={staffDisplayName}
      exitCommitting={exitCommit.committing}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      brandIcon={<StaffBrandIcon />}
    >
      <div className="staff-workspace-page staff-page-portals">
        <StaffPageHeader
          eyebrow="Operations"
          title="Page portals"
          description="Open a controlled learner view at a chosen workflow checkpoint for development testing."
          badge={
            <span className="staff-environment-badge">Local development</span>
          }
        />

        {portalQuery.isError ? (
          <Surface
            kind="notice"
            padding="normal"
            className="staff-dashboard-error"
            role="alert"
          >
            <div>
              <strong>Kristen&apos;s portal record could not be loaded.</strong>
              <p>{portalQuery.error.message}</p>
            </div>
            <BigButton
              variant="secondary"
              size="regular"
              onClick={() => void portalQuery.refetch()}
            >
              Retry
            </BigButton>
          </Surface>
        ) : null}

        <div
          className="staff-page-portals__layout"
          aria-busy={portalQuery.isLoading}
        >
          <Surface
            kind="panel"
            padding="normal"
            className="staff-data-card staff-portal-learner"
          >
            <header className="staff-data-card__header">
              <div>
                <p>Portal system learner</p>
                <h2>{learner?.full_name ?? "Loading Kristen…"}</h2>
              </div>
              <span>{learner?.learner_code ?? "KW000"}</span>
            </header>

            {learner ? (
              <>
                <dl className="staff-portal-facts">
                  <div>
                    <dt>Current checkpoint</dt>
                    <dd>{readableStage(learner.progress_stage)}</dd>
                  </div>
                  <div>
                    <dt>Active reader sessions</dt>
                    <dd>{learner.active_standard_sessions}</dd>
                  </div>
                  <div>
                    <dt>Analytics</dt>
                    <dd>
                      {learner.analytics_excluded ? "Excluded" : "Included"}
                    </dd>
                  </div>
                  <div>
                    <dt>Last manual reset</dt>
                    <dd>{formatDate(learner.last_reset_at)}</dd>
                  </div>
                </dl>

                <Surface
                  kind="notice"
                  padding="compact"
                  className="staff-portal-safeguard"
                >
                  <strong>Protected test account</strong>
                  <span>
                    A reset signs Kristen out everywhere, ends any portal run,
                    and returns her to before the Diagnostic Assessment.
                  </span>
                </Surface>

                {confirmingReset ? (
                  <div
                    className="staff-portal-confirm"
                    role="group"
                    aria-label="Confirm Kristen reset"
                  >
                    <div>
                      <strong>Reset Kristen now?</strong>
                      <p>
                        Any active learner session will stop immediately. This
                        cannot restore the current test progress.
                      </p>
                    </div>
                    <div className="staff-portal-confirm__actions">
                      <BigButton
                        variant="quiet"
                        size="regular"
                        disabled={
                          resetMutation.isPending || resetCommit.committing
                        }
                        onClick={() => setConfirmingReset(false)}
                      >
                        Cancel
                      </BigButton>
                      <BigButton
                        variant="secondary"
                        size="regular"
                        committing={resetCommit.committing}
                        busy={resetMutation.isPending}
                        busyLabel="Resetting Kristen"
                        onClick={() =>
                          resetCommit.commit(() => resetMutation.mutate())
                        }
                      >
                        Confirm reset
                      </BigButton>
                    </div>
                  </div>
                ) : (
                  <BigButton
                    className="staff-portal-reset"
                    variant="secondary"
                    size="regular"
                    onClick={() => setConfirmingReset(true)}
                  >
                    {learner.active_portal_run
                      ? "End portal and reset"
                      : "Reset Kristen's progress"}
                  </BigButton>
                )}

                {resetMutation.isSuccess ? (
                  <p className="staff-portal-success" role="status">
                    Kristen is back at the start. All prior sessions were
                    closed.
                  </p>
                ) : null}
                {resetMutation.isError ? (
                  <p className="staff-portal-error" role="alert">
                    {resetMutation.error.message}
                  </p>
                ) : null}
              </>
            ) : (
              <div
                className="staff-loading-block"
                aria-label="Loading portal learner"
              />
            )}
          </Surface>

          <Surface
            kind="panel"
            padding="normal"
            className="staff-data-card staff-portal-destinations"
          >
            <header className="staff-data-card__header">
              <div>
                <p>Workflow destinations</p>
                <h2>Choose a starting page</h2>
              </div>
              <span>Preparing</span>
            </header>

            <div className="staff-portal-placeholder">
              <span
                className="staff-portal-placeholder__mark"
                aria-hidden="true"
              >
                →
              </span>
              <div>
                <strong>Portal launching is not active yet</strong>
                <p>
                  {portalQuery.data?.portal_launch.reason ??
                    "Waiting for the learner workflow records."}
                </p>
              </div>
            </div>

            <p className="staff-portal-note">
              Destinations will appear only after Diagnostic Assessment and
              lesson progress can be saved truthfully. No simulated completion
              records are being invented.
            </p>
          </Surface>
        </div>
      </div>
    </StaffShell>
  );
}
