import { lazy, Suspense, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import type {
  ClaraEmotion,
  ClaraPresentationState,
} from "./live2d/ClaraExpressionController";

const ClaraLive2DCanvas = lazy(() =>
  import("./live2d/ClaraLive2DCanvas").then((module) => ({
    default: module.ClaraLive2DCanvas,
  })),
);

const CLARA_RUNTIME_MODEL_PATH = "/assets/live2d/clara/CherryGoth.model3.json";
const CLARA_PORTRAIT_PATH = "/assets/live2d/clara/stills/clara-default.png";

interface ClaraStageProps {
  emotion?: ClaraEmotion;
  speaking?: boolean;
  speechLevel?: number;
}

export function ClaraStage({
  emotion = "default",
  speaking = false,
  speechLevel,
}: ClaraStageProps) {
  const reduceMotion = useReducedMotion();
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [portraitLoaded, setPortraitLoaded] = useState(false);
  const presentation: ClaraPresentationState = {
    emotion,
    speaking,
    speechLevel,
  };

  return (
    <motion.figure
      className="clara-stage"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        delay: reduceMotion ? 0 : 0.22,
        duration: reduceMotion ? 0 : 0.55,
        ease: "easeOut",
      }}
      aria-label="Ma'am Clara"
      data-live2d-model={CLARA_RUNTIME_MODEL_PATH}
      data-live2d-state={loadState}
      data-clara-emotion={emotion}
      data-clara-speaking={speaking}
    >
      <div className="clara-stage__portrait-wrap">
        <motion.img
          className="clara-stage__portrait"
          src={CLARA_PORTRAIT_PATH}
          alt="Ma'am Clara"
          draggable="false"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: portraitLoaded ? 1 : 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.55,
            ease: "easeOut",
          }}
          data-load-state={portraitLoaded ? "loaded" : "loading"}
          onLoad={() => setPortraitLoaded(true)}
        />
      </div>
      <Suspense fallback={null}>
        <ClaraLive2DCanvas
          reduceMotion={Boolean(reduceMotion)}
          presentation={presentation}
          onStateChange={setLoadState}
        />
      </Suspense>
    </motion.figure>
  );
}
