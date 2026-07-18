import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLARA_TOUCH_HOLD_DELAY_MS,
  ClaraInteractionTracker,
  normalizeClaraViewportPoint,
} from "../src/features/intro/live2d/ClaraInteractionTracker";

interface PointerEventOptions {
  clientX?: number;
  clientY?: number;
  pointerId?: number;
  pointerType?: string;
  isPrimary?: boolean;
}

function dispatchPointerEvent(
  type: string,
  {
    clientX = 0,
    clientY = 0,
    pointerId = 1,
    pointerType = "mouse",
    isPrimary = true,
  }: PointerEventOptions = {},
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX,
    clientY,
  });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
    isPrimary: { value: isPrimary },
  });
  window.dispatchEvent(event);
}

describe("ClaraInteractionTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 500,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("normalizes viewport coordinates and clamps points outside the viewport", () => {
    expect(normalizeClaraViewportPoint(750, 125, 1000, 500)).toEqual({
      active: true,
      x: 0.5,
      y: 0.5,
    });
    expect(normalizeClaraViewportPoint(1200, 700, 1000, 500)).toEqual({
      active: true,
      x: 1,
      y: -1,
    });
  });

  it("tracks desktop hover and returns to neutral when the pointer leaves", () => {
    const tracker = new ClaraInteractionTracker(window, document);
    const unsubscribe = tracker.subscribe(() => undefined);

    dispatchPointerEvent("pointermove", { clientX: 750, clientY: 125 });
    expect(tracker.getTarget()).toEqual({ active: true, x: 0.5, y: 0.5 });

    dispatchPointerEvent("pointerout");
    expect(tracker.getTarget()).toEqual({ active: false, x: 0, y: 0 });
    unsubscribe();
  });

  it("does not activate tracking for an ordinary touch tap", () => {
    const tracker = new ClaraInteractionTracker(window, document);
    const observedTargets: Array<ReturnType<typeof tracker.getTarget>> = [];
    const unsubscribe = tracker.subscribe((target) => {
      observedTargets.push(target);
    });

    dispatchPointerEvent("pointerdown", {
      clientX: 750,
      clientY: 125,
      pointerType: "touch",
    });
    vi.advanceTimersByTime(CLARA_TOUCH_HOLD_DELAY_MS - 1);
    dispatchPointerEvent("pointerup", {
      clientX: 750,
      clientY: 125,
      pointerType: "touch",
    });
    vi.advanceTimersByTime(CLARA_TOUCH_HOLD_DELAY_MS);

    expect(tracker.getTarget()).toEqual({ active: false, x: 0, y: 0 });
    expect(observedTargets).toEqual([{ active: false, x: 0, y: 0 }]);
    unsubscribe();
  });

  it("activates after a touch swipe and resets on release", () => {
    const tracker = new ClaraInteractionTracker(window, document);
    const unsubscribe = tracker.subscribe(() => undefined);

    dispatchPointerEvent("pointerdown", {
      clientX: 500,
      clientY: 250,
      pointerType: "touch",
    });
    dispatchPointerEvent("pointermove", {
      clientX: 750,
      clientY: 125,
      pointerType: "touch",
    });
    expect(tracker.getTarget()).toEqual({ active: true, x: 0.5, y: 0.5 });

    dispatchPointerEvent("pointerup", {
      clientX: 750,
      clientY: 125,
      pointerType: "touch",
    });
    expect(tracker.getTarget()).toEqual({ active: false, x: 0, y: 0 });
    unsubscribe();
  });

  it("activates after a deliberate stationary hold", () => {
    const tracker = new ClaraInteractionTracker(window, document);
    const unsubscribe = tracker.subscribe(() => undefined);

    dispatchPointerEvent("pointerdown", {
      clientX: 750,
      clientY: 125,
      pointerType: "touch",
    });
    vi.advanceTimersByTime(CLARA_TOUCH_HOLD_DELAY_MS - 1);
    expect(tracker.getTarget().active).toBe(false);

    vi.advanceTimersByTime(1);
    expect(tracker.getTarget()).toEqual({ active: true, x: 0.5, y: 0.5 });

    dispatchPointerEvent("pointerup", { pointerType: "touch" });
    unsubscribe();
  });
});
