import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import {
  LINK_START_DURATION_MS,
  LINK_START_ROUTE_SWAP_MS,
} from "../src/components/transitions/LinkStartTransition";
import { RouteTransitionProvider } from "../src/components/transitions/RouteTransitionProvider";

vi.mock("../src/features/intro/live2d/ClaraLive2DCanvas", () => ({
  ClaraLive2DCanvas: () => (
    <canvas className="clara-stage__canvas" aria-hidden="true" />
  ),
}));

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    useReducedMotion: () => false,
  };
});

import {
  INTRO_ACTION_COMMIT_DELAY_MS,
  INTRO_CENTER_HOLD_MS,
  INTRO_EXPRESSION_SEQUENCE,
  IntroPage,
} from "../src/features/intro/IntroPage";

function renderIntro() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <RouteTransitionProvider>
        <Routes>
          <Route path="/" element={<IntroPage />} />
          <Route
            path="/home"
            element={
              <div data-route-focus tabIndex={-1}>
                Home route
              </div>
            }
          />
        </Routes>
      </RouteTransitionProvider>
    </MemoryRouter>,
  );
}

describe("IntroPage", () => {
  it("declares the deterministic intro expression order", () => {
    expect(INTRO_EXPRESSION_SEQUENCE).toEqual([
      "default",
      "happy",
      "confused",
      "thinking",
    ]);
  });

  it("advances Clara's expression every two seconds and loops", () => {
    vi.useFakeTimers();

    try {
      const { container } = renderIntro();
      const clara = container.querySelector(".clara-stage");

      expect(clara).toHaveAttribute("data-clara-emotion", "default");

      for (const expression of ["happy", "confused", "thinking", "default"]) {
        act(() => vi.advanceTimersByTime(2000));
        expect(clara).toHaveAttribute("data-clara-emotion", expression);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("holds the centered title for two seconds before revealing the action", () => {
    vi.useFakeTimers();

    try {
      const { container, unmount } = renderIntro();
      const continueButton = container.querySelector<HTMLButtonElement>(
        ".intro-page__continue",
      );

      expect(
        screen.getByRole("heading", { name: "ReaDirect" }),
      ).toBeInTheDocument();
      expect(screen.getByAltText("Ma'am Clara")).toHaveAttribute(
        "src",
        "/assets/live2d/clara/stills/clara-default.png",
      );
      expect(continueButton).toBeDisabled();

      act(() => vi.advanceTimersByTime(INTRO_CENTER_HOLD_MS - 1));
      expect(continueButton).toBeDisabled();

      act(() => vi.advanceTimersByTime(1));
      expect(
        screen.getByRole("button", { name: "Tap to continue" }),
      ).toBeEnabled();

      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("reveals the fallback portrait only after the image loads", () => {
    const { container } = renderIntro();
    const portrait = screen.getByAltText("Ma'am Clara");
    const stage = container.querySelector<HTMLElement>(".clara-stage");

    expect(portrait).toHaveAttribute("data-load-state", "loading");
    expect(stage?.style.transform).not.toContain("translate");

    fireEvent.load(portrait);

    expect(portrait).toHaveAttribute("data-load-state", "loaded");
  });

  it("shows the press commit before continuing to the home route", () => {
    vi.useFakeTimers();

    try {
      const { unmount } = renderIntro();
      act(() => vi.advanceTimersByTime(INTRO_CENTER_HOLD_MS));

      const continueButton = screen.getByRole("button", {
        name: "Tap to continue",
      });

      fireEvent.click(continueButton);

      expect(continueButton).toBeDisabled();
      expect(continueButton).toHaveAttribute("data-press-state", "committing");
      expect(screen.queryByText("Home route")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(INTRO_ACTION_COMMIT_DELAY_MS - 1));
      expect(screen.queryByText("Home route")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(1));
      expect(
        document.querySelector('[data-route-transition="link-start"]'),
      ).toBeInTheDocument();
      expect(screen.queryByText("Home route")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(LINK_START_ROUTE_SWAP_MS - 1));
      expect(screen.queryByText("Home route")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(1));
      expect(screen.getByText("Home route")).toBeInTheDocument();
      expect(
        document.querySelector('[data-route-transition="link-start"]'),
      ).toBeInTheDocument();

      act(() =>
        vi.advanceTimersByTime(
          LINK_START_DURATION_MS - LINK_START_ROUTE_SWAP_MS,
        ),
      );
      expect(
        document.querySelector('[data-route-transition="link-start"]'),
      ).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(20));
      expect(screen.getByText("Home route")).toHaveFocus();

      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("prevents the browser copy action on the intro surface", () => {
    const { container } = renderIntro();
    const intro = container.querySelector("main");
    const event = new Event("copy", { bubbles: true, cancelable: true });

    intro?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
