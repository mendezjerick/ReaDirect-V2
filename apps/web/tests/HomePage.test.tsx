import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    useReducedMotion: () => false,
  };
});

import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { HomePage } from "../src/features/home/HomePage";
import { ThemeProvider } from "../src/features/theme/ThemeProvider";

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <ThemeProvider>
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route
            path="/learner/login"
            element={<div>Learner login route</div>}
          />
          <Route path="/staff/login" element={<div>Staff login route</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  it("keeps the home hierarchy to one primary and one quiet action", () => {
    renderHome();

    expect(screen.getByRole("main")).toHaveClass("learner-flow-page");
    const actions = screen.getByRole("region", { name: "Home actions" });
    const buttons = within(actions).getAllByRole("button");

    expect(buttons).toHaveLength(2);
    expect(
      within(actions).getByRole("button", { name: "Let's Read!" }),
    ).toHaveClass("home-page__read-button");
    expect(
      within(actions).getByRole("button", { name: "Staff login" }),
    ).toHaveClass("home-page__staff-button");
    expect(within(actions).queryByRole("link")).not.toBeInTheDocument();
  });

  it("opens the supplied About ReaDirect content from the bottom action", () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "About ReaDirect" }));

    const dialog = screen.getByRole("dialog", { name: "About ReaDirect" });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByText("Mission")).toBeVisible();
    expect(within(dialog).getByText("Vision")).toBeVisible();
    expect(within(dialog).getByText("Jerick E. Mendez")).toBeVisible();
    expect(
      within(dialog).getByAltText("Nick Narry S. Mendoza"),
    ).toHaveAttribute("src", "/assets/profile/nick.png");
    expect(
      within(dialog).getByRole("link", { name: "View credits and licences" }),
    ).toHaveAttribute("href", "/credits-licenses");

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Close About ReaDirect",
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the staff button press before opening staff login", () => {
    vi.useFakeTimers();

    try {
      renderHome();
      const staffButton = screen.getByRole("button", { name: "Staff login" });

      fireEvent.click(staffButton);

      expect(staffButton).toBeDisabled();
      expect(staffButton).toHaveAttribute("data-press-state", "committing");
      expect(screen.queryByText("Staff login route")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS - 1));
      expect(screen.queryByText("Staff login route")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(1));
      expect(screen.getByText("Staff login route")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the primary button press before opening learner login", () => {
    vi.useFakeTimers();

    try {
      renderHome();
      const readButton = screen.getByRole("button", { name: "Let's Read!" });

      fireEvent.click(readButton);

      expect(readButton).toBeDisabled();
      expect(screen.queryByText("Learner login route")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS));
      expect(screen.getByText("Learner login route")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
