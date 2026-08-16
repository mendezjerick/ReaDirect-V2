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

import { useLearnerExperience } from "../learner-auth/LearnerExperienceProvider";
import { useTheme } from "../theme/themeContext";
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
const CLARA_STAGE_TIMEOUT_MS = 15_000;

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
  const { theme } = useTheme();
  const learnerExperience = useLearnerExperience();
  const [loadState, setLoadState] = useState<ClaraStageVisualState>("loading");
  const [staticFallback, setStaticFallback] = useState(false);
  const onLoadStateChangeRef = useRef(onLoadStateChange);
  const stageRef = useRef<HTMLElement>(null);
  const revealCoverRef = useRef<HTMLSpanElement>(null);
  const renderedContentRef = useRef<string | null>(null);
  const [loaderOrigin, setLoaderOrigin] = useState({ x: 0, y: 0 });
  const presentation: ClaraPresentationState = {
    emotion,
    behavior,
    cue,
    speaking,
    speechLevel,
  };
  const displayMode = learnerExperience.displayMode;
  const effectiveDisplayMode = staticFallback ? "static" : displayMode;
  const awaitingLearnerExperience =
    learnerExperience.state === "resolving" && displayMode === null;
  const staticSource =
    theme === "t2"
      ? "/assets/live2d/clara/stills/clara-t2.png"
      : theme === "t3"
        ? "/assets/live2d/clara/stills/clara-t3.png"
        : "/assets/live2d/clara/stills/clara-default.png";
  // Live2D updates its palette from the document theme in place.  Only a
  // static portrait depends on this source, so do not treat a Live2D theme
  // change as a new render that needs the stage loader.
  const renderedContent =
    effectiveDisplayMode === "static"
      ? `static:${staticSource}`
      : (effectiveDisplayMode ?? "resolving");

  onLoadStateChangeRef.current = onLoadStateChange;

  useEffect(() => {
    if (displayMode !== "live2d" && staticFallback) {
      setStaticFallback(false);
    }
  }, [displayMode, staticFallback]);

  useEffect(() => {
    if (displayMode !== "live2d" || staticFallback || loadState === "ready") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStaticFallback(true);
      setLoadState("loading");
    }, CLARA_STAGE_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [displayMode, loadState, staticFallback]);

  useEffect(() => {
    if (renderedContentRef.current === null) {
      renderedContentRef.current = renderedContent;
      return;
    }

    if (renderedContentRef.current === renderedContent) {
      return;
    }

    renderedContentRef.current = renderedContent;
    setLoadState("loading");
  }, [renderedContent]);

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

      if (state === "error" && displayMode === "live2d" && !staticFallback) {
        setStaticFallback(true);
        setLoadState("loading");
        return;
      }

      setLoadState(state);
      onLoadStateChangeRef.current?.(state);
    },
    [displayMode, reduceMotion, staticFallback],
  );

  useEffect(() => {
    if (learnerExperience.state === "error" && displayMode === null) {
      handleLoadStateChange("error");
    }
  }, [displayMode, handleLoadStateChange, learnerExperience.state]);

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
        data-live2d-model={
          effectiveDisplayMode === "live2d"
            ? CLARA_RUNTIME_MODEL_PATH
            : undefined
        }
        data-live2d-state={loadState}
        data-clara-display-mode={effectiveDisplayMode ?? "resolving"}
        data-clara-emotion={emotion}
        data-clara-behavior={behavior}
        data-clara-cue={cue}
        data-clara-speaking={speaking}
      >
        <div className="clara-stage__viewport">
          {effectiveDisplayMode === "static" ? (
            <img
              className="clara-stage__static-image"
              src={staticSource}
              alt=""
              aria-hidden="true"
              onLoad={() => handleLoadStateChange("ready")}
              onError={() => handleLoadStateChange("error")}
            />
          ) : effectiveDisplayMode === "live2d" ? (
            <Suspense fallback={null}>
              <ClaraLive2DCanvas
                reduceMotion={Boolean(reduceMotion)}
                presentation={presentation}
                onStateChange={handleLoadStateChange}
              />
            </Suspense>
          ) : null}
        </div>
        <span className="visually-hidden" role="status">
          {learnerExperience.state === "error" && loadState === "ready"
            ? "Ma'am Clara is using a simple view"
            : loadState === "ready"
              ? "Ma'am Clara is ready"
              : loadState === "error"
                ? "Ma'am Clara could not load"
                : awaitingLearnerExperience
                  ? "Preparing Ma'am Clara"
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
