import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";

import { DEFAULT_CLARA_PRESENTATION } from "../../features/intro/live2d/ClaraPresentation";
import { useOptionalTheme } from "../../features/theme/themeContext";
import {
  loadOfflineDynamicClara,
  resolveOfflineClaraMode,
} from "./offlineClaraRuntime";

import type { ClaraCanvasComponent } from "./offlineClaraRuntime";
import type { ClaraMode, ClaraSelection } from "./claraCapability";

type ClaraLoadState = "loading" | "ready" | "error";

export function OfflineClaraStage({
  savedMode,
  selection,
  loadDynamic = loadOfflineDynamicClara,
  onLoadStateChange,
  useMainUi = false,
  speaking = false,
}: {
  savedMode: ClaraMode | null;
  selection: ClaraSelection;
  loadDynamic?: () => Promise<{ default: ClaraCanvasComponent }>;
  onLoadStateChange?: (state: ClaraLoadState) => void;
  useMainUi?: boolean;
  speaking?: boolean;
}) {
  const theme = useOptionalTheme()?.theme ?? "t1";
  const allowedMode = resolveOfflineClaraMode(savedMode, selection);
  const [runtimeFailed, setRuntimeFailed] = useState(false);
  const [loadState, setLoadState] = useState<ClaraLoadState>("loading");
  const [DynamicCanvas, setDynamicCanvas] = useState<ComponentType<
    Parameters<ClaraCanvasComponent>[0]
  > | null>(null);
  const onLoadStateChangeRef = useRef(onLoadStateChange);
  onLoadStateChangeRef.current = onLoadStateChange;
  const displayedMode =
    allowedMode === "dynamic" && !runtimeFailed ? "dynamic" : "static";
  const staticSource =
    theme === "t2"
      ? "/assets/live2d/clara/stills/clara-t2.png"
      : theme === "t3"
        ? "/assets/live2d/clara/stills/clara-t3.png"
        : "/assets/live2d/clara/stills/clara-default.png";

  useEffect(() => {
    let active = true;
    if (allowedMode !== "dynamic") {
      setDynamicCanvas(null);
      setLoadState("loading");
      return () => {
        active = false;
      };
    }

    setRuntimeFailed(false);
    setLoadState("loading");
    void loadDynamic()
      .then((module) => {
        if (active) setDynamicCanvas(() => module.default);
      })
      .catch(() => {
        if (active) {
          setRuntimeFailed(true);
          setLoadState("error");
        }
      });

    return () => {
      active = false;
    };
  }, [allowedMode, loadDynamic]);

  const handleLoadState = useCallback((state: ClaraLoadState) => {
    if (state === "error") setRuntimeFailed(true);
    setLoadState(state);
    onLoadStateChangeRef.current?.(state);
  }, []);

  return (
    <figure
      className={useMainUi ? "clara-stage" : "offline-clara-stage"}
      aria-label="Ma'am Clara"
      data-clara-display-mode={displayedMode}
      data-clara-capability={selection.mode}
      data-live2d-state={loadState}
    >
      <div
        className={
          useMainUi ? "clara-stage__viewport" : "offline-clara-stage__viewport"
        }
      >
        {displayedMode === "dynamic" && DynamicCanvas ? (
          <Suspense fallback={null}>
            <DynamicCanvas
              reduceMotion={
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
              }
              presentation={{
                ...DEFAULT_CLARA_PRESENTATION,
                speaking,
                speechLevel: speaking ? 0.72 : 0,
              }}
              onStateChange={handleLoadState}
            />
          </Suspense>
        ) : displayedMode === "static" ? (
          <img
            className={
              useMainUi
                ? "clara-stage__static-image"
                : "offline-clara-stage__static-image"
            }
            src={staticSource}
            alt=""
            aria-hidden="true"
            onLoad={() => handleLoadState("ready")}
            onError={() => handleLoadState("error")}
          />
        ) : null}
      </div>
      <span
        className={
          useMainUi ? "visually-hidden" : "offline-clara-stage__status"
        }
        role="status"
      >
        {runtimeFailed
          ? "Dynamic Clara could not start. Static Clara is ready."
          : loadState === "ready"
            ? "Ma'am Clara is ready"
            : "Loading Ma'am Clara"}
      </span>
    </figure>
  );
}
