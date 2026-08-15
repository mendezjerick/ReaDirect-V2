import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LearnWithClaraWordsPage } from "../src/features/learn-with-clara/LearnWithClaraWordsPage";
import { saveLearnerSession } from "../src/features/learner-auth/learnerApi";

vi.mock("../src/features/intro/ClaraStage", () => ({
  ClaraStage: ({
    onLoadStateChange,
  }: {
    onLoadStateChange?: (state: "loading" | "ready" | "error") => void;
  }) => {
    useEffect(() => {
      onLoadStateChange?.("ready");
    }, [onLoadStateChange]);

    return <figure aria-label="Ma'am Clara" />;
  },
}));

vi.mock("../src/features/clara-audio/claraSpeech", () => ({
  playClaraSpeech: vi.fn(
    async (_speech: Blob, onLevel: (level: number) => void) => {
      onLevel(0.4);
      return {
        finished: Promise.resolve(),
        stop: vi.fn(),
      };
    },
  ),
  prepareClaraSpeech: vi.fn(async () => new Blob(["RIFF"])),
  unlockClaraAudio: vi.fn(),
}));

const learnerSession = {
  token: "learner-token",
  learner: {
    id: 1,
    learner_code: "KW000",
    full_name: "Kristen Rhine Wright",
    first_name: "Kristen",
    account_purpose: "portal_system" as const,
    speech_language: "en" as const,
    school: null,
    grade_level: null,
    section: null,
    achievement_keys: [],
    progress: {
      stage: "before_diagnostic",
      current_required_lesson_order: null,
    },
  },
  session: { expires_at: "2026-07-20T12:00:00+00:00" },
};

describe("LearnWithClaraWordsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    document.cookie = "readirect_learner_signed_in=; Max-Age=0; Path=/";
  });

  it("runs the Clara-style Word Story from its dedicated route", async () => {
    saveLearnerSession(learnerSession);

    render(
      <MemoryRouter initialEntries={["/learner/learn-with-clara/words"]}>
        <Routes>
          <Route
            path="/learner/learn-with-clara/words"
            element={<LearnWithClaraWordsPage />}
          />
          <Route
            path="/learner/learn-with-clara"
            element={<div>Clara classes route</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Word story" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "The Word Rescue" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Ma'am Clara")).toBeVisible();
    expect(
      document.querySelectorAll(".words-class__trail-preview-stop img"),
    ).toHaveLength(0);
    expect(
      document.querySelectorAll(
        ".words-class__trail-preview-stop .word-rescue-icon",
      ),
    ).toHaveLength(5);
    expect(screen.getByText("Your word story is ready.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Start Story" }));

    await screen.findByText(
      "Listen to the story, then find the word that belongs.",
    );

    expect(
      screen.getByRole("heading", { name: "A Friend in the Sky" }),
    ).toBeVisible();
    expect(
      document.querySelector(".word-rescue-board__clue-art .word-rescue-icon"),
    ).toBeTruthy();

    const batChoice = screen.getByRole("button", { name: "Choose bat" });
    await waitFor(() => expect(batChoice).toBeDisabled());
    await waitFor(() => expect(batChoice).toBeEnabled());
    fireEvent.click(batChoice);
    expect(await screen.findByText("You rescued bat.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Next Story Moment" }),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Back to Clara classes" }),
    );

    expect(screen.getByText("Clara classes route")).toBeInTheDocument();
  });
});
