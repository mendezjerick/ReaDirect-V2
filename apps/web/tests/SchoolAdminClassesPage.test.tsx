import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { SchoolAdminClassesPage } from "../src/features/staff-dashboard/SchoolAdminClassesPage";

describe("SchoolAdminClassesPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("updates class context without presenting learner-flow controls", async () => {
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
    const existingClass = {
      id: 8,
      teacher_name: "Teacher",
      username: "teacher-maple",
      grade_level: 3,
      section: "Maple",
      is_active: true,
      learner_count: 12,
      active_learner_count: 11,
    };
    const fetchMock = vi
      .fn()
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              init?.method === "PUT"
                ? {
                    class: {
                      ...existingClass,
                      grade_level: 4,
                      section: "Cedar",
                    },
                  }
                : { classes: [existingClass] },
            ),
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
          <SchoolAdminClassesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /Grade 3.*Maple/ }),
    );
    fireEvent.change(screen.getByLabelText("Grade level"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Section"), {
      target: { value: "Cedar" },
    });
    vi.useFakeTimers();
    fireEvent.click(
      screen.getByRole("button", { name: "Save class assignment" }),
    );

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
      await vi.runAllTimersAsync();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/school-admin/2/classes/8",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ grade_level: 4, section: "Cedar" }),
      }),
    );
    expect(
      screen.getByText(/Learner-flow records were not changed/),
    ).toBeVisible();
    expect(screen.queryByText(/reset progress/i)).not.toBeInTheDocument();
  });
});
