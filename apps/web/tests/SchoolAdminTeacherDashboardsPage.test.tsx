import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { SchoolAdminTeacherDashboardsPage } from "../src/features/staff-dashboard/SchoolAdminTeacherDashboardsPage";

describe("SchoolAdminTeacherDashboardsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("reviews a Teacher class without impersonating the Teacher", async () => {
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
    const teacher = {
      id: 8,
      username: "teacher-maple",
      display_name: "Teacher",
      is_active: true,
      grade_level: 3,
      section: "Maple",
      requires_credential_setup: false,
      created_at: "2026-07-25T10:00:00Z",
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            String(input).includes("teacher-dashboards")
              ? {
                  teacher: {
                    id: 8,
                    name: "Teacher",
                    username: "teacher-maple",
                    is_active: true,
                    grade_level: 3,
                    section: "Maple",
                  },
                  overview: {
                    metrics: {
                      total_learners: 1,
                      diagnostic_complete: 1,
                      diagnostic_pending: 0,
                      ready_for_final: 0,
                      final_complete: 0,
                    },
                    part_one_distribution: [{ label: "Grade Ready", value: 1 }],
                    diagnostic_reading_profile_distribution: [],
                    final_reading_profile_distribution: [],
                    recent_learner_activity: [],
                  },
                  report: {
                    summary: {
                      learners: 1,
                      diagnostic_complete: 1,
                      all_lessons_complete: 0,
                      final_complete: 0,
                      with_review_evidence: 0,
                    },
                    learners: [
                      {
                        learner_id: 10,
                        learner_code: "AA240",
                        learner_name: "Dorothy Gale Wright",
                        active: true,
                        stage: "required_lessons",
                        stage_label: "Required lessons",
                        diagnostic: {
                          status: "completed",
                          score: 78,
                          profile: "Developing Reader",
                          completed_at: "2026-07-25T10:00:00Z",
                        },
                        required_lessons_completed: 2,
                        final: {
                          status: "not_started",
                          score: null,
                          profile: null,
                          completed_at: null,
                        },
                        skipped_items: 0,
                        review_recommended_items: 0,
                        has_review_evidence: false,
                      },
                    ],
                  },
                  read_only: true,
                  impersonating: false,
                  generated_at: "2026-07-25T10:00:00Z",
                }
              : { teachers: [teacher] },
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
          <SchoolAdminTeacherDashboardsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /teacher-maple/ }),
    );

    expect(await screen.findByText("Dorothy Gale Wright")).toBeVisible();
    expect(screen.getByText("No impersonation")).toBeVisible();
    expect(
      screen.getByText(/cannot acknowledge the Teacher’s assignment/),
    ).toBeVisible();
    expect(screen.queryByText(/edit learner/i)).not.toBeInTheDocument();
  });
});
