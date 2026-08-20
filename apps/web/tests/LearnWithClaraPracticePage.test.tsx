import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LearnWithClaraPracticePage } from "../src/features/learn-with-clara/LearnWithClaraPracticePage";

vi.mock("../src/features/intro/ClaraStage", () => ({
  ClaraStage: () => <div aria-label="Ma'am Clara" />,
}));

const learnerSession = {
  token: "cookie-session",
  learner: {
    id: 1,
    learner_code: "KW000",
    full_name: "Kristen Rhine Wright",
    first_name: "Kristen",
    account_purpose: "portal_system",
    speech_language: "en",
    school: null,
    grade_level: null,
    section: null,
    progress: {
      stage: "before_diagnostic",
      current_required_lesson_order: null,
    },
    achievement_keys: [],
  },
  session: { expires_at: "2026-07-20T12:00:00+00:00" },
};

function renderPractice(practiceKey: string, speechLanguage: "en" | "fil-PH" = "en") {
  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify({
      ...learnerSession,
      learner: { ...learnerSession.learner, speech_language: speechLanguage },
    }),
  );

  return render(
    <MemoryRouter
      initialEntries={[`/learner/learn-with-clara/practice/${practiceKey}`]}
    >
      <Routes>
        <Route
          path="/learner/learn-with-clara/practice/:practiceKey"
          element={<LearnWithClaraPracticePage />}
        />
        <Route
          path="/learner/learn-with-clara"
          element={<div>Practice menu</div>}
        />
        <Route path="/learner/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LearnWithClaraPracticePage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("builds a phrase with tap-to-arrange chips and gives feedback", () => {
    renderPractice("phrases");

    expect(screen.getByRole("heading", { name: "Phrases" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "the" }));
    fireEvent.click(screen.getByRole("button", { name: "red" }));
    fireEvent.click(screen.getByRole("button", { name: "ball" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(screen.getByRole("status")).toHaveTextContent(/that is right/i);
    expect(screen.getByRole("button", { name: /next/i })).toBeVisible();
  });

  it("checks comprehension choices and explains a wrong answer", () => {
    renderPractice("comprehension");

    fireEvent.click(screen.getByRole("button", { name: "A toy" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(screen.getByRole("status")).toHaveTextContent(/clue/i);
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  it("shows Filipino Clara guidance when Filipino is selected", () => {
    renderPractice("phrases", "fil-PH");

    expect(
      screen.getByText(
        "Sabi ni Ma'am Clara: Maglaan ng oras at gawin ang iyong makakaya.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Kaya mo iyan!")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Suriin ang sagot" }),
    ).toBeVisible();
  });
});
