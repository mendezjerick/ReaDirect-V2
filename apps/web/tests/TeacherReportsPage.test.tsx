import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { TeacherReportsPage } from "../src/features/staff-dashboard/TeacherReportsPage";

function saveTeacherSession() {
  saveStaffSession({
    token: "teacher-report-session-token".repeat(3),
    session: { expires_at: "2099-01-01T00:00:00Z" },
    staff: {
      id: 3,
      username: "teacher-test",
      email: null,
      display_name: "Teacher",
      role: "teacher",
      school: { id: 4, name: "Northfield Elementary School" },
      requires_school_setup: false,
      requires_credential_setup: false,
      grade_level: 1,
      section: "Maple",
      requires_assignment_acknowledgement: false,
    },
  });
}

describe("TeacherReportsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders a read-only report from the persisted server summary", async () => {
    saveTeacherSession();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          class_context: {
            school: { id: 4, name: "Northfield Elementary School" },
            grade_level: 1,
            section: "Maple",
          },
          generated_at: "2026-07-25T12:00:00Z",
          summary: {
            learners: 1,
            diagnostic_complete: 1,
            all_lessons_complete: 0,
            final_complete: 0,
            with_review_evidence: 1,
          },
          learners: [
            {
              learner_id: 12,
              learner_code: "AA012",
              learner_name: "Dorothy Gale Wright",
              active: true,
              stage: "required_lessons",
              stage_label: "Required lessons",
              diagnostic: {
                status: "completed",
                score: 81,
                profile: "Transitioning Reader",
                completed_at: "2026-07-24T12:00:00Z",
              },
              required_lessons_completed: 2,
              final: {
                status: "not_started",
                score: null,
                profile: null,
                completed_at: null,
              },
              skipped_items: 1,
              review_recommended_items: 1,
              has_review_evidence: true,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <MemoryRouter>
          <TeacherReportsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Class Progress Report" }),
    ).toBeVisible();
    expect(await screen.findByText("Dorothy Gale Wright")).toBeVisible();
    expect(
      screen.getByText("Transitioning Reader", { exact: false }),
    ).toBeVisible();
    expect(screen.getByText("2 of 6")).toBeVisible();
    expect(screen.getByText("1 skips · 1 flags")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).not.toEqual(
      expect.objectContaining({ method: "POST" }),
    );
  });
});
