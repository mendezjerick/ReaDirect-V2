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
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="School management"
          title="Teachers"
          description={`Create Teacher accounts for ${assignedSchool.name} and assign each one to a grade and section.`}
          badge={
            <StaffBadge>{teachersQuery.data?.length ?? 0} accounts</StaffBadge>
          }
        />

        <StaffContentGrid className="staff-content-grid--sidebar">
          <StaffCard>
            <StaffSectionHeader
              eyebrow="New account"
              title="Create Teacher"
              description="The Teacher receives temporary credentials and the assigned class details at first sign-in."
            />

            <form className="staff-form-stack" onSubmit={submitAccount}>
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
                <StaffNotice tone="danger">
                  <span>{createMutation.error.message}</span>
                </StaffNotice>
              ) : null}

              {createMutation.isSuccess ? (
                <StaffNotice
                  tone="success"
                  title="Teacher created."
                  role="status"
                >
                  <span>
                    {createMutation.data.username} is assigned to Grade{" "}
                    {createMutation.data.grade_level}, Section{" "}
                    {createMutation.data.section}.
                  </span>
                </StaffNotice>
              ) : null}

              <StaffButton
                tone="primary"
                size="roomy"
                type="submit"
                committing={createCommit.committing}
                busy={createMutation.isPending}
                busyLabel="Creating Teacher"
              >
                Create Teacher
              </StaffButton>
            </form>
          </StaffCard>

          <StaffCard padding="none">
            <StaffSectionHeader
              bordered
              eyebrow="School directory"
              title="Teacher accounts"
              meta={<StaffBadge>Newest first</StaffBadge>}
            />

            {teachersQuery.isLoading ? (
              <StaffState title="Loading accounts…" aria-live="polite" />
            ) : null}

            {teachersQuery.isError ? (
              <StaffState
                tone="danger"
                role="alert"
                title="Teacher accounts could not be loaded."
                actionLabel="Retry"
                onAction={() => void teachersQuery.refetch()}
              />
            ) : null}

            {teachersQuery.data?.length === 0 ? (
              <StaffState
                title="No Teachers yet."
                description="The first Teacher you create will appear here."
              />
            ) : null}

            {teachersQuery.data && teachersQuery.data.length > 0 ? (
              <StaffDataTable
                accessibleLabel="Teacher accounts"
                rows={teachersQuery.data}
                rowKey={(teacher) => teacher.id}
                columns={[
                  {
                    key: "account",
                    label: "Account",
                    width: "minmax(12rem, 1.3fr)",
                    render: (teacher) => (
                      <span className="staff-primary-value">
                        <strong>{teacher.username}</strong>
                        <small>
                          Created {formatCreatedDate(teacher.created_at)}
                        </small>
                      </span>
                    ),
                  },
                  {
                    key: "grade",
                    label: "Grade",
                    render: (teacher) => `Grade ${teacher.grade_level}`,
                  },
                  {
                    key: "section",
                    label: "Section",
                    render: (teacher) => teacher.section,
                  },
                  {
                    key: "setup",
                    label: "Setup",
                    render: (teacher) => (
                      <StaffBadge
                        tone={
                          teacher.requires_credential_setup
                            ? "warning"
                            : "success"
                        }
                      >
                        {teacher.requires_credential_setup
                          ? "Temporary credentials"
                          : "Complete"}
                      </StaffBadge>
                    ),
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
