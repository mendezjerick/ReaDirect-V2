import { motion, useReducedMotion } from "motion/react";
import { useCallback, useState } from "react";

import { BigButton } from "../../components/ui/BigButton";
import { PointerTrail } from "../../features/intro/PointerTrail";
import { VectorCursor } from "../../features/intro/VectorCursor";
import { ThemeSelector } from "../../features/theme/ThemeSelector";
import { OfflineClaraStage } from "../clara/OfflineClaraStage";
import { offlineLearnerRepository } from "../storage/offlineLearnerRepository";
import { completeOfflineIntro } from "../storage/offlineLearnerState";

import type { ClaraSelection } from "../clara/claraCapability";
import type { OfflineLearnerState } from "../storage/offlineLearnerState";

export function OfflineIntro({
  learner,
  claraSelection,
  onLinkStart,
  repository = offlineLearnerRepository,
}: {
  learner: OfflineLearnerState;
  claraSelection: ClaraSelection;
  onLinkStart: (learner: OfflineLearnerState) => void;
  repository?: {
    update: (
      mutate: (state: OfflineLearnerState, now: string) => OfflineLearnerState,
    ) => Promise<OfflineLearnerState>;
  };
}) {
  const reduceMotion = useReducedMotion();
  const [claraReady, setClaraReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleClaraLoadState = useCallback(
    (state: "loading" | "ready" | "error") => setClaraReady(state === "ready"),
    [],
  );

  const startJourney = async () => {
    if (!claraReady || saving) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const updated = await repository.update(completeOfflineIntro);
      onLinkStart(updated);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The intro could not save its progress.",
      );
      setSaving(false);
    }
  };

  return (
    <main
      className="intro-page learner-typography-page"
      aria-labelledby="intro-title"
      data-screen="intro"
    >
      <PointerTrail />
      <VectorCursor />
      <ThemeSelector />

      <section className="intro-page__content">
        <div className="intro-page__brand">
          <motion.h1
            id="intro-title"
            className="intro-page__title"
            initial={reduceMotion ? false : { opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: -80 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
          >
            ReaDirect
          </motion.h1>

          <motion.div
            className="intro-page__continue-wrap"
            initial={false}
            animate={{ opacity: 1 }}
          >
            <BigButton
              className="intro-page__continue"
              variant={claraReady ? "primary" : "unavailable"}
              busy={saving}
              busyLabel="Starting"
              disabled={!claraReady || saving}
              onClick={() => void startJourney()}
            >
              {claraReady ? "Tap to continue" : "Loading..."}
            </BigButton>
          </motion.div>
          {errorMessage ? (
            <p className="offline-intro__error" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <OfflineClaraStage
          useMainUi
          savedMode={learner.setup.clara.mode}
          selection={claraSelection}
          onLoadStateChange={handleClaraLoadState}
        />
      </section>
    </main>
  );
}
