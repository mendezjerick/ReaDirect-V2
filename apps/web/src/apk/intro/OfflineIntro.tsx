import { useState } from "react";

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
  const [claraReady, setClaraReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      className="offline-intro"
      aria-labelledby="offline-intro-title"
      data-screen="intro"
    >
      <section className="offline-intro__content">
        <div className="offline-intro__brand">
          <p>Your offline reading journey</p>
          <h1 id="offline-intro-title">ReaDirect</h1>
          <button
            className="offline-button offline-intro__continue"
            type="button"
            disabled={!claraReady || saving}
            onClick={() => void startJourney()}
          >
            {saving
              ? "Starting…"
              : claraReady
                ? "Tap to continue"
                : "Loading Clara…"}
          </button>
          <p className="offline-intro__error" role="alert">
            {errorMessage}
          </p>
        </div>
        <OfflineClaraStage
          savedMode={learner.setup.clara.mode}
          selection={claraSelection}
          onLoadStateChange={(state) => setClaraReady(state === "ready")}
        />
      </section>
    </main>
  );
}
