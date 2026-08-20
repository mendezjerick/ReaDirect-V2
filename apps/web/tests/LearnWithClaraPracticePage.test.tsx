import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LearnWithClaraPracticePage } from "../src/features/learn-with-clara/LearnWithClaraPracticePage";

const speechMocks = vi.hoisted(() => ({
  prepare: vi.fn(async () => new Blob(["RIFF"])),
  play: vi.fn(async (_speech: Blob, onLevel: (level: number) => void) => {
    onLevel(0.4);
    return { finished: Promise.resolve(), stop: vi.fn() };
  }),
  unlock: vi.fn(),
}));

vi.mock("../src/features/clara-audio/claraSpeech", () => ({
  prepareClaraSpeech: speechMocks.prepare,
  playClaraSpeech: speechMocks.play,
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

    return <div aria-label="Ma'am Clara" />;
  },
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

function renderPractice(
  practiceKey: string,
  speechLanguage: "en" | "fil-PH" = "en",
) {
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
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("automatically narrates a phrase, supports replay, and gives feedback", async () => {
    const { container } = renderPractice("phrases");

    expect(screen.getByRole("heading", { name: "Phrases" })).toBeVisible();
    expect(screen.getByRole("main")).toHaveClass(
      "letters-class",
      "clara-practice",
    );
    expect(
      screen.getByRole("button", { name: "Back to practice menu" }),
    ).toHaveClass("letters-class__back");

    const workspace = container.querySelector(".letters-class__workspace");
    expect(workspace?.children[0]).toHaveClass("letters-class__teacher");
    expect(workspace?.children[1]).toHaveClass("letters-class__lesson");
    expect(
      container
        .querySelector(".clara-practice__actions")
        ?.closest(".letters-class__coaching"),
    ).not.toBeNull();
    expect(container.querySelector(".clara-practice__shell")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Listen, then give it a try." }),
    ).toBeVisible();
    expect(speechMocks.play).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    expect(speechMocks.unlock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(speechMocks.play).toHaveBeenCalledTimes(1);
      expect(speechMocks.prepare).toHaveBeenCalledWith(
        "learn-with-clara-phrases-item-1",
        "cookie-session",
      );
    });

    const replay = await screen.findByRole("button", { name: "Replay" });
    fireEvent.click(replay);
    expect(speechMocks.unlock).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(speechMocks.play).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(replay).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "the" }));
    fireEvent.click(screen.getByRole("button", { name: "red" }));
    fireEvent.click(screen.getByRole("button", { name: "ball" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(screen.getByRole("status")).toHaveTextContent(/that is right/i);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(speechMocks.prepare).toHaveBeenCalledWith(
        "learn-with-clara-phrases-item-2",
        "cookie-session",
      );
      expect(speechMocks.play).toHaveBeenCalledTimes(3);
    });
  });

  it("locks the activity until Clara finishes the automatic narration", async () => {
    let finishSpeech: () => void = () => undefined;
    speechMocks.play.mockImplementationOnce(
      async (_speech: Blob, onLevel: (level: number) => void) => {
        onLevel(0.4);
        return {
          finished: new Promise<void>((resolve) => {
            finishSpeech = resolve;
          }),
          stop: vi.fn(),
        };
      },
    );

    renderPractice("phrases");
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));

    await waitFor(() => expect(speechMocks.play).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "the" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    expect(
      screen.getByText("Listen to Ma'am Clara before you answer."),
    ).toBeVisible();

    act(() => finishSpeech());

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "the" })).toBeEnabled(),
    );
    expect(screen.getByRole("button", { name: "Check answer" })).toBeEnabled();
  });

  it("checks comprehension choices and explains a wrong answer", async () => {
    renderPractice("comprehension");
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "A toy" })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "A toy" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(screen.getByRole("status")).toHaveTextContent(/clue/i);
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  it("shows Filipino Clara guidance when Filipino is selected", async () => {
    renderPractice("phrases", "fil-PH");

    expect(screen.getByText("Handa na ang iyong pagsasanay.")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Simulan ang pagsasanay" }),
    );

    expect(
      screen.getByText(
        "Sabi ni Ma'am Clara: Maglaan ng oras at gawin ang iyong makakaya.",
      ),
    ).toBeVisible();
    expect(await screen.findByText("Kaya mo iyan!")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Suriin ang sagot" }),
    ).toBeVisible();
  });
});
