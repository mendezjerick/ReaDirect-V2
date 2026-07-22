import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LINK_START_DURATION_MS,
  LINK_START_ROUTE_SWAP_MS,
} from "../src/components/transitions/LinkStartTransition";
import { RouteTransitionProvider } from "../src/components/transitions/RouteTransitionProvider";
import { ThemeProvider } from "../src/features/theme/ThemeProvider";
import { THEME_STORAGE_KEY } from "../src/features/theme/theme";

const live2dMocks = vi.hoisted(() => ({
  setState: undefined as
    ((state: "loading" | "ready" | "error") => void) | undefined,
}));

vi.mock("../src/features/intro/live2d/ClaraLive2DCanvas", async () => {
  const { useEffect } = await import("react");

  return {
    ClaraLive2DCanvas: ({
      onStateChange,
    }: {
      onStateChange: (state: "loading" | "ready" | "error") => void;
    }) => {
      useEffect(() => {
        live2dMocks.setState = onStateChange;
        return () => {
          live2dMocks.setState = undefined;
        };
      }, [onStateChange]);

      return <canvas className="clara-stage__canvas" aria-hidden="true" />;
    },
  };
});

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
} from "../src/features/intro/introConfig";
import { IntroPage } from "../src/features/intro/IntroPage";

function renderIntro() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <ThemeProvider>
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
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("IntroPage", () => {
  afterEach(() => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    delete document.documentElement.dataset.theme;
    live2dMocks.setState = undefined;
  });

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
      expect(container.querySelector("main")).toHaveClass(
        "learner-typography-page",
      );
      const continueButton = container.querySelector<HTMLButtonElement>(
        ".intro-page__continue",
      );

      expect(
        screen.getByRole("heading", { name: "ReaDirect" }),
      ).toBeInTheDocument();
      expect(document.querySelector(".clara-stage__loader-wave")).toBeTruthy();
      expect(screen.queryByAltText("Ma'am Clara")).not.toBeInTheDocument();
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

  it("uses the model-centered CSS wave and completes its reveal", () => {
    const boundsSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(40, 100, 200, 200));
    const { container } = renderIntro();
    const stage = container.querySelector<HTMLElement>(".clara-stage");
    const loader = document.querySelector<HTMLElement>(".clara-stage__loader");
    const cover = document.querySelector<HTMLElement>(
      ".clara-stage__loader-cover",
    );

    expect(stage).toHaveAttribute("data-live2d-state", "loading");
    expect(document.querySelector(".clara-stage__loader-wave")).toBeTruthy();
    expect(cover).toBeTruthy();
    expect(loader?.style.getPropertyValue("--clara-loader-origin-x")).toBe(
      "140px",
    );
    expect(loader?.style.getPropertyValue("--clara-loader-origin-y")).toBe(
      "200px",
    );
    expect(screen.queryByAltText("Ma'am Clara")).not.toBeInTheDocument();
    expect(stage?.style.transform).not.toContain("translate");

    act(() => live2dMocks.setState?.("ready"));
    expect(stage).toHaveAttribute("data-live2d-state", "revealing");

    act(() => {
      cover!.dispatchEvent(new Event("animationend", { bubbles: true }));
    });
    expect(stage).toHaveAttribute("data-live2d-state", "ready");
    boundsSpy.mockRestore();
  });

  it("switches and persists the selected theme immediately", () => {
    renderIntro();

    const winterTheme = screen.getByRole("button", {
      name: "Use Winter theme",
    });

    expect(
      screen.getByRole("button", { name: "Use Meadow theme" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(winterTheme);

    expect(winterTheme).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("data-theme", "t2");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("t2");
    expect(document.querySelector(".clara-stage__canvas")).toBeTruthy();
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
