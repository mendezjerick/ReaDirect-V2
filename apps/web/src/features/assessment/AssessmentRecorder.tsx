import { useAudioRecorder } from "./useAudioRecorder";

export type AssessmentRecorderViewState =
  "idle" | "recording" | "recorded" | "playing" | "processing";

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
  committed = false,
  submitAvailableAfterCapture = false,
  onAudioAction,
}: {
  recorder: ReturnType<typeof useAudioRecorder>;
  unavailable: boolean;
  committed?: boolean;
  submitAvailableAfterCapture?: boolean;
  onAudioAction: () => void;
}) {
  const useRecorder = () => {
    if (unavailable || committed) return;
    onAudioAction();
    if (recorder.state === "idle") void recorder.record();
    else if (recorder.state === "recording") recorder.stop();
    else if (recorder.state === "recorded") recorder.play();
  };

  return (
    <AssessmentRecorderView
      state={recorder.state}
      unavailable={unavailable}
      committed={committed}
      hasCapture={Boolean(recorder.audio)}
      hasPlayed={recorder.hasPlayed}
      submitAvailableAfterCapture={submitAvailableAfterCapture}
      error={recorder.error}
      onControl={useRecorder}
      onRetry={recorder.retry}
    />
  );
}

export function AssessmentRecorderView({
  state,
  unavailable,
  committed = false,
  hasCapture = false,
  hasPlayed = false,
  submitAvailableAfterCapture = false,
  error = "",
  recordLabel = "Record",
  stopLabel = "Stop",
  onControl,
  onRetry,
}: {
  state: AssessmentRecorderViewState;
  unavailable: boolean;
  committed?: boolean;
  hasCapture?: boolean;
  hasPlayed?: boolean;
  submitAvailableAfterCapture?: boolean;
  error?: string;
  recordLabel?: string;
  stopLabel?: string;
  onControl: () => void;
  onRetry?: () => void;
}) {
  const label =
    state === "recording"
      ? stopLabel
      : state === "playing"
        ? "Playing"
        : state === "recorded"
          ? "Play"
          : state === "processing"
            ? "Checking"
            : recordLabel;

  return (
    <div className="assessment-recorder">
      <button
        type="button"
        className="assessment-recorder__control"
        data-state={state}
        disabled={
          unavailable ||
          committed ||
          state === "playing" ||
          state === "processing"
        }
        aria-label={label}
        aria-pressed={state === "recording" || undefined}
        onClick={onControl}
      >
        <span className="assessment-recorder__icon">
          {state === "recording" ? (
            <StopIcon />
          ) : state === "recorded" || state === "playing" ? (
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
        {hasPlayed && !committed && onRetry ? (
          <button
            type="button"
            className="assessment-recorder__retry"
            onClick={onRetry}
          >
            Retry?
          </button>
        ) : submitAvailableAfterCapture && hasCapture && !hasPlayed ? (
          <span className="assessment-recorder__capture-note">
            Ready to submit
          </span>
        ) : null}
      </div>
      <p
        className="assessment-recorder__error"
        role={error ? "alert" : undefined}
        aria-live="polite"
      >
        {error}
      </p>
    </div>
  );
}
