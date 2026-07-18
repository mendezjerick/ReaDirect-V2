import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

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
  INTRO_EXPRESSION_SEQUENCE,
  IntroPage,
} from "../src/features/intro/IntroPage";

function renderIntro() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<IntroPage />} />
        <Route path="/home" element={<div>Home route</div>} />
      </Routes>
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

  it("introduces ReaDirect and Ma'am Clara", () => {
    renderIntro();

    expect(
      screen.getByRole("heading", { name: "ReaDirect" }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Ma'am Clara")).toHaveAttribute(
      "src",
      "/assets/live2d/clara/stills/clara-default.png",
    );
    expect(
      screen.getByRole("button", { name: "Tap to continue" }),
    ).toBeEnabled();
  });

  it("continues to the reserved home route", () => {
    renderIntro();

    fireEvent.click(screen.getByRole("button", { name: "Tap to continue" }));

    expect(screen.getByText("Home route")).toBeInTheDocument();
  });

  it("prevents the browser copy action on the intro surface", () => {
    const { container } = renderIntro();
    const intro = container.querySelector("main");
    const event = new Event("copy", { bubbles: true, cancelable: true });

    intro?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
