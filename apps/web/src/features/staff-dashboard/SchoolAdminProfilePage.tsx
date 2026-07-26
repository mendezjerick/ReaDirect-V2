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
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
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
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="School management"
          title="School Profile"
          description="Review the school identity used across your staff and Learner records."
          badge={<StaffBadge>School scoped</StaffBadge>}
        />

        <StaffContentGrid className="staff-content-grid--two">
          <StaffCard>
            <StaffSectionHeader
              eyebrow="School identity"
              title={profileQuery.data?.name ?? administrator.school.name}
              description={
                <>
                  Renaming the school updates its displayed identity only.
                  Learner progress and activity records are not changed.
                </>
              }
            />
            <StaffFactGrid
              facts={[
                {
                  label: "Teachers",
                  value: profileQuery.data?.teachers ?? "—",
                },
                {
                  label: "Standard Learners",
                  value: profileQuery.data?.learners ?? "—",
                },
              ]}
            />
          </StaffCard>

          <StaffCard>
            <StaffSectionHeader
              eyebrow="Permitted change"
              title="School name"
              description="Use the school’s complete official display name."
            />
            <form className="staff-form-stack" onSubmit={submit}>
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
                <StaffNotice tone="success" role="status">
                  <span>School profile updated.</span>
                </StaffNotice>
              ) : null}
              {profileMutation.isError ? (
                <StaffNotice tone="danger">
                  <span>{profileMutation.error.message}</span>
                </StaffNotice>
              ) : null}
              <StaffButton
                type="submit"
                size="roomy"
                tone="primary"
                disabled={!isDirty}
                busy={profileMutation.isPending}
                busyLabel="Saving profile"
                committing={saveCommit.committing}
              >
                Save school profile
              </StaffButton>
            </form>
          </StaffCard>
        </StaffContentGrid>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
