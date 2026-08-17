import { useEffect, useState } from "react";

import { APP_TARGET } from "../app/appTarget";
import {
  LINK_START_DURATION_MS,
  LINK_START_ROUTE_SWAP_MS,
  LinkStartTransition,
} from "../components/transitions/LinkStartTransition";
import { OfflineDashboard } from "./dashboard/OfflineDashboard";
import { OfflineJourneyActivity } from "./activity/OfflineJourneyActivity";
import { offlineJourneyContent } from "./content/offlineJourneyContent";
import { OfflineIntro } from "./intro/OfflineIntro";
import { OfflineOnboarding } from "./onboarding/OfflineOnboarding";
import { offlineLearnerRepository } from "./storage/offlineLearnerRepository";
import {
  resetOfflineJourneyProgress,
  skipOfflineDiagnostic,
} from "./storage/offlineLearnerState";

import type { OfflineInitializationResult } from "./onboarding/offlineInitialization";
import type { OfflineLearnerState } from "./storage/offlineLearnerState";

type ReadyState = {
  learner: OfflineLearnerState;
  initialization: OfflineInitializationResult;
};

export function OfflineApkApp() {
  const [ready, setReady] = useState<ReadyState | null>(null);
  const [screen, setScreen] = useState<"dashboard" | "activity">("dashboard");
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
        onLinkStart={setLinkStartLearner}
      />
    ) : screen === "activity" ? (
      <OfflineJourneyActivity
        learner={ready.learner}
        onLearnerChange={(learner) =>
          setReady((current) => (current ? { ...current, learner } : current))
        }
        onExit={() => setScreen("dashboard")}
      />
    ) : (
      <OfflineDashboard
        learner={ready.learner}
        onOpenJourney={() => setScreen("activity")}
        onSkipDiagnostic={async () => {
          const learner = await offlineLearnerRepository.update((state, now) =>
            skipOfflineDiagnostic(
              state,
              offlineJourneyContent.assessments.diagnostic.items.length,
              now,
            ),
          );
          setReady((current) => (current ? { ...current, learner } : current));
        }}
        onResetProgress={async () => {
          const learner = await offlineLearnerRepository.update(
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
