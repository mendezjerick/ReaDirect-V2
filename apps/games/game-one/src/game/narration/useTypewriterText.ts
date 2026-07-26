import { useEffect, useState } from "react";

export const TYPEWRITER_ENABLED_KEY = "readirect-rpg:typewriter-enabled:v1";

export function useTypewriterPreference() {
  const [enabled, setEnabled] = useState(() => window.localStorage.getItem(TYPEWRITER_ENABLED_KEY) !== "false");
  const toggle = () => {
    setEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(TYPEWRITER_ENABLED_KEY, String(next));
      return next;
    });
  };
  return { enabled, toggle };
}

export function useTypewriterText(text: string, enabled: boolean, charactersPerSecond = 32) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const animate = enabled && !reducedMotion;
  const [visibleLength, setVisibleLength] = useState(() => animate ? 0 : text.length);

  useEffect(() => {
    setVisibleLength(animate ? 0 : text.length);
  }, [animate, text]);

  useEffect(() => {
    if (!animate || visibleLength >= text.length) return;
    const timer = window.setInterval(() => {
      setVisibleLength((current) => Math.min(text.length, current + 1));
    }, 1000 / charactersPerSecond);
    return () => window.clearInterval(timer);
  }, [animate, charactersPerSecond, text.length, visibleLength]);

  return {
    displayedText: text.slice(0, visibleLength),
    isComplete: visibleLength >= text.length,
    complete: () => setVisibleLength(text.length)
  };
}
