import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();
  return { ...motion, useReducedMotion: () => false };
});

import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { LearnerActivityHomeButton } from "../src/features/learner-activity/LearnerActivityHomeButton";

describe("LearnerActivityHomeButton", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the learner to the dashboard after its tactile commit", () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={["/learner/assessment/part-two"]}>
        <Routes>
          <Route
            path="/learner/assessment/part-two"
            element={<LearnerActivityHomeButton />}
          />
          <Route path="/learner/dashboard" element={<h1>Dashboard</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    const homeButton = screen.getByRole("button", {
      name: "Back to dashboard",
    });
    expect(homeButton).toHaveAttribute("data-press-state", "idle");

    fireEvent.click(homeButton);
    expect(homeButton).toHaveAttribute("data-press-state", "committing");
    expect(screen.queryByRole("heading", { name: "Dashboard" })).toBeNull();

    act(() => vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS));

    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });
});
