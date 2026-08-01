import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useLocation } from "react-router-dom";

import {
  getIntroExperienceSettings,
  getLearnerExperienceSettings,
  loadLearnerSession,
  type LearnerExperienceSettings,
} from "./learnerApi";

type LearnerExperienceState = "ready" | "resolving" | "error";

interface LearnerExperienceContextValue {
  state: LearnerExperienceState;
  settings: LearnerExperienceSettings | null;
}

interface ResolvedLearnerExperience extends LearnerExperienceContextValue {
  requestKey?: string;
}

const defaultExperience: LearnerExperienceContextValue = {
  state: "ready",
  settings: {
    revision: "standard-v1",
    display_mode: "live2d",
    speech_mode: "hybrid",
  },
};

const LearnerExperienceContext =
  createContext<LearnerExperienceContextValue>(defaultExperience);

export function LearnerExperienceProvider({ children }: PropsWithChildren) {
  const location = useLocation();
  const learnerToken = loadLearnerSession()?.token ?? null;
  const appliesToLearnerRoute =
    location.pathname.startsWith("/learner/") &&
    location.pathname !== "/learner/login";
  const appliesToIntroRoute = location.pathname === "/";
  const requestKey =
    appliesToLearnerRoute && learnerToken !== null
      ? `learner:${location.key}:${learnerToken}`
      : appliesToIntroRoute
        ? `intro:${location.key}`
        : null;
  const [experience, setExperience] =
    useState<ResolvedLearnerExperience>(defaultExperience);

  useEffect(() => {
    if (requestKey === null) {
      setExperience(defaultExperience);
      return;
    }

    let active = true;
    setExperience({ state: "resolving", settings: null, requestKey });
    const settingsRequest =
      learnerToken !== null && appliesToLearnerRoute
        ? getLearnerExperienceSettings(learnerToken)
        : getIntroExperienceSettings();
    void settingsRequest
      .then((settings) => {
        if (active) {
          setExperience({ state: "ready", settings, requestKey });
        }
      })
      .catch(() => {
        if (active) {
          setExperience({ state: "error", settings: null, requestKey });
        }
      });

    return () => {
      active = false;
    };
  }, [appliesToLearnerRoute, learnerToken, requestKey]);

  const value = useMemo<LearnerExperienceContextValue>(() => {
    if (requestKey === null) {
      return defaultExperience;
    }

    return experience.requestKey === requestKey
      ? experience
      : { state: "resolving", settings: null };
  }, [experience, requestKey]);

  return (
    <LearnerExperienceContext.Provider value={value}>
      {children}
    </LearnerExperienceContext.Provider>
  );
}

export function useLearnerExperience(): LearnerExperienceContextValue {
  return useContext(LearnerExperienceContext);
}
