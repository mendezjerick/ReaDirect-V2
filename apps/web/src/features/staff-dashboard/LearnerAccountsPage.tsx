import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
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
  type CreatedLearnerAccount,
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
  const [session] = useState(loadStaffSession);
  const [createdLearner, setCreatedLearner] =
    useState<CreatedLearnerAccount | null>(null);
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
    createCommit.commit(() => createMutation.mutate(form));
  });
  const accountLabel =
    teacherSession.staff.username ?? teacherSession.staff.display_name;

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
      <div className="staff-workspace-page">
        <StaffPageHeader
          eyebrow="Class management"
          title="Learners"
          description={`Create Learner accounts for Grade ${assignedGrade} Section ${assignedSection}. School and class assignment are automatic.`}
          badge={
            <span className="staff-count-badge">
              {learnersQuery.data?.length ?? 0} learners
            </span>
          }
        />

        {createdLearner ? (
          <Surface
            kind="notice"
            padding="normal"
            className="learner-credentials-card"
            role="status"
            aria-labelledby="learner-credentials-title"
          >
            <div>
              <p>Account created</p>
              <h2 id="learner-credentials-title">
                Save {createdLearner.full_name}&apos;s credentials
              </h2>
              <span>
                The password is shown only in this creation confirmation.
              </span>
            </div>
            <dl className="learner-credentials-card__values">
              <div>
                <dt>Learner Code</dt>
                <dd>{createdLearner.learner_code}</dd>
              </div>
              <div>
                <dt>Password</dt>
                <dd>{createdLearner.temporary_password}</dd>
              </div>
            </dl>
            <BigButton
              variant="secondary"
              size="regular"
              onClick={() => setCreatedLearner(null)}
            >
              Credentials saved
            </BigButton>
          </Surface>
        ) : null}

        <div className="staff-account-layout">
          <Surface
            kind="panel"
            padding="normal"
            className="staff-account-create-card"
          >
            <header className="staff-section-header">
              <p>New account</p>
              <h2>Create Learner</h2>
              <span>
                ReaDirect generates the Learner Code and password. Rhine, Grade{" "}
                {assignedGrade}, and Section {assignedSection} are assigned
                automatically.
              </span>
            </header>

            <form className="staff-account-form" onSubmit={submitAccount}>
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
                <Surface
                  kind="notice"
                  padding="compact"
                  className="staff-form-notice staff-form-notice--error"
                  role="alert"
                >
                  {createMutation.error.message}
                </Surface>
              ) : null}

              <BigButton
                className="staff-account-form__submit"
                size="regular"
                type="submit"
                committing={createCommit.committing}
                busy={createMutation.isPending}
                busyLabel="Creating Learner"
              >
                Create Learner
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
                <p>Your class</p>
                <h2>Learner directory</h2>
              </div>
              <span>Newest first</span>
            </header>

            {learnersQuery.isLoading ? (
              <div className="staff-account-list-state" aria-live="polite">
                Loading Learners…
              </div>
            ) : null}

            {learnersQuery.isError ? (
              <div className="staff-account-list-state" role="alert">
                <strong>Learners could not be loaded.</strong>
                <BigButton
                  variant="secondary"
                  size="regular"
                  onClick={() => void learnersQuery.refetch()}
                >
                  Retry
                </BigButton>
              </div>
            ) : null}

            {learnersQuery.data?.length === 0 ? (
              <div className="staff-account-list-state">
                <strong>No Learners yet.</strong>
                <span>The first Learner you create will appear here.</span>
              </div>
            ) : null}

            {learnersQuery.data && learnersQuery.data.length > 0 ? (
              <div className="staff-account-table" role="table">
                <div className="staff-account-table__header" role="row">
                  <span role="columnheader">Learner</span>
                  <span role="columnheader">Code</span>
                  <span role="columnheader">Assignment</span>
                  <span role="columnheader">LRN</span>
                </div>
                {learnersQuery.data.map((learner) => (
                  <article
                    className="staff-account-table__row"
                    role="row"
                    key={learner.id}
                  >
                    <div role="cell" data-label="Learner">
                      <strong>{learner.full_name}</strong>
                      <span>
                        Created {formatCreatedDate(learner.created_at)}
                      </span>
                    </div>
                    <div role="cell" data-label="Code">
                      <strong>{learner.learner_code}</strong>
                    </div>
                    <div role="cell" data-label="Assignment">
                      Grade {learner.grade_level} · {learner.section}
                    </div>
                    <div role="cell" data-label="LRN">
                      {learner.lrn ?? "Not entered"}
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
