import { useReducedMotion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  LINK_START_DURATION_MS,
  LINK_START_ROUTE_SWAP_MS,
  LinkStartTransition,
} from "./LinkStartTransition";

export const ROUTE_TRANSITION_PRESS_COMMIT_MS = 180;

type RouteTransitionState = "idle" | "committing" | "running";

interface RouteTransitionContextValue {
  beginRouteTransition: (destination: string) => void;
  isTransitioning: boolean;
}

interface RouteTransitionProviderProps {
  children: ReactNode;
}

const RouteTransitionContext =
  createContext<RouteTransitionContextValue | null>(null);

export function RouteTransitionProvider({
  children,
}: RouteTransitionProviderProps) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [transitionState, setTransitionState] =
    useState<RouteTransitionState>("idle");
  const transitionStateRef = useRef<RouteTransitionState>("idle");
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }

    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const finishTransition = useCallback(() => {
    clearTimers();
    transitionStateRef.current = "idle";
    setTransitionState("idle");

    const focusRoute = () => {
      const focusTarget =
        document.querySelector<HTMLElement>("[data-route-focus]");
      focusTarget?.focus({ preventScroll: true });
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(focusRoute);
    } else {
      window.setTimeout(focusRoute, 0);
    }
  }, [clearTimers]);

  const beginRouteTransition = useCallback(
    (destination: string) => {
      if (transitionStateRef.current !== "idle") {
        return;
      }

      if (reduceMotion) {
        navigate(destination);
        return;
      }

      transitionStateRef.current = "committing";
      setTransitionState("committing");

      const commitTimer = window.setTimeout(() => {
        transitionStateRef.current = "running";
        setTransitionState("running");

        const navigationTimer = window.setTimeout(
          () => navigate(destination),
          LINK_START_ROUTE_SWAP_MS,
        );
        const completionTimer = window.setTimeout(
          finishTransition,
          LINK_START_DURATION_MS,
        );

        timersRef.current.push(navigationTimer, completionTimer);
      }, ROUTE_TRANSITION_PRESS_COMMIT_MS);

      timersRef.current.push(commitTimer);
    },
    [finishTransition, navigate, reduceMotion],
  );

  const contextValue = useMemo<RouteTransitionContextValue>(
    () => ({
      beginRouteTransition,
      isTransitioning: transitionState !== "idle",
    }),
    [beginRouteTransition, transitionState],
  );

  return (
    <RouteTransitionContext.Provider value={contextValue}>
      {children}
      {transitionState === "running" ? <LinkStartTransition /> : null}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition(): RouteTransitionContextValue {
  const context = useContext(RouteTransitionContext);

  if (!context) {
    throw new Error(
      "useRouteTransition must be used inside RouteTransitionProvider.",
    );
  }

  return context;
}
