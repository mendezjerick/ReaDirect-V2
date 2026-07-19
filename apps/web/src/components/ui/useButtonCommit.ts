import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

export const BUTTON_PRESS_COMMIT_MS = 180;

export function useButtonCommit() {
  const reduceMotion = useReducedMotion();
  const timeoutRef = useRef<number | null>(null);
  const [committing, setCommitting] = useState(false);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const commit = useCallback(
    (action: () => void) => {
      if (committing) {
        return;
      }

      if (reduceMotion) {
        action();
        return;
      }

      setCommitting(true);
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        setCommitting(false);
        action();
      }, BUTTON_PRESS_COMMIT_MS);
    },
    [committing, reduceMotion],
  );

  return { commit, committing };
}
