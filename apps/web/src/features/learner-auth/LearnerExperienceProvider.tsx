import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

import {
  getIntroExperienceSettings,
  getLearnerExperienceSettings,
  loadLearnerSession,
  type LearnerExperienceSettings,
} from "./learnerApi";

type LearnerExperienceState = "ready" | "resolving" | "error";
type ClaraDisplayMode = LearnerExperienceSettings["display_mode"];

const claraDisplayModeOverrideStorageKey =
  "readirect.learner.clara-display-mode";

interface LearnerExperienceContextValue {
  state: LearnerExperienceState;
  settings: LearnerExperienceSettings | null;
  displayMode: ClaraDisplayMode | null;
  setDisplayModeOverride: (displayMode: ClaraDisplayMode) => void;
}

interface ResolvedLearnerExperience {
  state: LearnerExperienceState;
  settings: LearnerExperienceSettings | null;
  requestKey?: string;
}

const defaultExperience: LearnerExperienceContextValue = {
  state: "ready",
  settings: {
    revision: "standard-v1",
    display_mode: "live2d",
    speech_mode: "hybrid",
  },
  displayMode: "live2d",
  setDisplayModeOverride: () => undefined,
};

const nativeExperience: ResolvedLearnerExperience = {
  state: "ready",
  settings: null,
};

const LearnerExperienceContext =
  createContext<LearnerExperienceContextValue>(defaultExperience);

function loadClaraDisplayModeOverride(): ClaraDisplayMode | null {
  const stored = window.localStorage.getItem(
    claraDisplayModeOverrideStorageKey,
  );

  return stored === "live2d" || stored === "static" ? stored : null;
}

export function LearnerExperienceProvider({ children }: PropsWithChildren) {
  const isNativePlatform = Capacitor.isNativePlatform();
  const location = useLocation();
  const learnerToken = loadLearnerSession()?.token ?? null;
  const isOfflinePracticeRoute =
    location.pathname.startsWith("/learner/offline");
  const appliesToLearnerRoute =
    location.pathname.startsWith("/learner/") &&
    location.pathname !== "/learner/login" &&
    !isOfflinePracticeRoute;
  const appliesToIntroRoute = location.pathname === "/";
  const requestKey =
    appliesToLearnerRoute && learnerToken !== null
      ? `learner:${location.key}:${learnerToken}`
      : appliesToIntroRoute
        ? `intro:${location.key}`
        : null;
  const [experience, setExperience] = useState<ResolvedLearnerExperience>(
    isNativePlatform ? nativeExperience : defaultExperience,
  );
  const [displayModeOverride, setDisplayModeOverrideState] =
    useState<ClaraDisplayMode | null>(loadClaraDisplayModeOverride);

  const setDisplayModeOverride = useCallback(
    (displayMode: ClaraDisplayMode) => {
      window.localStorage.setItem(
        claraDisplayModeOverrideStorageKey,
        displayMode,
      );
      setDisplayModeOverrideState(displayMode);
    },
    [],
  );

  useEffect(() => {
    if (isNativePlatform) {
      setExperience(nativeExperience);
      return;
    }

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
  }, [appliesToLearnerRoute, isNativePlatform, learnerToken, requestKey]);

  const value = useMemo<LearnerExperienceContextValue>(() => {
    const resolvedExperience: ResolvedLearnerExperience = isNativePlatform
      ? nativeExperience
      : requestKey === null
        ? defaultExperience
        : experience.requestKey === requestKey
          ? experience
          : { state: "resolving", settings: null };
    const systemDisplayMode =
      resolvedExperience.state === "ready"
        ? (resolvedExperience.settings?.display_mode ?? null)
        : null;

    return {
      ...resolvedExperience,
      displayMode:
        displayModeOverride ??
        (isNativePlatform ? "static" : systemDisplayMode),
      setDisplayModeOverride,
    };
  }, [
    displayModeOverride,
    experience,
    isNativePlatform,
    requestKey,
    setDisplayModeOverride,
  ]);

  return (
    <LearnerExperienceContext.Provider value={value}>
      {children}
    </LearnerExperienceContext.Provider>
  );
}

export function useLearnerExperience(): LearnerExperienceContextValue {
  return useContext(LearnerExperienceContext);
}
