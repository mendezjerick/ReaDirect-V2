import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  WHITE_LINK_START_DURATION_MS,
  WHITE_LINK_START_ROUTE_SWAP_MS,
} from "../src/components/transitions/LinkStartTransition";
import {
  ROUTE_TRANSITION_PRESS_COMMIT_MS,
  RouteTransitionProvider,
} from "../src/components/transitions/RouteTransitionProvider";
import { useRouteTransition } from "../src/components/transitions/routeTransitionContext";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    useReducedMotion: () => false,
  };
});

function WhiteTransitionTrigger() {
  const { beginRouteTransition, isTransitioning } = useRouteTransition();

  return (
    <button
      disabled={isTransitioning}
      onClick={() =>
        beginRouteTransition({ destination: "/next", variant: "white" })
      }
    >
      Open next
    </button>
  );
}

describe("RouteTransitionProvider", () => {
  afterEach(() => vi.useRealTimers());

  it("swaps the route only after the white Link Start cover is complete", () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <RouteTransitionProvider>
          <Routes>
            <Route path="/" element={<WhiteTransitionTrigger />} />
            <Route path="/next" element={<div>Next route</div>} />
          </Routes>
        </RouteTransitionProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open next" }));
    expect(screen.queryByText("Next route")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(ROUTE_TRANSITION_PRESS_COMMIT_MS));
    expect(
      document.querySelector('[data-route-transition="link-start-white"]'),
    ).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(WHITE_LINK_START_ROUTE_SWAP_MS - 1));
    expect(screen.queryByText("Next route")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("Next route")).toBeInTheDocument();
    expect(
      document.querySelector('[data-route-transition="link-start-white"]'),
    ).toBeInTheDocument();

    act(() =>
      vi.advanceTimersByTime(
        WHITE_LINK_START_DURATION_MS - WHITE_LINK_START_ROUTE_SWAP_MS,
      ),
    );
    expect(
      document.querySelector('[data-route-transition="link-start-white"]'),
    ).not.toBeInTheDocument();
  });
});
