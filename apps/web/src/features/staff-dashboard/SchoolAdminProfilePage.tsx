import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { schoolAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  loadStaffSession,
  saveStaffSession,
} from "../staff-auth/staffApi";
import {
  getSchoolAdminProfile,
  updateSchoolAdminProfile,
} from "./schoolAdminApi";

interface SchoolProfileForm {
  school_name: string;
}

export function SchoolAdminProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exitCommit = useButtonCommit();
  const saveCommit = useButtonCommit();
  const [session, setSession] = useState(loadStaffSession);
  const administrator =
    session?.staff.role === "school_admin" ? session.staff : null;
  const profileQuery = useQuery({
    queryKey: ["school-admin-profile", administrator?.id],
    queryFn: () => getSchoolAdminProfile(administrator!.id),
    enabled: Boolean(administrator?.school),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SchoolProfileForm>({
    values: {
      school_name: profileQuery.data?.name ?? administrator?.school?.name ?? "",
    },
  });
  const profileMutation = useMutation({
    mutationFn: (schoolName: string) =>
      updateSchoolAdminProfile({
        staffUserId: administrator!.id,
        schoolName,
      }),
    onSuccess: (profile) => {
      if (session) {
        const updatedSession = {
          ...session,
          staff: {
            ...session.staff,
            school: { id: profile.id, name: profile.name },
          },
        };
        saveStaffSession(updatedSession);
        setSession(updatedSession);
      }
      reset({ school_name: profile.name });
      queryClient.setQueryData(
        ["school-admin-profile", administrator?.id],
        profile,
      );
      void queryClient.invalidateQueries({
        queryKey: ["school-admin-overview", administrator?.id],
      });
    },
  });

  if (!administrator || !administrator.school) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>School setup required</h1>
          <BigButton
            onClick={() => navigate("/staff/school-admin/setup-school")}
          >
            Complete school setup
          </BigButton>
        </Surface>
      </main>
    );
  }

  const submit = handleSubmit(({ school_name }) => {
    const schoolName = school_name;
    saveCommit.commit(() => profileMutation.mutate(schoolName));
  });

  return (
    <StaffShell
      accountLabel={administrator.username ?? administrator.display_name}
      accountMeta={administrator.school.name}
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
      <div className="staff-workspace-page school-admin-profile-page">
        <StaffPageHeader
          eyebrow="School management"
          title="School Profile"
          description="Review the school identity used across your staff and Learner records."
          badge={<span className="staff-count-badge">School scoped</span>}
        />

        <div className="school-admin-profile-layout">
          <Surface kind="panel" padding="normal">
            <header className="staff-section-header">
              <p>School identity</p>
              <h2>{profileQuery.data?.name ?? administrator.school.name}</h2>
              <span>
                Renaming the school updates its displayed identity only. Learner
                progress and activity records are not changed.
              </span>
            </header>
            <dl className="school-admin-profile-facts">
              <div>
                <dt>Teachers</dt>
                <dd>{profileQuery.data?.teachers ?? "—"}</dd>
              </div>
              <div>
                <dt>Standard Learners</dt>
                <dd>{profileQuery.data?.learners ?? "—"}</dd>
              </div>
            </dl>
          </Surface>

          <Surface kind="panel" padding="normal">
            <header className="staff-section-header">
              <p>Permitted change</p>
              <h2>School name</h2>
              <span>Use the school’s complete official display name.</span>
            </header>
            <form className="school-admin-profile-form" onSubmit={submit}>
              <TextField
                label="School name"
                required
                error={errors.school_name?.message}
                {...register("school_name", {
                  required: "Enter the school name.",
                  minLength: {
                    value: 2,
                    message: "Use at least 2 characters.",
                  },
                })}
              />
              {profileMutation.isSuccess ? (
                <p className="staff-form-notice" role="status">
                  School profile updated.
                </p>
              ) : null}
              {profileMutation.isError ? (
                <p className="staff-form-notice--error" role="alert">
                  {profileMutation.error.message}
                </p>
              ) : null}
              <BigButton
                type="submit"
                size="regular"
                disabled={!isDirty}
                busy={profileMutation.isPending}
                busyLabel="Saving profile"
                committing={saveCommit.committing}
              >
                Save school profile
              </BigButton>
            </form>
          </Surface>
        </div>
      </div>
    </StaffShell>
  );
}
