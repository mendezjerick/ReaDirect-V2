import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { SchoolAdminLearnersPage } from "../src/features/staff-dashboard/SchoolAdminLearnersPage";

describe("SchoolAdminLearnersPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders only the school-scoped standard Learner response", async () => {
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            learners: [
              {
                id: 10,
                learner_code: "AA220",
                full_name: "Dorothy Gale Wright",
                grade_level: 3,
                section: "Maple",
                is_active: true,
                progress_stage: "required_lessons",
                reading_path: {
                  diagnostic: { status: "skipped", score: 0 },
                  lessons: [1, 2, 3, 4, 5, 6].map((order) => ({
                    order,
                    status: order === 4 ? "completed" : "not_started",
                  })),
                  completed_lesson_count: 1,
                  final_assessment: { status: "locked" },
                },
                teacher: {
                  id: 8,
                  name: "Teacher",
                  username: "teacher-maple",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <MemoryRouter>
          <SchoolAdminLearnersPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Dorothy Gale Wright")).toBeVisible();
    expect(screen.getByText("AA220")).toBeVisible();
    expect(screen.getByText("teacher-maple")).toBeVisible();
    expect(screen.getByText(/Diagnostic skipped · Score 0/)).toBeVisible();
    expect(screen.getByText(/KW000/)).toBeVisible();
    expect(screen.queryByText("Reset progress")).not.toBeInTheDocument();
  });
});
