import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  prepare: vi.fn().mockResolvedValue(new Blob()),
  unlock: vi.fn(),
}));

const activitySpeechMocks = vi.hoisted(() => ({
  prepare: vi.fn().mockResolvedValue({
    activity: "assessment-part-one",
    ready: true,
  }),
  clear: vi.fn(),
}));

vi.mock("../src/features/clara-audio/claraSpeech", () => ({
  prepareClaraSpeech: claraSpeechMocks.prepare,
  unlockClaraAudio: claraSpeechMocks.unlock,
}));

vi.mock("../src/features/clara-audio/activitySpeechReadiness", () => ({
  activitySpeechScopeForProgress: (progress: { stage: string }) =>
    progress.stage === "required_lessons" ? "lesson-1" : "assessment-part-one",
  prepareActivitySpeech: activitySpeechMocks.prepare,
  clearActivitySpeechPreparation: activitySpeechMocks.clear,
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
  const activeSession = {
    ...learnerSession,
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
      name: /start diagnostic assessment/i,
    });
    const gameAction = screen.getByRole("button", {
      name: /open game lobby/i,
    });

    expect(primaryAction).toHaveClass("learner-dashboard__primary-action");
    expect(gameAction).toHaveClass("learner-dashboard__games-action");
    expect(screen.getByText(/open your lessons/i)).toBeInTheDocument();
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

  it("prepares Clara and opens Lesson Intro from the primary action", async () => {
    renderDashboard();

    fireEvent.click(
      screen.getByRole("button", { name: /start diagnostic assessment/i }),
    );

    expect(claraSpeechMocks.unlock).toHaveBeenCalledOnce();
    expect(claraSpeechMocks.prepare).toHaveBeenCalledWith(
      "lesson-intro",
      "learner-token",
    );
    await waitFor(() =>
      expect(activitySpeechMocks.prepare).toHaveBeenCalledWith(
        "learner-token",
        "assessment-part-one",
      ),
    );
    expect(screen.getByText("Lesson intro route")).toBeInTheDocument();
  });

  it("presents the Final Assessment as the next required action", () => {
    renderDashboard("final_assessment");

    expect(
      screen.getByRole("button", { name: "Start Final Assessment" }),
    ).toBeEnabled();
    expect(screen.getByText("Your Final Assessment is ready.")).toBeVisible();
  });

  it("settles into a non-restarting state after the Reading Journey", () => {
    renderDashboard("reading_journey_complete");

    expect(
      screen.getByRole("button", { name: "Reading Journey complete" }),
    ).toBeDisabled();
    expect(
      screen.getByText("You completed all eight reading milestones."),
    ).toBeVisible();
  });
});
