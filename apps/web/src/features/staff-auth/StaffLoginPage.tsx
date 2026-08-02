import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { loginStaff, saveStaffSession } from "./staffApi";

interface StaffLoginForm {
  identifier: string;
  password: string;
  remember_me: boolean;
}

function BookShieldIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M7 10.5c6.8-1 12.5.6 17 4.8v23c-4.5-4.1-10.2-5.7-17-4.7V10.5Z" />
      <path d="M41 10.5c-6.8-1-12.5.6-17 4.8v23c4.5-4.1 10.2-5.7 17-4.7V10.5Z" />
      <path d="M24 17.5v20" />
      <path d="m31.5 19.5 4.5 2v4.2c0 3.4-1.8 6.4-4.5 7.8-2.7-1.4-4.5-4.4-4.5-7.8v-4.2l4.5-2Z" />
      <path d="m29.6 26.3 1.3 1.4 2.7-3" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m14.5 6-6 6 6 6" />
      <path d="M9 12h9" />
    </svg>
  );
}

export function StaffLoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const navigationCommit = useButtonCommit();
  const signInCommit = useButtonCommit();
  const loginMutation = useMutation({
    mutationFn: loginStaff,
    onSuccess: (session) => {
      saveStaffSession(session);

      if (session.staff.role === "school_admin") {
        navigate(
          session.staff.requires_school_setup
            ? "/staff/school-admin/setup-school"
            : "/staff/school-admin",
        );
        return;
      }

      if (session.staff.role === "teacher") {
        navigate("/staff/teacher");
        return;
      }

      navigate("/staff/system-admin");
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffLoginForm>({
    defaultValues: { identifier: "", password: "", remember_me: false },
  });

  const returnHome = () => {
    navigationCommit.commit(() => navigate("/home"));
  };

  const submitLogin = handleSubmit((credentials) => {
    signInCommit.commit(() => loginMutation.mutate(credentials));
  });

  return (
    <main
      className="staff-login-page"
      aria-labelledby="staff-login-title"
      data-route-focus
      tabIndex={-1}
    >
      <div className="staff-login-page__stage">
        <BigButton
          className="staff-login-page__back"
          variant="secondary"
          size="regular"
          leadingIcon={<BackIcon />}
          committing={navigationCommit.committing}
          onClick={returnHome}
        >
          Back to home
        </BigButton>

        <Surface kind="frame" padding="compact" className="staff-login-card">
          <Surface kind="panel" padding="roomy">
            <header className="staff-login-card__header">
              <div className="staff-login-card__mark">
                <BookShieldIcon />
              </div>

              <div>
                <p className="staff-login-card__eyebrow">
                  ReaDirect <span>Staff</span>
                </p>
                <h1 id="staff-login-title">Welcome back</h1>
                <p className="staff-login-card__intro">
                  Sign in to manage your school, learners, and reading tools.
                </p>
              </div>
            </header>

            <form
              className="staff-login-form"
              onSubmit={submitLogin}
              noValidate
            >
              <TextField
                label="Username or email"
                type="text"
                autoComplete="username"
                inputMode="email"
                error={errors.identifier?.message}
                {...register("identifier", {
                  required: "Enter your username or email.",
                })}
              />

              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                error={errors.password?.message}
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
                {...register("password", {
                  required: "Enter your password.",
                })}
              />

              <label className="staff-login-form__remember">
                <input type="checkbox" {...register("remember_me")} />
                <span>
                  Remember me on this device
                  <small>
                    Keep me signed in on this browser for up to 30 days.
                  </small>
                </span>
              </label>

              {loginMutation.isError ? (
                <Surface
                  kind="notice"
                  padding="compact"
                  className="staff-login-form__notice staff-login-form__notice--error"
                  role="alert"
                >
                  {loginMutation.error.message}
                </Surface>
              ) : null}

              <BigButton
                className="staff-login-form__submit"
                committing={signInCommit.committing}
                busy={loginMutation.isPending}
                busyLabel="Signing in"
                type="submit"
              >
                Sign in
              </BigButton>
            </form>

            <p className="staff-login-card__roles">
              For system administrators, school administrators, and teachers.
            </p>
          </Surface>
        </Surface>
      </div>
    </main>
  );
}
