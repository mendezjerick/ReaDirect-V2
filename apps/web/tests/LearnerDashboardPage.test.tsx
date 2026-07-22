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
  prepare: vi.fn().mockResolvedValue(new Blob()),
  unlock: vi.fn(),
}));

vi.mock("../src/features/clara-audio/claraSpeech", () => ({
  prepareClaraSpeech: claraSpeechMocks.prepare,
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

function renderDashboard() {
  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify(learnerSession),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(learnerSession), {
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
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(
      screen.getByRole("listitem", {
        name: /first step: complete the diagnostic assessment/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Welcome, Kristen!")).toBeInTheDocument();
    expect(screen.getByText("KW000")).toBeInTheDocument();
  });

  it("opens the game lobby from the secondary game action", () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: /open game lobby/i }));

    expect(screen.getByText("Lobby route")).toBeInTheDocument();
  });

  it("prepares Clara and opens Lesson Intro from the primary action", () => {
    renderDashboard();

    fireEvent.click(
      screen.getByRole("button", { name: /start diagnostic assessment/i }),
    );

    expect(claraSpeechMocks.unlock).toHaveBeenCalledOnce();
    expect(claraSpeechMocks.prepare).toHaveBeenCalledWith(
      "lesson-intro",
      "learner-token",
    );
    expect(screen.getByText("Lesson intro route")).toBeInTheDocument();
  });
});
