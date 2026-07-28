import { useEffect, useRef, useState } from "react";

function portraitMatches() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(orientation: portrait)").matches ??
    window.innerHeight > window.innerWidth;
}

export function useResponsiveInputReset(clearInput: () => void) {
  const clearInputRef = useRef(clearInput);
  const [portrait, setPortrait] = useState(portraitMatches);
  clearInputRef.current = clearInput;

  useEffect(() => {
    const media = window.matchMedia?.("(orientation: portrait)");
    let frame = 0;

    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        clearInputRef.current();
        setPortrait(media?.matches ?? window.innerHeight > window.innerWidth);
      });
    };

    media?.addEventListener("change", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);

    return () => {
      window.cancelAnimationFrame(frame);
      media?.removeEventListener("change", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  return portrait;
}
