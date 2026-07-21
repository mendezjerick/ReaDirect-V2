import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "../src/features/theme/ThemeProvider";

const speechMocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  play: vi.fn(),
}));

const live2dMocks = vi.hoisted(() => ({
  setState: undefined as
    ((state: "loading" | "ready" | "error") => void) | undefined,
}));

vi.mock("../src/features/clara-audio/claraSpeech", () => ({
  prepareClaraSpeech: speechMocks.prepare,
  playClaraSpeech: speechMocks.play,
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
    useReducedMotion: () => true,
  };
});

import { LessonIntroPage } from "../src/features/lesson-intro/LessonIntroPage";

const learnerSession = {
  token: "learner-token",
  learner: {
    id: 1,
    learner_code: "KW000",
    full_name: "Kristen Rhine Wright",
    first_name: "Kristen",
    account_purpose: "portal_system",
    school: null,
    grade_level: null,
    section: null,
    progress: {
      stage: "before_diagnostic",
      current_required_lesson_order: null,
    },
  },
  session: { expires_at: "2026-07-20T12:00:00+00:00" },
};

function renderLessonIntro() {
  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify(learnerSession),
  );

  return render(
    <MemoryRouter initialEntries={["/learner/lesson-intro"]}>
      <ThemeProvider>
        <Routes>
          <Route path="/learner/lesson-intro" element={<LessonIntroPage />} />
          <Route path="/learner/login" element={<div>Login route</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("LessonIntroPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    live2dMocks.setState = undefined;
    vi.clearAllMocks();
  });

  it("enables Continue only after Clara's audio finishes", async () => {
    let finishPlayback: (() => void) | undefined;
    const finished = new Promise<void>((resolve) => {
      finishPlayback = resolve;
    });
    speechMocks.prepare.mockResolvedValue(new Blob(["wave"]));
    speechMocks.play.mockResolvedValue({ finished, stop: vi.fn() });

    const { container } = renderLessonIntro();
    const continueButton = screen.getByRole("button", { name: "Continue" });

    expect(continueButton).toBeDisabled();
    expect(continueButton).toHaveClass("big-button--unavailable");
    expect(container.querySelector(".clara-stage")).toHaveAttribute(
      "data-clara-emotion",
      "happy",
    );

    await waitFor(() => expect(speechMocks.prepare).toHaveBeenCalledOnce());
    await act(async () => undefined);
    expect(speechMocks.play).not.toHaveBeenCalled();

    await waitFor(() => expect(live2dMocks.setState).toBeTypeOf("function"));
    act(() => live2dMocks.setState?.("ready"));

    await waitFor(() =>
      expect(container.querySelector(".clara-stage")).toHaveAttribute(
        "data-clara-speaking",
        "true",
      ),
    );
    expect(continueButton).toBeDisabled();
    expect(continueButton).toHaveClass("big-button--unavailable");

    await act(async () => finishPlayback?.());

    expect(continueButton).toBeEnabled();
    expect(continueButton).toHaveClass("big-button--primary");
    expect(continueButton).not.toHaveClass("big-button--unavailable");
    expect(container.querySelector(".clara-stage")).toHaveAttribute(
      "data-clara-speaking",
      "false",
    );
    expect(screen.getByText("Ready!")).toBeInTheDocument();
  });

  it("keeps Continue disabled and offers retry when speech fails", async () => {
    speechMocks.prepare.mockRejectedValue(new Error("TTS unavailable"));

    renderLessonIntro();

    expect(
      await screen.findByText("Ma'am Clara needs another try."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass(
      "big-button--unavailable",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
});
