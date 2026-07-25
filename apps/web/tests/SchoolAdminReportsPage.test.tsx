import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { SchoolAdminReportsPage } from "../src/features/staff-dashboard/SchoolAdminReportsPage";

describe("SchoolAdminReportsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders a read-only school report from the scoped API", async () => {
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
    const learner = {
      learner_id: 10,
      learner_code: "AA230",
      learner_name: "Dorothy Gale Wright",
      active: true,
      stage: "required_lessons",
      stage_label: "Required lessons",
      diagnostic: {
        status: "completed",
        score: 74,
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
      skipped_items: 1,
      review_recommended_items: 2,
      has_review_evidence: true,
      teacher: { id: 8, name: "Teacher", username: "teacher-maple" },
      grade_level: 3,
      section: "Maple",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            school: { id: 3, name: "Northfield Elementary School" },
            generated_at: "2026-07-25T10:00:00Z",
            summary: {
              teachers: 1,
              classes: 1,
              learners: 1,
              diagnostic_complete: 1,
              all_lessons_complete: 0,
              final_complete: 0,
              with_review_evidence: 1,
            },
            classes: [
              {
                teacher: learner.teacher,
                grade_level: 3,
                section: "Maple",
                summary: {
                  learners: 1,
                  diagnostic_complete: 1,
                  all_lessons_complete: 0,
                  final_complete: 0,
                  with_review_evidence: 1,
                },
                learners: [learner],
              },
            ],
            learners: [learner],
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
          <SchoolAdminReportsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Dorothy Gale Wright")).toBeVisible();
    expect(screen.getByText("teacher-maple")).toBeVisible();
    expect(screen.getByText("2/6 lessons")).toBeVisible();
    expect(
      screen.getByText(/writes no learner-flow or audit data/),
    ).toBeVisible();
    expect(screen.queryByText(/reset progress/i)).not.toBeInTheDocument();
  });
});
