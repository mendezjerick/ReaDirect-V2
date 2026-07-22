import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useRouteTransition } from "../../components/transitions/routeTransitionContext";
import { BigButton } from "../../components/ui/BigButton";
import { preloadCssImageToken } from "../../utils/preloadCssImageToken";
import { ThemeSelector } from "../theme/ThemeSelector";
import { useTheme } from "../theme/themeContext";
import { ClaraIntroStage } from "./ClaraIntroStage";
import {
  INTRO_CENTER_HOLD_MS,
  INTRO_EXPRESSION_SEQUENCE,
} from "./introConfig";

const INTRO_EXPRESSION_DURATION_MS = 2000;
const INTRO_TITLE_RISE_PX = 80;

export function IntroPage() {
  const reduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const { beginRouteTransition, isTransitioning } = useRouteTransition();
  const [expressionIndex, setExpressionIndex] = useState(0);
  const [introReady, setIntroReady] = useState(Boolean(reduceMotion));
  const homeBackgroundPreloadRef = useRef<HTMLImageElement | null>(null);
  const expression = INTRO_EXPRESSION_SEQUENCE[expressionIndex];

  useEffect(() => {
    const assetToken =
      window.innerWidth >= 768
        ? "--asset-learner-flow-background-desktop"
        : "--asset-learner-flow-background-mobile";

    homeBackgroundPreloadRef.current = preloadCssImageToken(assetToken);
  }, [theme]);

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

  useEffect(() => {
    if (reduceMotion) {
      setIntroReady(true);
      return;
    }

    const timeout = window.setTimeout(
      () => setIntroReady(true),
      INTRO_CENTER_HOLD_MS,
    );

    return () => window.clearTimeout(timeout);
  }, [reduceMotion]);

  const continueToHome = () => {
    beginRouteTransition("/home");
  };

  return (
    <ClaraIntroStage
      ariaLabelledBy="intro-title"
      emotion={expression}
      overlay={<ThemeSelector />}
    >
      <motion.h1
        id="intro-title"
        className="intro-page__title"
        initial={reduceMotion ? false : { opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: introReady ? -INTRO_TITLE_RISE_PX : 0 }}
        transition={{
          opacity: {
            duration: reduceMotion ? 0 : 0.6,
            ease: "easeOut",
          },
          y: {
            duration: reduceMotion ? 0 : 0.65,
            ease: [0.16, 1, 0.3, 1],
          },
        }}
      >
        ReaDirect
      </motion.h1>

      <motion.div
        className="intro-page__continue-wrap"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: introReady ? 1 : 0 }}
        transition={{
          delay: reduceMotion || !introReady ? 0 : 0.14,
          duration: reduceMotion ? 0 : 0.5,
          ease: "easeOut",
        }}
        aria-hidden={!introReady}
      >
        <BigButton
          className="intro-page__continue"
          committing={isTransitioning}
          disabled={!introReady}
          onClick={continueToHome}
        >
          Tap to continue
        </BigButton>
      </motion.div>
    </ClaraIntroStage>
  );
}
