import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { Surface } from "../../components/ui/Surface";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getCurrentStaffSession,
  loadStaffSession,
  loginStaff,
  restoreStaffSession,
  saveStaffSession,
} from "./staffApi";
import { staffHomeRoute } from "./staffRoutes";

interface StaffLoginForm {
  identifier: string;
  password: string;
  remember_me: boolean;
}

export function StaffLoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [restoreState, setRestoreState] = useState<
    "checking" | "ready" | "error"
  >(() =>
    loadStaffSession() ||
    document.cookie.includes("readirect_staff_signed_in=1")
      ? "checking"
      : "ready",
  );
  const navigationCommit = useButtonCommit();
  const signInCommit = useButtonCommit();
  const loginMutation = useMutation({
    mutationFn: loginStaff,
    onSuccess: async (session) => {
      await saveStaffSession(session);
      navigate(staffHomeRoute(session), { replace: true });
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffLoginForm>({
    defaultValues: { identifier: "", password: "", remember_me: false },
  });

  useEffect(() => {
    const storedSession = loadStaffSession();
    const hasRestoreMarker = document.cookie.includes(
      "readirect_staff_signed_in=1",
    );

    let active = true;
    if (!storedSession && !hasRestoreMarker) {
      setRestoreState("ready");
      return () => {
        active = false;
      };
    }

    setRestoreState("checking");

    const restore = storedSession
      ? new Date(storedSession.session.expires_at).getTime() <= Date.now()
        ? Promise.reject(new Error("expired"))
        : getCurrentStaffSession()
      : hasRestoreMarker
        ? restoreStaffSession()
        : Promise.resolve(null);

    void restore
      .then(async (session) => {
        if (!active) return;

        if (session) {
          await saveStaffSession(session);
          navigate(staffHomeRoute(session), { replace: true });
        } else {
          // A marker can outlive its server cookie. Treat that as signed out
          // so the login page does not remain stuck in the restore state.
          clearStaffSession();
          setRestoreState("ready");
        }
      })
      .catch(() => {
        if (active) {
          if (storedSession && loadStaffSession()) {
            setRestoreState("error");
          } else {
            clearStaffSession();
            setRestoreState("ready");
          }
        }
      });

    return () => {
      active = false;
    };
  }, [navigate, restoreAttempt]);

  const returnHome = () => {
    navigationCommit.commit(() => navigate("/home"));
  };

  const submitLogin = handleSubmit((credentials) => {
    signInCommit.commit(() => loginMutation.mutate(credentials));
  });

  if (restoreState === "checking") {
    return (
      <main
        className="staff-session-required-page"
        aria-live="polite"
        aria-busy="true"
      >
        <p>Restoring your staff session...</p>
      </main>
    );
  }

  if (restoreState === "error") {
    return (
      <main
        className="staff-session-required-page"
        aria-labelledby="staff-session-restore-title"
      >
        <h1 id="staff-session-restore-title">
          We could not restore your staff session.
        </h1>
        <p>
          Your remembered session is still saved. Check the connection and try
          again.
        </p>
        <BigButton onClick={() => setRestoreAttempt((attempt) => attempt + 1)}>
          Retry session
        </BigButton>
      </main>
    );
  }

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
          leadingIcon={<PixelIcon name="arrow-left" />}
          committing={navigationCommit.committing}
          onClick={returnHome}
        >
          Back to home
        </BigButton>

        <Surface kind="frame" padding="compact" className="staff-login-card">
          <Surface kind="panel" padding="roomy">
            <header className="staff-login-card__header">
              <div className="staff-login-card__mark">
                <PixelIcon name="book-shield" />
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
            <Link className="staff-login-card__legal" to="/credits-licenses">
              Credits &amp; licenses
            </Link>
          </Surface>
        </Surface>
      </div>
    </main>
  );
}
