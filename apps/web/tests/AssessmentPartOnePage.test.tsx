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

      return <canvas aria-hidden="true" />;
    },
  };
});

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();
  return { ...motion, useReducedMotion: () => true };
});

import { AssessmentPartOnePage } from "../src/features/assessment/AssessmentPartOnePage";

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

function renderAssessment(payload: object) {
  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify(learnerSession),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );

  return render(
    <MemoryRouter initialEntries={["/learner/assessment/part-one"]}>
      <ThemeProvider>
        <Routes>
          <Route
            path="/learner/assessment/part-one"
            element={<AssessmentPartOnePage />}
          />
          <Route path="/learner/login" element={<div>Learner login</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("AssessmentPartOnePage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    live2dMocks.setState = undefined;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("opens with the real microphone orientation and waits for Clara", async () => {
    let finishSpeech: (() => void) | undefined;
    const finished = new Promise<void>((resolve) => {
      finishSpeech = resolve;
    });
    speechMocks.prepare.mockResolvedValue(new Blob(["wave"]));
    speechMocks.play.mockResolvedValue({ finished, stop: vi.fn() });
    const { container } = renderAssessment({
      run_id: 1,
      assessment_type: "diagnostic",
      stage: "orientation",
      orientation_ready: false,
      progress: null,
      item: null,
      response_committed: false,
      result: null,
    });

    expect(
      await screen.findByRole("heading", { name: "Microphone check" }),
    ).toBeInTheDocument();
    const itemPanel = container.querySelector(".assessment-item-panel");
    const recorderPanel = container.querySelector(".assessment-recorder-panel");
    expect(itemPanel).toBeTruthy();
    expect(recorderPanel).toBeTruthy();
    expect(itemPanel?.querySelector(".assessment-recorder")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Record" })
        .closest(".assessment-recorder-panel"),
    ).toBe(recorderPanel);
    expect(
      screen
        .getByRole("button", { name: "Submit" })
        .closest(".assessment-action-dock"),
    ).toBeTruthy();
    expect(
      container
        .querySelector(".assessment-clara")
        ?.closest(".assessment-action-dock"),
    ).toBeTruthy();
    expect(screen.getByText("READY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record" })).toBeDisabled();
    await waitFor(() =>
      expect(speechMocks.prepare).toHaveBeenCalledWith(
        "assessment-orientation",
        "learner-token",
      ),
    );
    await act(async () => undefined);
    expect(speechMocks.play).not.toHaveBeenCalled();

    await waitFor(() => expect(live2dMocks.setState).toBeTypeOf("function"));
    act(() => live2dMocks.setState?.("ready"));

    await act(async () => finishSpeech?.());

    expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
    expect(container.querySelector(".clara-stage")).toHaveAttribute(
      "data-clara-emotion",
      "default",
    );
  });

  it("presents the committed Part 1 result without hiding task statuses", async () => {
    speechMocks.prepare.mockResolvedValue(new Blob(["wave"]));
    speechMocks.play.mockResolvedValue({
      finished: Promise.resolve(),
      stop: vi.fn(),
    });
    renderAssessment({
      run_id: 4,
      assessment_type: "diagnostic",
      stage: "part-1-results",
      orientation_ready: true,
      progress: null,
      item: null,
      response_committed: false,
      result: {
        score: 25,
        maximum: 30,
        level: "Light Refresher",
        branch: "high",
        segments: [
          { task: "Task 1A", score: 7, maximum: 10, status: "administered" },
          { task: "Task 2A", score: 10, maximum: 10, status: "automatic" },
          { task: "Task 2B", score: 8, maximum: 10, status: "administered" },
        ],
        continues_to_part_two: true,
      },
    });

    expect(
      await screen.findByRole("heading", { name: "Part 1 Results" }),
    ).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("Light Refresher")).toBeInTheDocument();
    expect(screen.getByText("Automatic")).toBeInTheDocument();
    await waitFor(() => expect(live2dMocks.setState).toBeTypeOf("function"));
    act(() => live2dMocks.setState?.("ready"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled(),
    );
  });
});
