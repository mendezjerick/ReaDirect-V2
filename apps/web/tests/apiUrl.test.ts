import { describe, expect, it, vi } from "vitest";

import {
  apiFetch,
  apiFetchWithNormalTimeout,
  apiFetchWithTimeout,
  ApiRequestTimeoutError,
  NORMAL_API_TIMEOUT_MS,
  resolveApiUrl,
  runtimeApiOrigin,
} from "../src/lib/apiUrl";

describe("runtimeApiOrigin", () => {
  it("uses the production API for a native Capacitor runtime", () => {
    expect(
      runtimeApiOrigin({
        configuredOrigin: "",
        hostname: "localhost",
        native: true,
      }),
    ).toBe("https://api.readirect.org");
  });

  it("keeps an explicit build origin ahead of runtime defaults", () => {
    expect(
      runtimeApiOrigin({
        configuredOrigin: "https://staging.readirect.org/",
        hostname: "localhost",
        native: true,
      }),
    ).toBe("https://staging.readirect.org");
  });

  it("preserves same-origin local browser requests", () => {
    expect(
      runtimeApiOrigin({
        configuredOrigin: "",
        hostname: "localhost",
        native: false,
      }),
    ).toBe("");
  });
});

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
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );

    const request = apiFetchWithTimeout(
      "/api/learners/lessons/lesson-2/1/submit",
      {
        method: "POST",
      },
      1_000,
    );
    const failure = expect(request).rejects.toThrow(
      "We couldn't connect right now. Please try again.",
    );
    await vi.advanceTimersByTimeAsync(1_000);
    await failure;

    fetchSpy.mockRestore();
    vi.useRealTimers();
  });

  it("bounds normal requests at the shared recovery ceiling", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );

    const request = apiFetchWithNormalTimeout("/api/learners/session");
    const failure = expect(request).rejects.toBeInstanceOf(
      ApiRequestTimeoutError,
    );
    await vi.advanceTimersByTimeAsync(NORMAL_API_TIMEOUT_MS);
    await failure;

    fetchSpy.mockRestore();
    vi.useRealTimers();
  });

  it("preserves caller cancellation instead of reporting a timeout", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    const caller = new AbortController();
    const request = apiFetchWithNormalTimeout("/api/learners/session", {
      signal: caller.signal,
    });
    const failure = expect(request).rejects.toMatchObject({
      name: "AbortError",
    });

    caller.abort();
    await failure;
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/learners/session",
      expect.objectContaining({ credentials: "include" }),
    );

    fetchSpy.mockRestore();
    vi.useRealTimers();
  });
});
