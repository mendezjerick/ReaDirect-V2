import { useCallback, useEffect, useRef, useState } from "react";

import { registerNativeLifecycleHandler } from "../../app/nativeLifecycle";

export type RecorderState = "idle" | "recording" | "recorded" | "playing";

interface AudioRecorderOptions {
  maximumDurationMs?: number;
}

const RECORDER_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm"];

function supportedRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }

  return RECORDER_MIME_TYPES.find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType),
  );
}

function createRecorder(stream: MediaStream): MediaRecorder {
  const mimeType = supportedRecorderMimeType();

  if (mimeType) {
    try {
      return new MediaRecorder(stream, { mimeType });
    } catch {
      // Some Android WebViews report a MIME type as supported but reject it
      // during construction. Let the platform choose its native format.
    }
  }

  return new MediaRecorder(stream);
}

export function useAudioRecorder(
  resetKey: string,
  options: AudioRecorderOptions = {},
) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const maximumDurationTimeoutRef = useRef<number | null>(null);
  const elapsedIntervalRef = useRef<number | null>(null);
  const interruptedRef = useRef(false);
  const [state, setState] = useState<RecorderState>("idle");
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [error, setError] = useState("");
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);

  const stopPlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    player.pause();
    player.currentTime = 0;
    playerRef.current = null;
    setState((current) => (current === "playing" ? "recorded" : current));
  }, []);

  const clearRecordingTimers = useCallback(() => {
    if (maximumDurationTimeoutRef.current !== null) {
      window.clearTimeout(maximumDurationTimeoutRef.current);
      maximumDurationTimeoutRef.current = null;
    }
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    interruptedRef.current = true;
    clearRecordingTimers();
    stopPlayback();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setState("idle");
    setAudio(null);
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setHasPlayed(false);
    setError("");
    setRecordingElapsedMs(0);
  }, [clearRecordingTimers, stopPlayback]);

  useEffect(() => {
    clear();
  }, [clear, resetKey]);

  useEffect(() => () => clear(), [clear]);

  const stopForLifecycle = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      interruptedRef.current = true;
      clearRecordingTimers();
      recorderRef.current.stop();
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setState("idle");
      setError("Recording stopped when the app was paused. Please try again.");
      return;
    }

    if (state === "playing") {
      stopPlayback();
    }
  }, [clearRecordingTimers, state, stopPlayback]);

  useEffect(
    () =>
      registerNativeLifecycleHandler({
        onPause: stopForLifecycle,
        onBackButton: () => {
          if (state !== "recording" && state !== "playing") {
            return false;
          }

          stopForLifecycle();
          return true;
        },
      }),
    [state, stopForLifecycle],
  );

  const record = useCallback(async () => {
    let acquiredStream: MediaStream | null = null;

    try {
      setError("");
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      ) {
        setError(
          "This device cannot record audio here. Please try another device.",
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      acquiredStream = stream;
      const recorder = createRecorder(stream);
      chunksRef.current = [];
      interruptedRef.current = false;
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener(
        "stop",
        () => {
          clearRecordingTimers();
          if (interruptedRef.current) {
            chunksRef.current = [];
            return;
          }

          const durationMilliseconds =
            performance.now() - recordingStartedAtRef.current;
          setRecordingElapsedMs(durationMilliseconds);
          if (durationMilliseconds < 500) {
            setState("idle");
            setError("Record for at least half a second, then try again.");
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            return;
          }
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const url = URL.createObjectURL(blob);
          setAudio(blob);
          setAudioUrl(url);
          setState("recorded");
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        },
        { once: true },
      );
      recordingStartedAtRef.current = performance.now();
      recorder.start();
      setState("recording");
      setRecordingElapsedMs(0);
      elapsedIntervalRef.current = window.setInterval(() => {
        setRecordingElapsedMs(
          performance.now() - recordingStartedAtRef.current,
        );
      }, 250);
      if (options.maximumDurationMs) {
        maximumDurationTimeoutRef.current = window.setTimeout(() => {
          if (recorder.state === "recording") recorder.stop();
        }, options.maximumDurationMs);
      }
    } catch {
      acquiredStream?.getTracks().forEach((track) => track.stop());
      setError("Microphone access is needed to record your voice.");
    }
  }, [clearRecordingTimers, options.maximumDurationMs]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const play = useCallback(() => {
    if (!audioUrl) return;
    const player = new Audio(audioUrl);
    playerRef.current = player;
    setState("playing");
    player.addEventListener(
      "ended",
      () => {
        if (playerRef.current !== player) return;
        playerRef.current = null;
        setHasPlayed(true);
        setState("recorded");
      },
      { once: true },
    );
    void player
      .play()
      .then(() => {
        if (playerRef.current === player) setHasPlayed(true);
      })
      .catch(() => {
        if (playerRef.current !== player) return;
        playerRef.current = null;
        setState("recorded");
        setError("Your recording could not play. Try recording again.");
      });
  }, [audioUrl]);

  return {
    state,
    audio,
    hasPlayed,
    error,
    recordingElapsedMs,
    record,
    stop,
    stopPlayback,
    play,
    retry: clear,
    discard: clear,
  };
}
