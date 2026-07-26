import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { SchoolAdminInstructionalInsightsPage } from "../src/features/staff-dashboard/SchoolAdminInstructionalInsightsPage";

describe("SchoolAdminInstructionalInsightsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders deterministic school-scoped face-to-face priorities", async () => {
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
        requires_credential_setup: false,
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          school: { id: 3, name: "Northfield Elementary School" },
          generated_at: "2026-07-26T10:00:00Z",
          read_only: true,
          rules_version: "school-instructional-insights-v1",
          summary: {
            active_learners: 18,
            learners_with_evidence: 7,
            assessment_skips: 5,
            lesson_skips: 2,
            review_recommended_items: 3,
            teaching_priorities: 1,
          },
          priorities: [
            {
              rank: 1,
              key: "word-reading",
              title: "Teach word reading face-to-face",
              topic: "Word reading",
              reason:
                "7 active learners have 10 persisted evidence items for this instructional topic.",
              affected_learners: 7,
              evidence_items: 10,
              assessment_skips: 5,
              lesson_skips: 2,
              review_recommended_items: 3,
              affected_classes: 1,
            },
          ],
          assessment_breakdown: [
            {
              task_key: "task-2b",
              title: "Word Pronunciation",
              topic_key: "word-reading",
              diagnostic_skips: 3,
              final_skips: 2,
              affected_learners: 5,
            },
          ],
          lesson_breakdown: [
            {
              lesson_key: "required-lesson-2",
              order: 2,
              title: "Word reading",
              topic_key: "word-reading",
              skipped_items: 2,
              review_recommended_items: 3,
              affected_learners: 4,
            },
          ],
          class_breakdown: [
            {
              key: "8:3:Maple",
              teacher: {
                id: 8,
                name: "Teacher",
                username: "teacher-maple",
              },
              grade_level: 3,
              section: "Maple",
              cohort_size: 18,
              assessment_skips: 5,
              lesson_skips: 2,
              review_recommended_items: 3,
              affected_learners: 7,
              evidence_items: 10,
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
          <SchoolAdminInstructionalInsightsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Teach word reading face-to-face",
      }),
    ).toBeVisible();
    expect(screen.getByText("Word Pronunciation")).toBeVisible();
    expect(screen.getByText("teacher-maple")).toBeVisible();
    expect(screen.getByText(/do not use generated conclusions/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /apply/i })).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/staff/school-admin/2/instructional-insights",
    );
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Accept"),
    ).toBe("application/json");
  });
});
