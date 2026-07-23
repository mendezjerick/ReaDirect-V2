import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";

import type {
  ClaraEmotion,
  ClaraPresentationCue,
  ClaraPresentationState,
  ClaraTeachingBehavior,
} from "./live2d/ClaraPresentation";

const ClaraLive2DCanvas = lazy(() =>
  import("./live2d/ClaraLive2DCanvas").then((module) => ({
    default: module.ClaraLive2DCanvas,
  })),
);

const CLARA_RUNTIME_MODEL_PATH = "/assets/live2d/clara/CherryGoth.model3.json";

interface ClaraStageProps {
  emotion?: ClaraEmotion;
  behavior?: ClaraTeachingBehavior;
  cue?: ClaraPresentationCue;
  speaking?: boolean;
  speechLevel?: number;
  onLoadStateChange?: (state: ClaraStageLoadState) => void;
}

export type ClaraStageLoadState = "loading" | "ready" | "error";
type ClaraStageVisualState = ClaraStageLoadState | "revealing";

export function ClaraStage({
  emotion = "default",
  behavior = "neutral",
  cue = "none",
  speaking = false,
  speechLevel,
  onLoadStateChange,
}: ClaraStageProps) {
  const reduceMotion = useReducedMotion();
  const [loadState, setLoadState] = useState<ClaraStageVisualState>("loading");
  const onLoadStateChangeRef = useRef(onLoadStateChange);
  const stageRef = useRef<HTMLElement>(null);
  const revealCoverRef = useRef<HTMLSpanElement>(null);
  const [loaderOrigin, setLoaderOrigin] = useState({ x: 0, y: 0 });
  const presentation: ClaraPresentationState = {
    emotion,
    behavior,
    cue,
    speaking,
    speechLevel,
  };

  onLoadStateChangeRef.current = onLoadStateChange;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const updateOrigin = () => {
      const bounds = stage.getBoundingClientRect();
      setLoaderOrigin({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });
    };

    updateOrigin();
    window.addEventListener("resize", updateOrigin);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateOrigin);
    resizeObserver?.observe(stage);

    return () => {
      window.removeEventListener("resize", updateOrigin);
      resizeObserver?.disconnect();
    };
  }, []);

  const handleLoadStateChange = useCallback(
    (state: ClaraStageLoadState) => {
      if (state === "ready") {
        if (reduceMotion) {
          setLoadState("ready");
          onLoadStateChangeRef.current?.("ready");
          return;
        }

        setLoadState("revealing");
        return;
      }

      setLoadState(state);
      onLoadStateChangeRef.current?.(state);
    },
    [reduceMotion],
  );

  useEffect(() => {
    const cover = revealCoverRef.current;
    if (!cover || loadState !== "revealing") {
      return;
    }

    const handleRevealEnd = () => {
      setLoadState("ready");
      onLoadStateChangeRef.current?.("ready");
    };

    cover.addEventListener("animationend", handleRevealEnd, { once: true });
    return () => cover.removeEventListener("animationend", handleRevealEnd);
  }, [loadState]);

  const loaderStyle = {
    "--clara-loader-origin-x": `${loaderOrigin.x}px`,
    "--clara-loader-origin-y": `${loaderOrigin.y}px`,
  } as CSSProperties;

  return (
    <>
      <motion.figure
        ref={stageRef}
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
        data-clara-behavior={behavior}
        data-clara-cue={cue}
        data-clara-speaking={speaking}
      >
        <div className="clara-stage__viewport">
          <Suspense fallback={null}>
            <ClaraLive2DCanvas
              reduceMotion={Boolean(reduceMotion)}
              presentation={presentation}
              onStateChange={handleLoadStateChange}
            />
          </Suspense>
        </div>
        <span className="visually-hidden" role="status">
          {loadState === "ready"
            ? "Ma'am Clara is ready"
            : loadState === "error"
              ? "Ma'am Clara could not load"
              : "Loading Ma'am Clara"}
        </span>
      </motion.figure>
      {loadState !== "ready"
        ? createPortal(
            <div
              className="clara-stage__loader"
              data-live2d-state={loadState}
              style={loaderStyle}
              aria-hidden="true"
            >
              <span className="clara-stage__loader-wave" />
              <span
                ref={revealCoverRef}
                className="clara-stage__loader-cover"
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
