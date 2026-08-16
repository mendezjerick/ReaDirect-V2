import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AssessmentAuthenticationError,
  startPartOne,
  submitSpeech,
} from "../src/features/assessment/assessmentApi";
import {
  getPartTwo,
  selectAssessmentStory,
} from "../src/features/assessment/assessmentPartTwoApi";
import {
  clearActivitySpeechPreparation,
  prepareActivitySpeech,
} from "../src/features/clara-audio/activitySpeechReadiness";
import {
  clearPreparedClaraSpeech,
  prepareClaraSpeech,
} from "../src/features/clara-audio/claraSpeech";
import { startLearnWithClaraLetters } from "../src/features/learn-with-clara/learnWithClaraLettersApi";

const partOneState = {
  run_id: 7,
  assessment_type: "diagnostic" as const,
  stage: "orientation" as const,
  orientation_ready: false,
  progress: null,
  item: null,
  response_committed: false,
  result: null,
};

const partTwoState = {
  run_id: 7,
  assessment_type: "diagnostic" as const,
  stage: "story-selection" as const,
  selected_story_key: null,
  progress: null,
  story_choices: [],
  item: null,
  result: null,
  completion: null,
};

const activityManifest = {
  activity: "lesson-1",
  published_groups: ["lesson-1-fixed"],
  published_speech_keys: ["lesson-1-mission-1"],
  runtime_profiles: ["result"],
  requires_runtime: true,
};

const activityReadiness = {
  activity: "lesson-1",
  ready: true,
  published_ready: true,
  published_groups: ["lesson-1-fixed"],
  voice_version: "clara-sh-v1",
  unavailable_speech_keys: [],
  runtime_required: true,
  runtime_ready: true,
  runtime_profiles: ["result"],
  profiles_ready: ["result"],
  device: "cpu",
};

const lettersState = {
  session_id: 3,
  lesson_key: "letters" as const,
  chapter_key: "letter-names-a-e" as const,
  status: "active" as const,
  visit_count: 1,
  scene: {
    key: "opening",
    kind: "story" as const,
    title: "Letters",
    display_text: "Find the letters.",
    pronunciation: "letters",
    speech_key: "learn-with-clara-letters-parade-opening" as const,
    choices: ["A"],
    item_progress: null,
  },
  prefetch_speech_keys: ["learn-with-clara-letters-parade-opening" as const],
};

function mockJsonResponse(body: unknown): Response {
  return Response.json(body, {
    headers: { "Content-Type": "application/json" },
  });
}

function requestInit(call: ReturnType<typeof vi.fn>, index = 0): RequestInit {
  return call.mock.calls[index]?.[1] as RequestInit;
}

afterEach(() => {
  clearActivitySpeechPreparation();
  clearPreparedClaraSpeech();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Diagnostic authenticated transport", () => {
  it("starts Part One with browser credentials and no manually exposed cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(partOneState));
    vi.stubGlobal("fetch", fetchMock);

    await expect(startPartOne("cookie-session")).resolves.toEqual(partOneState);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/assessments/part-one/start",
      expect.objectContaining({ credentials: "include" }),
    );
    const init = requestInit(fetchMock);
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer cookie-session",
    );
    expect(new Headers(init.headers).get("Cookie")).toBeNull();
  });

  it("keeps an expired learner session distinct from transport failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthenticated." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(startPartOne("expired-session")).rejects.toBeInstanceOf(
      AssessmentAuthenticationError,
    );
  });

  it("preserves FormData and native bearer requests through the same transport", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(partOneState));
    vi.stubGlobal("fetch", fetchMock);
    const audio = new Blob(["wave"], { type: "audio/webm" });

    await submitSpeech("native-session-token", 7, "letter-a", audio);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/assessments/part-one/7/speech",
      expect.objectContaining({
        credentials: "include",
        body: expect.any(FormData),
      }),
    );
    const init = requestInit(fetchMock);
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer native-session-token",
    );
    expect(new Headers(init.headers).get("Content-Type")).toBeNull();
  });

  it("uses credentialed transport for Part Two reads and mutations", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(partTwoState))
      .mockResolvedValueOnce(mockJsonResponse(partTwoState));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPartTwo("cookie-session")).resolves.toEqual(partTwoState);
    await expect(
      selectAssessmentStory("cookie-session", 7, "story-a"),
    ).resolves.toEqual(partTwoState);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/learners/assessments/part-two/current",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/learners/assessments/part-two/7/story",
      expect.objectContaining({
        credentials: "include",
        body: JSON.stringify({ story_key: "story-a" }),
      }),
    );
  });

  it("uses credentialed transport for activity manifest and readiness", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(activityManifest))
      .mockResolvedValueOnce(mockJsonResponse(activityReadiness));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      prepareActivitySpeech("cookie-session", "lesson-1"),
    ).resolves.toEqual(activityReadiness);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/learners/tts/activity-manifest?activity=lesson-1",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/learners/tts/activity-readiness",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("uses credentialed transport for authenticated Clara speech generation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(new Blob(["wave"]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      prepareClaraSpeech("assessment-orientation", "cookie-session"),
    ).resolves.toBeInstanceOf(Blob);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/tts/speech/assessment-orientation",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("uses credentialed transport for learner-authenticated Clara letters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(lettersState));
    vi.stubGlobal("fetch", fetchMock);

    await expect(startLearnWithClaraLetters("cookie-session")).resolves.toEqual(
      lettersState,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/learn-with-clara/letters/start",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
