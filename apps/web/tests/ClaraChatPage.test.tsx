import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const speechMocks = vi.hoisted(() => ({
  prepare: vi.fn(() => Promise.resolve(new Blob(["audio"]))),
  play: vi.fn(async () => ({
    finished: Promise.resolve(),
    stop: vi.fn(),
  })),
  stopAll: vi.fn(),
  unlock: vi.fn(),
}));

vi.mock("../src/features/clara-audio/claraSpeech", () => ({
  playClaraSpeech: speechMocks.play,
  prepareClaraSpeech: speechMocks.prepare,
  stopAllClaraSpeech: speechMocks.stopAll,
  unlockClaraAudio: speechMocks.unlock,
}));

vi.mock("../src/features/intro/ClaraStage", () => ({
  ClaraStage: ({
    onLoadStateChange,
  }: {
    onLoadStateChange?: (state: "loading" | "ready" | "error") => void;
  }) => {
    useEffect(() => {
      onLoadStateChange?.("ready");
    }, [onLoadStateChange]);
    return <div data-testid="clara-stage" />;
  },
}));

import { ClaraChatPage } from "../src/features/clara-chat/ClaraChatPage";

const learnerSession = {
  token: "cookie-session",
  learner: {
    id: 1,
    learner_code: "KW000",
    first_name: "Kristen",
    full_name: "Kristen Rhine Wright",
    account_purpose: "portal_system",
    speech_language: "en",
    school: null,
    grade_level: null,
    section: null,
    progress: {
      stage: "before_diagnostic",
      current_required_lesson_order: null,
    },
  },
  reading_path: {
    diagnostic: { status: "required", score: null },
    lessons: [1, 2, 3, 4, 5, 6].map((order) => ({
      order,
      status: "not_started",
    })),
    completed_lesson_count: 0,
    final_assessment: { status: "locked" },
  },
  session: { expires_at: "2026-12-31T00:00:00Z" },
};

function renderChat() {
  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify(learnerSession),
  );

  return render(
    <MemoryRouter initialEntries={["/learner/learn-with-clara/chat"]}>
      <Routes>
        <Route
          path="/learner/learn-with-clara/chat"
          element={<ClaraChatPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ClaraChatPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("renders Clara with deterministic prompt strips and a typed composer", () => {
    renderChat();

    expect(screen.getByRole("heading", { name: "Clara Chat" })).toBeVisible();
    expect(screen.getByTestId("clara-stage")).toBeVisible();
    expect(
      screen.getByPlaceholderText("Type a letter or reading word..."),
    ).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Show A" })).toHaveLength(1);
  });

  it("resolves a letter prompt to the existing letter demo speech key", async () => {
    renderChat();

    fireEvent.click(screen.getByRole("button", { name: "Show A" }));

    expect(
      screen.getByText("This is A. Say the letter name with me."),
    ).toBeVisible();
    await waitFor(() =>
      expect(speechMocks.prepare).toHaveBeenCalledWith(
        "lesson-1-letter-demo-A",
        "cookie-session",
        { language: "en" },
      ),
    );
  });

  it("resolves a typed word to the existing word demo speech key", async () => {
    renderChat();

    const input = screen.getByLabelText("Type a letter or reading word");
    fireEvent.change(input, { target: { value: "dog" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    expect(
      screen.getByText("Let’s read “dog” together. Say the whole word."),
    ).toBeVisible();
    await waitFor(() =>
      expect(speechMocks.prepare).toHaveBeenCalledWith(
        "lesson-2-word-demo-dog",
        "cookie-session",
        { language: "en" },
      ),
    );
  });
});
