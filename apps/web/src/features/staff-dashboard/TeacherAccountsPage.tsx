import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { schoolAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { SelectField } from "../../components/ui/SelectField";
import { Surface } from "../../components/ui/Surface";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  createTeacherAccount,
  getSchoolAdminTeachers,
  loadStaffSession,
} from "../staff-auth/staffApi";

interface TeacherAccountForm {
  username: string;
  temporary_password: string;
  grade_level: string;
  section: string;
}

const gradeLevels = [1, 2, 3, 4, 5, 6] as const;

function formatCreatedDate(value: string | null): string {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function TeacherAccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exitCommit = useButtonCommit();
  const setupCommit = useButtonCommit();
  const createCommit = useButtonCommit();
  const [showPassword, setShowPassword] = useState(false);
  const [session] = useState(loadStaffSession);
  const schoolAdminSession =
    session?.staff.role === "school_admin" ? session : null;
  const assignedSchool = schoolAdminSession?.staff.school ?? null;
  const canManageTeachers =
    schoolAdminSession !== null &&
    !schoolAdminSession.staff.requires_school_setup &&
    assignedSchool !== null;
  const teachersQuery = useQuery({
    queryKey: ["school-admin-teachers", schoolAdminSession?.staff.id],
    queryFn: () => getSchoolAdminTeachers(schoolAdminSession!.staff.id),
    enabled: canManageTeachers,
  });
  const createMutation = useMutation({
    mutationFn: (form: TeacherAccountForm) =>
      createTeacherAccount({
        staffUserId: schoolAdminSession!.staff.id,
        username: form.username,
        temporaryPassword: form.temporary_password,
        gradeLevel: Number(form.grade_level),
        section: form.section,
      }),
    onSuccess: () => {
      reset();
      setShowPassword(false);
      void queryClient.invalidateQueries({
        queryKey: ["school-admin-teachers", schoolAdminSession?.staff.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["school-admin-overview", schoolAdminSession?.staff.id],
      });
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeacherAccountForm>({
    defaultValues: {
      username: "",
      temporary_password: "",
      grade_level: "",
      section: "",
    },
  });

  if (!schoolAdminSession) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>School Administrator sign-in required</h1>
          <p>Return to staff login to manage Teacher accounts.</p>
          <BigButton onClick={() => navigate("/staff/login")}>
            Go to staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  if (!canManageTeachers || !assignedSchool) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>School setup required</h1>
          <p>Enter your school before creating Teacher accounts.</p>
          <BigButton
            committing={setupCommit.committing}
            onClick={() =>
              setupCommit.commit(() =>
                navigate("/staff/school-admin/setup-school"),
              )
            }
          >
            Complete school setup
          </BigButton>
        </Surface>
      </main>
    );
  }

  const submitAccount = handleSubmit((form) => {
    createCommit.commit(() => createMutation.mutate(form));
  });
  const accountLabel =
    schoolAdminSession.staff.username ?? schoolAdminSession.staff.display_name;

  return (
    <StaffShell
      accountLabel={accountLabel}
      accountMeta={assignedSchool.name}
      administrationLabel="School administration"
      avatarLabel="SC"
      brandIcon={<StaffBrandIcon />}
      exitCommitting={exitCommit.committing}
      navigationGroups={schoolAdminNavigationGroups}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      workspaceLabel="School Admin"
    >
      <div className="staff-workspace-page">
        <StaffPageHeader
          eyebrow="School management"
          title="Teachers"
          description={`Create Teacher accounts for ${assignedSchool.name} and assign each one to a grade and section.`}
          badge={
            <span className="staff-count-badge">
              {teachersQuery.data?.length ?? 0} accounts
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
              <h2>Create Teacher</h2>
              <span>
                The Teacher receives temporary credentials and the assigned
                class details at first sign-in.
              </span>
            </header>

            <form className="staff-account-form" onSubmit={submitAccount}>
              <TextField
                label="Username"
                type="text"
                autoComplete="off"
                placeholder="e.g. grade4-maple"
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

              <SelectField
                label="Grade level"
                defaultValue=""
                error={errors.grade_level?.message}
                {...register("grade_level", {
                  required: "Choose a grade level.",
                })}
              >
                <option value="" disabled>
                  Choose a grade
                </option>
                {gradeLevels.map((grade) => (
                  <option value={grade} key={grade}>
                    Grade {grade}
                  </option>
                ))}
              </SelectField>

              <TextField
                label="Section"
                type="text"
                autoComplete="off"
                placeholder="e.g. Maple"
                error={errors.section?.message}
                {...register("section", {
                  required: "Enter the assigned section.",
                  maxLength: {
                    value: 80,
                    message: "Use 80 characters or fewer.",
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
                  <strong>Teacher created.</strong>
                  <span>
                    {createMutation.data.username} is assigned to Grade{" "}
                    {createMutation.data.grade_level}, Section{" "}
                    {createMutation.data.section}.
                  </span>
                </Surface>
              ) : null}

              <BigButton
                className="staff-account-form__submit"
                size="regular"
                type="submit"
                committing={createCommit.committing}
                busy={createMutation.isPending}
                busyLabel="Creating Teacher"
              >
                Create Teacher
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
                <p>School directory</p>
                <h2>Teacher accounts</h2>
              </div>
              <span>Newest first</span>
            </header>

            {teachersQuery.isLoading ? (
              <div className="staff-account-list-state" aria-live="polite">
                Loading accounts…
              </div>
            ) : null}

            {teachersQuery.isError ? (
              <div className="staff-account-list-state" role="alert">
                <strong>Teacher accounts could not be loaded.</strong>
                <BigButton
                  variant="secondary"
                  size="regular"
                  onClick={() => void teachersQuery.refetch()}
                >
                  Retry
                </BigButton>
              </div>
            ) : null}

            {teachersQuery.data?.length === 0 ? (
              <div className="staff-account-list-state">
                <strong>No Teachers yet.</strong>
                <span>The first Teacher you create will appear here.</span>
              </div>
            ) : null}

            {teachersQuery.data && teachersQuery.data.length > 0 ? (
              <div className="staff-account-table" role="table">
                <div className="staff-account-table__header" role="row">
                  <span role="columnheader">Account</span>
                  <span role="columnheader">Grade</span>
                  <span role="columnheader">Section</span>
                  <span role="columnheader">Setup</span>
                </div>
                {teachersQuery.data.map((teacher) => (
                  <article
                    className="staff-account-table__row"
                    role="row"
                    key={teacher.id}
                  >
                    <div role="cell" data-label="Account">
                      <strong>{teacher.username}</strong>
                      <span>
                        Created {formatCreatedDate(teacher.created_at)}
                      </span>
                    </div>
                    <div role="cell" data-label="Grade">
                      Grade {teacher.grade_level}
                    </div>
                    <div role="cell" data-label="Section">
                      {teacher.section}
                    </div>
                    <div role="cell" data-label="Setup">
                      <span className="staff-setup-badge">
                        {teacher.requires_credential_setup
                          ? "Temporary credentials"
                          : "Complete"}
                      </span>
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
