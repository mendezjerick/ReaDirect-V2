import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import {
  StaffContentGrid,
  StaffWorkspacePage,
} from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  createSchoolAdministrator,
  getSchoolAdministrators,
} from "../staff-auth/staffApi";

interface SchoolAdministratorForm {
  username: string;
  temporary_password: string;
}

function formatCreatedDate(value: string | null): string {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function SchoolAdministratorsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exitCommit = useButtonCommit();
  const createCommit = useButtonCommit();
  const [showPassword, setShowPassword] = useState(false);
  const accountsQuery = useQuery({
    queryKey: ["school-administrators"],
    queryFn: getSchoolAdministrators,
  });
  const createMutation = useMutation({
    mutationFn: createSchoolAdministrator,
    onSuccess: () => {
      reset();
      setShowPassword(false);
      void queryClient.invalidateQueries({
        queryKey: ["school-administrators"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["system-admin-overview"],
      });
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolAdministratorForm>({
    defaultValues: { username: "", temporary_password: "" },
  });

  const submitAccount = handleSubmit((credentials) => {
    createCommit.commit(() => createMutation.mutate(credentials));
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
    >
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="People and schools"
          title="School administrators"
          description="Create the temporary credentials a School Administrator uses for their first sign-in."
          badge={
            <StaffBadge>{accountsQuery.data?.length ?? 0} accounts</StaffBadge>
          }
        />

        <StaffContentGrid className="staff-content-grid--sidebar">
          <StaffCard>
            <StaffSectionHeader
              eyebrow="New account"
              title="Create School Administrator"
              description="Email and school details are completed by the administrator after their first sign-in."
            />

            <form className="staff-form-stack" onSubmit={submitAccount}>
              <TextField
                label="Username"
                type="text"
                autoComplete="off"
                placeholder="e.g. northfield-admin"
                error={errors.username?.message}
                {...register("username", {
                  required: "Enter a temporary username.",
                  minLength: {
                    value: 3,
                    message: "Use at least 3 characters.",
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
                    message:
                      "Use letters, numbers, periods, underscores, or hyphens only.",
                  },
                })}
              />

              <TextField
                label="Temporary password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                error={errors.temporary_password?.message}
                trailingAction={
                  <button
                    className="text-field__toggle"
                    type="button"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                }
                {...register("temporary_password", {
                  required: "Enter a temporary password.",
                  minLength: {
                    value: 8,
                    message: "Use at least 8 characters.",
                  },
                })}
              />

              {createMutation.isError ? (
                <StaffNotice tone="danger">
                  {createMutation.error.message}
                </StaffNotice>
              ) : null}

              {createMutation.isSuccess ? (
                <StaffNotice
                  tone="success"
                  title="Account created."
                  role="status"
                >
                  <span>
                    {createMutation.data.username} can now use the temporary
                    credentials to sign in.
                  </span>
                </StaffNotice>
              ) : null}

              <StaffButton
                tone="primary"
                size="roomy"
                type="submit"
                committing={createCommit.committing}
                busy={createMutation.isPending}
                busyLabel="Creating account"
              >
                Create account
              </StaffButton>
            </form>
          </StaffCard>

          <StaffCard padding="none">
            <StaffSectionHeader
              bordered
              eyebrow="Account directory"
              title="School Administrators"
              meta={<StaffBadge tone="neutral">Newest first</StaffBadge>}
            />

            {accountsQuery.isLoading ? (
              <StaffState
                compact
                aria-live="polite"
                title="Loading accounts…"
              />
            ) : null}

            {accountsQuery.isError ? (
              <StaffState
                compact
                tone="danger"
                role="alert"
                title="Accounts could not be loaded."
                actionLabel="Retry"
                onAction={() => void accountsQuery.refetch()}
              />
            ) : null}

            {accountsQuery.data?.length === 0 ? (
              <StaffState
                compact
                title="No School Administrators yet."
                description="The first account you create will appear here."
              />
            ) : null}

            {accountsQuery.data && accountsQuery.data.length > 0 ? (
              <StaffDataTable
                accessibleLabel="School administrator accounts"
                rows={accountsQuery.data}
                rowKey={(account) => account.id}
                columns={[
                  {
                    key: "account",
                    label: "Account",
                    width: "minmax(12rem, 1.4fr)",
                    render: (account) => (
                      <span className="staff-data-table__primary">
                        <strong>{account.username}</strong>
                        <small>{account.display_name}</small>
                      </span>
                    ),
                  },
                  {
                    key: "school",
                    label: "School",
                    width: "minmax(10rem, 1.2fr)",
                    render: (account) => account.school ?? "Not entered",
                  },
                  {
                    key: "setup",
                    label: "Setup",
                    render: (account) => (
                      <StaffBadge
                        tone={
                          account.requires_school_setup ? "warning" : "success"
                        }
                      >
                        {account.requires_school_setup
                          ? "School required"
                          : "Complete"}
                      </StaffBadge>
                    ),
                  },
                  {
                    key: "created",
                    label: "Created",
                    render: (account) => formatCreatedDate(account.created_at),
                  },
                ]}
              />
            ) : null}
          </StaffCard>
        </StaffContentGrid>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
