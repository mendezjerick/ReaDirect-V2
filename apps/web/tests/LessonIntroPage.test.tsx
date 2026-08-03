import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { ReadingJourneyMenuPage } from "../src/features/lesson-intro/LessonIntroPage";
import type { LearnerReadingPath } from "../src/features/learner-auth/learnerApi";
import { ThemeProvider } from "../src/features/theme/ThemeProvider";

const freshPath: LearnerReadingPath = {
  diagnostic: { status: "required", score: null },
  lessons: [1, 2, 3, 4, 5, 6].map((order) => ({
    order: order as 1 | 2 | 3 | 4 | 5 | 6,
    status: "not_started" as const,
  })),
  completed_lesson_count: 0,
  final_assessment: { status: "locked" },
};

const learnerSession = {
  token: "learner-token",
  reading_path: freshPath,
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
    achievement_keys: [],
  },
  session: { expires_at: "2026-07-20T12:00:00+00:00" },
};

function LocationProbe() {
  const location = useLocation();
  return <div>Current route: {location.pathname}</div>;
}

function sessionResponse(readingPath: LearnerReadingPath) {
  return {
    reading_path: readingPath,
    learner: learnerSession.learner,
    session: learnerSession.session,
  };
}

function renderReadingJourney(readingPath: LearnerReadingPath = freshPath) {
  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify({ ...learnerSession, reading_path: readingPath }),
  );

  return render(
    <MemoryRouter initialEntries={["/learner/lesson-intro"]}>
      <ThemeProvider>
        <QueryClientProvider client={createAppQueryClient()}>
          <Routes>
            <Route
              path="/learner/lesson-intro"
              element={<ReadingJourneyMenuPage />}
            />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("ReadingJourneyMenuPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(sessionResponse(freshPath))),
    );
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows only the Diagnostic as available for a fresh learner without Clara", async () => {
    const { container } = renderReadingJourney();

    expect(
      screen.getByRole("heading", { name: "My Reading Journey" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("0 of 6 lessons complete"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Diagnostic Assessment. Start. Find your best starting point",
      }),
    ).toHaveClass("big-button--primary");

    for (const order of [1, 2, 3, 4, 5, 6]) {
      expect(
        screen.getByRole("button", {
          name: `Lesson ${order}. Locked. Waiting for your starting check`,
        }),
      ).toHaveClass("big-button--unavailable");
    }

    expect(
      screen.getByRole("button", {
        name: "Final Assessment. Locked. Complete 6 more lessons",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Skip Diagnostic" }),
    ).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(
      container.querySelectorAll(
        'img.reading-journey-card__book-icon[src="/assets/icons/book.png"]',
      ),
    ).toHaveLength(6);
    expect(container.querySelector(".clara-stage")).toBeNull();
    expect(container.querySelector(".clara-speech-loader")).toBeNull();

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it("shows independent Start, Resume, and Completed lesson states", async () => {
    const user = userEvent.setup();
    const readingPath: LearnerReadingPath = {
      diagnostic: { status: "completed", score: 17 },
      lessons: [
        { order: 1, status: "completed" },
        { order: 2, status: "not_started" },
        { order: 3, status: "in_progress" },
        { order: 4, status: "not_started" },
        { order: 5, status: "not_started" },
        { order: 6, status: "completed" },
      ],
      completed_lesson_count: 2,
      final_assessment: { status: "locked" },
    };
    vi.mocked(fetch).mockResolvedValue(
      Response.json(sessionResponse(readingPath)),
    );
    renderReadingJourney(readingPath);

    expect(screen.getByText("Completed · Score 17")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Lesson 1. Completed. Lesson completed",
      }),
    ).toHaveClass("big-button--completed");
    expect(
      screen.getByRole("button", {
        name: "Lesson 2. Start. Ready when you are",
      }),
    ).toHaveClass("big-button--primary");
    const resumeLesson = screen.getByRole("button", {
      name: "Lesson 3. Resume. Continue from your saved place",
    });
    expect(resumeLesson).toHaveClass("big-button--primary");
    expect(
      screen.queryByRole("button", { name: "Skip Diagnostic" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Final Assessment. Locked. Complete 4 more lessons",
      }),
    ).toBeDisabled();

    await user.click(resumeLesson);
    expect(
      screen.getByText("Current route: /learner/lessons/3"),
    ).toBeInTheDocument();
  });

  it("confirms that skipping records score zero and unlocks every lesson", async () => {
    const user = userEvent.setup();
    const skippedPath: LearnerReadingPath = {
      ...freshPath,
      diagnostic: { status: "skipped", score: 0 },
    };
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      return Promise.resolve(
        url.endsWith("/assessments/diagnostic/skip")
          ? Response.json({ reading_path: skippedPath })
          : Response.json(sessionResponse(freshPath)),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    renderReadingJourney();

    await user.click(screen.getByRole("button", { name: "Skip Diagnostic" }));
    const dialog = screen.getByRole("alertdialog", {
      name: "Skip the Diagnostic?",
    });
    expect(dialog).toHaveTextContent("score of 0");
    expect(dialog).toHaveTextContent("All six reading lessons will unlock");

    await user.click(
      screen.getByRole("button", { name: "Skip and unlock lessons" }),
    );

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByText("Skipped · Score 0")).toBeInTheDocument();
    for (const order of [1, 2, 3, 4, 5, 6]) {
      expect(
        screen.getByRole("button", {
          name: `Lesson ${order}. Start. Ready when you are`,
        }),
      ).toBeEnabled();
    }
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/assessments/diagnostic/skip",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("offers the Final Assessment after all six lessons are complete", async () => {
    const user = userEvent.setup();
    const completePath: LearnerReadingPath = {
      diagnostic: { status: "completed", score: 22 },
      lessons: [1, 2, 3, 4, 5, 6].map((order) => ({
        order: order as 1 | 2 | 3 | 4 | 5 | 6,
        status: "completed" as const,
      })),
      completed_lesson_count: 6,
      final_assessment: { status: "available" },
    };
    vi.mocked(fetch).mockResolvedValue(
      Response.json(sessionResponse(completePath)),
    );
    renderReadingJourney(completePath);

    const finalButton = screen.getByRole("button", {
      name: "Final Assessment. Start. Show how much your reading has grown",
    });
    expect(finalButton).toBeEnabled();
    await user.click(finalButton);
    expect(
      screen.getByText("Current route: /learner/final-assessment/part-one"),
    ).toBeInTheDocument();
  });
});
