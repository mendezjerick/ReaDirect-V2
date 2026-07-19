import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    useReducedMotion: () => true,
  };
});

import { LearnerDashboardPage } from "../src/features/learner-dashboard/LearnerDashboardPage";

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/learner/dashboard"]}>
      <Routes>
        <Route path="/learner/dashboard" element={<LearnerDashboardPage />} />
        <Route path="/learner/games" element={<div>Lobby route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LearnerDashboardPage", () => {
  it("keeps the required learning action visually primary", () => {
    renderDashboard();

    const primaryAction = screen.getByRole("button", {
      name: /start diagnostic assessment/i,
    });
    const gameAction = screen.getByRole("button", {
      name: /open game lobby/i,
    });

    expect(primaryAction).toHaveClass("learner-dashboard__primary-action");
    expect(gameAction).toHaveClass("learner-dashboard__games-action");
    expect(screen.getByText(/unlock your lessons/i)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(
      screen.getByText("Complete the Diagnostic Assessment"),
    ).toBeInTheDocument();
  });

  it("opens the game lobby from the secondary game action", () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: /open game lobby/i }));

    expect(screen.getByText("Lobby route")).toBeInTheDocument();
  });
});
