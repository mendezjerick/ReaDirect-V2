import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LearnWithClaraMenuPage } from "../src/features/learn-with-clara/LearnWithClaraMenuPage";

vi.mock("../src/features/intro/ClaraStage", () => ({
  ClaraStage: () => <figure aria-label="Ma'am Clara" />,
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

function renderMenu(authenticated = true) {
  if (authenticated) {
    window.sessionStorage.setItem(
      "readirect.learner-session",
      JSON.stringify(learnerSession),
    );
  }

  return render(
    <MemoryRouter initialEntries={["/learner/learn-with-clara"]}>
      <Routes>
        <Route
          path="/learner/learn-with-clara"
          element={<LearnWithClaraMenuPage />}
        />
        <Route path="/learner/dashboard" element={<div>Dashboard route</div>} />
        <Route path="/learner/login" element={<div>Learner login route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LearnWithClaraMenuPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("presents the five short-class choices without a passage option", () => {
    renderMenu();

    expect(
      screen.getByRole("heading", { name: "What should we practice?" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Ma'am Clara")).toBeVisible();

    const choices = screen.getByRole("group", {
      name: "Reading skills",
    });
    expect(choices).toBeVisible();

    for (const name of [
      "Letters",
      "Words",
      "Phrases",
      "Sentences",
      "Comprehension",
    ]) {
      expect(
        screen.getByRole("button", { name: new RegExp(`^${name}`) }),
      ).toBeVisible();
    }

    expect(
      screen.queryByRole("button", { name: /passages?/i }),
    ).not.toBeInTheDocument();
  });

  it("marks a chosen short class without starting a session", () => {
    renderMenu();

    const words = screen.getByRole("button", { name: /^Words/ });
    fireEvent.click(words);

    expect(words).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText("Words is ready for your class with Ma'am Clara."),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "What should we practice?" }),
    ).toBeVisible();
  });

  it("returns to the learner dashboard", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: "Back to dashboard" }));

    expect(screen.getByText("Dashboard route")).toBeInTheDocument();
  });

  it("returns signed-out visitors to learner sign in", async () => {
    renderMenu(false);

    expect(await screen.findByText("Learner login route")).toBeInTheDocument();
  });
});
