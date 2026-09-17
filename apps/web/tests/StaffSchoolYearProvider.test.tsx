import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { StaffShell } from "../src/components/staff/StaffShell";
import { StaffSchoolYearProvider } from "../src/features/staff-auth/StaffSchoolYearProvider";
import {
  getActiveStaffSchoolYear,
  saveStaffSession,
} from "../src/features/staff-auth/staffApi";

describe("StaffSchoolYearProvider", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders the year selector and changes the active staff scope", async () => {
    saveStaffSession({
      token: "staff-school-year-token".repeat(3),
      session: { expires_at: "2099-01-01T00:00:00Z" },
      staff: {
        id: 17,
        username: "year-admin",
        email: null,
        display_name: "Year Administrator",
        role: "system_admin",
        school: null,
        requires_school_setup: false,
        requires_credential_setup: false,
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            school_years: [
              {
                id: null,
                label: "2026-2027",
                start_year: 2026,
                end_year: 2027,
                is_current: false,
                status: "closed",
              },
              {
                id: null,
                label: "2025-2026",
                start_year: 2025,
                end_year: 2026,
                is_current: true,
                status: "current",
              },
            ],
            selected_school_year: {
              id: null,
              label: "2025-2026",
              start_year: 2025,
              end_year: 2026,
              is_current: true,
              status: "current",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <StaffSchoolYearProvider>
          <MemoryRouter initialEntries={["/staff/system-admin"]}>
            <StaffShell
              accountLabel="Year Administrator"
              exitCommitting={false}
              onExit={vi.fn()}
              brandIcon={<span aria-hidden="true">RD</span>}
            >
              <p>Staff content</p>
            </StaffShell>
          </MemoryRouter>
        </StaffSchoolYearProvider>
      </QueryClientProvider>,
    );

    const selector = await screen.findByRole("combobox", {
      name: "Selected school year",
    });
    expect(selector).toHaveValue("2025-2026");

    fireEvent.change(selector, { target: { value: "2026-2027" } });

    expect(selector).toHaveValue("2026-2027");
    expect(getActiveStaffSchoolYear()).toBe("2026-2027");
  });
});
