import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const speechMocks = vi.hoisted(() => ({
  prepare: vi.fn().mockResolvedValue(new Blob(["wave"])),
  unlock: vi.fn(),
  play: vi
    .fn()
    .mockImplementation(
      async (_speech: Blob, onLevel?: (level: number) => void) => {
        onLevel?.(0.4);
        return {
          finished: Promise.resolve(),
          stop: vi.fn(),
        };
      },
    ),
}));

const apiMocks = vi.hoisted(() => ({
  start: vi.fn(),
  advance: vi.fn(),
  restart: vi.fn(),
}));

vi.mock("../src/features/clara-audio/claraSpeech", () => ({
  prepareClaraSpeech: speechMocks.prepare,
  playClaraSpeech: speechMocks.play,
  unlockClaraAudio: speechMocks.unlock,
}));

vi.mock(
  "../src/features/learn-with-clara/learnWithClaraLettersApi",
  async () => {
    const original = await vi.importActual<
      typeof import("../src/features/learn-with-clara/learnWithClaraLettersApi")
    >("../src/features/learn-with-clara/learnWithClaraLettersApi");

    return {
      ...original,
      startLearnWithClaraLetters: apiMocks.start,
      advanceLearnWithClaraLetters: apiMocks.advance,
      restartLearnWithClaraLetters: apiMocks.restart,
    };
  },
);

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

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    useReducedMotion: () => true,
  };
});

import { LearnWithClaraLettersPage } from "../src/features/learn-with-clara/LearnWithClaraLettersPage";
import type { LearnWithClaraLettersState } from "../src/features/learn-with-clara/learnWithClaraLettersApi";

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

function paradeState(
  scene: Partial<LearnWithClaraLettersState["scene"]> = {},
): LearnWithClaraLettersState {
  return {
    session_id: 1,
    lesson_key: "letters",
    chapter_key: "letter-names-a-e",
    status: "active",
    visit_count: 1,
    scene: {
      key: "parade-opening",
      kind: "story",
      title: "The little letters blew away",
      display_text: "A B C D E",
      pronunciation: "",
      speech_key: "learn-with-clara-letters-parade-opening",
      choices: [],
      item_progress: { current: 1, total: 5 },
      ...scene,
    },
    prefetch_speech_keys: ["learn-with-clara-letters-find-a"],
  };
}

const findAState = paradeState({
  key: "find-a",
  kind: "find",
  title: "Find little a",
  display_text: "A a",
  pronunciation: "ay",
  speech_key: "learn-with-clara-letters-find-a",
  choices: ["d", "a", "e"],
  item_progress: { current: 1, total: 5 },
});

const teachAState = paradeState({
  key: "teach-a",
  kind: "teach",
  title: "A found its partner",
  display_text: "A a",
  pronunciation: "ay",
  speech_key: "lesson-1-letter-demo-A",
  choices: [],
  item_progress: { current: 1, total: 5 },
});

