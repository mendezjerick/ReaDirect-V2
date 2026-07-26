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
  StaffFactGrid,
  StaffWorkspacePage,
} from "../../components/staff/StaffContentPatterns";
import {
  StaffDataTable,
  type StaffDataColumn,
} from "../../components/staff/StaffDataTable";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { teacherNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  createLearnerAccount,
  getTeacherLearners,
  loadStaffSession,
  resetLearnerPassword,
  type CreatedLearnerAccount,
  type LearnerAccount,
  type ResetLearnerCredentials,
} from "../staff-auth/staffApi";

interface LearnerAccountForm {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  lrn: string;
}

function formatCreatedDate(value: string | null): string {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function LearnerAccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exitCommit = useButtonCommit();
  const createCommit = useButtonCommit();
  const openLearnerCommit = useButtonCommit();
  const resetPasswordCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const [createdLearner, setCreatedLearner] =
    useState<CreatedLearnerAccount | null>(null);
  const [passwordResetTarget, setPasswordResetTarget] =
    useState<LearnerAccount | null>(null);
  const [resetCredentials, setResetCredentials] =
    useState<ResetLearnerCredentials | null>(null);
  const teacherSession = session?.staff.role === "teacher" ? session : null;
  const assignedSchool = teacherSession?.staff.school ?? null;
  const assignedGrade = teacherSession?.staff.grade_level ?? null;
  const assignedSection = teacherSession?.staff.section ?? null;
  const hasCompleteAssignment =
    teacherSession !== null &&
    assignedSchool !== null &&
    assignedGrade !== null &&
    assignedSection !== null;
  const learnersQuery = useQuery({
    queryKey: ["teacher-learners", teacherSession?.staff.id],
    queryFn: () => getTeacherLearners(teacherSession!.staff.id),
    enabled: hasCompleteAssignment,
  });
  const createMutation = useMutation({
    mutationFn: (form: LearnerAccountForm) =>
      createLearnerAccount({
        staffUserId: teacherSession!.staff.id,
        firstName: form.first_name,
        middleName: form.middle_name,
        lastName: form.last_name,
        suffix: form.suffix,
        lrn: form.lrn,
      }),
    onSuccess: (learner) => {
      setResetCredentials(null);
      setCreatedLearner(learner);
      reset();
      void queryClient.invalidateQueries({
        queryKey: ["teacher-learners", teacherSession?.staff.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["teacher-overview", teacherSession?.staff.id],
      });
    },
  });
  const resetPasswordMutation = useMutation({
    mutationFn: (learner: LearnerAccount) =>
      resetLearnerPassword({
        staffUserId: teacherSession!.staff.id,
        learnerId: learner.id,
      }),
    onSuccess: (credentials) => {
      setCreatedLearner(null);
      setPasswordResetTarget(null);
      setResetCredentials(credentials);
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LearnerAccountForm>({
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      suffix: "",
      lrn: "",
    },
  });

  if (!teacherSession) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>Teacher sign-in required</h1>
          <p>Return to staff login to manage Learner accounts.</p>
          <BigButton onClick={() => navigate("/staff/login")}>
            Go to staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  if (!hasCompleteAssignment || !assignedSchool) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>Class assignment required</h1>
          <p>
            Ask your School Administrator to assign your school, grade level,
            and section before creating Learners.
          </p>
          <BigButton
            variant="secondary"
            onClick={() => navigate("/staff/teacher")}
          >
            Return to dashboard
          </BigButton>
        </Surface>
      </main>
    );
  }

  const submitAccount = handleSubmit((form) => {
    setCreatedLearner(null);
    setPasswordResetTarget(null);
    setResetCredentials(null);
    resetPasswordMutation.reset();
    createCommit.commit(() => createMutation.mutate(form));
  });
  const accountLabel =
    teacherSession.staff.username ?? teacherSession.staff.display_name;
  const learnerColumns: StaffDataColumn<LearnerAccount>[] = [
    {
      key: "learner",
      label: "Learner",
      width: "minmax(11rem, 1.5fr)",
      render: (learner) => (
        <span className="staff-data-table__primary">
          <strong>{learner.full_name}</strong>
          <small>Created {formatCreatedDate(learner.created_at)}</small>
        </span>
      ),
    },
    {
      key: "code",
      label: "Code",
      width: "minmax(7rem, 0.8fr)",
      render: (learner) => <strong>{learner.learner_code}</strong>,
    },
    {
      key: "assignment",
      label: "Assignment",
      width: "minmax(9rem, 1fr)",
      render: (learner) => `Grade ${learner.grade_level} · ${learner.section}`,
    },
    {
      key: "lrn",
      label: "LRN",
      width: "minmax(7rem, 0.9fr)",
      render: (learner) => learner.lrn ?? "Not entered",
    },
    {
      key: "actions",
      label: "Actions",
      width: "minmax(12rem, 1.2fr)",
      cellClassName: "staff-data-table__actions",
      render: (learner) => (
        <>
          <StaffButton
            tone="secondary"
            size="compact"
            committing={openLearnerCommit.committing}
            onClick={() =>
              openLearnerCommit.commit(() =>
                navigate(`/staff/teacher/learners/${learner.id}`),
              )
            }
          >
            View progress
          </StaffButton>
          <StaffButton
            tone="quiet"
            size="compact"
            aria-label={`Reset password for ${learner.full_name}`}
            onClick={() => {
              setCreatedLearner(null);
              setResetCredentials(null);
              setPasswordResetTarget(learner);
              resetPasswordMutation.reset();
            }}
          >
            Reset password
          </StaffButton>
        </>
      ),
    },
  ];

  return (
    <StaffShell
      accountLabel={accountLabel}
      accountMeta={`${assignedSchool.name} · Grade ${assignedGrade} ${assignedSection}`}
      administrationLabel="Teacher workspace"
      avatarLabel="TR"
      brandIcon={<StaffBrandIcon />}
      exitCommitting={exitCommit.committing}
      navigationGroups={teacherNavigationGroups}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      workspaceLabel="Teacher"
    >
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="Class management"
          title="Learners"
          description={`Create Learner accounts for Grade ${assignedGrade} Section ${assignedSection}. School and class assignment are automatic.`}
          badge={
            <StaffBadge>{learnersQuery.data?.length ?? 0} learners</StaffBadge>
          }
        />

        {createdLearner ? (
          <StaffCard
            tone="success"
            role="status"
            aria-labelledby="learner-credentials-title"
          >
            <StaffSectionHeader
              eyebrow="Account created"
              title={`Save ${createdLearner.full_name}'s credentials`}
              id="learner-credentials-title"
              description="The password is shown only in this creation confirmation."
            />
            <StaffFactGrid
              facts={[
                {
                  label: "Learner Code",
                  value: createdLearner.learner_code,
                },
                {
                  label: "Password",
                  value: createdLearner.temporary_password,
                },
              ]}
            />
            <StaffButton
              tone="secondary"
              size="regular"
              onClick={() => setCreatedLearner(null)}
            >
              Credentials saved
            </StaffButton>
          </StaffCard>
        ) : null}

        {resetCredentials ? (
          <StaffCard
            tone="success"
            role="status"
            aria-labelledby="learner-reset-credentials-title"
          >
            <StaffSectionHeader
              eyebrow="Password reset"
              title={`Save ${resetCredentials.full_name}'s new credentials`}
              id="learner-reset-credentials-title"
              description="This password is shown only once. Existing Learner sessions have been signed out."
            />
            <StaffFactGrid
              facts={[
                {
                  label: "Learner Code",
                  value: resetCredentials.learner_code,
                },
                {
                  label: "New password",
                  value: resetCredentials.temporary_password,
                },
              ]}
            />
            <StaffButton
              tone="secondary"
              size="regular"
              onClick={() => setResetCredentials(null)}
            >
              Credentials saved
            </StaffButton>
          </StaffCard>
        ) : null}

        {passwordResetTarget ? (
          <StaffNotice
            tone="warning"
            title={`Reset the password for ${passwordResetTarget.full_name}?`}
            role="group"
            aria-label={`Confirm password reset for ${passwordResetTarget.full_name}`}
            actions={
              <>
                <StaffButton
                  tone="quiet"
                  size="regular"
                  disabled={
                    resetPasswordMutation.isPending ||
                    resetPasswordCommit.committing
                  }
                  onClick={() => {
                    setPasswordResetTarget(null);
                    resetPasswordMutation.reset();
                  }}
                >
                  Cancel
                </StaffButton>
                <StaffButton
                  tone="secondary"
                  size="regular"
                  committing={resetPasswordCommit.committing}
                  busy={resetPasswordMutation.isPending}
                  busyLabel="Resetting password"
                  onClick={() =>
                    resetPasswordCommit.commit(() =>
                      resetPasswordMutation.mutate(passwordResetTarget),
                    )
                  }
                >
                  Confirm password reset
                </StaffButton>
              </>
            }
          >
            <span>
              Their old password will stop working immediately and every active
              Learner session will be signed out. Learning progress will not be
              changed.
            </span>
            {resetPasswordMutation.isError ? (
              <strong role="alert">
                {resetPasswordMutation.error.message}
              </strong>
            ) : null}
          </StaffNotice>
        ) : null}

        <StaffContentGrid className="staff-content-grid--sidebar">
          <StaffCard>
            <StaffSectionHeader
              eyebrow="New account"
              title="Create Learner"
              description={
                <>
                  ReaDirect generates the Learner Code and password. Rhine,
                  Grade {assignedGrade}, and Section {assignedSection} are
                  assigned automatically.
                </>
              }
            />

            <form className="staff-form-stack" onSubmit={submitAccount}>
              <TextField
                label="First name"
                type="text"
                autoComplete="given-name"
                error={errors.first_name?.message}
                {...register("first_name", {
                  required: "Enter the Learner's first name.",
                  maxLength: {
                    value: 80,
                    message: "Use 80 characters or fewer.",
                  },
                })}
              />

              <TextField
                label="Middle name"
                type="text"
                autoComplete="additional-name"
                error={errors.middle_name?.message}
                {...register("middle_name", {
                  required: "Enter the Learner's middle name.",
                  maxLength: {
                    value: 80,
                    message: "Use 80 characters or fewer.",
                  },
                })}
              />

              <TextField
                label="Last name"
                type="text"
                autoComplete="family-name"
                error={errors.last_name?.message}
                {...register("last_name", {
                  required: "Enter the Learner's last name.",
                  maxLength: {
                    value: 80,
                    message: "Use 80 characters or fewer.",
                  },
                })}
              />

              <TextField
                label="Suffix (optional)"
                type="text"
                autoComplete="honorific-suffix"
                placeholder="e.g. Jr."
                error={errors.suffix?.message}
                {...register("suffix", {
                  maxLength: {
                    value: 20,
                    message: "Use 20 characters or fewer.",
                  },
                })}
              />

              <TextField
                label="LRN (optional)"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                error={errors.lrn?.message}
                {...register("lrn", {
                  maxLength: {
                    value: 50,
                    message: "Use 50 characters or fewer.",
                  },
                })}
              />

              {createMutation.isError ? (
                <StaffNotice tone="danger">
                  {createMutation.error.message}
                </StaffNotice>
              ) : null}

              <StaffButton
                tone="primary"
                size="roomy"
                type="submit"
                committing={createCommit.committing}
                busy={createMutation.isPending}
                busyLabel="Creating Learner"
              >
                Create Learner
              </StaffButton>
            </form>
          </StaffCard>

          <StaffCard padding="none">
            <StaffSectionHeader
              eyebrow="Your class"
              title="Learner directory"
              meta={<StaffBadge tone="neutral">Newest first</StaffBadge>}
              bordered
            />

            {learnersQuery.isLoading ? (
              <StaffState
                compact
                aria-live="polite"
                title="Loading Learners…"
              />
            ) : null}

            {learnersQuery.isError ? (
              <StaffState
                compact
                tone="danger"
                role="alert"
                title="Learners could not be loaded."
                actionLabel="Retry"
                onAction={() => void learnersQuery.refetch()}
              />
            ) : null}

            {learnersQuery.data?.length === 0 ? (
              <StaffState
                compact
                title="No Learners yet."
                description="The first Learner you create will appear here."
              />
            ) : null}

            {learnersQuery.data && learnersQuery.data.length > 0 ? (
              <StaffDataTable
                accessibleLabel="Learner directory"
                columns={learnerColumns}
                rows={learnersQuery.data}
                rowKey={(learner) => learner.id}
              />
            ) : null}
          </StaffCard>
        </StaffContentGrid>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
