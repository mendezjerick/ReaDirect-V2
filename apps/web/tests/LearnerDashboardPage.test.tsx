import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    useReducedMotion: () => true,
  };
});

import { LearnerDashboardPage } from "../src/features/learner-dashboard/LearnerDashboardPage";
import { RouteTransitionProvider } from "../src/components/transitions/RouteTransitionProvider";
import { createAppQueryClient } from "../src/app/queryClient";

const claraSpeechMocks = vi.hoisted(() => ({
  unlock: vi.fn(),
}));

vi.mock("../src/features/clara-audio/claraSpeech", () => ({
  unlockClaraAudio: claraSpeechMocks.unlock,
}));

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

function renderDashboard(stage = "before_diagnostic") {
  const completedLessonCount = [
    "final_assessment",
    "reading_journey_complete",
  ].includes(stage)
    ? 6
    : 0;
  const activeSession = {
    ...learnerSession,
    reading_path: {
      diagnostic: {
        status: stage === "before_diagnostic" ? "required" : "completed",
        score: stage === "before_diagnostic" ? null : 8,
      },
      lessons: [1, 2, 3, 4, 5, 6].map((order) => ({
        order,
        status: order <= completedLessonCount ? "completed" : "not_started",
      })),
      completed_lesson_count: completedLessonCount,
      final_assessment: {
        status:
          stage === "reading_journey_complete"
            ? "completed"
            : stage === "final_assessment"
              ? "available"
              : "locked",
      },
    },
    learner: {
      ...learnerSession.learner,
      progress: {
        stage,
        current_required_lesson_order: stage === "required_lessons" ? 1 : null,
      },
    },
  };

  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify(activeSession),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(activeSession), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  const queryClient = createAppQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/learner/dashboard"]}>
        <RouteTransitionProvider>
          <Routes>
            <Route
              path="/learner/dashboard"
              element={<LearnerDashboardPage />}
            />
            <Route path="/learner/games" element={<div>Lobby route</div>} />
            <Route
              path="/learner/learn-with-clara"
              element={<div>Learn with Clara route</div>}
            />
            <Route
              path="/learner/lesson-intro"
              element={<div>Lesson intro route</div>}
            />
          </Routes>
        </RouteTransitionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LearnerDashboardPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("keeps the required learning action visually primary", () => {
    renderDashboard();

    expect(screen.getByRole("main")).toHaveClass("learner-flow-page");
    expect(
      screen.getByRole("banner", { name: "Learner summary" }).parentElement,
    ).toHaveClass(
      "surface",
      "surface--panel",
      "learner-dashboard__header-surface",
    );
    const primaryAction = screen.getByRole("button", {
      name: /open reading journey/i,
    });
    const gameAction = screen.getByRole("button", {
      name: /open game lobby/i,
    });

    expect(primaryAction).toHaveClass("learner-dashboard__primary-action");
    expect(gameAction).toHaveClass("learner-dashboard__games-action");
    expect(
      screen.getByText(/start with the diagnostic assessment/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(
      screen.getByRole("listitem", {
        name: /ready reader: complete the diagnostic assessment/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Welcome, Kristen!")).toBeInTheDocument();
    expect(screen.getByText("KW000")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /learn with ma'am clara/i }),
    ).toBeEnabled();
  });

  it("places Learn with Ma'am Clara after Games and before Achievements", () => {
    renderDashboard();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);

    expect(headings.indexOf("Games")).toBeLessThan(
      headings.indexOf("Learn with Ma'am Clara"),
    );
    expect(headings.indexOf("Learn with Ma'am Clara")).toBeLessThan(
      headings.indexOf("Achievements"),
    );
    expect(headings.indexOf("Achievements")).toBeLessThan(
      headings.indexOf("Clara appearance"),
    );
    expect(
      screen.getByRole("switch", { name: "Clara appearance: Dynamic" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("shows the selected badge details from the recessed achievement case", () => {
    renderDashboard();

    const readyReader = screen.getByRole("button", {
      name: "View Ready Reader achievement",
    });
    const wordWizard = screen.getByRole("button", {
      name: "View Word Wizard achievement",
    });

    expect(readyReader).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText("Complete the Diagnostic Assessment"),
    ).toBeVisible();

    fireEvent.click(wordWizard);

    expect(readyReader).toHaveAttribute("aria-pressed", "false");
    expect(wordWizard).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Word Wizard")).toBeVisible();
    expect(screen.getByText("Complete Lesson 2: Words")).toBeVisible();
  });

  it("opens Learn with Ma'am Clara before the diagnostic", () => {
    renderDashboard("before_diagnostic");

    const action = screen.getByRole("button", {
      name: /learn with ma'am clara/i,
    });
    expect(action).toBeEnabled();

    fireEvent.click(action);

    expect(claraSpeechMocks.unlock).toHaveBeenCalledOnce();
    expect(screen.getByText("Learn with Clara route")).toBeInTheDocument();
  });

  it("opens the game lobby from the secondary game action", () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: /open game lobby/i }));

    expect(screen.getByText("Lobby route")).toBeInTheDocument();
  });

  it("opens the Reading Journey without preparing Clara", () => {
    renderDashboard();

    fireEvent.click(
      screen.getByRole("button", { name: /open reading journey/i }),
    );

    expect(claraSpeechMocks.unlock).not.toHaveBeenCalled();
    expect(screen.getByText("Lesson intro route")).toBeInTheDocument();
  });

  it("opens the journey when the Final Assessment is available", () => {
    renderDashboard("final_assessment");

    expect(
      screen.getByRole("button", { name: "Open Reading Journey" }),
    ).toBeEnabled();
    expect(
      screen.getByText(
        "6 of 6 lessons complete. Choose any available activity.",
      ),
    ).toBeVisible();
  });

  it("keeps the completed Reading Journey available for review", () => {
    renderDashboard("reading_journey_complete");

    expect(
      screen.getByRole("button", { name: "Open Reading Journey" }),
    ).toBeEnabled();
    expect(
      screen.getByText(/you can still review your journey/i),
    ).toBeVisible();
  });
});
