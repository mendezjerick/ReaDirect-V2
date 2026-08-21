import { useEffect, useState, type PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";

import {
  clearPagePortalOrigin,
  getPagePortalReturnPath,
} from "../../app/navigationContext";
import { BigButton } from "../../components/ui/BigButton";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { Surface } from "../../components/ui/Surface";
import {
  getSpeechServiceReadiness,
  type SpeechServiceReadiness,
} from "./speechServiceReadiness";
import "./speech-service-gate.css";

const unavailableReadiness: SpeechServiceReadiness = {
  asr: "offline",
  tts: "offline",
};

export function SpeechServiceGate({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const [readiness, setReadiness] = useState<SpeechServiceReadiness | null>(
    null,
  );
  const [degradedAccepted, setDegradedAccepted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void getSpeechServiceReadiness(controller.signal)
      .then(setReadiness)
      .catch(() => {
        if (!controller.signal.aborted) setReadiness(unavailableReadiness);
      });

    return () => controller.abort();
  }, []);

  const asrOffline = readiness?.asr === "offline";
  const ttsOffline = readiness?.tts === "offline";
  const shouldShowDialog =
    readiness !== null && (asrOffline || (ttsOffline && !degradedAccepted));

  if (readiness === null) {
    return (
      <main
        className="speech-service-gate speech-service-gate--checking assessment-page learner-flow-page"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="speech-service-gate__checking">
          <PixelIcon name="speech" />
          <span>Checking speech services…</span>
        </div>
      </main>
    );
  }

  if (!shouldShowDialog) return children;

  const bothOffline = asrOffline && ttsOffline;
  const title = asrOffline
    ? bothOffline
      ? "Speech Services Offline"
      : "Reading Checker Offline"
    : "Dynamic Voice Offline";

  const leaveActivity = () => {
    const portalReturnPath = getPagePortalReturnPath();

    if (portalReturnPath) {
      clearPagePortalOrigin();
      navigate(portalReturnPath, { replace: true });
      return;
    }

    navigate("/learner/lesson-intro", { replace: true });
  };

  return (
    <main className="speech-service-gate assessment-page learner-flow-page">
      <div className="speech-service-gate__backdrop">
        <Surface
          className="speech-service-gate__dialog"
          kind="frame"
          padding="roomy"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="speech-service-warning-title"
          aria-describedby="speech-service-warning-description"
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Tab") {
              event.preventDefault();
              event.currentTarget.querySelector("button")?.focus();
            }
          }}
        >
          <div className="speech-service-gate__icon" aria-hidden="true">
            <PixelIcon name={asrOffline ? "wifi-off" : "warning"} />
          </div>
          <h1 id="speech-service-warning-title">{title}</h1>
          <p id="speech-service-warning-description">
            {asrOffline ? (
              <>
                The reading checker (ASR) is offline, so this activity cannot
                check or score recordings.{" "}
                {bothOffline ? (
                  <>
                    Ma&apos;am Clara&apos;s dynamic voice service (TTS) is also
                    offline. Please try again later.
                  </>
                ) : (
                  <>
                    Ma&apos;am Clara&apos;s prepared voice lines are ready, but
                    ASR is required. Please try again later.
                  </>
                )}
              </>
            ) : (
              <>
                The reading checker (ASR) is online, so you can continue.
                Ma&apos;am Clara&apos;s dynamic voice service (TTS) is offline.
                Prepared voice lines will still play, but dynamic feedback in
                lessons will be disabled.
              </>
            )}
          </p>
          <div className="speech-service-gate__actions">
            <BigButton
              autoFocus
              size="regular"
              onClick={
                asrOffline ? leaveActivity : () => setDegradedAccepted(true)
              }
            >
              {asrOffline
                ? "Try Again Later"
                : "Proceed with Prepared Voice Lines"}
            </BigButton>
          </div>
        </Surface>
      </div>
    </main>
  );
}
