import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useRouteTransition } from "../../components/transitions/routeTransitionContext";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { loginLearner, saveLearnerSession } from "./learnerApi";
import "./learner-login.css";

interface LearnerLoginForm {
  learner_code: string;
  password: string;
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
  const returnTo =
    searchParams.get("returnTo") === "/learner/offline"
      ? "/learner/offline"
      : "/learner/dashboard";
  const { beginRouteTransition, isTransitioning } = useRouteTransition();
  const [showPassword, setShowPassword] = useState(false);
  const backCommit = useButtonCommit();
  const loginCommit = useButtonCommit();
  const loginMutation = useMutation({
    mutationFn: loginLearner,
    onSuccess: (session) => {
      saveLearnerSession(session);
      beginRouteTransition(returnTo);
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LearnerLoginForm>({
    defaultValues: { learner_code: "", password: "" },
  });

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
                committing={loginCommit.committing || isTransitioning}
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
