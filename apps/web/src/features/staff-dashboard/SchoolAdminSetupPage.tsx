import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  completeSchoolAdminSetup,
  loadStaffSession,
  saveStaffSession,
} from "../staff-auth/staffApi";

interface SchoolSetupForm {
  school_name: string;
}

export function SchoolAdminSetupPage() {
  const navigate = useNavigate();
  const continueCommit = useButtonCommit();
  const navigationCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const setupMutation = useMutation({
    mutationFn: completeSchoolAdminSetup,
    onSuccess: (updatedSession) => {
      saveStaffSession(updatedSession);
      navigate("/staff/school-admin");
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchoolSetupForm>({
    defaultValues: { school_name: "" },
  });

  const returnToLogin = () => {
    navigationCommit.commit(() => {
      clearStaffSession();
      navigate("/staff/login");
    });
  };

  if (!session || session.staff.role !== "school_admin") {
    return (
      <main className="staff-session-required-page">
        <StaffCard padding="roomy" className="staff-session-required">
          <h1>School Administrator sign-in required</h1>
          <p>Sign in with the temporary credentials created for you.</p>
          <StaffButton
            tone="primary"
            size="roomy"
            committing={navigationCommit.committing}
            onClick={returnToLogin}
          >
            Go to staff login
          </StaffButton>
        </StaffCard>
      </main>
    );
  }

  if (!session.staff.requires_school_setup && session.staff.school) {
    return (
      <main className="staff-session-required-page">
        <StaffCard padding="roomy" className="staff-session-required">
          <h1>{session.staff.school.name}</h1>
          <p>Your school setup is already complete.</p>
          <StaffButton
            tone="primary"
            size="roomy"
            committing={navigationCommit.committing}
            onClick={() =>
              navigationCommit.commit(() => navigate("/staff/school-admin"))
            }
          >
            Open dashboard
          </StaffButton>
        </StaffCard>
      </main>
    );
  }

  const submitSchool = handleSubmit(({ school_name }) => {
    continueCommit.commit(() =>
      setupMutation.mutate({
        staffUserId: session.staff.id,
        schoolName: school_name,
      }),
    );
  });

  return (
    <main
      className="staff-session-required-page"
      data-route-focus
      tabIndex={-1}
    >
      <StaffCard padding="roomy" className="staff-session-required">
        <StaffPageHeader
          eyebrow="First-time setup"
          title="Tell us your school"
          description="Your dashboard and future Teacher accounts will use this school assignment."
          badge={<StaffBrandIcon />}
        />

        <StaffNotice title="Signed in account">
          <strong>{session.staff.username}</strong>
        </StaffNotice>

        <form className="staff-form-stack" onSubmit={submitSchool}>
          <TextField
            label="School name"
            type="text"
            autoComplete="organization"
            placeholder="Enter the complete school name"
            required
            error={errors.school_name?.message}
            {...register("school_name", {
              required: "Enter your school name.",
              minLength: {
                value: 2,
                message: "Use at least 2 characters.",
              },
            })}
          />

          {setupMutation.isError ? (
            <StaffNotice tone="danger">
              {setupMutation.error.message}
            </StaffNotice>
          ) : null}

          <StaffButton
            tone="primary"
            size="roomy"
            type="submit"
            committing={continueCommit.committing}
            busy={setupMutation.isPending}
            busyLabel="Saving school"
          >
            Continue to dashboard
          </StaffButton>
        </form>

        <StaffButton tone="quiet" size="compact" onClick={returnToLogin}>
          Use a different staff account
        </StaffButton>
      </StaffCard>
    </main>
  );
}
