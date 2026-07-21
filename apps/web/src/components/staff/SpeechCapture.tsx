import { useEffect, useRef, useState } from "react";

import { BigButton } from "../ui/BigButton";

interface SpeechCaptureProps {
  audio: File | null;
  disabled?: boolean;
  onAudioChange: (audio: File | null) => void;
}

function preferredMimeType(): string {
  const options = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function extensionForMime(mimeType: string): string {
  return mimeType.includes("ogg") ? "ogg" : "webm";
}

export function SpeechCapture({
  audio,
  disabled = false,
  onAudioChange,
}: SpeechCaptureProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!audio) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(audio);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  useEffect(
    () => () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const startRecording = async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Recording is unavailable in this browser. Upload an audio file instead.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const resolvedType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: resolvedType });
        onAudioChange(
          new File(
            [blob],
            `sandbox-recording.${extensionForMime(resolvedType)}`,
            { type: resolvedType },
          ),
        );
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
      };
      recorder.start();
      setError(null);
      setRecording(true);
    } catch {
      setError(
        "Microphone permission was not granted. You can still upload audio.",
      );
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="speech-capture">
      <div className="speech-capture__actions">
        <BigButton
          variant={recording ? "secondary" : "primary"}
          size="regular"
          disabled={disabled}
          onClick={() => void (recording ? stopRecording() : startRecording())}
        >
          {recording ? "Stop recording" : "Record sample"}
        </BigButton>
        <label className="speech-capture__upload">
          <span>Upload audio</span>
          <input
            type="file"
            accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.flac"
            disabled={disabled || recording}
            onChange={(event) => onAudioChange(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      {recording ? (
        <p className="speech-capture__recording" role="status">
          Recording now… speak clearly.
        </p>
      ) : null}
      {error ? (
        <p className="speech-capture__error" role="alert">
          {error}
        </p>
      ) : null}
      {audio && previewUrl ? (
        <div className="speech-capture__preview">
          <div>
            <strong>{audio.name}</strong>
            <span>{Math.max(1, Math.round(audio.size / 1024))} KB</span>
          </div>
          <audio controls src={previewUrl}>
            Your browser cannot preview this audio.
          </audio>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAudioChange(null)}
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="speech-capture__empty">No audio selected yet.</p>
      )}
    </div>
  );
}
