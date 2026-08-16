import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useRouteTransition } from "../../components/transitions/routeTransitionContext";
import { BigButton } from "../../components/ui/BigButton";
import { preloadCssImageToken } from "../../utils/preloadCssImageToken";
import { ThemeSelector } from "../theme/ThemeSelector";
import { useTheme } from "../theme/themeContext";
import { useLearnerExperience } from "../learner-auth/LearnerExperienceProvider";
import { ClaraIntroStage } from "./ClaraIntroStage";
import { INTRO_EXPRESSION_SEQUENCE } from "./introConfig";

const INTRO_EXPRESSION_DURATION_MS = 2000;
const INTRO_TITLE_RISE_PX = 80;

export function IntroPage() {
  const reduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const { beginRouteTransition, isTransitioning } = useRouteTransition();
  const { state: experienceState, retry: retryExperience } =
    useLearnerExperience();
  const [expressionIndex, setExpressionIndex] = useState(0);
  const [claraLoadState, setClaraLoadState] = useState<
    "loading" | "ready" | "error"
  >("loading");
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
  const introReady = claraLoadState === "ready";
  const staticFallbackReady = introReady && experienceState === "error";
  const retryClara = () => {
    setClaraLoadState("loading");
    retryExperience();
  };

  return (
    <ClaraIntroStage
      ariaLabelledBy="intro-title"
      emotion={expression}
      overlay={<ThemeSelector />}
      onClaraLoadStateChange={setClaraLoadState}
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
        {staticFallbackReady ? (
          <p className="intro-page__clara-notice" role="status">
            Clara&apos;s animation is unavailable, so a simple view is ready.
          </p>
        ) : null}
        <BigButton
          className="intro-page__continue"
          variant={introReady ? "primary" : "unavailable"}
          committing={isTransitioning}
          disabled={!introReady}
          onClick={continueToHome}
        >
          {introReady ? "Tap to continue" : "Loading..."}
        </BigButton>
        {claraLoadState === "error" ? (
          <BigButton
            className="intro-page__clara-retry"
            variant="secondary"
            size="regular"
            onClick={retryClara}
          >
            Try again
          </BigButton>
        ) : null}
      </motion.div>
    </ClaraIntroStage>
  );
}
