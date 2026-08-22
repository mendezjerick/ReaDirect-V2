import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();
  return { ...motion, useReducedMotion: () => false };
});

import { createAppQueryClient } from "../src/app/queryClient";
import { RouteTransitionProvider } from "../src/components/transitions/RouteTransitionProvider";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { NORMAL_API_TIMEOUT_MS } from "../src/lib/apiUrl";
import { LearnerLoginPage } from "../src/features/learner-auth/LearnerLoginPage";
import { saveLearnerSession } from "../src/features/learner-auth/learnerApi";

function renderLogin(initialPath = "/learner/login") {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <RouteTransitionProvider>
          <Routes>
            <Route path="/learner/login" element={<LearnerLoginPage />} />
            <Route
              path="/learner/dashboard"
              element={<div>Learner dashboard route</div>}
            />
            <Route
              path="/learner/offline"
              element={<div>Offline Practice route</div>}
            />
            <Route path="/home" element={<div>Home route</div>} />
          </Routes>
        </RouteTransitionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LearnerLoginPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    document.cookie = "readirect_learner_signed_in=; Max-Age=0; Path=/";
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("keeps learner inputs large and simple", () => {
    renderLogin();

    expect(screen.getByRole("main")).toHaveClass("learner-flow-page");
    expect(
      screen.getByRole("heading", { name: "Ready to read?" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Learner Code")).toHaveAttribute(
      "maxlength",
      "5",
    );
    expect(screen.getByRole("button", { name: "Let's go!" })).toBeEnabled();
    expect(
      screen.getByRole("checkbox", { name: /remember me on this device/i }),
    ).not.toBeChecked();
  });

  it("normalizes the learner code and waits for the button press before login", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "learner-token",
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
          },
          session: { expires_at: "2026-07-20T12:00:00+00:00" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderLogin();

    fireEvent.change(screen.getByLabelText("Learner Code"), {
      target: { value: "kw000" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "rhine359" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Let's go!" }));

    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(BUTTON_PRESS_COMMIT_MS);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/login",
      expect.objectContaining({
        body: JSON.stringify({ learner_code: "KW000", password: "rhine359" }),
      }),
    );
    expect(
      window.sessionStorage.getItem("readirect.learner-session"),
    ).toContain("KW000");
    expect(window.localStorage.getItem("readirect.learner-session")).toBeNull();
    expect(screen.getByText("Learner dashboard route")).toBeVisible();
    expect(
      document.querySelector('[data-route-transition="link-start"]'),
    ).not.toBeInTheDocument();
  });

  it("shows a safe message when learner login receives HTML", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<!doctype html><title>Proxy error</title>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );
    renderLogin();

    fireEvent.change(screen.getByLabelText("Learner Code"), {
      target: { value: "kw000" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "rhine359" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Let's go!" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "ReaDirect received an unexpected server response. Please try again.",
    );
    expect(screen.queryByText(/Unexpected token/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Proxy error/)).not.toBeInTheDocument();
  });

  it("stores a remembered learner session outside tab-only storage", async () => {
    await saveLearnerSession(
      {
        token: "learner-token",
        learner: {
          id: 1,
          learner_code: "KW000",
          full_name: "Kristen Rhine Wright",
          first_name: "Kristen",
          account_purpose: "portal_system",
          speech_language: "en",
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
      },
      { remember: true },
    );

    expect(window.localStorage.getItem("readirect.learner-session")).toContain(
      "KW000",
    );
    expect(
      window.sessionStorage.getItem("readirect.learner-session"),
    ).toBeNull();
  });

  it("returns to Offline Practice when login was opened for a download", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            token: "learner-token",
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
            },
            session: { expires_at: "2026-07-20T12:00:00+00:00" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    renderLogin("/learner/login?returnTo=%2Flearner%2Foffline");

    fireEvent.change(screen.getByLabelText("Learner Code"), {
      target: { value: "kw000" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "rhine359" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Let's go!" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(BUTTON_PRESS_COMMIT_MS);
    });

    expect(screen.getByText("Offline Practice route")).toBeVisible();
  });

  it("recovers a stalled login request so the form can be retried", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderLogin();

    fireEvent.change(screen.getByLabelText("Learner Code"), {
      target: { value: "kw000" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "rhine359" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Let's go!" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(BUTTON_PRESS_COMMIT_MS);
    });
    expect(fetchMock).toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NORMAL_API_TIMEOUT_MS + 1);
      await Promise.resolve();
    });

    expect(
      screen.getByText("We couldn't sign you in right now. Please try again."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Let's go!" })).toBeEnabled();
    expect(screen.getByLabelText("Learner Code")).toHaveValue("kw000");
  });

  it("keeps a saved session when restore is temporarily unavailable", async () => {
    vi.useFakeTimers();
    const storedSession = {
      token: "cookie-session",
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
      },
      session: { expires_at: "2026-07-20T12:00:00+00:00" },
    };
    window.sessionStorage.setItem(
      "readirect.learner-session",
      JSON.stringify(storedSession),
    );
    document.cookie = "readirect_learner_signed_in=1; Path=/";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );
    renderLogin();

    expect(screen.getByText("Restoring your reading session...")).toBeVisible();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NORMAL_API_TIMEOUT_MS);
    });

    expect(
      screen.getByText("We couldn't verify your saved reading session."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    expect(window.sessionStorage.getItem("readirect.learner-session")).toBe(
      JSON.stringify(storedSession),
    );
  });

  it("restores an existing session without replaying Link Start", async () => {
    const storedSession = {
      token: "cookie-session",
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
      },
      session: { expires_at: "2026-07-20T12:00:00+00:00" },
    };
    window.sessionStorage.setItem(
      "readirect.learner-session",
      JSON.stringify(storedSession),
    );
    document.cookie = "readirect_learner_signed_in=1; Path=/";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(storedSession), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderLogin();

    expect(await screen.findByText("Learner dashboard route")).toBeVisible();
    expect(
      document.querySelector('[data-route-transition="link-start"]'),
    ).not.toBeInTheDocument();
  });
});
