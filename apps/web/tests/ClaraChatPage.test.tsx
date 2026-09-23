import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "../src/features/theme/ThemeProvider";

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
    <ThemeProvider>
      <MemoryRouter initialEntries={["/learner/learn-with-clara/chat"]}>
        <Routes>
          <Route
            path="/learner/learn-with-clara/chat"
            element={<ClaraChatPage />}
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("ClaraChatPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders Clara with only the typed composer", () => {
    renderChat();

    expect(screen.getByRole("heading", { name: "Clara Chat" })).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Choose a theme" }),
    ).toBeVisible();
    expect(screen.getByTestId("clara-stage")).toBeVisible();
    expect(
      screen.getByPlaceholderText("Type a letter or reading word..."),
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Suggested prompts"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Clara conversation"),
    ).not.toBeInTheDocument();
  });

  it("resolves a letter prompt to the existing letter demo speech key", async () => {
    renderChat();

    const input = screen.getByLabelText("Type a letter or reading word");
    fireEvent.change(input, { target: { value: "A" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(speechMocks.prepare).toHaveBeenCalledWith(
        "lesson-1-letter-demo-A",
        "cookie-session",
        { language: "en" },
      ),
    );
    await waitFor(() => expect(speechMocks.play).toHaveBeenCalled());
  });

  it("resolves a typed word to the existing word demo speech key", async () => {
    renderChat();

    const input = screen.getByLabelText("Type a letter or reading word");
    fireEvent.change(input, { target: { value: "dog" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(speechMocks.prepare).toHaveBeenCalledWith(
        "lesson-2-word-demo-dog",
        "cookie-session",
        { language: "en" },
      ),
    );
  });

  it("uses the existing technical retry voice line for unknown text", async () => {
    renderChat();

    const input = screen.getByLabelText("Type a letter or reading word");
    fireEvent.change(input, { target: { value: "zzzz" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(speechMocks.prepare).toHaveBeenCalledWith(
        "lesson-2-technical-retry",
        "cookie-session",
        { language: "en" },
      ),
    );
  });
});
