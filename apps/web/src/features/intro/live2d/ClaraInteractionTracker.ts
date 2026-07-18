export interface ClaraLookTarget {
  active: boolean;
  x: number;
  y: number;
}

export const CLARA_TOUCH_SWIPE_THRESHOLD_PX = 12;
export const CLARA_TOUCH_HOLD_DELAY_MS = 220;

const NEUTRAL_LOOK_TARGET: ClaraLookTarget = Object.freeze({
  active: false,
  x: 0,
  y: 0,
});

type TargetListener = (target: ClaraLookTarget) => void;

interface TouchGesture {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  active: boolean;
}

function clampSignedUnit(value: number) {
  return Math.min(1, Math.max(-1, value));
}

export function normalizeClaraViewportPoint(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
): ClaraLookTarget {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight);

  return {
    active: true,
    x: clampSignedUnit((clientX / safeWidth) * 2 - 1),
    y: clampSignedUnit(1 - (clientY / safeHeight) * 2),
  };
}

export class ClaraInteractionTracker {
  private readonly listeners = new Set<TargetListener>();
  private target = NEUTRAL_LOOK_TARGET;
  private touchGesture: TouchGesture | null = null;
  private touchHoldTimer: number | null = null;
  private listening = false;

  public constructor(
    private readonly hostWindow: Window,
    private readonly hostDocument: Document,
  ) {}

  public subscribe(listener: TargetListener) {
    this.listeners.add(listener);
    if (!this.listening) {
      this.startListening();
    }
    listener(this.target);

    let subscribed = true;
    return () => {
      if (!subscribed) {
        return;
      }

      subscribed = false;
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopListening();
      }
    };
  }

  public getTarget() {
    return this.target;
  }

  private getViewportSize() {
    return {
      width:
        this.hostDocument.documentElement.clientWidth ||
        this.hostWindow.innerWidth,
      height:
        this.hostDocument.documentElement.clientHeight ||
        this.hostWindow.innerHeight,
    };
  }

  private updateFromViewportPoint(clientX: number, clientY: number) {
    const viewport = this.getViewportSize();
    this.setTarget(
      normalizeClaraViewportPoint(
        clientX,
        clientY,
        viewport.width,
        viewport.height,
      ),
    );
  }

  private setTarget(target: ClaraLookTarget) {
    if (
      target.active === this.target.active &&
      target.x === this.target.x &&
      target.y === this.target.y
    ) {
      return;
    }

    this.target = target;
    for (const listener of this.listeners) {
      listener(target);
    }
  }

  private resetTarget = () => {
    this.setTarget(NEUTRAL_LOOK_TARGET);
  };

  private clearTouchHoldTimer() {
    if (this.touchHoldTimer === null) {
      return;
    }

    this.hostWindow.clearTimeout(this.touchHoldTimer);
    this.touchHoldTimer = null;
  }

  private finishTouchGesture(pointerId?: number) {
    const gesture = this.touchGesture;
    if (
      !gesture ||
      (pointerId !== undefined && gesture.pointerId !== pointerId)
    ) {
      return;
    }

    this.clearTouchHoldTimer();
    this.touchGesture = null;
    if (gesture.active) {
      this.resetTarget();
    }
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "touch" || !event.isPrimary) {
      return;
    }

    this.finishTouchGesture();
    this.touchGesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      active: false,
    };
    this.touchHoldTimer = this.hostWindow.setTimeout(() => {
      const gesture = this.touchGesture;
      if (!gesture || gesture.pointerId !== event.pointerId || gesture.active) {
        return;
      }

      gesture.active = true;
      this.touchHoldTimer = null;
      this.updateFromViewportPoint(gesture.currentX, gesture.currentY);
    }, CLARA_TOUCH_HOLD_DELAY_MS);
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "touch") {
      this.updateFromViewportPoint(event.clientX, event.clientY);
      return;
    }

    const gesture = this.touchGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    gesture.currentX = event.clientX;
    gesture.currentY = event.clientY;
    if (!gesture.active) {
      const movement = Math.hypot(
        gesture.currentX - gesture.startX,
        gesture.currentY - gesture.startY,
      );
      if (movement < CLARA_TOUCH_SWIPE_THRESHOLD_PX) {
        return;
      }

      gesture.active = true;
      this.clearTouchHoldTimer();
    }

    this.updateFromViewportPoint(gesture.currentX, gesture.currentY);
  };

  private handlePointerEnd = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      this.finishTouchGesture(event.pointerId);
    }
  };

  private handlePointerOut = (event: PointerEvent) => {
    if (event.pointerType !== "touch" && event.relatedTarget === null) {
      this.resetTarget();
    }
  };

  private handleVisibilityChange = () => {
    if (this.hostDocument.hidden) {
      this.finishTouchGesture();
      this.resetTarget();
    }
  };

  private startListening() {
    this.listening = true;
    this.hostWindow.addEventListener("pointerdown", this.handlePointerDown, {
      passive: true,
    });
    this.hostWindow.addEventListener("pointermove", this.handlePointerMove, {
      passive: true,
    });
    this.hostWindow.addEventListener("pointerup", this.handlePointerEnd, {
      passive: true,
    });
    this.hostWindow.addEventListener("pointercancel", this.handlePointerEnd, {
      passive: true,
    });
    this.hostWindow.addEventListener("pointerout", this.handlePointerOut, {
      passive: true,
    });
    this.hostWindow.addEventListener("blur", this.resetTarget);
    this.hostDocument.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }

  private stopListening() {
    this.listening = false;
    this.finishTouchGesture();
    this.resetTarget();
    this.hostWindow.removeEventListener("pointerdown", this.handlePointerDown);
    this.hostWindow.removeEventListener("pointermove", this.handlePointerMove);
    this.hostWindow.removeEventListener("pointerup", this.handlePointerEnd);
    this.hostWindow.removeEventListener("pointercancel", this.handlePointerEnd);
    this.hostWindow.removeEventListener("pointerout", this.handlePointerOut);
    this.hostWindow.removeEventListener("blur", this.resetTarget);
    this.hostDocument.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }
}

let sharedTracker: ClaraInteractionTracker | null = null;

export function getClaraInteractionTracker() {
  sharedTracker ??= new ClaraInteractionTracker(window, document);
  return sharedTracker;
}
