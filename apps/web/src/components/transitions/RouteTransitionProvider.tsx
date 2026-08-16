import { useReducedMotion } from "motion/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  LINK_START_DURATION_MS,
  LINK_START_ROUTE_SWAP_MS,
  CLARA_LINK_START_DURATION_MS,
  CLARA_LINK_START_ROUTE_SWAP_MS,
  WHITE_LINK_START_DURATION_MS,
  WHITE_LINK_START_ROUTE_SWAP_MS,
  LinkStartTransition,
  type LinkStartVariant,
} from "./LinkStartTransition";
import {
  RouteTransitionContext,
  type RouteTransitionContextValue,
  type RouteTransitionRequest,
} from "./routeTransitionContext";

export const ROUTE_TRANSITION_PRESS_COMMIT_MS = 180;

type RouteTransitionState = "idle" | "committing" | "running";

interface RouteTransitionProviderProps {
  children: ReactNode;
}

export function RouteTransitionProvider({
  children,
}: RouteTransitionProviderProps) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [transitionState, setTransitionState] =
    useState<RouteTransitionState>("idle");
  const [transitionVariant, setTransitionVariant] =
    useState<LinkStartVariant>("full");
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
    (request: RouteTransitionRequest) => {
      if (transitionStateRef.current !== "idle") {
        return;
      }

      const destination =
        typeof request === "string" ? request : request.destination;
      const variant =
        typeof request === "string" ? "full" : (request.variant ?? "full");
      const routeSwapMs =
        variant === "clara"
          ? CLARA_LINK_START_ROUTE_SWAP_MS
          : variant === "white"
          ? WHITE_LINK_START_ROUTE_SWAP_MS
          : LINK_START_ROUTE_SWAP_MS;
      const durationMs =
        variant === "clara"
          ? CLARA_LINK_START_DURATION_MS
          : variant === "white"
          ? WHITE_LINK_START_DURATION_MS
          : LINK_START_DURATION_MS;

      if (reduceMotion) {
        navigate(destination);
        return;
      }

      transitionStateRef.current = "committing";
      setTransitionVariant(variant);
      setTransitionState("committing");

      const commitTimer = window.setTimeout(() => {
        transitionStateRef.current = "running";
        setTransitionState("running");

        const navigationTimer = window.setTimeout(
          () => navigate(destination),
          routeSwapMs,
        );
        const completionTimer = window.setTimeout(finishTransition, durationMs);

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
      {transitionState === "running" ? (
        <LinkStartTransition variant={transitionVariant} />
      ) : null}
    </RouteTransitionContext.Provider>
  );
}
