import { afterEach, describe, expect, it, vi } from "vitest";

import {
  prepareLessonDemonstration,
  startLessonTwo,
} from "../src/features/lesson/lessonApi";

const lessonTwoState = {
  run_id: 22,
  lesson_key: "required-lesson-2",
  content_version: "v1",
  status: "active",
  mission: {
    key: "mission-1",
    number: 1,
    total: 2,
    title: "Read the word",
  },
  progress: { current: 1, total: 5 },
  item: {
    item_key: "lesson-v1-word-cat",
    presentation: "display_word",
    display_text: "cat",
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
    sequence_key: "lesson-v1-word-cat:introduction",
    speech: [{ kind: "published", speech_key: "lesson-2-mission-1" }],
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

describe("Lesson 2 API", () => {
  it("opens the Lesson 2 route and validates its word presentation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(lessonTwoState));
    vi.stubGlobal("fetch", fetchMock);

    await expect(startLessonTwo("learner-token")).resolves.toMatchObject({
      lesson_key: "required-lesson-2",
      item: {
        presentation: "display_word",
        display_text: "cat",
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/lessons/lesson-2/start",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("requests a runtime target-word demonstration by response id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("wave", {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      prepareLessonDemonstration("learner-token", 41),
    ).resolves.toMatchObject({ size: 4, type: "audio/wav" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/tts/lesson-demonstration/41",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
