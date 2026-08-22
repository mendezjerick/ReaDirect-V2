import { useEffect, useState, type RefObject } from "react";

type ViewportSnapshot = {
  width: number;
  height: number;
  orientation: "portrait" | "landscape";
  revision: number;
  readyForLandscape: boolean;
};

function isNativeCapacitorRuntime() {
  if (typeof window === "undefined") return false;
  const capacitor = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

function readViewport(): Pick<
  ViewportSnapshot,
  "width" | "height" | "orientation"
> {
  const width = Math.max(
    1,
    Math.round(window.visualViewport?.width ?? window.innerWidth),
  );
  const height = Math.max(
    1,
    Math.round(window.visualViewport?.height ?? window.innerHeight),
  );

  return {
    width,
    height,
    orientation: width > height ? "landscape" : "portrait",
  };
}

/**
 * Owns the browser viewport lifecycle for the game runtime. The revision is
 * deliberately stable during same-orientation chrome resizing; Game One uses
 * the orientation boundary to rebuild KAPLAY with fresh logical dimensions,
 * while KAPLAY's own ResizeObserver handles CSS-only size changes.
 */
export function useGameViewportLifecycle(
  hostRef: RefObject<HTMLElement | null>,
): ViewportSnapshot {
  const [snapshot, setSnapshot] = useState<ViewportSnapshot>(() => ({
    ...readViewport(),
    revision: 0,
    readyForLandscape:
      !isNativeCapacitorRuntime() || readViewport().orientation === "landscape",
  }));
  useEffect(() => {
    let frame = 0;

    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const next = readViewport();
        setSnapshot((current) => {
          const orientationChanged = current.orientation !== next.orientation;
          if (
            current.width === next.width &&
            current.height === next.height &&
            !orientationChanged
          ) {
            return current;
          }
          return {
            ...next,
            revision: orientationChanged
              ? current.revision + 1
              : current.revision,
            readyForLandscape:
              !isNativeCapacitorRuntime() || next.orientation === "landscape",
          };
        });
      });
    };

    const media = window.matchMedia?.("(orientation: portrait)");
    const orientation = window.screen?.orientation;
    const host = hostRef.current;
    const observer =
      typeof ResizeObserver === "undefined" || !host
        ? undefined
        : new ResizeObserver(update);

    if (observer && host) observer.observe(host);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    media?.addEventListener("change", update);
    orientation?.addEventListener("change", update);
    update();

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
      media?.removeEventListener("change", update);
      orientation?.removeEventListener("change", update);
    };
  }, [hostRef]);

  return snapshot;
}
