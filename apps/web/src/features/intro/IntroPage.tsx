import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ClaraStage } from "./ClaraStage";
import type { ClaraEmotion } from "./live2d/ClaraExpressionController";
import { PointerTrail } from "./PointerTrail";
import { VectorCursor } from "./VectorCursor";

export const INTRO_EXPRESSION_SEQUENCE = [
  "default",
  "happy",
  "confused",
  "thinking",
] as const satisfies readonly ClaraEmotion[];

const INTRO_EXPRESSION_DURATION_MS = 2000;

export function IntroPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [expressionIndex, setExpressionIndex] = useState(0);
  const expression = INTRO_EXPRESSION_SEQUENCE[expressionIndex];

  useEffect(() => {
    if (reduceMotion) {
      setExpressionIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setExpressionIndex(
        (currentIndex) => (currentIndex + 1) % INTRO_EXPRESSION_SEQUENCE.length,
      );
    }, INTRO_EXPRESSION_DURATION_MS);

    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  const continueToHome = () => {
    navigate("/home");
  };

  return (
    <main
      className="intro-page"
      aria-labelledby="intro-title"
      onContextMenu={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
      onCut={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <PointerTrail />
      <VectorCursor />

      <section className="intro-page__content">
        <motion.div
          className="intro-page__brand"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: reduceMotion ? 0 : -14 }}
          transition={{
            opacity: { duration: reduceMotion ? 0 : 0.55, ease: "easeOut" },
            y: {
              delay: reduceMotion ? 0 : 1,
              duration: reduceMotion ? 0 : 0.35,
              ease: [0.22, 1, 0.36, 1],
            },
          }}
        >
          <h1 id="intro-title" className="intro-page__title">
            ReaDirect
          </h1>

          <motion.button
            type="button"
            className="intro-page__continue"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduceMotion ? 0 : 1.12,
              duration: reduceMotion ? 0 : 0.42,
              ease: "easeOut",
            }}
            onClick={continueToHome}
          >
            Tap to continue
          </motion.button>
        </motion.div>

        <ClaraStage emotion={expression} />
      </section>
    </main>
  );
}
