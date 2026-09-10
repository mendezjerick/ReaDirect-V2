import { afterEach, describe, expect, it, vi } from "vitest";

import {
  enterGuestMode,
  loadLearnerSession,
  resetGuestLearnerProgress,
} from "../src/features/learner-auth/learnerApi";
import { apiFetch } from "../src/lib/apiUrl";
import {
  loadGuestStore,
  updateGuestStore,
} from "../src/features/guest/guestSession";
import { prepareLessonFeedback } from "../src/features/lesson/lessonApi";

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

function guestHeaders(): HeadersInit {
  const token = loadLearnerSession()?.token;
  if (!token) throw new Error("Guest session was not started.");
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

describe("browser-local guest mode", () => {
  it("uses a submitted recording's transcript for dynamic feedback", async () => {
    const networkFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ correct: false, transcript: "B", usable: true }),
        ),
      )
      .mockResolvedValueOnce(new Response("RIFF-feedback"));
    vi.stubGlobal("fetch", networkFetch);
    enterGuestMode();
    const body = new FormData();
    body.append("audio", new Blob(["recording"], { type: "audio/webm" }));
    const state = await (
      await apiFetch("/api/learners/lessons/lesson-1/101/submit", {
        method: "POST",
        headers: { Authorization: `Bearer ${loadLearnerSession()!.token}` },
        body,
      })
    ).json();
    await prepareLessonFeedback(
      loadLearnerSession()!.token,
      state.support.speech[0].response_id,
    );
    expect(JSON.parse(networkFetch.mock.calls[1][1].body).transcript).toBe("B");
  });

  it("falls back when dynamic feedback exceeds its time budget", async () => {
    vi.useFakeTimers();
    const networkFetch = vi
      .fn()
      .mockImplementationOnce(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      )
      .mockResolvedValueOnce(new Response("RIFF-published"));
    vi.stubGlobal("fetch", networkFetch);
    const state = await incorrectGuestLesson(2);
    const pending = prepareLessonFeedback(
      loadLearnerSession()!.token,
      state.response.id,
    );
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await (await pending).text()).toBe("RIFF-published");
    expect(networkFetch).toHaveBeenCalledTimes(2);
  });

  async function incorrectGuestLesson(lesson: number) {
    enterGuestMode();
    await apiFetch(`/api/learners/lessons/lesson-${lesson}/start`, {
      method: "POST",
      headers: guestHeaders(),
    });
    updateGuestStore((store) => ({
      ...store,
      lessons: {
        ...store.lessons,
        [lesson]: {
          ...store.lessons[String(lesson)],
          response: "incorrect",
          finalTranscript: "bed",
        },
      },
    }));
    return (
      await apiFetch(`/api/learners/lessons/lesson-${lesson}/start`, {
        method: "POST",
        headers: guestHeaders(),
      })
    ).json();
  }

  it.each([1, 2, 3, 4])(
    "routes lesson %s guest feedback to the public endpoint",
    async (lesson) => {
      const networkFetch = vi
        .fn()
        .mockResolvedValue(new Response("RIFF-feedback"));
      vi.stubGlobal("fetch", networkFetch);
      const state = await incorrectGuestLesson(lesson);
      expect(state.support.speech).toEqual([
        { kind: "runtime_feedback", response_id: state.response.id },
      ]);
      const audio = await prepareLessonFeedback(
        loadLearnerSession()!.token,
        state.response.id,
      );
      expect(await audio.text()).toBe("RIFF-feedback");
      const [url, options] = networkFetch.mock.calls[0];
      expect(new URL(url).pathname).toBe("/api/guest/tts/lesson-feedback");
      expect(JSON.parse(options.body)).toEqual({
        lesson,
        transcript: "bed",
        language: "en",
      });
      expect(new Headers(options.headers).has("Authorization")).toBe(false);
      expect(state.teaching.can_advance).toBe(false);
      expect(state.teaching.can_record).toBe(true);
    },
  );

  it.each([404, 409, 429, 503])(
    "falls back to prepared feedback on HTTP %s",
    async (status) => {
      const networkFetch = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status }))
        .mockResolvedValueOnce(new Response("RIFF-published"));
      vi.stubGlobal("fetch", networkFetch);
      const state = await incorrectGuestLesson(2);
      const audio = await prepareLessonFeedback(
        loadLearnerSession()!.token,
        state.response.id,
      );
      expect(await audio.text()).toBe("RIFF-published");
      expect(networkFetch.mock.calls[1][0]).toContain(
        "/api/guest/tts/speech/lesson-2-feedback-not-yet?language=en",
      );
    },
  );

  it("does not intercept signed-in learner feedback", async () => {
    const networkFetch = vi
      .fn()
      .mockResolvedValue(new Response("RIFF-learner"));
    vi.stubGlobal("fetch", networkFetch);
    await prepareLessonFeedback("real-learner-token", 42);
    expect(networkFetch.mock.calls[0][0]).toContain(
      "/api/learners/tts/lesson-feedback/42",
    );
  });

  it("rejects stale guest response IDs without contacting the learner API", async () => {
    const networkFetch = vi.fn();
    vi.stubGlobal("fetch", networkFetch);
    await incorrectGuestLesson(2);
    const response = await apiFetch("/api/learners/tts/lesson-feedback/999", {
      method: "POST",
      headers: guestHeaders(),
    });
    expect(response.status).toBe(404);
    expect(networkFetch).not.toHaveBeenCalled();
  });

  it("keeps profiles and game saves local, then resets only guest progress", async () => {
    const networkFetch = vi.fn();
    vi.stubGlobal("fetch", networkFetch);
    enterGuestMode();
    window.localStorage.setItem("readirect.device-preference", "keep-me");

    const profileResponse = await apiFetch("/api/learners/games/profile", {
      method: "POST",
      headers: guestHeaders(),
      body: JSON.stringify({ username: "GuestRead" }),
    });
    expect(await profileResponse.json()).toMatchObject({
      profile: { public_handle: "GuestRead#0000" },
    });

    const saveUrl = "/api/learners/games/chronicles-of-the-lost-kingdom/save";
    await apiFetch(saveUrl, {
      method: "PUT",
      headers: guestHeaders(),
      body: JSON.stringify({
        checkpoint_key: "village",
        save_schema_version: 1,
        state: { mission: 2 },
      }),
    });
    const storedSave = await (
      await apiFetch(saveUrl, {
        headers: guestHeaders(),
      })
    ).json();
    expect(storedSave.save).toMatchObject({
      checkpoint_key: "village",
      state: { mission: 2 },
      revision: 1,
    });
    expect(networkFetch).not.toHaveBeenCalled();

    resetGuestLearnerProgress();

    const resetProfile = await (
      await apiFetch("/api/learners/games/profile", { headers: guestHeaders() })
    ).json();
    const resetSave = await (
      await apiFetch(saveUrl, {
        headers: guestHeaders(),
      })
    ).json();
    expect(resetProfile.profile).toBeNull();
    expect(resetSave.save).toBeNull();
    expect(window.localStorage.getItem("readirect.device-preference")).toBe(
      "keep-me",
    );
  });

  it("serves lesson state locally with published Clara speech keys", async () => {
    const networkFetch = vi.fn();
    vi.stubGlobal("fetch", networkFetch);
    enterGuestMode();

    const firstItem = await (
      await apiFetch("/api/learners/lessons/lesson-1/start", {
        method: "POST",
        headers: guestHeaders(),
      })
    ).json();
    expect(firstItem.support.speech).toEqual([
      { kind: "published", speech_key: "lesson-1-mission-1" },
    ]);

    const lessonSix = await (
      await apiFetch("/api/learners/lessons/lesson-6/start", {
        method: "POST",
        headers: guestHeaders(),
      })
    ).json();
    expect(lessonSix.support.speech_key).toBe("lesson-6-question-who-lena");
    expect(networkFetch).not.toHaveBeenCalled();
  });

  it("allows one retry after incorrect feedback and scores the final outcome", async () => {
    const networkFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            correct: false,
            transcript: "B",
            usable: true,
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            correct: true,
            transcript: "A",
            usable: true,
          }),
        ),
      );
    vi.stubGlobal("fetch", networkFetch);
    enterGuestMode();

    await apiFetch("/api/learners/lessons/lesson-1/start", {
      method: "POST",
      headers: guestHeaders(),
    });

    const first = new FormData();
    first.append("audio", new Blob(["first"], { type: "audio/webm" }));
    const afterFirst = await (
      await apiFetch("/api/learners/lessons/lesson-1/101/submit", {
        method: "POST",
        headers: { Authorization: `Bearer ${loadLearnerSession()!.token}` },
        body: first,
      })
    ).json();
    expect(afterFirst.response.attempt_count).toBe(1);
    expect(afterFirst.teaching.can_record).toBe(true);
    expect(afterFirst.teaching.can_advance).toBe(false);

    const retry = new FormData();
    retry.append("audio", new Blob(["retry"], { type: "audio/webm" }));
    const afterRetry = await (
      await apiFetch("/api/learners/lessons/lesson-1/101/submit", {
        method: "POST",
        headers: { Authorization: `Bearer ${loadLearnerSession()!.token}` },
        body: retry,
      })
    ).json();
    expect(afterRetry.response.attempt_count).toBe(2);
    expect(afterRetry.teaching.can_record).toBe(false);
    expect(afterRetry.teaching.can_advance).toBe(true);

    expect(loadGuestStore()?.lessons["1"].score).toBe(1);
    expect(loadGuestStore()?.lessons["1"].attemptCount).toBe(2);
  });

  it("does not award a point when the initial attempt and retry are incorrect", async () => {
    const networkFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          correct: false,
          transcript: "B",
          usable: true,
        }),
      ),
    );
    vi.stubGlobal("fetch", networkFetch);
    enterGuestMode();

    await apiFetch("/api/learners/lessons/lesson-1/start", {
      method: "POST",
      headers: guestHeaders(),
    });
    for (const recording of ["first", "retry"]) {
      const body = new FormData();
      body.append("audio", new Blob([recording], { type: "audio/webm" }));
      await apiFetch("/api/learners/lessons/lesson-1/101/submit", {
        method: "POST",
        headers: { Authorization: `Bearer ${loadLearnerSession()!.token}` },
        body,
      });
    }

    const state = await (
      await apiFetch("/api/learners/lessons/lesson-1/101/start", {
        headers: guestHeaders(),
      })
    ).json();
    expect(state.response.attempt_count).toBe(2);
    expect(state.teaching.can_advance).toBe(true);
    await apiFetch("/api/learners/lessons/lesson-1/101/advance", {
      method: "POST",
      headers: guestHeaders(),
      body: "{}",
    });
    expect(loadGuestStore()?.lessons["1"].score).toBe(0);
  });
});
