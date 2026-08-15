import { describe, expect, it, vi } from "vitest";

import {
  apiFetch,
  apiFetchWithTimeout,
  resolveApiUrl,
} from "../src/lib/apiUrl";

describe("resolveApiUrl", () => {
  it("keeps API paths relative when no origin is configured", () => {
    expect(resolveApiUrl("/api/learners/session")).toBe(
      "/api/learners/session",
    );
  });

  it("prefixes API paths with a normalized configured origin", () => {
    expect(
      resolveApiUrl(
        "/api/learners/tts/activity-manifest?activity=lesson-1",
        "https://api.example.test///",
      ),
    ).toBe(
      "https://api.example.test/api/learners/tts/activity-manifest?activity=lesson-1",
    );
  });

  it("preserves the API path, query, and absolute URLs", () => {
    expect(
      resolveApiUrl("/api?next=%2Flesson-1", "https://api.example.test"),
    ).toBe("https://api.example.test/api?next=%2Flesson-1");
    expect(
      resolveApiUrl(
        "https://other.example.test/api/status",
        "https://api.example.test",
      ),
    ).toBe("https://other.example.test/api/status");
  });

  it("does not rewrite bundled or blob assets", () => {
    expect(
      resolveApiUrl(
        "/assets/live2d/clara/model3.json",
        "https://api.example.test",
      ),
    ).toBe("/assets/live2d/clara/model3.json");
    expect(
      resolveApiUrl("blob:https://localhost/audio", "https://api.example.test"),
    ).toBe("blob:https://localhost/audio");
  });

  it("passes request bodies, headers, and abort signals through unchanged", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const body = new FormData();
    const headers = new Headers({ Authorization: "Bearer test-token" });
    const controller = new AbortController();

    await apiFetch("/api/learners/assessments/diagnostic/skip", {
      method: "POST",
      body,
      headers,
      signal: controller.signal,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/learners/assessments/diagnostic/skip",
      expect.objectContaining({ body, headers, signal: controller.signal }),
    );
    fetchSpy.mockRestore();
  });

  it("turns a stalled request into a readable timeout error", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
      );

    const request = apiFetchWithTimeout("/api/learners/lessons/lesson-2/1/submit", {
      method: "POST",
    }, 1_000);
    const failure = expect(request).rejects.toThrow(
      "The reading checker took too long to respond. Please try again.",
    );
    await vi.advanceTimersByTimeAsync(1_000);
    await failure;

    fetchSpy.mockRestore();
    vi.useRealTimers();
  });
});
