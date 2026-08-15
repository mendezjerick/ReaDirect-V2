import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

vi.mock("../src/features/clara-audio/useActivitySpeechPreparation", () => ({
  useActivitySpeechPreparation: () => ({
    status: "ready",
    manifest: null,
    readiness: null,
    error: "",
    retry: vi.fn(),
    runtimeRequired: false,
    showRuntimeLoader: false,
  }),
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

function renderAssessment(payload: object, followUpPayloads: object[] = []) {
  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify({ ...learnerSession, token: "cookie-session" }),
  );
  const responses = [payload, ...followUpPayloads];
  let responseIndex = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            responses[Math.min(responseIndex++, responses.length - 1)],
          ),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
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
        "cookie-session",
      ),
    );
    await act(async () => undefined);
    expect(speechMocks.play).not.toHaveBeenCalled();
    expect(document.querySelector(".clara-speech-loader")).toBeNull();

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

  it("does not expose a Next action for a committed assessment item", async () => {
    speechMocks.prepare.mockResolvedValue(new Blob(["wave"]));
    speechMocks.play.mockResolvedValue({
      finished: Promise.resolve(),
      stop: vi.fn(),
    });
    const { container } = renderAssessment({
      run_id: 6,
      assessment_type: "diagnostic",
      stage: "task-1a",
      orientation_ready: true,
      progress: { current: 1, total: 10, completed: 1 },
      item: {
        item_key: "task1a-a",
        display_text: "A a",
        uppercase_form: "A",
        lowercase_form: "a",
      },
      response_committed: true,
      result: null,
    });

    await screen.findByRole("heading", { name: "Letters" });
    expect(container.querySelector(".assessment-item")).toHaveAttribute(
      "data-response-state",
      "committed",
    );
    expect(container.querySelectorAll(".assessment-letter-tile")).toHaveLength(
      2,
    );
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(
      container.querySelector(".assessment-action-slot"),
    ).not.toHaveAttribute("data-assessment-action-split");
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();
  });

  it("persists Skip and advances directly without revealing Next", async () => {
    speechMocks.prepare.mockResolvedValue(new Blob(["wave"]));
    speechMocks.play.mockResolvedValue({
      finished: Promise.resolve(),
      stop: vi.fn(),
    });
    const activeItem = {
      run_id: 7,
      assessment_type: "diagnostic",
      stage: "task-1a",
      orientation_ready: true,
      progress: { current: 1, total: 10, completed: 0 },
      item: {
        item_key: "task1a-a",
        display_text: "A a",
        uppercase_form: "A",
        lowercase_form: "a",
      },
      response_committed: false,
      result: null,
    };
    const { container } = renderAssessment(activeItem, [
      {
        ...activeItem,
        progress: { current: 2, total: 10, completed: 1 },
        item: {
          item_key: "task1a-b",
          display_text: "B b",
          uppercase_form: "B",
          lowercase_form: "b",
        },
      },
    ]);

    expect(
      await screen.findByRole("heading", { name: "Letters" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(live2dMocks.setState).toBeTypeOf("function"));
    act(() => live2dMocks.setState?.("ready"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Skip" })).toBeEnabled(),
    );
    await waitFor(() =>
      expect(speechMocks.prepare).toHaveBeenCalledWith(
        "assessment-letters-item-2",
        "cookie-session",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/learners/assessments/part-one/7/skip",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ item_key: "task1a-a" }),
        }),
      ),
    );
    await waitFor(() =>
      expect(
        container.querySelector(".assessment-item__prompt strong"),
      ).toHaveAttribute("aria-label", "B b"),
    );
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Skip" })).toBeEnabled(),
    );
    expect(document.querySelector(".clara-speech-loader")).toBeNull();
    expect(
      speechMocks.prepare.mock.calls.filter(
        ([key]) => key === "assessment-letters-item-2",
      ),
    ).toHaveLength(1);
  });

  it("shows the Clara voice loader when a fast Skip overtakes prefetch", async () => {
    let finishPrefetch: ((speech: Blob) => void) | undefined;
    let finishSkip: ((response: Response) => void) | undefined;
    const pendingPrefetch = new Promise<Blob>((resolve) => {
      finishPrefetch = resolve;
    });
    const pendingSkip = new Promise<Response>((resolve) => {
      finishSkip = resolve;
    });
    const activeItem = {
      run_id: 8,
      assessment_type: "diagnostic",
      stage: "task-1a",
      orientation_ready: true,
      progress: { current: 1, total: 10, completed: 0 },
      item: {
        item_key: "task1a-a",
        display_text: "A a",
        uppercase_form: "A",
        lowercase_form: "a",
      },
      response_committed: false,
      result: null,
    };
    const nextItem = {
      ...activeItem,
      progress: { current: 2, total: 10, completed: 1 },
      item: {
        item_key: "task1a-b",
        display_text: "B b",
        uppercase_form: "B",
        lowercase_form: "b",
      },
    };

    speechMocks.prepare.mockImplementation((key: string) =>
      key === "assessment-letters-item-2"
        ? pendingPrefetch
        : Promise.resolve(new Blob(["wave"])),
    );
    speechMocks.play.mockResolvedValue({
      finished: Promise.resolve(),
      stop: vi.fn(),
    });
    window.sessionStorage.setItem(
      "readirect.learner-session",
      JSON.stringify({ ...learnerSession, token: "cookie-session" }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: string | URL | Request) =>
        String(input).endsWith("/skip")
          ? pendingSkip
          : Promise.resolve(
              new Response(JSON.stringify(activeItem), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }),
            ),
      ),
    );

    render(
      <MemoryRouter initialEntries={["/learner/assessment/part-one"]}>
        <ThemeProvider>
          <Routes>
            <Route
              path="/learner/assessment/part-one"
              element={<AssessmentPartOnePage />}
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "Letters" });
    await waitFor(() => expect(live2dMocks.setState).toBeTypeOf("function"));
    act(() => live2dMocks.setState?.("ready"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Skip" })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(
      await screen.findByRole("status", {
        name: "Preparing Ma'am Clara's voice",
      }),
    ).toBeInTheDocument();

    await act(async () => {
      finishPrefetch?.(new Blob(["next-wave"]));
      finishSkip?.(
        new Response(JSON.stringify(nextItem), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    await waitFor(() =>
      expect(
        screen.queryByRole("status", {
          name: "Preparing Ma'am Clara's voice",
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it("advances rhyme choices immediately after Submit without showing Next", async () => {
    speechMocks.prepare.mockResolvedValue(new Blob(["wave"]));
    speechMocks.play.mockResolvedValue({
      finished: Promise.resolve(),
      stop: vi.fn(),
    });
    const activeRhyme = {
      run_id: 9,
      assessment_type: "diagnostic",
      stage: "task-2a",
      orientation_ready: true,
      progress: { current: 1, total: 10, completed: 0 },
      item: {
        item_key: "task2a-cat-hat",
        word_one: "cat",
        word_two: "hat",
      },
      response_committed: false,
      result: null,
    };
    const { container } = renderAssessment(activeRhyme, [
      {
        ...activeRhyme,
        progress: { current: 2, total: 10, completed: 1 },
        item: {
          item_key: "task2a-sun-fan",
          word_one: "sun",
          word_two: "fan",
        },
      },
    ]);

    expect(
      await screen.findByRole("heading", { name: "Rhyme check" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(live2dMocks.setState).toBeTypeOf("function"));
    act(() => live2dMocks.setState?.("ready"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "yes" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "yes" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/learners/assessments/part-one/9/rhyme",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            item_key: "task2a-cat-hat",
            choice: "yes",
          }),
        }),
      ),
    );
    await waitFor(() =>
      expect(
        container.querySelector(".assessment-rhyme__words"),
      ).toHaveTextContent("sunfan"),
    );
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("assembles Task 2B words as one neutral animated item", async () => {
    speechMocks.prepare.mockResolvedValue(new Blob(["wave"]));
    speechMocks.play.mockResolvedValue({
      finished: Promise.resolve(),
      stop: vi.fn(),
    });
    const { container } = renderAssessment({
      run_id: 8,
      assessment_type: "diagnostic",
      stage: "task-2b",
      orientation_ready: true,
      progress: { current: 3, total: 10, completed: 2 },
      item: {
        item_key: "task2b-cat",
        display_text: "cat",
      },
      response_committed: false,
      result: null,
    });

    expect(
      await screen.findByRole("heading", { name: "Words" }),
    ).toBeInTheDocument();
    const assembly = container.querySelector(".assessment-word-assembly");
    expect(assembly).toHaveAttribute("aria-label", "cat");
    expect(assembly?.querySelectorAll("span")).toHaveLength(3);
    expect(container.querySelector(".assessment-item")).toHaveAttribute(
      "data-response-state",
      "active",
    );
  });
});
