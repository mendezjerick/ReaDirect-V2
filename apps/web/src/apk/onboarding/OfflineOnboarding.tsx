import { useCallback, useEffect, useRef, useState } from "react";

import { ASR_MODEL_CATALOG, type AsrTier } from "../asr/asrModelCatalog";
import type { ClaraMode } from "../clara/claraCapability";
import { offlineLearnerRepository } from "../storage/offlineLearnerRepository";
import {
  acknowledgeOfflineAsr,
  acknowledgeOfflineClara,
  type OfflineLearnerState,
} from "../storage/offlineLearnerState";
import {
  runOfflineInitialization,
  type OfflineInitializationProgress,
  type OfflineInitializationResult,
} from "./offlineInitialization";

type OnboardingPhase = "loading" | "asr" | "clara" | "error";

const initialProgress: OfflineInitializationProgress = {
  percent: 0,
  label: "Preparing offline mode",
  step: "starting",
};

function asrExplanation(tier: AsrTier): string {
  if (tier === "low") {
    return "Your device cannot handle the best speech-recognition model. We will switch to Low, which uses less memory. Please understand that its results may be less accurate.";
  }
  if (tier === "medium") {
    return "Your device will use Medium speech recognition. It balances stronger accuracy with the memory and processing available on this device. High will remain locked.";
  }
  return "Your device supports High speech recognition, the best-quality model included in ReaDirect.";
}

function claraExplanation(mode: ClaraMode): string {
  return mode === "static"
    ? "Your device cannot handle Dynamic Clara smoothly. We will use Static Clara so lessons stay responsive. Dynamic Clara will remain locked."
    : "Your device supports Dynamic Clara, including her full animated lesson presentation.";
}

function CapabilityDialog({
  kind,
  selection,
  explanation,
  pending,
  onAcknowledge,
}: {
  kind: "Speech recognition" | "Clara display";
  selection: string;
  explanation: string;
  pending: boolean;
  onAcknowledge: () => void;
}) {
  const titleId = `offline-${kind === "Speech recognition" ? "asr" : "clara"}-title`;
  const descriptionId = `${titleId}-description`;
  return (
    <div className="offline-onboarding__dialog-backdrop">
      <section
        className="offline-onboarding__dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="offline-onboarding__dialog-icon" aria-hidden="true">
          {kind === "Speech recognition" ? "A" : "C"}
        </div>
        <p className="offline-onboarding__eyebrow">Device setup</p>
        <h1 id={titleId}>
          {kind}: <strong>{selection}</strong>
        </h1>
        <p id={descriptionId}>{explanation}</p>
        <button
          className="offline-onboarding__button"
          type="button"
          autoFocus
          disabled={pending}
          onClick={onAcknowledge}
        >
          {pending ? "Saving…" : "I understand"}
        </button>
      </section>
    </div>
  );
}

export function OfflineOnboarding({
  onReady,
  initialize = runOfflineInitialization,
  repository = offlineLearnerRepository,
}: {
  onReady: (
    learner: OfflineLearnerState,
    result: OfflineInitializationResult,
  ) => void;
  initialize?: typeof runOfflineInitialization;
  repository?: {
    update: (
      mutate: (state: OfflineLearnerState, now: string) => OfflineLearnerState,
    ) => Promise<OfflineLearnerState>;
  };
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [phase, setPhase] = useState<OnboardingPhase>("loading");
  const [result, setResult] = useState<OfflineInitializationResult | null>(
    null,
  );
  const [learner, setLearner] = useState<OfflineLearnerState | null>(null);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initializationRef = useRef<Promise<OfflineInitializationResult> | null>(
    null,
  );

  const beginInitialization = useCallback(() => {
    setPhase("loading");
    setErrorMessage(null);
    setProgress(initialProgress);
    const run = initialize(setProgress);
    initializationRef.current = run;
    void run
      .then((initialized) => {
        if (initializationRef.current !== run) return;
        setResult(initialized);
        setLearner(initialized.learner);
        const asrMatches =
          initialized.learner.setup.asr.tier ===
            initialized.asr.selection.tier &&
          initialized.learner.setup.asr.acknowledgedAt !== null;
        const claraMatches =
          initialized.learner.setup.clara.mode === initialized.clara.mode &&
          initialized.learner.setup.clara.acknowledgedAt !== null;
        if (
          initialized.learner.setup.onboardingCompletedAt !== null &&
          asrMatches &&
          claraMatches
        ) {
          onReady(initialized.learner, initialized);
        } else {
          setPhase(asrMatches ? "clara" : "asr");
        }
      })
      .catch((error: unknown) => {
        if (initializationRef.current !== run) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "This device could not finish offline setup.",
        );
        setPhase("error");
      });
  }, [initialize, onReady]);

  useEffect(() => {
    if (initializationRef.current === null) beginInitialization();
  }, [beginInitialization]);

  const acknowledgeAsr = async () => {
    if (!result || !learner || pending) return;
    setPending(true);
    try {
      const updated = await repository.update((state, now) =>
        acknowledgeOfflineAsr(state, result.asr.selection.tier, now),
      );
      setLearner(updated);
      setPhase("clara");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The selection could not be saved.",
      );
      setPhase("error");
    } finally {
      setPending(false);
    }
  };

  const acknowledgeClara = async () => {
    if (!result || !learner || pending) return;
    setPending(true);
    try {
      const updated = await repository.update((state, now) =>
        acknowledgeOfflineClara(state, result.clara.mode, now),
      );
      setLearner(updated);
      onReady(updated, result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The selection could not be saved.",
      );
      setPhase("error");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="offline-onboarding" data-onboarding-phase={phase}>
      <div
        className="offline-onboarding__progress"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={progress.label}
        aria-label="Offline setup progress"
      >
        <div className="offline-onboarding__progress-head">
          <strong>{progress.label}</strong>
          <span className="offline-onboarding__progress-percent">
            {progress.percent}%
          </span>
        </div>
        <div className="offline-onboarding__progress-rail">
          <div
            className="offline-onboarding__progress-fill"
            style={
              {
                "--offline-progress": `${progress.percent}%`,
              } as React.CSSProperties
            }
          >
            <span
              className="offline-onboarding__progress-edge"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {phase === "asr" && result ? (
        <CapabilityDialog
          kind="Speech recognition"
          selection={ASR_MODEL_CATALOG[result.asr.selection.tier].displayName}
          explanation={asrExplanation(result.asr.selection.tier)}
          pending={pending}
          onAcknowledge={() => void acknowledgeAsr()}
        />
      ) : null}

      {phase === "clara" && result ? (
        <CapabilityDialog
          kind="Clara display"
          selection={result.clara.displayName}
          explanation={claraExplanation(result.clara.mode)}
          pending={pending}
          onAcknowledge={() => void acknowledgeClara()}
        />
      ) : null}

      {phase === "error" ? (
        <div className="offline-onboarding__dialog-backdrop">
          <section className="offline-onboarding__error" role="alert">
            <h1>Offline setup needs another try</h1>
            <p>{errorMessage}</p>
            <button
              className="offline-onboarding__button"
              type="button"
              onClick={() => {
                initializationRef.current = null;
                beginInitialization();
              }}
            >
              Try again
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
