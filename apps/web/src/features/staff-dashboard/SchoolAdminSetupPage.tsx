import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
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
      <main className="staff-school-setup-page">
        <Surface
          kind="frame"
          padding="compact"
          className="staff-school-setup-card"
        >
          <Surface kind="panel" padding="roomy">
            <div className="staff-setup-access-message">
              <h1>School Administrator sign-in required</h1>
              <p>Sign in with the temporary credentials created for you.</p>
              <BigButton
                committing={navigationCommit.committing}
                onClick={returnToLogin}
              >
                Go to staff login
              </BigButton>
            </div>
          </Surface>
        </Surface>
      </main>
    );
  }

  if (!session.staff.requires_school_setup && session.staff.school) {
    return (
      <main className="staff-school-setup-page">
        <Surface
          kind="frame"
          padding="compact"
          className="staff-school-setup-card"
        >
          <Surface kind="panel" padding="roomy">
            <div className="staff-setup-access-message">
              <h1>{session.staff.school.name}</h1>
              <p>Your school setup is already complete.</p>
              <BigButton
                committing={navigationCommit.committing}
                onClick={() =>
                  navigationCommit.commit(() => navigate("/staff/school-admin"))
                }
              >
                Open dashboard
              </BigButton>
            </div>
          </Surface>
        </Surface>
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
      className="staff-school-setup-page"
      aria-labelledby="school-setup-title"
      data-route-focus
      tabIndex={-1}
    >
      <Surface
        kind="frame"
        padding="compact"
        className="staff-school-setup-card"
      >
        <Surface kind="panel" padding="roomy">
          <header className="staff-school-setup-card__header">
            <div className="staff-school-setup-card__mark">
              <StaffBrandIcon />
            </div>
            <div>
              <p className="staff-page-header__eyebrow">First-time setup</p>
              <h1 id="school-setup-title">Tell us your school</h1>
              <p>
                Your dashboard and future Teacher accounts will use this school
                assignment.
              </p>
            </div>
          </header>

          <Surface
            kind="notice"
            padding="compact"
            className="staff-school-setup-card__account"
          >
            Signed in as <strong>{session.staff.username}</strong>
          </Surface>

          <form className="staff-school-setup-form" onSubmit={submitSchool}>
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
              <Surface
                kind="notice"
                padding="compact"
                className="staff-form-notice staff-form-notice--error"
                role="alert"
              >
                {setupMutation.error.message}
              </Surface>
            ) : null}

            <BigButton
              className="staff-school-setup-form__submit"
              type="submit"
              committing={continueCommit.committing}
              busy={setupMutation.isPending}
              busyLabel="Saving school"
            >
              Continue to dashboard
            </BigButton>
          </form>

          <button
            className="staff-school-setup-card__sign-out"
            type="button"
            onClick={returnToLogin}
          >
            Use a different staff account
          </button>
        </Surface>
      </Surface>
    </main>
  );
}