function renderPage(speechLanguage: "en" | "fil-PH" = "en") {
  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify({
      ...learnerSession,
      token: "cookie-session",
      learner: { ...learnerSession.learner, speech_language: speechLanguage },
    }),
  );

  return render(
    <MemoryRouter initialEntries={["/learner/learn-with-clara/letters"]}>
      <Routes>
        <Route
          path="/learner/learn-with-clara/letters"
          element={<LearnWithClaraLettersPage />}
        />
        <Route
          path="/learner/learn-with-clara"
          element={<div>Clara classes</div>}
        />
        <Route path="/learner/login" element={<div>Learner login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LearnWithClaraLettersPage", () => {
  beforeEach(() => {
    apiMocks.start.mockResolvedValue(paradeState());
    apiMocks.advance.mockImplementation(
      async (_token: string, sceneKey: string) => {
        if (sceneKey === "parade-opening") {
          return findAState;
        }
        if (sceneKey === "find-a") {
          return teachAState;
        }
        return findAState;
      },
    );
    apiMocks.restart.mockResolvedValue(paradeState());
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("plays each generated Clara line before enabling the letter interaction", async () => {
    renderPage();

    expect(
      await screen.findByRole("button", { name: "Start Story" }),
    ).toBeVisible();
    await waitFor(() =>
      expect(speechMocks.prepare).toHaveBeenCalledWith(
        "learn-with-clara-letters-find-a",
        "cookie-session",
      ),
    );
    speechMocks.prepare.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Start Story" }));

    expect(speechMocks.unlock).toHaveBeenCalled();
    await waitFor(() =>
      expect(speechMocks.prepare).toHaveBeenCalledWith(
        "learn-with-clara-letters-parade-opening",
        "cookie-session",
      ),
    );
    await waitFor(() => expect(speechMocks.play).toHaveBeenCalled());
    expect(
      await screen.findByText("The little letters blew away"),
    ).toBeVisible();
    fireEvent.click(
      await screen.findByRole("button", { name: "Find the First Letter" }),
    );

    expect(await screen.findByText("Find little a")).toBeVisible();
    const wrongLetter = await screen.findByRole("button", {
      name: "Choose little d",
    });
    await waitFor(() => expect(wrongLetter).toBeEnabled());
    fireEvent.click(wrongLetter);
    expect(
      await screen.findByText("That letter has another partner. Look again."),
    ).toBeVisible();

    fireEvent.click(
      await screen.findByRole("button", { name: "Choose little a" }),
    );

    await waitFor(
      () =>
        expect(apiMocks.advance).toHaveBeenCalledWith(
          "cookie-session",
          "find-a",
        ),
      { timeout: 1_500 },
    );
    expect(await screen.findByText("A found its partner")).toBeVisible();
    expect(screen.queryByText("LETTER NAME")).not.toBeInTheDocument();
    expect(screen.queryByText("ay")).not.toBeInTheDocument();
    expect(await screen.findByText("Your turn. Say A out loud.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Next Stop" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /record/i }),
    ).not.toBeInTheDocument();
    expect(speechMocks.prepare).toHaveBeenCalledWith(
      "learn-with-clara-letters-find-a",
      "cookie-session",
    );
  });

  it("finishes the story with the animated parade and can restart", async () => {
    const teachEState = paradeState({
      key: "teach-e",
      kind: "teach",
      title: "E found its partner",
      display_text: "E e",
      pronunciation: "ee",
      speech_key: "lesson-1-letter-demo-E",
      choices: [],
      item_progress: { current: 5, total: 5 },
    });
    const finaleState = {
      ...paradeState({
        key: "parade-finale",
        kind: "completion",
        title: "The Letter Parade",
        display_text: "A a B b C c D d E e",
        pronunciation: "",
        speech_key: "learn-with-clara-letters-parade-finale",
        choices: [],
        item_progress: null,
      }),
      status: "letters-complete" as const,
      prefetch_speech_keys: [],
    };
    apiMocks.start.mockResolvedValue(teachEState);
    apiMocks.advance.mockResolvedValue(finaleState);

    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "Continue Story" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Start the Parade" }),
    );

    expect(await screen.findByText("The Letter Parade")).toBeVisible();
    fireEvent.click(await screen.findByRole("button", { name: "Play Again" }));

    await waitFor(() =>
      expect(apiMocks.restart).toHaveBeenCalledWith("cookie-session"),
    );
  });

  it("returns to the Clara class menu", async () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Back to Clara classes" }),
    );

    expect(await screen.findByText("Clara classes")).toBeInTheDocument();
  });

  it("shows Filipino Clara guidance when Filipino is selected", async () => {
    renderPage("fil-PH");

    expect(
      await screen.findByText("Handa na ang kuwento ng mga letra."),
    ).toBeVisible();
    fireEvent.click(
      await screen.findByRole("button", { name: "Simulan ang kuwento" }),
    );
    expect(
      await screen.findByText("Kailangan ng maliliit na letra ang tulong mo."),
    ).toBeVisible();

    fireEvent.click(
      await screen.findByRole("button", { name: "Hanapin ang unang letra" }),
    );
    expect(
      await screen.findByText("Tulungan si Clara hanapin ang kapares"),
    ).toBeVisible();
    expect(await screen.findByText("Hanapin ang maliit na a")).toBeVisible();
    expect(
      await screen.findByRole("button", { name: "Piliin ang maliit na a" }),
    ).toBeVisible();
  });
});
