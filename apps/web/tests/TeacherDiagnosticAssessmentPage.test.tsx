import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { TeacherDiagnosticAssessmentPage } from "../src/features/staff-dashboard/TeacherDiagnosticAssessmentPage";

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

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/teacher/assessments/diagnostic"]}>
        <Routes>
          <Route
            path="/staff/teacher/assessments/diagnostic"
            element={<TeacherDiagnosticAssessmentPage />}
          />
          <Route
            path="/staff/teacher/learners/:learnerId"
            element={<div>Learner detail opened</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TeacherDiagnosticAssessmentPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders persisted class-scoped results and opens learner detail", async () => {
    saveTeacherSession();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          assessment_type: "diagnostic",
          metrics: {
            total_learners: 2,
            pending: 1,
            not_ready: 0,
            ready: 0,
            in_progress: 0,
            completed: 1,
            skipped_assessments: 1,
            with_skipped_items: 0,
          },
          learners: [
            {
              learner: {
                id: 10,
                learner_code: "AA010",
                full_name: "Alice Maple Reader",
              },
              status: "pending",
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
                full_name: "Dorothy Gale Wright",
              },
              status: "completed",
              completion_mode: "skipped",
              part_one_score: 0,
              part_one_level: "Full Refresher",
              reading_accuracy_percent: 0,
              comprehension_score: 0,
              comprehension_percent: 0,
              final_reading_score: 0,
              final_reading_profile: "Low Emerging Reader",
              skipped_items_count: 0,
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

    renderPage();

    const dorothy = await screen.findByText("Dorothy Gale Wright");
    const dorothyRow = dorothy.closest<HTMLElement>('[role="row"]');
    expect(dorothyRow).not.toBeNull();
    expect(within(dorothyRow!).getByText("Full Refresher")).toBeVisible();
    expect(within(dorothyRow!).getByText("Low Emerging Reader")).toBeVisible();
    expect(
      within(dorothyRow!).getByText("Skipped", { selector: ".staff-badge" }),
    ).toBeVisible();
    expect(within(dorothyRow!).getByText("Whole assessment")).toBeVisible();
    expect(screen.getByText("Alice Maple Reader")).toBeVisible();
    expect(screen.queryByText("Reset password")).not.toBeInTheDocument();
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(requestUrl).toBe("/api/staff/teacher/3/assessments/diagnostic");
    expect(new Headers(requestInit.headers).get("Authorization")).toBe(
      `Bearer ${"teacher-session-token".repeat(4)}`,
    );

    vi.useFakeTimers();
    fireEvent.click(
      within(dorothyRow!).getByRole("button", { name: "View details" }),
    );
    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
    });

    expect(screen.getByText("Learner detail opened")).toBeVisible();
  });

  it("shows an honest empty state when the Teacher has no assigned learners", async () => {
    saveTeacherSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            assessment_type: "diagnostic",
            metrics: {
              total_learners: 0,
              pending: 0,
              not_ready: 0,
              ready: 0,
              in_progress: 0,
              completed: 0,
              with_skipped_items: 0,
            },
            learners: [],
            generated_at: "2026-07-20T10:00:00+00:00",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    renderPage();

    expect(await screen.findByText("No assigned Learners yet.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "View details" })).toBeNull();
  });
});
