import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getLearnerSession,
  learnerReadingPathSchema,
  loadLearnerSession,
  skipDiagnostic,
} from "../src/features/learner-auth/learnerApi";

const learner = {
  id: 1,
  learner_code: "RP001",
  full_name: "Reading Path",
  first_name: "Reading",
  account_purpose: "standard",
  school: null,
  grade_level: 3,
  section: "A",
  progress: {
    stage: "required_lessons",
    current_required_lesson_order: 2,
  },
  achievement_keys: [],
};

const readingPath = {
  diagnostic: { status: "completed", score: 73 },
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

afterEach(() => {
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("learner reading-path contract", () => {
  it("parses the authoritative snapshot returned by the learner session API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          reading_path: readingPath,
          learner,
          session: { expires_at: "2099-01-01T00:00:00Z" },
        }),
      ),
    );

    await expect(getLearnerSession("learner-token")).resolves.toMatchObject({
      reading_path: readingPath,
    });
  });

  it("rejects statuses outside the reading-path contract", () => {
    expect(
      learnerReadingPathSchema.safeParse({
        ...readingPath,
        final_assessment: { status: "ready_later" },
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate lesson orders and inconsistent completion counts", () => {
    expect(
      learnerReadingPathSchema.safeParse({
        ...readingPath,
        lessons: readingPath.lessons.map((lesson, index) =>
          index === 5 ? { ...lesson, order: 1 } : lesson,
        ),
      }).success,
    ).toBe(false);
    expect(
      learnerReadingPathSchema.safeParse({
        ...readingPath,
        completed_lesson_count: 3,
      }).success,
    ).toBe(false);
  });

  it("upgrades a previously stored session with a locked default snapshot", () => {
    window.sessionStorage.setItem(
      "readirect.learner-session",
      JSON.stringify({
        token: "legacy-token",
        learner,
        session: { expires_at: "2099-01-01T00:00:00Z" },
      }),
    );

    expect(loadLearnerSession()?.reading_path).toMatchObject({
      diagnostic: { status: "required", score: null },
      completed_lesson_count: 0,
      final_assessment: { status: "locked" },
    });
  });

  it("submits the whole-diagnostic skip and returns its fresh snapshot", async () => {
    const skippedPath = {
      ...readingPath,
      diagnostic: { status: "skipped", score: 0 },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ reading_path: skippedPath }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(skipDiagnostic("learner-token")).resolves.toEqual(skippedPath);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/assessments/diagnostic/skip",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer learner-token",
        }),
      }),
    );
  });
});
