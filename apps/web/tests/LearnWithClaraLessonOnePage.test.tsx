import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const speechMocks = vi.hoisted(() => ({
  prepare: vi.fn().mockResolvedValue(new Blob(["wave"])),
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
}));

vi.mock("../src/features/learn-with-clara/learnWithClaraApi", async () => {
  const original = await vi.importActual<
    typeof import("../src/features/learn-with-clara/learnWithClaraApi")
  >("../src/features/learn-with-clara/learnWithClaraApi");

  return {
    ...original,
    startLearnWithClaraLessonOne: apiMocks.start,
    advanceLearnWithClaraLessonOne: apiMocks.advance,
    restartLearnWithClaraLessonOne: apiMocks.restart,
  };
});

vi.mock("../src/features/intro/ClaraIntroStage", () => ({
  ClaraIntroStage: ({
    children,
    onClaraLoadStateChange,
  }: {
    children: ReactNode;
    onClaraLoadStateChange?: (state: "loading" | "ready" | "error") => void;
  }) => {
    useEffect(() => {
      onClaraLoadStateChange?.("ready");
    }, [onClaraLoadStateChange]);

    return <main>{children}</main>;
  },
}));

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    useReducedMotion: () => true,
  };
});

import { LearnWithClaraLessonOnePage } from "../src/features/learn-with-clara/LearnWithClaraLessonOnePage";
import type { LearnWithClaraListeningState } from "../src/features/learn-with-clara/learnWithClaraApi";

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

function listeningState(
  scene: Partial<LearnWithClaraListeningState["scene"]> = {},
): LearnWithClaraListeningState {
  return {
    session_id: 1,
    lesson_key: "lesson-1",
    chapter_key: "chapter-1",
    status: "active",
    story_branch: null,
    heard_story_keys: [],
    visit_count: 1,
    scene: {
      key: "chapter-1-item-a",
      kind: "letter_pair",
      title: "Big and small letters",
      display_text: "A a",
      speech_key: "learn-with-clara-lesson-1-pair-a",
      item_progress: { current: 1, total: 5 },
      ...scene,
    },
    prefetch_speech_keys: ["learn-with-clara-lesson-1-pair-b"],
  };
}

function renderPage() {
  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify(learnerSession),
  );

  return render(
    <MemoryRouter initialEntries={["/learner/learn-with-clara/lesson-1"]}>
      <Routes>
        <Route
          path="/learner/learn-with-clara/lesson-1"
          element={<LearnWithClaraLessonOnePage />}
        />
        <Route
          path="/learner/dashboard"
          element={<div>Learner dashboard</div>}
        />
        <Route path="/learner/login" element={<div>Learner login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LearnWithClaraLessonOnePage", () => {
  beforeEach(() => {
    apiMocks.start.mockResolvedValue(listeningState());
    apiMocks.advance.mockResolvedValue(
      listeningState({
        key: "chapter-1-item-b",
        display_text: "B b",
        speech_key: "learn-with-clara-lesson-1-pair-b",
        item_progress: { current: 2, total: 5 },
      }),
    );
    apiMocks.restart.mockResolvedValue(listeningState());
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("is available before the Diagnostic Assessment and advances explanations automatically", async () => {
    renderPage();

    const startButton = await screen.findByRole("button", {
      name: "Start Class",
    });
    fireEvent.click(startButton);

    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Hear Again" }),
    ).not.toBeInTheDocument();

    await waitFor(
      () =>
        expect(apiMocks.advance).toHaveBeenCalledWith(
          "learner-token",
          "chapter-1-item-a",
          "continue",
        ),
      {
        timeout: 2_500,
      },
    );
    expect(await screen.findByText("B")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
  });

  it("offers the authored story choice without adding recording controls", async () => {
    apiMocks.start.mockResolvedValue(
      listeningState({
        key: "chapter-1-story-opening",
        kind: "story",
        title: "A funny memory",
        display_text: "My very big name",
        speech_key: "learn-with-clara-lesson-1-story-name-opening",
        item_progress: null,
        choices: [
          { action: "tell_more", label: "Tell me more" },
          { action: "keep_learning", label: "Keep learning" },
        ],
      }),
    );

    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "Continue Class" }),
    );

    expect(
      await screen.findByRole("img", {
        name: /enormous letter C/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Tell me more" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Keep learning" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /record/i }),
    ).not.toBeInTheDocument();
  });
});
