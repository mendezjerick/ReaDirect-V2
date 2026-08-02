import { useMutation } from "@tanstack/react-query";
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
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import {
  schoolAdminNavigationGroups,
  systemAdminNavigationGroups,
  teacherNavigationGroups,
} from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  changeStaffPassword,
  clearStaffSession,
  confirmStaffEmailVerification,
  loadStaffSession,
  requestStaffEmailVerification,
  requestStaffPasswordChangeCode,
  saveStaffSession,
  type StaffRole,
} from "./staffApi";

interface EmailBindingForm {
  email: string;
  current_password: string;
}

interface CodeForm {
  code: string;
}

interface PasswordAuthorizationForm {
  current_password: string;
}

interface PasswordChangeForm {
  code: string;
  password: string;
  password_confirmation: string;
}

const rolePresentation: Record<
  StaffRole,
  {
    workspaceLabel: string;
    administrationLabel: string;
    avatarLabel: string;
    navigationGroups: typeof systemAdminNavigationGroups;
  }
> = {
  system_admin: {
    workspaceLabel: "System Admin",
    administrationLabel: "System administration",
    avatarLabel: "SA",
    navigationGroups: systemAdminNavigationGroups,
  },
  school_admin: {
    workspaceLabel: "School Admin",
    administrationLabel: "School administration",
    avatarLabel: "SC",
    navigationGroups: schoolAdminNavigationGroups,
  },
  teacher: {
    workspaceLabel: "Teacher",
    administrationLabel: "Teacher workspace",
    avatarLabel: "TR",
    navigationGroups: teacherNavigationGroups,
  },
};

