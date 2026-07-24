import { afterEach, describe, expect, it, vi } from "vitest";

import { startLessonThree } from "../src/features/lesson/lessonApi";

const lessonThreeState = {
  run_id: 33,
  lesson_key: "required-lesson-3",
  content_version: "v1",
  status: "active",
  mission: {
    key: "mission-1",
    number: 1,
    total: 1,
    title: "Read the phrase",
  },
  progress: { current: 1, total: 5 },
  item: {
    item_key: "lesson-v1-phrase-fat-cat",
    presentation: "display_phrase",
    display_text: "a fat cat",
  },
  response: null,
  teaching: {
    state: "LISTENING",
    outcome: null,
    academic_attempt_count: 0,
    technical_retry_count: 0,
    highest_scaffold_used: "none",
    independent_mastery: false,
    diagnosis_key: null,
    review_recommended: false,
    can_record: true,
    can_continue_support: false,
    can_advance: false,
  },
  support: {
    sequence_key: "lesson-v1-phrase-fat-cat:introduction",
    speech: [{ kind: "published", speech_key: "lesson-3-mission-1" }],
    display_mode: "instruction",
    after_speech: "record",
    requires_speech_completion: true,
  },
  practice_tries: { count: 0, entries: [] },
  completion: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Lesson 3 API", () => {
  it("opens Lesson 3 and validates its phrase presentation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(lessonThreeState));
    vi.stubGlobal("fetch", fetchMock);

    await expect(startLessonThree("learner-token")).resolves.toMatchObject({
      lesson_key: "required-lesson-3",
      mission: { total: 1 },
      item: {
        presentation: "display_phrase",
        display_text: "a fat cat",
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/lessons/lesson-3/start",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
