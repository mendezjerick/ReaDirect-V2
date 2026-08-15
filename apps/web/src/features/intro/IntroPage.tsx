import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useRouteTransition } from "../../components/transitions/routeTransitionContext";
import { BigButton } from "../../components/ui/BigButton";
import { preloadCssImageToken } from "../../utils/preloadCssImageToken";
import { ThemeSelector } from "../theme/ThemeSelector";
import { useTheme } from "../theme/themeContext";
import { ClaraIntroStage } from "./ClaraIntroStage";
import { INTRO_EXPRESSION_SEQUENCE } from "./introConfig";

const INTRO_EXPRESSION_DURATION_MS = 2000;
const INTRO_TITLE_RISE_PX = 80;

export function IntroPage() {
  const reduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const { beginRouteTransition, isTransitioning } = useRouteTransition();
  const [expressionIndex, setExpressionIndex] = useState(0);
  const [claraReady, setClaraReady] = useState(false);
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

  const continueToHome = () => {
    beginRouteTransition({ destination: "/home", variant: "clara" });
  };
  const introReady = claraReady;

  return (
    <ClaraIntroStage
      ariaLabelledBy="intro-title"
      emotion={expression}
      overlay={<ThemeSelector />}
      onClaraLoadStateChange={(loadState) =>
        setClaraReady(loadState === "ready")
      }
    >
      <motion.h1
        id="intro-title"
        className="intro-page__title"
        initial={reduceMotion ? false : { opacity: 0, y: -INTRO_TITLE_RISE_PX }}
        animate={{ opacity: 1, y: -INTRO_TITLE_RISE_PX }}
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
        initial={false}
        animate={{ opacity: 1 }}
        transition={{
          duration: reduceMotion ? 0 : 0.2,
          ease: "easeOut",
        }}
      >
        <BigButton
          className="intro-page__continue"
          variant={introReady ? "primary" : "unavailable"}
          committing={isTransitioning}
          disabled={!introReady}
          onClick={continueToHome}
        >
          {introReady ? "Tap to continue" : "Loading..."}
        </BigButton>
      </motion.div>
    </ClaraIntroStage>
  );
}
