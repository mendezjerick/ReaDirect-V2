import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { ReadingJourneyAchievementIcon } from "./ReadingJourneyAchievementIcon";
import type { ReadingJourneyAchievement } from "./readingJourneyAchievements";
import "./achievementUnlockOverlay.css";

type AchievementUnlockOverlayProps = {
  achievement: ReadingJourneyAchievement;
  open: boolean;
  onDismiss: () => void;
};

const DISMISS_DELAY_MS = 900;
const SPARK_COUNT = 12;

export function AchievementUnlockOverlay({
  achievement,
  open,
  onDismiss,
}: AchievementUnlockOverlayProps) {
  const reduceMotion = useReducedMotion();
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const [canDismiss, setCanDismiss] = useState(Boolean(reduceMotion));

  useEffect(() => {
    if (!open) {
      setCanDismiss(Boolean(reduceMotion));
      return;
    }
    if (reduceMotion) {
      setCanDismiss(true);
      return;
    }

    setCanDismiss(false);
    const timeout = window.setTimeout(
      () => setCanDismiss(true),
      DISMISS_DELAY_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [open, reduceMotion]);

  useEffect(() => {
    if (open) continueButtonRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="achievement-unlock"
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-unlock-title"
          aria-describedby="achievement-unlock-name achievement-unlock-prompt"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.65, ease: "easeOut" }}
        >
          <button
            ref={continueButtonRef}
            className="achievement-unlock__dismiss"
            type="button"
            aria-disabled={!canDismiss}
            onClick={() => canDismiss && onDismiss()}
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                event.preventDefault();
                continueButtonRef.current?.focus();
              }
              if (!canDismiss && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
              }
            }}
          >
            <span className="achievement-unlock__presentation">
              <motion.span
                className="achievement-unlock__eyebrow"
                id="achievement-unlock-title"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0.1 : 0.42,
                  delay: reduceMotion ? 0 : 0.28,
                }}
              >
                Achievement unlocked
              </motion.span>

              <motion.span
                className="achievement-unlock__icon-stage"
                initial={
                  reduceMotion ? false : { opacity: 0, scale: 0.2, rotate: -8 }
                }
                animate={{ opacity: 1, scale: [1, 1.12, 1], rotate: 0 }}
                transition={{
                  opacity: { duration: reduceMotion ? 0.1 : 0.24 },
                  scale: {
                    duration: reduceMotion ? 0.1 : 0.72,
                    times: [0, 0.62, 1],
                    ease: "easeOut",
                  },
                  rotate: {
                    duration: reduceMotion ? 0.1 : 0.62,
                    ease: "easeOut",
                  },
                }}
              >
                <span className="achievement-unlock__sparks" aria-hidden="true">
                  {Array.from({ length: SPARK_COUNT }, (_, index) => (
                    <i key={index} />
                  ))}
                </span>
                <ReadingJourneyAchievementIcon
                  achievement={achievement}
                  className="achievement-unlock__icon"
                />
              </motion.span>

              <motion.strong
                className="achievement-unlock__name"
                id="achievement-unlock-name"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0.1 : 0.42,
                  delay: reduceMotion ? 0 : 0.38,
                }}
              >
                {achievement.name}
              </motion.strong>

              <motion.span
                className="achievement-unlock__prompt"
                id="achievement-unlock-prompt"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: canDismiss ? 1 : 0 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.35 }}
              >
                Tap to continue
              </motion.span>
            </span>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
