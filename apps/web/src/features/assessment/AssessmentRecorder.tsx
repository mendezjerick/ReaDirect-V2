import { useAudioRecorder } from "./useAudioRecorder";
import { PILOT_ASR_UNAVAILABLE_MESSAGE } from "../../deployment/pilot";

function MicrophoneIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="17" y="7" width="14" height="24" rx="7" />
      <path d="M11 24c0 8 5 13 13 13s13-5 13-13M24 37v6M17 43h14" />
    </svg>
  );
}

function StopIcon() {
  return <span className="assessment-recorder__stop-icon" aria-hidden="true" />;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m16 10 24 14-24 14V10Z" />
    </svg>
  );
}

export function AssessmentDockActionIcon({
  kind,
}: {
  kind: "submit" | "next";
}) {
  return kind === "submit" ? (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m11 25 8 8 18-19" />
      <path d="M8 8h32v32H8z" />
    </svg>
  ) : (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9 24h28M27 13l11 11-11 11" />
    </svg>
  );
}

export function AssessmentRecorder({
  recorder,
  unavailable,
  pilotUnavailable = false,
  committed = false,
  submitAvailableAfterCapture = false,
  onAudioAction,
}: {
  recorder: ReturnType<typeof useAudioRecorder>;
  unavailable: boolean;
  pilotUnavailable?: boolean;
  committed?: boolean;
  submitAvailableAfterCapture?: boolean;
  onAudioAction: () => void;
}) {
  const label =
    recorder.state === "recording"
      ? "Stop"
      : recorder.state === "playing"
        ? "Playing"
        : recorder.state === "recorded"
          ? "Play"
          : "Record";

  const useRecorder = () => {
    if (unavailable || pilotUnavailable || committed) return;
    onAudioAction();
    if (recorder.state === "idle") void recorder.record();
    else if (recorder.state === "recording") recorder.stop();
    else if (recorder.state === "recorded") recorder.play();
  };

  return (
    <div className="assessment-recorder">
      <button
        type="button"
        className="assessment-recorder__control"
        data-state={recorder.state}
        disabled={
          unavailable ||
          pilotUnavailable ||
          committed ||
          recorder.state === "playing"
        }
        aria-label={label}
        onClick={useRecorder}
      >
        <span className="assessment-recorder__icon">
          {recorder.state === "recording" ? (
            <StopIcon />
          ) : recorder.state === "recorded" || recorder.state === "playing" ? (
            <PlayIcon />
          ) : (
            <MicrophoneIcon />
          )}
        </span>
        <strong>{label}</strong>
        <span className="assessment-recorder__bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </button>
      <div className="assessment-recorder__review-slot">
        {pilotUnavailable ? (
          <span className="assessment-recorder__pilot-note" role="status">
            {PILOT_ASR_UNAVAILABLE_MESSAGE} Use Skip to continue.
          </span>
        ) : recorder.hasPlayed && !committed ? (
          <button
            type="button"
            className="assessment-recorder__retry"
            onClick={recorder.retry}
          >
            Retry?
          </button>
        ) : submitAvailableAfterCapture &&
          recorder.audio &&
          !recorder.hasPlayed ? (
          <span className="assessment-recorder__capture-note">
            Ready to submit
          </span>
        ) : null}
      </div>
      <p className="assessment-recorder__error" role="alert" aria-live="polite">
        {recorder.error}
      </p>
    </div>
  );
}
