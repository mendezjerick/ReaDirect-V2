import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
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
      <div className="staff-workspace-page">
        <StaffPageHeader
          eyebrow="People and schools"
          title="School administrators"
          description="Create the temporary credentials a School Administrator uses for their first sign-in."
          badge={
            <span className="staff-count-badge">
              {accountsQuery.data?.length ?? 0} accounts
            </span>
          }
        />

        <div className="staff-account-layout">
          <Surface
            kind="panel"
            padding="normal"
            className="staff-account-create-card"
          >
            <header className="staff-section-header">
              <p>New account</p>
              <h2>Create School Administrator</h2>
              <span>
                Email and school details are completed by the administrator
                after their first sign-in.
              </span>
            </header>

            <form className="staff-account-form" onSubmit={submitAccount}>
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
                <Surface
                  kind="notice"
                  padding="compact"
                  className="staff-form-notice staff-form-notice--error"
                  role="alert"
                >
                  {createMutation.error.message}
                </Surface>
              ) : null}

              {createMutation.isSuccess ? (
                <Surface
                  kind="notice"
                  padding="compact"
                  className="staff-form-notice staff-form-notice--success"
                  role="status"
                >
                  <strong>Account created.</strong>
                  <span>
                    {createMutation.data.username} can now use the temporary
                    credentials to sign in.
                  </span>
                </Surface>
              ) : null}

              <BigButton
                className="staff-account-form__submit"
                size="regular"
                type="submit"
                committing={createCommit.committing}
                busy={createMutation.isPending}
                busyLabel="Creating account"
              >
                Create account
              </BigButton>
            </form>
          </Surface>

          <Surface
            kind="panel"
            padding="none"
            className="staff-account-list-card"
          >
            <header className="staff-section-header staff-section-header--list">
              <div>
                <p>Account directory</p>
                <h2>School Administrators</h2>
              </div>
              <span>Newest first</span>
            </header>

            {accountsQuery.isLoading ? (
              <div className="staff-account-list-state" aria-live="polite">
                Loading accounts…
              </div>
            ) : null}

            {accountsQuery.isError ? (
              <div className="staff-account-list-state" role="alert">
                <strong>Accounts could not be loaded.</strong>
                <BigButton
                  variant="secondary"
                  size="regular"
                  onClick={() => void accountsQuery.refetch()}
                >
                  Retry
                </BigButton>
              </div>
            ) : null}

            {accountsQuery.data?.length === 0 ? (
              <div className="staff-account-list-state">
                <strong>No School Administrators yet.</strong>
                <span>The first account you create will appear here.</span>
              </div>
            ) : null}

            {accountsQuery.data && accountsQuery.data.length > 0 ? (
              <div className="staff-account-table" role="table">
                <div className="staff-account-table__header" role="row">
                  <span role="columnheader">Account</span>
                  <span role="columnheader">School</span>
                  <span role="columnheader">Setup</span>
                  <span role="columnheader">Created</span>
                </div>
                {accountsQuery.data.map((account) => (
                  <article
                    className="staff-account-table__row"
                    role="row"
                    key={account.id}
                  >
                    <div role="cell" data-label="Account">
                      <strong>{account.username}</strong>
                      <span>{account.display_name}</span>
                    </div>
                    <div role="cell" data-label="School">
                      {account.school ?? "Not entered"}
                    </div>
                    <div role="cell" data-label="Setup">
                      <span className="staff-setup-badge">
                        {account.requires_school_setup
                          ? "School required"
                          : "Complete"}
                      </span>
                    </div>
                    <div role="cell" data-label="Created">
                      {formatCreatedDate(account.created_at)}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </Surface>
        </div>
      </div>
    </StaffShell>
  );
}
