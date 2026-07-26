import { useCallback, useEffect, useRef, useState } from "react";
import type { GameLanguage } from "../localization/language";

export const NARRATION_MUTED_KEY = "readirect-rpg:narration-muted:v1";

export function useNarration(text: string, active = true, language: GameLanguage = "en") {
  const [muted, setMuted] = useState(() => window.localStorage.getItem(NARRATION_MUTED_KEY) === "true");
  const textRef = useRef(text);
  textRef.current = text;
  const supported = false;

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    window.dispatchEvent(new CustomEvent("readirect:narration-state", { detail: { active: false } }));
  }, []);

  useEffect(() => {
    return stop;
  }, [active, language, stop, text]);

  useEffect(() => {
    const onPreference = (event: Event) => setMuted(Boolean((event as CustomEvent<{ muted: boolean }>).detail?.muted));
    const onStop = () => stop();
    window.addEventListener("readirect:voice-preference", onPreference);
    window.addEventListener("readirect:narration-stop", onStop);
    return () => {
      window.removeEventListener("readirect:voice-preference", onPreference);
      window.removeEventListener("readirect:narration-stop", onStop);
    };
  }, [stop]);

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      window.localStorage.setItem(NARRATION_MUTED_KEY, String(next));
      window.dispatchEvent(new CustomEvent("readirect:voice-preference", { detail: { muted: next } }));
      if (next) stop();
      return next;
    });
  }, [stop]);

  const replay = useCallback(() => {
    void textRef.current;
  }, []);

  return { muted, replay, stop, toggleMute, supported };
}
