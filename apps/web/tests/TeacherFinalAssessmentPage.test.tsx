import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { TeacherFinalAssessmentPage } from "../src/features/staff-dashboard/TeacherFinalAssessmentPage";

function saveTeacherSession() {
  saveStaffSession({
    token: "teacher-session-token".repeat(4),
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

describe("TeacherFinalAssessmentPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("separates readiness from persisted Final Assessment activity", async () => {
    saveTeacherSession();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          assessment_type: "final",
          metrics: {
            total_learners: 4,
            pending: 0,
            not_ready: 1,
            ready: 1,
            in_progress: 1,
            completed: 1,
            with_skipped_items: 1,
          },
          learners: [
            {
              learner: {
                id: 10,
                learner_code: "AA010",
                full_name: "Alice Maple Reader",
              },
              status: "not_ready",
              part_one_score: null,
              part_one_level: null,
              reading_accuracy_percent: null,
              comprehension_score: null,
              comprehension_percent: null,
              final_reading_score: null,
              final_reading_profile: null,
              skipped_items_count: 0,
              completed_at: null,
              last_activity_at: null,
            },
            {
              learner: {
                id: 11,
                learner_code: "AA011",
                full_name: "Dorothy Gale Wright",
              },
              status: "ready",
              part_one_score: null,
              part_one_level: null,
              reading_accuracy_percent: null,
              comprehension_score: null,
              comprehension_percent: null,
              final_reading_score: null,
              final_reading_profile: null,
              skipped_items_count: 0,
              completed_at: null,
              last_activity_at: null,
            },
            {
              learner: {
                id: 12,
                learner_code: "AA012",
                full_name: "Matilda Book Worm",
              },
              status: "in_progress",
              part_one_score: 30,
              part_one_level: "Grade Ready",
              reading_accuracy_percent: null,
              comprehension_score: null,
              comprehension_percent: null,
              final_reading_score: null,
              final_reading_profile: null,
              skipped_items_count: 0,
              completed_at: null,
              last_activity_at: "2026-07-20T09:00:00+00:00",
            },
            {
              learner: {
                id: 13,
                learner_code: "AA013",
                full_name: "Zelda Final Reader",
              },
              status: "completed",
              part_one_score: 30,
              part_one_level: "Grade Ready",
              reading_accuracy_percent: 95,
              comprehension_score: 5,
              comprehension_percent: 100,
              final_reading_score: 97,
              final_reading_profile: "Reading at Grade Level",
              skipped_items_count: 1,
              completed_at: "2026-07-20T09:30:00+00:00",
              last_activity_at: "2026-07-20T09:30:00+00:00",
            },
          ],
          generated_at: "2026-07-20T10:00:00+00:00",
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
        <MemoryRouter
          initialEntries={["/staff/teacher/assessments/final"]}
        >
          <Routes>
            <Route
              path="/staff/teacher/assessments/final"
              element={<TeacherFinalAssessmentPage />}
            />
            <Route
              path="/staff/teacher/learners/:learnerId"
              element={<div>Learner detail opened</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Final Assessment" }),
    ).toBeVisible();
    const notReadyRow = (
      await screen.findByText("Alice Maple Reader")
    ).closest<HTMLElement>('[role="row"]');
    const readyRow = screen
      .getByText("Dorothy Gale Wright")
      .closest<HTMLElement>('[role="row"]');
    const completedRow = screen
      .getByText("Zelda Final Reader")
      .closest<HTMLElement>('[role="row"]');
    expect(notReadyRow).not.toBeNull();
    expect(readyRow).not.toBeNull();
    expect(completedRow).not.toBeNull();
    expect(within(notReadyRow!).getByText("Not ready")).toBeVisible();
    expect(within(readyRow!).getByText("Ready")).toBeVisible();
    expect(
      within(completedRow!).getByText("Reading at Grade Level"),
    ).toBeVisible();

    const [requestUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe("/api/staff/teacher/3/assessments/final");

    vi.useFakeTimers();
    fireEvent.click(
      within(completedRow!).getByRole("button", { name: "View details" }),
    );
    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
    });

    expect(screen.getByText("Learner detail opened")).toBeVisible();
  }, 15_000);
});
