import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { TeacherAnalyticsPage } from "../src/features/staff-dashboard/TeacherAnalyticsPage";

function saveTeacherSession() {
  saveStaffSession({
    token: "teacher-analytics-session-token".repeat(3),
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

describe("TeacherAnalyticsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("keeps independent, supported, technical, and review evidence separate", async () => {
    saveTeacherSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            class_context: {
              school_name: "Northfield Elementary School",
              grade_level: 1,
              section: "Maple",
            },
            generated_at: "2026-07-25T12:00:00Z",
            cohort_size: 1,
            lesson_evidence: {
              recorded_items: 3,
              independent_success: 1,
              supported_success: 1,
              demonstrated_items: 0,
              not_yet_correct: 0,
              unscorable_recordings: 1,
              review_recommended: 1,
              technical_retries: 3,
            },
            assessment_skips: { diagnostic: 1, final: 0 },
            lesson_breakdown: [
              {
                lesson_key: "required-lesson-2",
                title: "Lesson 2 · Word reading",
                cohort_size: 1,
                learners_started: 1,
                learners_completed: 1,
                recorded_items: 3,
                independent_success: 1,
                supported_success: 1,
                review_recommended: 1,
              },
            ],
            diagnoses: [
              {
                diagnosis_key: "final_letter_substitution",
                label: "Final letter substitution",
                items: 1,
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
          <TeacherAnalyticsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Lesson 2 · Word reading")).toBeVisible();
    expect(screen.getByText("Independent success")).toBeVisible();
    expect(screen.getByText("Supported success")).toBeVisible();
    expect(screen.getByText("Unscorable audio")).toBeVisible();
    expect(screen.getByText("Technical retries")).toBeVisible();
    expect(screen.getByText("Final letter substitution")).toBeVisible();
    expect(
      screen.getByText("not conclusions about a Learner.", { exact: false }),
    ).toBeVisible();
  });
});
