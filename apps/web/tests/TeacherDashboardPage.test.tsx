import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { TeacherDashboardPage } from "../src/features/staff-dashboard/TeacherDashboardPage";

const emptyProfiles = [
  { label: "Low Emerging Reader", value: 0 },
  { label: "High Emerging Reader", value: 0 },
  { label: "Developing Reader", value: 0 },
  { label: "Transitioning Reader", value: 0 },
  { label: "Reading at Grade Level", value: 0 },
];

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
      requires_credential_setup: true,
      grade_level: 1,
      section: "Maple",
      requires_assignment_acknowledgement: true,
    },
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/teacher"]}>
        <TeacherDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TeacherDashboardPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the assigned class and only Teacher tools", async () => {
    saveTeacherSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            school: { id: 4, name: "Northfield Elementary School" },
            assignment: { grade_level: 1, section: "Maple" },
            metrics: {
              total_learners: 0,
              diagnostic_complete: 0,
              diagnostic_pending: 0,
              ready_for_final: 0,
              final_complete: 0,
            },
            part_one_distribution: [
              { label: "Full Refresher", value: 0 },
              { label: "Moderate Refresher", value: 0 },
              { label: "Light Refresher", value: 0 },
              { label: "Grade Ready", value: 0 },
            ],
            diagnostic_reading_profile_distribution: emptyProfiles,
            final_reading_profile_distribution: emptyProfiles,
            recent_learner_activity: [
              {
                id: "lesson-18",
                learner_id: 12,
                learner_code: "AA012",
                learner_name: "Dorothy Gale Wright",
                activity_type: "lesson",
                title: "Lesson 6 · Comprehension",
                status: "completed",
                occurred_at: "2026-07-20T09:30:00+00:00",
              },
            ],
            teacher_lessons: [],
            requires_assignment_acknowledgement: true,
            requires_credential_setup: true,
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

    expect(
      screen.getByRole("heading", { name: "Grade 1 · Section Maple" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "You are part of Grade 1 Section Maple",
      }),
    ).toBeVisible();
    expect(await screen.findByText("Total learners")).toBeVisible();
    expect(screen.queryByText("AI services")).not.toBeInTheDocument();
    expect(screen.queryByText("School profile")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Learner" }),
    ).toBeEnabled();
    expect(await screen.findByText("Dorothy Gale Wright")).toBeVisible();
    expect(screen.getByText("Lesson 6 · Comprehension")).toBeVisible();
    expect(screen.getByText("Completed")).toBeVisible();
    expect(screen.getByRole("button", { name: "Review" })).toBeEnabled();
  });

  it("persists first-login assignment acknowledgement after the button commit", async () => {
    vi.useFakeTimers();
    saveTeacherSession();
    const fetchMock = vi
      .fn()
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              init?.method === "POST"
                ? {
                    requires_assignment_acknowledgement: false,
                    acknowledged_at: "2026-07-20T10:05:00+00:00",
                  }
                : {
                    school: {
                      id: 4,
                      name: "Northfield Elementary School",
                    },
                    assignment: { grade_level: 1, section: "Maple" },
                    metrics: {
                      total_learners: 0,
                      diagnostic_complete: 0,
                      diagnostic_pending: 0,
                      ready_for_final: 0,
                      final_complete: 0,
                    },
                    part_one_distribution: [],
                    diagnostic_reading_profile_distribution: [],
                    final_reading_profile_distribution: [],
                    recent_learner_activity: [],
                    teacher_lessons: [],
                    requires_assignment_acknowledgement: true,
                    requires_credential_setup: true,
                    generated_at: "2026-07-20T10:00:00+00:00",
                  },
            ),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/teacher/3/assignment-acknowledgement",
      expect.objectContaining({ method: "POST" }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(
      screen.queryByRole("heading", {
        name: "You are part of Grade 1 Section Maple",
      }),
    ).not.toBeInTheDocument();
  });
});
