import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { SchoolAdminProfilePage } from "../src/features/staff-dashboard/SchoolAdminProfilePage";

describe("SchoolAdminProfilePage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("updates the school identity through the authenticated school route", async () => {
    saveStaffSession({
      token: "school-admin-token".repeat(4),
      session: { expires_at: "2099-01-01T00:00:00Z" },
      staff: {
        id: 2,
        username: "school-admin",
        email: null,
        display_name: "School Administrator",
        role: "school_admin",
        school: { id: 3, name: "Northfield Elementary School" },
        requires_school_setup: false,
        requires_credential_setup: true,
      },
    });
    const fetchMock = vi
      .fn()
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              school: {
                id: 3,
                name:
                  init?.method === "PUT"
                    ? "Northfield Primary School"
                    : "Northfield Elementary School",
                teachers: 2,
                learners: 18,
                created_at: "2026-07-20T10:00:00Z",
                updated_at: "2026-07-25T10:00:00Z",
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <MemoryRouter>
          <SchoolAdminProfilePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("18")).toBeVisible();
    fireEvent.change(screen.getByLabelText("School name"), {
      target: { value: "Northfield Primary School" },
    });
    vi.useFakeTimers();
    fireEvent.click(
      screen.getByRole("button", { name: "Save school profile" }),
    );

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
      await vi.runAllTimersAsync();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/school-admin/2/school-profile",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          school_name: "Northfield Primary School",
        }),
      }),
    );
    expect(screen.getByText("School profile updated.")).toBeVisible();
    expect(
      screen.getAllByText("Northfield Primary School").length,
    ).toBeGreaterThan(0);
  });
});
