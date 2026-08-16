import { afterEach, describe, expect, it, vi } from "vitest";

import { probeApiReachability } from "../src/features/connectivity/connectivityProbe";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("API connectivity probe", () => {
  it("uses credentialed transport for browser learner-session probes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      probeApiReachability({ token: "cookie-session" }),
    ).resolves.toMatchObject({ status: "unauthorized", httpStatus: 401 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/session",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("uses the public lightweight endpoint without a learner token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(
      probeApiReachability({ fetchImpl: fetchMock }),
    ).resolves.toMatchObject({
      status: "reachable",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/experience/intro/settings",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("distinguishes an expired learner session from an unavailable API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 401 }));

    await expect(
      probeApiReachability({ token: "session-token", fetchImpl: fetchMock }),
    ).resolves.toMatchObject({ status: "unauthorized", httpStatus: 401 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/session",
      expect.objectContaining({
        headers: {
          Accept: "application/json",
          Authorization: "Bearer session-token",
        },
      }),
    );
  });

  it("classifies server failures as unreachable and lets stale probes abort", async () => {
    const failedFetch = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 503 }));
    await expect(
      probeApiReachability({ fetchImpl: failedFetch }),
    ).resolves.toMatchObject({ status: "unreachable", httpStatus: 503 });

    const controller = new AbortController();
    const pendingFetch = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const pendingProbe = probeApiReachability({
      signal: controller.signal,
      fetchImpl: pendingFetch,
    });
    controller.abort();
    await expect(pendingProbe).rejects.toMatchObject({ name: "AbortError" });
  });
});
