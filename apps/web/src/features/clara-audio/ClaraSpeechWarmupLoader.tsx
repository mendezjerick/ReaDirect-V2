import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";

interface ClaraSpeechWarmupLoaderProps {
  active: boolean;
  modelReady: boolean;
}

export function ClaraSpeechWarmupLoader({
  active,
  modelReady,
}: ClaraSpeechWarmupLoaderProps) {
  const reduceMotion = useReducedMotion();

  // Clara's model loader has priority. Returning early also prevents its
  // full-screen reveal from overlapping this loader's exit animation.
  if (!modelReady || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence initial={false}>
      {active ? (
        <motion.div
          key="clara-speech-warmup"
          className="clara-speech-loader"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.42,
            ease: "easeInOut",
          }}
          role="status"
          aria-live="polite"
          aria-label="Preparing Ma'am Clara's voice"
        >
          <div className="clara-speech-loader__perspective" aria-hidden="true">
            <div className="clara-speech-loader__cube">
              <div data-cube-face="front" />
              <div data-cube-face="back" />
              <div data-cube-face="right" />
              <div data-cube-face="left" />
              <div data-cube-face="top" />
              <div data-cube-face="bottom" />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
