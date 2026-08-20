import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LearnWithClaraMenuPage } from "../src/features/learn-with-clara/LearnWithClaraMenuPage";

const claraAudioMocks = vi.hoisted(() => ({
  unlock: vi.fn(),
}));

vi.mock("../src/features/clara-audio/claraSpeech", () => ({
  unlockClaraAudio: claraAudioMocks.unlock,
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

function renderMenu(authenticated = true, speechLanguage: "en" | "fil-PH" = "en") {
  if (authenticated) {
    window.sessionStorage.setItem(
      "readirect.learner-session",
      JSON.stringify({
        ...learnerSession,
        token: "cookie-session",
        learner: { ...learnerSession.learner, speech_language: speechLanguage },
      }),
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
        <Route
          path="/learner/learn-with-clara/letters"
          element={<div>Letters class route</div>}
        />
        <Route
          path="/learner/learn-with-clara/words"
          element={<div>Words class route</div>}
        />
        <Route
          path="/learner/learn-with-clara/practice/:practiceKey"
          element={<div>Practice class route</div>}
        />
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
    expect(screen.queryByLabelText("Ma'am Clara")).not.toBeInTheDocument();

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

  it("opens the Words class from the Words choice", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /^Words/ }));

    expect(claraAudioMocks.unlock).toHaveBeenCalledOnce();
    expect(screen.getByText("Words class route")).toBeInTheDocument();
  });

  it("shows Filipino Clara guidance when Filipino is selected", () => {
    renderMenu(true, "fil-PH");

    expect(
      screen.getByRole("heading", { name: "Ano ang gusto nating sanayin?" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /^Mga salita/ })).toBeVisible();
    expect(
      screen.getByText(
        "Pumili ng aralin para sa maikling klase kasama si Ma'am Clara.",
      ),
    ).toBeVisible();
  });

  it("opens the complete Letters class from the Letters choice", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /^Letters/ }));

    expect(claraAudioMocks.unlock).toHaveBeenCalledOnce();
    expect(screen.getByText("Letters class route")).toBeInTheDocument();
  });

  it.each(["Phrases", "Sentences", "Comprehension"])(
    "opens the %s practice class",
    (topic) => {
      renderMenu();

      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(`^${topic}`) }),
      );

      expect(screen.getByText("Practice class route")).toBeInTheDocument();
    },
  );

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
