import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();
  return { ...motion, useReducedMotion: () => false };
});

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { SystemAdminPagePortalsPage } from "../src/features/staff-dashboard/SystemAdminPagePortalsPage";

const response = {
  learner: {
    id: 10,
    learner_code: "KW000",
    full_name: "Kristen Rhine Wright",
    account_purpose: "portal_system",
    is_active: true,
    analytics_excluded: true,
    progress_stage: "before_diagnostic",
    last_reset_at: null,
    active_standard_sessions: 1,
    active_portal_run: null,
  },
  portal_launch: {
    available: true,
    reason:
      "The Learner Dashboard and all implemented workflow checkpoints are ready for persisted testing.",
    targets: [
      {
        key: "learner-dashboard",
        label: "Learner Dashboard",
        description: "Open Kristen at the normal learner starting dashboard.",
        task: "Dashboard",
      },
      {
        key: "assessment-orientation",
        label: "Microphone check",
        description: "Open Part 1 before the first scored item.",
        task: "Setup",
      },
      {
        key: "assessment-task-1a",
        label: "Letters",
        description: "Start Task 1A at its first letter pair.",
        task: "Task 1A",
      },
      {
        key: "assessment-task-2a",
        label: "Rhyme Yes / No",
        description: "Use the low branch and open its first rhyme pair.",
        task: "Task 2A",
      },
      {
        key: "assessment-task-2b",
        label: "Words",
        description: "Use the high branch and open its first word.",
        task: "Task 2B",
      },
      {
        key: "assessment-part-1-results",
        label: "Part 1 Results",
        description: "Open a persisted high-branch Part 1 result.",
        task: "Result",
      },
      {
        key: "assessment-story-selection",
        label: "Choose a Story",
        description: "Open the unscored story choice before passage reading.",
        task: "Part 2",
      },
      {
        key: "assessment-task-3a",
        label: "Passage Reading",
        description: "Open the selected story at the passage recording task.",
        task: "Task 3A",
      },
      {
        key: "assessment-task-3b",
        label: "Comprehension",
        description: "Open the first linked 5W question.",
        task: "Task 3B",
      },
      {
        key: "assessment-part-2-results",
        label: "Part 2 Results",
        description: "Open a completed Part 2 result.",
        task: "Result",
      },
      {
        key: "assessment-complete",
        label: "Assessment Complete",
        description: "Open the final assessment completion screen.",
        task: "Completion",
      },
    ],
  },
};

function renderPage() {
  window.sessionStorage.setItem(
    "readirect.staff-session",
    JSON.stringify({
      token: "system-admin-token".repeat(4),
      session: { expires_at: "2099-01-01T00:00:00Z" },
      staff: {
        id: 1,
        username: "rd07170",
        email: null,
        display_name: "System Administrator",
        role: "system_admin",
        school: null,
        requires_school_setup: false,
        requires_credential_setup: false,
      },
    }),
  );

  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/system-admin/page-portals"]}>
        <Routes>
          <Route
            path="/staff/system-admin/page-portals"
            element={<SystemAdminPagePortalsPage />}
          />
          <Route
            path="/learner/assessment/part-one"
            element={<div>Assessment portal opened</div>}
          />
          <Route
            path="/learner/assessment/part-two"
            element={<div>Part two portal opened</div>}
          />
          <Route
            path="/learner/assessment/complete"
            element={<div>Completion portal opened</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SystemAdminPagePortalsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows the isolated learner and all diagnostic checkpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    renderPage();

    expect(await screen.findByText("Kristen Rhine Wright")).toBeVisible();
    expect(screen.getByText("KW000")).toBeVisible();
    expect(screen.getByText("Excluded")).toBeVisible();
    expect(screen.getByText("Rhyme Yes / No")).toBeVisible();
    expect(screen.getByText("Passage Reading")).toBeVisible();
    expect(screen.getByText("Assessment Complete")).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: /^Open .* portal$/ })[0],
    ).toHaveAccessibleName("Open Learner Dashboard portal");
    expect(
      screen.getByRole("button", { name: "Open Words portal" }),
    ).toBeEnabled();
  });

  it("requires confirmation and preserves the button animation before reset", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...response,
            learner: {
              ...response.learner,
              active_standard_sessions: 0,
              last_reset_at: "2026-07-20T12:00:00+00:00",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Reset Kristen's progress" }),
    );
    expect(screen.getByText("Reset Kristen now?")).toBeVisible();

    vi.useFakeTimers();
    const confirm = screen.getByRole("button", { name: "Confirm reset" });
    fireEvent.click(confirm);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(BUTTON_PRESS_COMMIT_MS);
    });

    expect(screen.getByText(/Kristen is back at the start/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("creates a portal session and opens the selected assessment task", async () => {
    const launchResponse = {
      ...response,
      learner: {
        ...response.learner,
        active_standard_sessions: 0,
        active_portal_run: {
          id: 9,
          target_key: "assessment-task-2a",
          started_at: "2026-07-22T12:00:00+00:00",
          expires_at: "2026-07-22T13:00:00+00:00",
        },
      },
      message: "Kristen is ready at assessment-task-2a.",
      launch: {
        target_key: "assessment-task-2a",
        route: "/learner/assessment/part-one",
        learner_session: {
          token: "portal-token",
          learner: {
            id: 10,
            learner_code: "KW000",
            full_name: "Kristen Rhine Wright",
            first_name: "Kristen",
            account_purpose: "portal_system",
            achievement_keys: [],
            school: null,
            grade_level: null,
            section: null,
            progress: {
              stage: "before_diagnostic",
              current_required_lesson_order: null,
            },
          },
          session: { expires_at: "2026-07-22T13:00:00+00:00" },
        },
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(launchResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    const openRhyme = await screen.findByRole("button", {
      name: "Open Rhyme Yes / No portal",
    });
    fireEvent.click(openRhyme);

    await screen.findByText("Assessment portal opened");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/staff/system-admin/1/page-portals/launch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ target_key: "assessment-task-2a" }),
      }),
    );
    expect(screen.getByText("Assessment portal opened")).toBeVisible();
    expect(
      JSON.parse(
        window.sessionStorage.getItem("readirect.learner-session") ?? "null",
      ),
    ).toEqual(launchResponse.launch.learner_session);
  });
});
