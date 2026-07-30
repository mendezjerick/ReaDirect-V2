import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { SystemAdminGuestsPage } from "../src/features/staff-dashboard/SystemAdminGuestsPage";

const verifiedGuest = {
  id: 1,
  email: "verified@example.test",
  display_name: "Verified Reader",
  is_active: true,
  email_verified_at: "2026-07-29T10:00:00+00:00",
  last_signed_in_at: "2026-07-30T09:00:00+00:00",
  active_session_count: 2,
  created_at: "2026-07-20T10:00:00+00:00",
};

const pendingGuest = {
  id: 2,
  email: "pending@example.test",
  display_name: null,
  is_active: false,
  email_verified_at: null,
  last_signed_in_at: null,
  active_session_count: 0,
  created_at: "2026-07-21T10:00:00+00:00",
};

function directoryResponse(verifiedIsActive = true) {
  return {
    summary: {
      total_guests: 2,
      active_guests: verifiedIsActive ? 1 : 0,
      verified_guests: 1,
      pending_verification: 1,
      active_sessions: verifiedIsActive ? 2 : 0,
    },
    guests: [{ ...verifiedGuest, is_active: verifiedIsActive }, pendingGuest],
    generated_at: "2026-07-30T10:00:00+00:00",
  };
}

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/system-admin/guests"]}>
        <SystemAdminGuestsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SystemAdminGuestsPage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows Guest verification and access truth with local filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(directoryResponse()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(screen.getByRole("heading", { name: "Guests" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Guests" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await screen.findByText("Verified Reader")).toBeVisible();
    expect(screen.getByText("verified@example.test")).toBeVisible();
    expect(screen.getByText("pending@example.test")).toBeVisible();
    expect(screen.getByText("Email not verified")).toBeVisible();
    expect(
      screen.getByText("Email delivery is not connected yet."),
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText("Search guests"), {
      target: { value: "pending" },
    });
    fireEvent.change(screen.getByLabelText("Account status"), {
      target: { value: "active" },
    });

    expect(screen.getByText("No Guests match these filters.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requires confirmation before deactivation and refreshes access truth", async () => {
    let deactivated = false;
    const fetchMock = vi
      .fn()
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          deactivated = true;

          return Promise.resolve(
            new Response(
              JSON.stringify({
                guest: {
                  ...verifiedGuest,
                  is_active: false,
                  active_session_count: 0,
                },
                revoked_sessions: 2,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify(directoryResponse(!deactivated)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();
    expect(await screen.findByText("Verified Reader")).toBeVisible();
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    expect(
      screen.getByRole("alertdialog", {
        name: "Confirm deactivation for verified@example.test",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/immediately revokes 2 active sessions/i),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm deactivation" }),
    );

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/system-admin/guests/1/access",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ is_active: false }),
      }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(
      screen.queryByRole("alertdialog", {
        name: "Confirm deactivation for verified@example.test",
      }),
    ).not.toBeInTheDocument();
  });
});
