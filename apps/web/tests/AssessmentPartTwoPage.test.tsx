import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "../src/features/theme/ThemeProvider";

const speechMocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  play: vi.fn(),
}));

const live2dMocks = vi.hoisted(() => ({
  setState: undefined as
    | ((state: "loading" | "ready" | "error") => void)
    | undefined,
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

import { AssessmentPartTwoPage } from "../src/features/assessment/AssessmentPartTwoPage";

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
  session: { expires_at: "2026-07-22T13:00:00+00:00" },
};

function state(overrides: Record<string, unknown> = {}) {
  return {
    run_id: 12,
    assessment_type: "diagnostic",
    stage: "story-selection",
    selected_story_key: null,
    progress: null,
    story_choices: [
      { story_key: "lena-park", title: "Lena at the Park" },
      { story_key: "rosa-garden", title: "Rosa in the Garden" },
    ],
    item: null,
    result: null,
    completion: null,
    ...overrides,
  };
}

function renderPartTwo(responses: object[]) {
  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify(learnerSession),
  );
  let responseIndex = 0;
  const fetchMock = vi.fn().mockImplementation(() =>
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
  );
  vi.stubGlobal("fetch", fetchMock);

  render(
    <MemoryRouter initialEntries={["/learner/assessment/part-two"]}>
      <ThemeProvider>
        <Routes>
          <Route
            path="/learner/assessment/part-two"
            element={<AssessmentPartTwoPage />}
          />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );

  return fetchMock;
}

async function readyClara() {
  await waitFor(() => expect(live2dMocks.setState).toBeTypeOf("function"));
  act(() => live2dMocks.setState?.("ready"));
}

describe("AssessmentPartTwoPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    live2dMocks.setState = undefined;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("persists one story choice before opening passage reading", async () => {
    speechMocks.prepare.mockResolvedValue(new Blob(["wave"]));
    speechMocks.play.mockResolvedValue({
      finished: Promise.resolve(),
      stop: vi.fn(),
    });
    const fetchMock = renderPartTwo([
      state(),
      state({
        stage: "task-3a",
        selected_story_key: "lena-park",
        story_choices: [],
        progress: { current: 1, total: 1, completed: 0 },
        item: {
          item_key: "task3a-lena",
          kind: "passage",
          title: "Lena at the Park",
          display_text: "Lena at the Park",
          authored_pages: ["Lena goes to the park on Sunday."],
          time_limit_seconds: 60,
        },
      }),
    ]);

    expect(
      await screen.findByRole("heading", { name: "Choose your story" }),
    ).toBeVisible();
    await readyClara();
    await waitFor(() =>
      expect(
        screen.getByRole("radio", { name: /Lena at the Park/i }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("radio", { name: /Lena at the Park/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/learners/assessments/part-two/12/story",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ story_key: "lena-park" }),
        }),
      ),
    );
    expect(
      await screen.findByRole("heading", { name: "Read the passage" }),
    ).toBeVisible();
  });

  it("submits a four-choice answer and advances without a Next button", async () => {
    speechMocks.prepare.mockResolvedValue(new Blob(["wave"]));
    speechMocks.play.mockResolvedValue({
      finished: Promise.resolve(),
      stop: vi.fn(),
    });
    const questionItem = {
      item_key: "task3b-lena-who",
      kind: "comprehension",
      question_type: "who",
      question_text: "Who goes to the park?",
      choices: [
        { key: "a", text: "Lena" },
        { key: "b", text: "Rosa" },
        { key: "c", text: "Mila" },
        { key: "d", text: "Nina" },
      ],
    };
    const question = state({
      stage: "task-3b",
      selected_story_key: "lena-park",
      story_choices: [],
      progress: { current: 1, total: 5, completed: 0 },
      item: questionItem,
    });
    const nextQuestion = state({
      stage: "task-3b",
      selected_story_key: "lena-park",
      story_choices: [],
      progress: { current: 2, total: 5, completed: 1 },
      item: {
        ...questionItem,
        item_key: "task3b-lena-what",
        question_type: "what",
        question_text: "What does Lena take?",
      },
    });
    const fetchMock = renderPartTwo([question, nextQuestion]);

    expect(await screen.findByText("Who goes to the park?")).toBeVisible();
    await readyClara();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Lena/i })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Lena/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/learners/assessments/part-two/12/comprehension",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            item_key: "task3b-lena-who",
            choice: "a",
          }),
        }),
      ),
    );
    expect(await screen.findByText("What does Lena take?")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });
});
