import { useAudioRecorder } from "./useAudioRecorder";
import { PixelIcon } from "../../components/ui/PixelIcon";

function MicrophoneIcon() {
  return <PixelIcon name="microphone" />;
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
  const label =
    recorder.state === "recording"
      ? "Stop"
      : recorder.state === "playing"
        ? "Playing"
        : recorder.state === "recorded"
          ? "Play"
          : "Record";

  const useRecorder = () => {
    if (unavailable || committed) return;
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
        disabled={unavailable || committed || recorder.state === "playing"}
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
        {recorder.hasPlayed && !committed ? (
          <button
            type="button"
            className="assessment-recorder__retry"
            onClick={recorder.retry}
          >
            Retry recording
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
