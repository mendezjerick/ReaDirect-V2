import { createContext, useContext } from "react";

import type { LinkStartVariant } from "./LinkStartTransition";

export interface RouteTransitionContextValue {
  beginRouteTransition: (request: RouteTransitionRequest) => void;
  isTransitioning: boolean;
}

export interface RouteTransitionOptions {
  destination: string;
  variant?: LinkStartVariant;
}

export type RouteTransitionRequest = string | RouteTransitionOptions;

export const RouteTransitionContext =
  createContext<RouteTransitionContextValue | null>(null);

export function useRouteTransition(): RouteTransitionContextValue {
  const context = useContext(RouteTransitionContext);

  if (!context) {
    throw new Error(
      "useRouteTransition must be used inside RouteTransitionProvider.",
    );
  }

  return context;
}
