import { useAudioRecorder } from "./useAudioRecorder";
import { PixelIcon } from "../../components/ui/PixelIcon";

export type AssessmentRecorderViewState =
  "idle" | "recording" | "recorded" | "playing" | "processing";

function RecordMark() {
  return (
    <span className="assessment-recorder__record-mark" aria-hidden="true" />
  );
}

function StopIcon() {
  return <PixelIcon name="stop" />;
}

function PlayIcon() {
  return <PixelIcon name="play" />;
}

export function AssessmentDockActionIcon({
  kind,
}: {
  kind: "submit" | "next";
}) {
  return kind === "submit" ? (
    <PixelIcon name="clipboard-check" />
  ) : (
    <PixelIcon name="arrow-right" />
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
            <RecordMark />
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
            Retry recording
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
