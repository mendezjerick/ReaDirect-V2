import { useEffect, useRef } from "react";

import {
  createLinkStartStreaks,
  getLinkStartWaveProgresses,
  LINK_START_COVER_COMPLETE_MS,
  type LinkStartStreak,
} from "./linkStartMath";

export const LINK_START_ROUTE_SWAP_MS = 2600;
export const LINK_START_DURATION_MS = 3000;
export const WHITE_LINK_START_ROUTE_SWAP_MS = LINK_START_ROUTE_SWAP_MS;
export const WHITE_LINK_START_DURATION_MS = LINK_START_DURATION_MS;

export type LinkStartVariant = "full" | "white";

const LINK_START_IGNITION_MS = 640;
const LINK_START_CORE_FADE_START_MS = 2380;
const LINK_START_CORE_FADE_MS = 360;
const LINK_START_COVER_START_MS = 2200;
const LINK_START_REVEAL_START_MS = 2700;
const MAX_CANVAS_PIXEL_RATIO = 2;

const TRANSITION_COLOR_TOKENS = [
  "--color-link-start-fixed-core",
  "--color-link-start-fixed-cover",
  "--color-link-start-fixed-prism-pink",
  "--color-link-start-fixed-prism-yellow",
  "--color-link-start-fixed-prism-crimson",
  "--color-link-start-fixed-prism-violet",
  "--color-link-start-fixed-prism-coral",
  "--color-link-start-fixed-prism-glass",
] as const;

interface LinkStartColors {
  core: string;
  cover: string;
  streaks: readonly string[];
}

interface CanvasMetrics {
  height: number;
  pixelRatio: number;
  width: number;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInCubic(value: number): number {
  return value * value * value;
}

function easeOutQuint(value: number): number {
  return 1 - (1 - value) ** 5;
}

function resolveTransitionColors(element: HTMLElement): LinkStartColors | null {
  const styles = window.getComputedStyle(element);
  const values = TRANSITION_COLOR_TOKENS.map((token) =>
    styles.getPropertyValue(token).trim(),
  );

  if (values.some((value) => value.length === 0)) {
    return null;
  }

  return {
    core: values[0],
    cover: values[1],
    streaks: values.slice(2),
  };
}

function resizeCanvas(canvas: HTMLCanvasElement): CanvasMetrics {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, bounds.width || window.innerWidth);
  const height = Math.max(1, bounds.height || window.innerHeight);
  const pixelRatio = Math.min(
    MAX_CANVAS_PIXEL_RATIO,
    Math.max(1, window.devicePixelRatio || 1),
  );

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);

  return { height, pixelRatio, width };
}

function getCoverRadius(width: number, height: number): number {
  const centerX = width * 0.5;
  const centerY = height * 0.48;

  return (
    Math.max(
      Math.hypot(centerX, centerY),
      Math.hypot(width - centerX, centerY),
      Math.hypot(centerX, height - centerY),
      Math.hypot(width - centerX, height - centerY),
    ) * 1.04
  );
}

function drawLinkStartFrame(
  context: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  streaks: readonly LinkStartStreak[],
  colors: LinkStartColors,
  elapsed: number,
): void {
  const { height, pixelRatio, width } = metrics;
  const centerX = width * 0.5;
  const centerY = height * 0.48;
  const travelDistance = Math.hypot(width, height) * 0.72;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.lineCap = "round";

  for (const streak of streaks) {
    for (const progress of getLinkStartWaveProgresses(elapsed, streak.delay)) {
      const acceleratedProgress = easeInCubic(progress);
      const distance =
        streak.offset * travelDistance +
        acceleratedProgress * travelDistance * streak.speed;
      const length = 14 + streak.length * (0.2 + acceleratedProgress * 0.8);
      const startDistance = Math.max(3, distance - length);
      const cos = Math.cos(streak.angle);
      const sin = Math.sin(streak.angle);

      context.globalAlpha = Math.min(1, progress * 2.5);
      context.strokeStyle = colors.streaks[streak.colorIndex];
      context.lineWidth = streak.width * (0.45 + acceleratedProgress * 0.75);
      context.beginPath();
      context.moveTo(
        centerX + cos * startDistance,
        centerY + sin * startDistance,
      );
      context.lineTo(centerX + cos * distance, centerY + sin * distance);
      context.stroke();
    }
  }

  const ignitionProgress = clamp(elapsed / LINK_START_IGNITION_MS);
  const coreFade =
    1 -
    clamp((elapsed - LINK_START_CORE_FADE_START_MS) / LINK_START_CORE_FADE_MS);

  if (ignitionProgress > 0 && coreFade > 0) {
    context.globalAlpha = coreFade;
    context.fillStyle = colors.core;
    context.beginPath();
    context.arc(
      centerX,
      centerY,
      5 + easeOutQuint(ignitionProgress) * 13,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  const coverProgress = clamp(
    (elapsed - LINK_START_COVER_START_MS) /
      (LINK_START_COVER_COMPLETE_MS - LINK_START_COVER_START_MS),
  );

  if (coverProgress > 0) {
    const revealProgress = clamp(
      (elapsed - LINK_START_REVEAL_START_MS) /
        (LINK_START_DURATION_MS - LINK_START_REVEAL_START_MS),
    );

    context.globalAlpha = 1 - revealProgress;
    context.fillStyle = colors.cover;
    context.beginPath();
    context.arc(
      centerX,
      centerY,
      getCoverRadius(width, height) * easeOutQuint(coverProgress),
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.globalAlpha = 1;
}

interface LinkStartTransitionProps {
  variant?: LinkStartVariant;
}

export function LinkStartTransition({
  variant = "full",
}: LinkStartTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (variant === "white") {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    const colors = resolveTransitionColors(canvas);

    if (!context || !colors) {
      return;
    }

    let metrics = resizeCanvas(canvas);
    let streaks = createLinkStartStreaks(metrics.width);
    let animationFrame = 0;
    const startedAt = performance.now();

    const handleResize = () => {
      metrics = resizeCanvas(canvas);
      streaks = createLinkStartStreaks(metrics.width);
    };

    const drawFrame = (timestamp: number) => {
      const elapsed = Math.min(timestamp - startedAt, LINK_START_DURATION_MS);
      drawLinkStartFrame(context, metrics, streaks, colors, elapsed);

      if (elapsed < LINK_START_DURATION_MS) {
        animationFrame = window.requestAnimationFrame(drawFrame);
      }
    };

    window.addEventListener("resize", handleResize);
    animationFrame = window.requestAnimationFrame(drawFrame);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, [variant]);

  if (variant === "white") {
    return (
      <div
        className="route-transition route-transition--white"
        data-route-transition="link-start-white"
        aria-hidden="true"
      >
        <span className="route-transition__white-cover" />
      </div>
    );
  }

  return (
    <div
      className="route-transition route-transition--link-start"
      data-route-transition="link-start"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="route-transition__canvas" />
    </div>
  );
}
