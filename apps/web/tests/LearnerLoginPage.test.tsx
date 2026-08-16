import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();
  return { ...motion, useReducedMotion: () => false };
});

import { createAppQueryClient } from "../src/app/queryClient";
import { LINK_START_ROUTE_SWAP_MS } from "../src/components/transitions/LinkStartTransition";
import {
  ROUTE_TRANSITION_PRESS_COMMIT_MS,
  RouteTransitionProvider,
} from "../src/components/transitions/RouteTransitionProvider";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { LearnerLoginPage } from "../src/features/learner-auth/LearnerLoginPage";

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
    expect(
      screen.queryByText("Learner dashboard route"),
    ).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ROUTE_TRANSITION_PRESS_COMMIT_MS);
    });
    expect(
      document.querySelector('[data-route-transition="link-start"]'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Learner dashboard route"),
    ).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(LINK_START_ROUTE_SWAP_MS);
    });
    expect(screen.getByText("Learner dashboard route")).toBeVisible();
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
      await vi.advanceTimersByTimeAsync(ROUTE_TRANSITION_PRESS_COMMIT_MS);
      await vi.advanceTimersByTimeAsync(LINK_START_ROUTE_SWAP_MS);
    });

    expect(screen.getByText("Offline Practice route")).toBeVisible();
  });
});
