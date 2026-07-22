import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "recorded" | "playing";

interface AudioRecorderOptions {
  maximumDurationMs?: number;
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
  const [state, setState] = useState<RecorderState>("idle");
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [error, setError] = useState("");
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);

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
    clearRecordingTimers();
    playerRef.current?.pause();
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
  }, [clearRecordingTimers]);

  useEffect(() => {
    clear();
  }, [clear, resetKey]);

  useEffect(() => () => clear(), [clear]);

  const record = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener(
        "stop",
        () => {
          clearRecordingTimers();
          const durationMilliseconds = performance.now() - recordingStartedAtRef.current;
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
        setRecordingElapsedMs(performance.now() - recordingStartedAtRef.current);
      }, 250);
      if (options.maximumDurationMs) {
        maximumDurationTimeoutRef.current = window.setTimeout(() => {
          if (recorder.state === "recording") recorder.stop();
        }, options.maximumDurationMs);
      }
    } catch {
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
        playerRef.current = null;
        setHasPlayed(true);
        setState("recorded");
      },
      { once: true },
    );
    void player.play().catch(() => {
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
    play,
    retry: clear,
  };
}
