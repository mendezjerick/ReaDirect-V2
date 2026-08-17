import { useEffect, useState } from "react";

import { APP_TARGET } from "../app/appTarget";
import {
  LINK_START_DURATION_MS,
  LINK_START_ROUTE_SWAP_MS,
  LinkStartTransition,
} from "../components/transitions/LinkStartTransition";
import { OfflineDashboard } from "./dashboard/OfflineDashboard";
import { OfflineJourneyMenu } from "./dashboard/OfflineJourneyMenu";
import { OfflineJourneyActivity } from "./activity/OfflineJourneyActivity";
import { offlineJourneyContent } from "./content/offlineJourneyContent";
import { OfflineIntro } from "./intro/OfflineIntro";
import { OfflineOnboarding } from "./onboarding/OfflineOnboarding";
import { nativeOfflineAppRuntime } from "./runtime/offlineAppRuntime";
import {
  resetOfflineJourneyProgress,
  skipOfflineDiagnostic,
  updateOfflineSpeechLanguage,
} from "./storage/offlineLearnerState";

import type { OfflineInitializationResult } from "./onboarding/offlineInitialization";
import type { OfflineAppRuntime } from "./runtime/offlineAppRuntime";
import type {
  OfflineJourneyStage,
  OfflineLearnerState,
} from "./storage/offlineLearnerState";

type ReadyState = {
  learner: OfflineLearnerState;
  initialization: OfflineInitializationResult;
};

export function OfflineApkApp({
  runtime = nativeOfflineAppRuntime,
}: {
  runtime?: OfflineAppRuntime;
}) {
  const [ready, setReady] = useState<ReadyState | null>(null);
  const [screen, setScreen] = useState<"dashboard" | "journey" | "activity">(
    "dashboard",
  );
  const [activityStage, setActivityStage] =
    useState<OfflineJourneyStage | null>(null);
  const [linkStartLearner, setLinkStartLearner] =
    useState<OfflineLearnerState | null>(null);

  useEffect(() => {
    if (!linkStartLearner) return;

    const routeTimer = window.setTimeout(() => {
      setReady((current) =>
        current ? { ...current, learner: linkStartLearner } : current,
      );
    }, LINK_START_ROUTE_SWAP_MS);
    const finishTimer = window.setTimeout(
      () => setLinkStartLearner(null),
      LINK_START_DURATION_MS,
    );

    return () => {
      window.clearTimeout(routeTimer);
      window.clearTimeout(finishTimer);
    };
  }, [linkStartLearner]);

  if (APP_TARGET !== "offline-apk") {
    throw new Error(
      "The offline APK entry requires VITE_APP_TARGET=offline-apk.",
    );
  }

  if (!ready) {
    return (
      <OfflineOnboarding
        initialize={runtime.initialize}
        repository={runtime.repository}
        onReady={(learner, initialization) =>
          setReady({ learner, initialization })
        }
      />
    );
  }

  const content =
    ready.learner.setup.introCompletedAt === null ? (
      <OfflineIntro
        learner={ready.learner}
        claraSelection={ready.initialization.clara}
        repository={runtime.repository}
        onLinkStart={setLinkStartLearner}
      />
    ) : screen === "activity" ? (
      <OfflineJourneyActivity
        learner={ready.learner}
        stage={activityStage ?? undefined}
        onLearnerChange={(learner) =>
          setReady((current) => (current ? { ...current, learner } : current))
        }
        claraSelection={ready.initialization.clara}
        repository={runtime.repository}
        asr={runtime.asr}
        tts={runtime.tts}
        onExit={() => {
          setActivityStage(null);
          setScreen("journey");
        }}
      />
    ) : screen === "journey" ? (
      <OfflineJourneyMenu
        learner={ready.learner}
        onBack={() => setScreen("dashboard")}
        onSelectActivity={(stage) => {
          if (stage === "complete") return;
          setActivityStage(stage);
          setScreen("activity");
        }}
        onSkipDiagnostic={async () => {
          const learner = await runtime.repository.update((state, now) =>
            skipOfflineDiagnostic(
              state,
              offlineJourneyContent.assessments.diagnostic.items.length,
              now,
            ),
          );
          setReady((current) => (current ? { ...current, learner } : current));
        }}
        onLanguageChange={async (language) => {
          const learner = await runtime.repository.update((state, now) =>
            updateOfflineSpeechLanguage(state, language, now),
          );
          setReady((current) => (current ? { ...current, learner } : current));
        }}
      />
    ) : (
      <OfflineDashboard
        learner={ready.learner}
        onOpenJourney={() => setScreen("journey")}
        onResetProgress={async () => {
          const learner = await runtime.repository.update(
            resetOfflineJourneyProgress,
          );
          setReady((current) => (current ? { ...current, learner } : current));
        }}
      />
    );

  return (
    <div data-app-target={APP_TARGET}>
      {content}
      {linkStartLearner ? <LinkStartTransition /> : null}
    </div>
  );
}
