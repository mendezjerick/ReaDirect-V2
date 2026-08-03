import { useCallback, useEffect, useState } from "react";

import {
  clearActivitySpeechPreparation,
  getActivitySpeechManifest,
  prepareActivitySpeech,
  type ActivitySpeechManifest,
  type ActivitySpeechReadiness,
} from "./activitySpeechReadiness";

export type ActivitySpeechPreparationStatus =
  "idle" | "preparing" | "ready" | "error";

export function useActivitySpeechPreparation(
  token: string | undefined,
  activity: string,
  enabled = true,
) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ActivitySpeechPreparationStatus>("idle");
  const [manifest, setManifest] = useState<ActivitySpeechManifest | null>(null);
  const [readiness, setReadiness] = useState<ActivitySpeechReadiness | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || !token) {
      setStatus("idle");
      setManifest(null);
      setReadiness(null);
      setError("");
      return;
    }

    let active = true;
    setStatus("preparing");
    setReadiness(null);
    setError("");

    void getActivitySpeechManifest(token, activity)
      .then((result) => {
        if (active) {
          setManifest(result);
        }
      })
      .catch(() => undefined);

    void prepareActivitySpeech(token, activity)
      .then((result) => {
        if (active) {
          setReadiness(result);
          setStatus("ready");
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setStatus("error");
          setError(
            cause instanceof Error
              ? cause.message
              : "Ma'am Clara could not prepare this activity.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [activity, attempt, enabled, token]);

  const retry = useCallback(() => {
    if (token) {
      clearActivitySpeechPreparation(token, activity);
    }
    setAttempt((current) => current + 1);
  }, [activity, token]);

  return {
    status,
    manifest,
    readiness,
    error,
    retry,
    runtimeRequired: manifest?.requires_runtime ?? false,
    showRuntimeLoader:
      status === "preparing" && manifest?.requires_runtime === true,
  };
}
