import { useEffect, useRef, useState } from "react";

import { ClaraWebGLRenderer } from "./ClaraWebGLRenderer";
import type { ClaraPresentationState } from "./ClaraExpressionController";
import {
  getClaraInteractionTracker,
  type ClaraLookTarget,
} from "./ClaraInteractionTracker";
import { acquireCubismFramework } from "./cubismFrameworkRuntime";

type ClaraLoadState = "loading" | "ready" | "error";

interface ClaraLive2DCanvasProps {
  reduceMotion: boolean;
  presentation: ClaraPresentationState;
  onStateChange: (state: ClaraLoadState) => void;
}

export function ClaraLive2DCanvas({
  reduceMotion,
  presentation,
  onStateChange,
}: ClaraLive2DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ClaraWebGLRenderer | null>(null);
  const presentationRef = useRef(presentation);
  const [statusMessage, setStatusMessage] = useState("Loading Ma'am Clara");

  presentationRef.current = presentation;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const abortController = new AbortController();
    let renderer: ClaraWebGLRenderer | null = null;
    let releaseFramework: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let releaseInteractionTracker: (() => void) | null = null;
    let lookTarget: ClaraLookTarget = { active: false, x: 0, y: 0 };
    let animationFrame = 0;
    let previousFrameTime = performance.now();
    let disposed = false;

    const frame = (currentTime: number) => {
      if (disposed || !renderer) {
        return;
      }

      if (!document.hidden) {
        const deltaTime = Math.min(
          (currentTime - previousFrameTime) / 1000,
          1 / 15,
        );
        previousFrameTime = currentTime;
        renderer.render(
          deltaTime,
          !reduceMotion,
          presentationRef.current,
          lookTarget,
        );
      }

      if (!reduceMotion) {
        animationFrame = requestAnimationFrame(frame);
      }
    };

    const initialize = async () => {
      try {
        onStateChange("loading");
        releaseFramework = acquireCubismFramework();
        renderer = new ClaraWebGLRenderer(canvas);
        rendererRef.current = renderer;
        releaseInteractionTracker = getClaraInteractionTracker().subscribe(
          (nextTarget) => {
            lookTarget = nextTarget;
            if (reduceMotion && renderer) {
              renderer.render(0, false, presentationRef.current, lookTarget);
            }
          },
        );
        resizeObserver = new ResizeObserver(() => renderer?.resize());
        resizeObserver.observe(canvas);

        await renderer.initialize(abortController.signal);
        if (disposed) {
          return;
        }

        themeObserver = new MutationObserver(() =>
          renderer?.refreshAppearanceColors(),
        );
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class", "data-theme", "style"],
        });

        onStateChange("ready");
        setStatusMessage("Ma'am Clara is ready");
        previousFrameTime = performance.now();
        animationFrame = requestAnimationFrame(frame);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        console.error("Ma'am Clara could not be rendered.", error);
        resizeObserver?.disconnect();
        resizeObserver = null;
        themeObserver?.disconnect();
        themeObserver = null;
        renderer?.release();
        renderer = null;
        rendererRef.current = null;
        releaseInteractionTracker?.();
        releaseInteractionTracker = null;
        releaseFramework?.();
        releaseFramework = null;
        onStateChange("error");
        setStatusMessage("Ma'am Clara is shown as a still portrait");
      }
    };

    void initialize();

    return () => {
      disposed = true;
      abortController.abort();
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      releaseInteractionTracker?.();
      renderer?.release();
      rendererRef.current = null;
      releaseFramework?.();
    };
  }, [onStateChange, reduceMotion]);

  useEffect(() => {
    if (!reduceMotion) {
      return;
    }

    rendererRef.current?.render(
      0,
      false,
      presentation,
      getClaraInteractionTracker().getTarget(),
    );
  }, [
    presentation.emotion,
    presentation.speaking,
    presentation.speechLevel,
    reduceMotion,
  ]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="clara-stage__canvas"
        aria-hidden="true"
      />
      <span className="visually-hidden" role="status">
        {statusMessage}
      </span>
    </>
  );
}
