import { afterEach, describe, expect, it, vi } from "vitest";

import {
  enterGuestMode,
  loadLearnerSession,
  resetGuestLearnerProgress,
} from "../src/features/learner-auth/learnerApi";
import { apiFetch } from "../src/lib/apiUrl";

afterEach(() => {
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
});