export function StaffSecurityPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const [session, setSession] = useState(loadStaffSession);
  const [emailCodeRequested, setEmailCodeRequested] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [passwordCurrentPassword, setPasswordCurrentPassword] = useState<
    string | null
  >(null);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const emailForm = useForm<EmailBindingForm>({
    defaultValues: {
      email: session?.staff.email ?? "",
      current_password: "",
    },
  });
  const emailCodeForm = useForm<CodeForm>({ defaultValues: { code: "" } });
  const passwordAuthorizationForm = useForm<PasswordAuthorizationForm>({
    defaultValues: { current_password: "" },
  });
  const passwordChangeForm = useForm<PasswordChangeForm>({
    defaultValues: { code: "", password: "", password_confirmation: "" },
  });

  const emailRequestMutation = useMutation({
    mutationFn: requestStaffEmailVerification,
    onSuccess: (_, input) => {
      setPendingEmail(input.email.trim().toLowerCase());
      setEmailCodeRequested(true);
      emailForm.reset({ email: input.email, current_password: "" });
      emailCodeForm.reset();
    },
  });
  const emailConfirmMutation = useMutation({
    mutationFn: confirmStaffEmailVerification,
    onSuccess: (verifiedEmail) => {
      if (session) {
        const updatedSession = {
          ...session,
          staff: {
            ...session.staff,
            email: verifiedEmail.email,
            email_verified_at: verifiedEmail.email_verified_at,
          },
        };
        saveStaffSession(updatedSession);
        setSession(updatedSession);
      }
      setPendingEmail(null);
      setEmailCodeRequested(false);
      emailCodeForm.reset();
    },
  });
  const passwordCodeMutation = useMutation({
    mutationFn: requestStaffPasswordChangeCode,
    onSuccess: (_, currentPassword) => {
      setPasswordCurrentPassword(currentPassword);
      passwordAuthorizationForm.reset();
      passwordChangeForm.reset();
      setPasswordChanged(false);
    },
  });
  const passwordChangeMutation = useMutation({
    mutationFn: changeStaffPassword,
    onSuccess: () => {
      if (session) {
        const updatedSession = {
          ...session,
          staff: { ...session.staff, requires_credential_setup: false },
        };
        saveStaffSession(updatedSession);
        setSession(updatedSession);
      }
      setPasswordCurrentPassword(null);
      passwordChangeForm.reset();
      setPasswordChanged(true);
    },
  });

  if (!session) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>Staff sign-in required</h1>
          <p>Sign in before managing account security.</p>
          <BigButton onClick={() => navigate("/staff/login")}>
            Go to staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  const role = rolePresentation[session.staff.role];
  const hasVerifiedEmail =
    session.staff.email !== null && session.staff.email_verified_at !== null;
  const accountLabel = session.staff.username ?? session.staff.display_name;

  return (
    <StaffShell
      accountLabel={accountLabel}
      accountMeta={session.staff.email ?? "Email not verified"}
      administrationLabel={role.administrationLabel}
      avatarLabel={role.avatarLabel}
      brandIcon={<StaffBrandIcon />}
      exitCommitting={exitCommit.committing}
      navigationGroups={role.navigationGroups}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      workspaceLabel={role.workspaceLabel}
    >
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="Account"
          title="Account security"
          description="Bind a working email and choose whether to replace your current password."
          badge={
            <StaffBadge tone={hasVerifiedEmail ? "success" : "warning"}>
              {hasVerifiedEmail ? "Email verified" : "Email required"}
            </StaffBadge>
          }
        />

        {session.staff.requires_credential_setup ? (
          <StaffNotice tone="warning" title="Temporary credentials are active.">
            <p>
              You may continue using your current password. Changing it is
              recommended, but it is your choice and does not block staff tools.
            </p>
          </StaffNotice>
        ) : (
          <StaffNotice tone="success" title="Your password has been updated.">
            <p>
              You can change it again at any time using your verified email.
            </p>
          </StaffNotice>
        )}

        <StaffContentGrid className="staff-content-grid--two">
          <StaffCard>
            <StaffSectionHeader
              eyebrow="Step 1"
              title="Verified email"
              description="Authentication codes are sent only to the address being verified."
            />

            {hasVerifiedEmail ? (
              <StaffNotice tone="success" title="Email binding complete">
                <p>{session.staff.email}</p>
              </StaffNotice>
            ) : emailCodeRequested ? (
              <form
                className="staff-form-stack"
                onSubmit={emailCodeForm.handleSubmit(({ code }) =>
                  emailConfirmMutation.mutate(code),
                )}
              >
                <p>
                  Enter the six-digit code sent to{" "}
                  <strong>{pendingEmail}</strong>. It expires after 10 minutes.
                </p>
                <TextField
                  label="Email authentication code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  error={emailCodeForm.formState.errors.code?.message}
                  {...emailCodeForm.register("code", {
                    required: "Enter the authentication code.",
                    pattern: {
                      value: /^\d{6}$/,
                      message: "Enter the six-digit code.",
                    },
                  })}
                />
                {emailConfirmMutation.isError ? (
                  <StaffNotice tone="danger">
                    <p>{emailConfirmMutation.error.message}</p>
                  </StaffNotice>
                ) : null}
                <StaffButton
                  type="submit"
                  tone="primary"
                  size="roomy"
                  busy={emailConfirmMutation.isPending}
                  busyLabel="Verifying email"
                >
                  Verify email
                </StaffButton>
                <StaffButton
                  type="button"
                  tone="quiet"
                  onClick={() => {
                    setEmailCodeRequested(false);
                    setPendingEmail(null);
                    emailCodeForm.reset();
                  }}
                >
                  Use a different email
                </StaffButton>
              </form>
            ) : (
              <form
                className="staff-form-stack"
                onSubmit={emailForm.handleSubmit((input) =>
                  emailRequestMutation.mutate(input),
                )}
              >
                <TextField
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  error={emailForm.formState.errors.email?.message}
                  {...emailForm.register("email", {
                    required: "Enter a working email address.",
                  })}
                />
                <TextField
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  error={emailForm.formState.errors.current_password?.message}
                  {...emailForm.register("current_password", {
                    required: "Enter your current password.",
                  })}
                />
                {emailRequestMutation.isError ? (
                  <StaffNotice tone="danger">
                    <p>{emailRequestMutation.error.message}</p>
                  </StaffNotice>
                ) : null}
                <StaffButton
                  type="submit"
                  tone="primary"
                  size="roomy"
                  busy={emailRequestMutation.isPending}
                  busyLabel="Sending code"
                >
                  Send verification code
                </StaffButton>
              </form>
            )}
          </StaffCard>

          <StaffCard>
            <StaffSectionHeader
              eyebrow="Step 2"
              title="Password"
              description="A fresh code from your verified email is required for every change."
            />

            {!hasVerifiedEmail ? (
              <StaffNotice tone="neutral" title="Verify an email first">
                <p>
                  Your current password remains valid until you choose to change
                  it.
                </p>
              </StaffNotice>
            ) : passwordChanged ? (
              <StaffNotice tone="success" title="Password changed">
                <p>
                  Other active sessions were signed out. This session remains
                  active.
                </p>
              </StaffNotice>
            ) : passwordCurrentPassword === null ? (
              <form
                className="staff-form-stack"
                onSubmit={passwordAuthorizationForm.handleSubmit(
                  ({ current_password }) =>
                    passwordCodeMutation.mutate(current_password),
                )}
              >
                <TextField
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  error={
                    passwordAuthorizationForm.formState.errors.current_password
                      ?.message
                  }
                  {...passwordAuthorizationForm.register("current_password", {
                    required: "Enter your current password.",
                  })}
                />
                {passwordCodeMutation.isError ? (
                  <StaffNotice tone="danger">
                    <p>{passwordCodeMutation.error.message}</p>
                  </StaffNotice>
                ) : null}
                <StaffButton
                  type="submit"
                  tone="primary"
                  size="roomy"
                  busy={passwordCodeMutation.isPending}
                  busyLabel="Sending code"
                >
                  Send password-change code
                </StaffButton>
              </form>
            ) : (
              <form
                className="staff-form-stack"
                onSubmit={passwordChangeForm.handleSubmit((input) =>
                  passwordChangeMutation.mutate({
                    ...input,
                    current_password: passwordCurrentPassword,
                  }),
                )}
              >
                <p>
                  Enter the code sent to {session.staff.email}, then choose a
                  new password.
                </p>
                <TextField
                  label="Password-change code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  error={passwordChangeForm.formState.errors.code?.message}
                  {...passwordChangeForm.register("code", {
                    required: "Enter the authentication code.",
                    pattern: {
                      value: /^\d{6}$/,
                      message: "Enter the six-digit code.",
                    },
                  })}
                />
                <TextField
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  error={passwordChangeForm.formState.errors.password?.message}
                  {...passwordChangeForm.register("password", {
                    required: "Enter a new password.",
                    minLength: {
                      value: 8,
                      message: "Use at least 8 characters.",
                    },
                  })}
                />
                <TextField
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  error={
                    passwordChangeForm.formState.errors.password_confirmation
                      ?.message
                  }
                  {...passwordChangeForm.register("password_confirmation", {
                    required: "Confirm the new password.",
                    validate: (value, values) =>
                      value === values.password ||
                      "The passwords do not match.",
                  })}
                />
                {passwordChangeMutation.isError ? (
                  <StaffNotice tone="danger">
                    <p>{passwordChangeMutation.error.message}</p>
                  </StaffNotice>
                ) : null}
                <StaffButton
                  type="submit"
                  tone="primary"
                  size="roomy"
                  busy={passwordChangeMutation.isPending}
                  busyLabel="Changing password"
                >
                  Change password
                </StaffButton>
                <StaffButton
                  type="button"
                  tone="quiet"
                  onClick={() => {
                    setPasswordCurrentPassword(null);
                    passwordChangeForm.reset();
                  }}
                >
                  Cancel password change
                </StaffButton>
              </form>
            )}
          </StaffCard>
        </StaffContentGrid>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
