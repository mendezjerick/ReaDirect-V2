import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  getLearnerSession,
  clearLearnerSession,
  LearnerSessionInvalidError,
  loadLearnerSession,
  loginLearner,
  restoreLearnerSession,
  saveLearnerSession,
} from "./learnerApi";
import "./learner-login.css";

interface LearnerLoginForm {
  learner_code: string;
  password: string;
  remember_me: boolean;
}

function ReaderIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 11c7-1 12.7.8 17 5.2V39c-4.3-4.4-10-6.2-17-5.2V11Z" />
      <path d="M41 11c-7-1-12.7.8-17 5.2V39c4.3-4.4 10-6.2 17-5.2V11Z" />
      <path d="M24 16.2V39" />
    </svg>
  );
}

export function LearnerLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo =
    requestedReturnTo &&
    requestedReturnTo.startsWith("/learner/") &&
    requestedReturnTo !== "/learner/login"
      ? requestedReturnTo
      : "/learner/dashboard";
  const [showPassword, setShowPassword] = useState(false);
  const [restoring, setRestoring] = useState(() =>
    Boolean(
      loadLearnerSession() ||
      document.cookie.includes("readirect_learner_signed_in=1"),
    ),
  );
  const [restoreError, setRestoreError] = useState(false);
  const backCommit = useButtonCommit();
  const loginCommit = useButtonCommit();
  const loginMutation = useMutation({
    mutationFn: loginLearner,
    onSuccess: async (session, credentials) => {
      await saveLearnerSession(session, { remember: credentials.remember_me });
      // Authentication pages should navigate directly. Link Start is reserved
      // for the public entry flow and should not delay a successful sign-in.
      navigate(returnTo, { replace: true });
    },
  });

  useEffect(() => {
    let active = true;
    const existing = loadLearnerSession();
    setRestoreError(false);
    const restore = existing
      ? getLearnerSession(existing.token).then((session) => ({
          ...session,
          token: existing.token,
        }))
      : document.cookie.includes("readirect_learner_signed_in=1")
        ? restoreLearnerSession()
        : Promise.resolve(null);

    void restore
      .then(async (session) => {
        if (!active) return;

        if (session) {
          await saveLearnerSession(session);
          navigate(returnTo, { replace: true });
        } else if (!existing) {
          // A stale browser marker without a valid server cookie must not
          // cause an endless restore attempt on every visit to the login page.
          clearLearnerSession();
        }
      })
      .catch((error) => {
        if (!active) return;

        if (error instanceof LearnerSessionInvalidError) {
          clearLearnerSession();
          return;
        }

        // Keep the encrypted session intact when the API is temporarily
        // unreachable. Showing the login form here would imply that the
        // account was logged out and invite duplicate credentials.
        if (existing) setRestoreError(true);
      })
      .finally(() => {
        if (active) setRestoring(false);
      });

    return () => {
      active = false;
    };
  }, [navigate, returnTo]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LearnerLoginForm>({
    defaultValues: { learner_code: "", password: "", remember_me: false },
  });

  if (restoring) {
    return (
      <main
        className="learner-session-required-page"
        aria-live="polite"
        aria-busy="true"
      >
        <p>Restoring your reading session...</p>
      </main>
    );
  }

  if (restoreError && loadLearnerSession()) {
    return (
      <main
        className="learner-session-required-page"
        aria-live="polite"
        data-route-focus
        tabIndex={-1}
      >
        <p>We couldn&apos;t verify your saved reading session.</p>
        <p>Check your connection and try again.</p>
        <BigButton size="regular" onClick={() => window.location.reload()}>
          Try again
        </BigButton>
      </main>
    );
  }

  return (
    <main
      className="learner-login-page learner-flow-page"
      aria-labelledby="learner-login-title"
      data-route-focus
      tabIndex={-1}
    >
      <div className="learner-login-page__stage">
        <Surface kind="frame" padding="compact" className="learner-login-card">
          <Surface kind="panel" padding="roomy">
            <header className="learner-login-card__header">
              <span className="learner-login-card__icon">
                <ReaderIcon />
              </span>
              <div>
                <p>Reader sign in</p>
                <h1 id="learner-login-title">Ready to read?</h1>
                <span>Enter the code and password your teacher gave you.</span>
              </div>
            </header>

            <form
              className="learner-login-form"
              onSubmit={handleSubmit((credentials) =>
                loginCommit.commit(() => loginMutation.mutate(credentials)),
              )}
              noValidate
            >
              <TextField
                label="Learner Code"
                type="text"
                inputMode="text"
                autoComplete="username"
                maxLength={5}
                placeholder="AA000"
                error={errors.learner_code?.message}
                {...register("learner_code", {
                  required: "Enter your Learner Code.",
                  setValueAs: (value: string) => value.trim().toUpperCase(),
                  pattern: {
                    value: /^[a-zA-Z]{2}\d{3}$/,
                    message: "Use two letters followed by three numbers.",
                  },
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
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                }
                {...register("password", {
                  required: "Enter your password.",
                })}
              />

              <label className="learner-login-form__remember">
                <input type="checkbox" {...register("remember_me")} />
                <span>
                  Remember me on this device
                  <small>Keep me signed in on this browser.</small>
                </span>
              </label>

              {loginMutation.isError ? (
                <Surface
                  kind="notice"
                  padding="compact"
                  className="learner-login-form__error"
                  role="alert"
                >
                  {loginMutation.error.message}
                </Surface>
              ) : null}

              <BigButton
                className="learner-login-form__submit"
                type="submit"
                committing={loginCommit.committing}
                busy={loginMutation.isPending}
                busyLabel="Opening your reading path"
              >
                Let&apos;s go!
              </BigButton>
            </form>

            <BigButton
              className="learner-login-card__back"
              variant="quiet"
              size="regular"
              committing={backCommit.committing}
              onClick={() => backCommit.commit(() => navigate("/home"))}
            >
              Back to home
            </BigButton>
          </Surface>
        </Surface>
      </div>
    </main>
  );
}
