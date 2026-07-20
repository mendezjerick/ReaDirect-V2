import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();
  return { ...motion, useReducedMotion: () => false };
});

import { createAppQueryClient } from "../src/app/AppProviders";
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
    available: false,
    reason:
      "Portal destinations will activate after assessment and lesson save records are implemented.",
  },
};

function renderPage() {
  window.sessionStorage.setItem(
    "readirect.staff-session",
    JSON.stringify({
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
        <SystemAdminPagePortalsPage />
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

  it("shows the isolated learner and explains why launches are unavailable", async () => {
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
    expect(
      screen.getByText("Portal launching is not active yet"),
    ).toBeVisible();
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
});
