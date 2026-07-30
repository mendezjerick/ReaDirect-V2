import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  getSystemAdminGuests,
  updateSystemAdminGuestAccess,
  type SystemAdminGuestDirectory,
} from "../staff-auth/staffApi";

type GuestAccount = SystemAdminGuestDirectory["guests"][number];
type AccountFilter = "all" | "active" | "inactive";
type VerificationFilter = "all" | "verified" | "pending";

function GuestIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4 21a8 8 0 0 1 16 0M19 8h3M20.5 6.5v3" />
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

function VerifiedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SessionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h6" />
    </svg>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SystemAdminGuestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exitCommit = useButtonCommit();
  const accessCommit = useButtonCommit();
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");
  const [accessTarget, setAccessTarget] = useState<GuestAccount | null>(null);
  const guestsQuery = useQuery({
    queryKey: ["system-admin-guests"],
    queryFn: getSystemAdminGuests,
  });
  const accessMutation = useMutation({
    mutationFn: ({
      guestId,
      isActive,
    }: {
      guestId: number;
      isActive: boolean;
    }) => updateSystemAdminGuestAccess(guestId, isActive),
    onSuccess: async () => {
      setAccessTarget(null);
      await queryClient.invalidateQueries({
        queryKey: ["system-admin-guests"],
      });
    },
  });
  const filteredGuests = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return (guestsQuery.data?.guests ?? []).filter((guest) => {
      const matchesAccount =
        accountFilter === "all" ||
        (accountFilter === "active" && guest.is_active) ||
        (accountFilter === "inactive" && !guest.is_active);
      const isVerified = guest.email_verified_at !== null;
      const matchesVerification =
        verificationFilter === "all" ||
        (verificationFilter === "verified" && isVerified) ||
        (verificationFilter === "pending" && !isVerified);
      const searchableText = [guest.email, guest.display_name]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return (
        matchesAccount &&
        matchesVerification &&
        (!normalizedSearch || searchableText.includes(normalizedSearch))
      );
    });
  }, [accountFilter, guestsQuery.data?.guests, search, verificationFilter]);
  const summary = guestsQuery.data?.summary;
  const requestedActive = accessTarget ? !accessTarget.is_active : false;

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
          title="Guests"
          description="Review Guest identities, verification state, and current access without mixing Guest data into Learner records."
          badge={
            <StaffBadge>
              {summary?.total_guests ?? 0}{" "}
              {summary?.total_guests === 1 ? "account" : "accounts"}
            </StaffBadge>
          }
        />

        {guestsQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="The Guest directory could not be loaded."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void guestsQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API connection, then retry this request.</span>
          </StaffNotice>
        ) : null}

        <StaffNotice
          tone="neutral"
          title="Email delivery is not connected yet."
        >
          <span>
            This workspace manages persisted Guest access only. Activating an
            account never verifies its email, and no invitation or verification
            message is sent from this page.
          </span>
        </StaffNotice>

        {accessTarget ? (
          <StaffNotice
            tone={requestedActive ? "accent" : "warning"}
            title={`${requestedActive ? "Reactivate" : "Deactivate"} ${accessTarget.email}?`}
            role="alertdialog"
            aria-label={`Confirm ${requestedActive ? "reactivation" : "deactivation"} for ${accessTarget.email}`}
            actions={
              <>
                <StaffButton
                  size="compact"
                  tone="quiet"
                  disabled={accessMutation.isPending}
                  onClick={() => setAccessTarget(null)}
                >
                  Cancel
                </StaffButton>
                <StaffButton
                  size="compact"
                  tone={requestedActive ? "primary" : "secondary"}
                  busy={accessMutation.isPending}
                  busyLabel="Saving access"
                  committing={accessCommit.committing}
                  onClick={() =>
                    accessCommit.commit(() =>
                      accessMutation.mutate({
                        guestId: accessTarget.id,
                        isActive: requestedActive,
                      }),
                    )
                  }
                >
                  Confirm {requestedActive ? "reactivation" : "deactivation"}
                </StaffButton>
              </>
            }
          >
            <span>
              {requestedActive
                ? "This restores sign-in eligibility but does not verify a pending email."
                : `This immediately revokes ${accessTarget.active_session_count} active ${
                    accessTarget.active_session_count === 1
                      ? "session"
                      : "sessions"
                  } and blocks future sign-in.`}
            </span>
          </StaffNotice>
        ) : null}

        {accessMutation.isError ? (
          <StaffNotice tone="danger" title="Guest access was not changed.">
            <span>{accessMutation.error.message}</span>
          </StaffNotice>
        ) : null}

        <section
          className="staff-metric-grid"
          aria-label="Guest directory totals"
          aria-busy={guestsQuery.isLoading}
        >
          <MetricCard
            label="Guest accounts"
            value={summary?.total_guests ?? null}
            icon={<GuestIcon />}
          />
          <MetricCard
            label="Active guests"
            value={summary?.active_guests ?? null}
            icon={<ActiveIcon />}
          />
          <MetricCard
            label="Verified emails"
            value={summary?.verified_guests ?? null}
            icon={<VerifiedIcon />}
            detail={
              summary
                ? `${summary.pending_verification} pending verification`
                : undefined
            }
          />
          <MetricCard
            label="Active sessions"
            value={summary?.active_sessions ?? null}
            icon={<SessionIcon />}
          />
        </section>

        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="Global directory"
            title="Guest accounts"
            meta={
              <StaffBadge tone="neutral">
                {filteredGuests.length} shown
              </StaffBadge>
            }
          />

          <div className="staff-directory-toolbar staff-directory-toolbar--filters staff-directory-toolbar--three">
            <TextField
              label="Search guests"
              type="search"
              value={search}
              placeholder="Email or display name"
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
            <SelectField
              label="Email verification"
              value={verificationFilter}
              onChange={(event) =>
                setVerificationFilter(event.target.value as VerificationFilter)
              }
            >
              <option value="all">All verification states</option>
              <option value="verified">Verified only</option>
              <option value="pending">Pending only</option>
            </SelectField>
          </div>

          {guestsQuery.isLoading ? (
            <StaffState compact aria-live="polite" title="Loading Guests…" />
          ) : null}

          {guestsQuery.data && guestsQuery.data.guests.length === 0 ? (
            <StaffState
              compact
              title="No Guest accounts yet."
              description="Verified public Guest registration will populate this directory after that access flow is enabled."
            />
          ) : null}

          {guestsQuery.data && guestsQuery.data.guests.length > 0 ? (
            <StaffDataTable
              accessibleLabel="System Guest accounts"
              rows={filteredGuests}
              rowKey={(guest) => guest.id}
              empty={
                <StaffState
                  compact
                  title="No Guests match these filters."
                  description="Adjust the search, account status, or verification state."
                />
              }
              columns={[
                {
                  key: "guest",
                  label: "Guest",
                  width: "minmax(8rem, 1.4fr)",
                  render: (guest) => (
                    <span className="staff-data-table__primary">
                      <strong>{guest.display_name ?? "Guest Reader"}</strong>
                      <small>{guest.email}</small>
                    </span>
                  ),
                },
                {
                  key: "verification",
                  label: "Verification",
                  width: "minmax(5.5rem, 0.85fr)",
                  render: (guest) => (
                    <span className="staff-data-table__primary">
                      <StaffBadge
                        tone={guest.email_verified_at ? "success" : "warning"}
                      >
                        {guest.email_verified_at ? "Verified" : "Pending"}
                      </StaffBadge>
                      <small>
                        {guest.email_verified_at
                          ? formatDateTime(guest.email_verified_at)
                          : "Email not verified"}
                      </small>
                    </span>
                  ),
                },
                {
                  key: "access",
                  label: "Access",
                  width: "minmax(4rem, 0.6fr)",
                  render: (guest) => (
                    <StaffBadge tone={guest.is_active ? "success" : "muted"}>
                      {guest.is_active ? "Active" : "Inactive"}
                    </StaffBadge>
                  ),
                },
                {
                  key: "last-sign-in",
                  label: "Last sign-in",
                  width: "minmax(6rem, 0.85fr)",
                  render: (guest) => formatDateTime(guest.last_signed_in_at),
                },
                {
                  key: "sessions",
                  label: "Sessions",
                  width: "minmax(3.5rem, 0.45fr)",
                  render: (guest) => guest.active_session_count,
                },
                {
                  key: "action",
                  label: "Access action",
                  width: "minmax(5.5rem, 0.75fr)",
                  render: (guest) => (
                    <StaffButton
                      size="compact"
                      tone={guest.is_active ? "quiet" : "secondary"}
                      disabled={accessMutation.isPending}
                      onClick={() => setAccessTarget(guest)}
                    >
                      {guest.is_active ? "Deactivate" : "Reactivate"}
                    </StaffButton>
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
