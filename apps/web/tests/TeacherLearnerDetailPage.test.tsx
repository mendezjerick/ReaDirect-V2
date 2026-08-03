import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { TeacherLearnerDetailPage } from "../src/features/staff-dashboard/TeacherLearnerDetailPage";
import type { TeacherLearnerDetail } from "../src/features/staff-dashboard/teacherLearnerDetailApi";

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

const emptyPerformance = {
  independent_correct: 0,
  supported_correct: 0,
  demonstrated: 0,
  not_yet_correct: 0,
  unscorable_audio: 0,
  skipped: 0,
  academic_attempts: 0,
  technical_retries: 0,
  practice_attempts: 0,
  review_recommended: 0,
};

function learnerDetailPayload(): TeacherLearnerDetail {
  const lessons: TeacherLearnerDetail["lessons"] = Array.from(
    { length: 6 },
    (_, index) => ({
      lesson_key: `required-lesson-${index + 1}`,
      order: index + 1,
      title: [
        "Letter names",
        "Word reading",
        "Phrase reading",
        "Sentence reading",
        "Passage reading",
        "Comprehension",
      ][index],
      status: "not_started",
      current_mission_key: null,
      current_item_index: null,
      items_total: 0,
      items_recorded: 0,
      completed_at: null,
      performance: emptyPerformance,
      items: [],
    }),
  );

  lessons[1] = {
    ...lessons[1],
    status: "completed",
    current_mission_key: "mission-2",
    current_item_index: 0,
    items_total: 1,
    items_recorded: 1,
    completed_at: "2026-07-25T10:00:00Z",
    performance: {
      ...emptyPerformance,
      supported_correct: 1,
      academic_attempts: 2,
      technical_retries: 1,
      practice_attempts: 1,
      review_recommended: 1,
    },
    items: [
      {
        response_id: 10,
        mission_key: "mission-1",
        item_key: "lesson-v1-word-bag",
        item_order: 1,
        target_label: "bag",
        response_type: "speech",
        decision: "CORRECT",
        outcome: "SUPPORTED_CORRECT",
        final_transcript: "bag",
        academic_attempt_count: 2,
        technical_retry_count: 1,
        highest_scaffold_used: "targeted_clue",
        independent_mastery: false,
        diagnosis_key: "final_letter_substitution",
        review_recommended: true,
        practice_attempt_count: 1,
        attempts: [
          {
            attempt_id: 20,
            attempt_sequence: 1,
            attempt_kind: "independent",
            academic_attempt_number: 1,
            scaffold_level: "none",
            classification: "CLEAR_INCORRECT",
            decision: "INCORRECT",
            final_transcript: "bat",
            selected_response: null,
            incorrect: true,
            recorded_at: "2026-07-25T09:55:00Z",
          },
          {
            attempt_id: 21,
            attempt_sequence: 2,
            attempt_kind: "guided",
            academic_attempt_number: 2,
            scaffold_level: "targeted_clue",
            classification: "CLEAR_CORRECT",
            decision: "CORRECT",
            final_transcript: "bag",
            selected_response: null,
            incorrect: false,
            recorded_at: "2026-07-25T09:56:00Z",
          },
        ],
        completed_at: "2026-07-25T09:56:00Z",
      },
    ],
  };

  return {
    learner: {
      id: 12,
      learner_code: "AA012",
      full_name: "Dorothy Gale Wright",
      first_name: "Dorothy",
      middle_name: "Gale",
      last_name: "Wright",
      suffix: null,
      lrn: "123456789012",
      is_active: true,
      created_at: "2026-07-20T10:00:00Z",
    },
    class_context: {
      school: { id: 4, name: "Northfield Elementary School" },
      grade_level: 1,
      section: "Maple",
    },
    progression: {
      recorded: true,
      stage: "required_lessons",
      stage_label: "Reading lessons · 1 of 6 complete",
      current_required_lesson_order: 3,
      diagnostic_completed_at: "2026-07-24T10:00:00Z",
      final_assessment_completed_at: null,
      last_confirmed_at: "2026-07-25T10:00:00Z",
    },
    reading_path: {
      diagnostic: { status: "completed", score: 81 },
      lessons: ([1, 2, 3, 4, 5, 6] as const).map((order) => ({
        order,
        status: order === 1 ? "completed" : "not_started",
      })),
      completed_lesson_count: 1,
      final_assessment: { status: "locked" },
    },
    assessments: {
      diagnostic: {
        run_id: 8,
        assessment_type: "diagnostic",
        status: "completed",
        completion_mode: "standard",
        stage: "assessment_complete",
        part_one_branch: "high",
        task_scores: { task_1a: 8, task_2a: 10, task_2b: 7 },
        part_one_score: 25,
        part_one_level: "Light Refresher",
        reading_accuracy_percent: 82,
        comprehension_score: 4,
        comprehension_percent: 80,
        final_reading_score: 81,
        final_reading_profile: "Transitioning Reader",
        responses_recorded: 16,
        skipped_items: 1,
        started_at: "2026-07-24T09:00:00Z",
        part_one_completed_at: "2026-07-24T09:30:00Z",
        part_two_completed_at: "2026-07-24T10:00:00Z",
        completed_at: "2026-07-24T10:00:00Z",
      },
      final: null,
    },
    skipped_assessment_items: [
      {
        assessment_type: "diagnostic",
        assessment_label: "Diagnostic Assessment",
        task_key: "task-1a",
        task_label: "Letter Pronunciation",
        item_key: "task-1a-01",
        item_order: 1,
        item_label: "A a",
        recorded_at: "2026-07-24T09:05:00Z",
      },
    ],
    lessons,
    recommendations: [
      {
        key: "lesson-review:required-lesson-2:mission-1:lesson-v1-word-bag",
        kind: "persisted_lesson_review",
        title: "Revisit Word reading item 1",
        reason:
          "The saved outcome for Lesson 2 item 1 is Supported correct. Highest recorded support: Targeted clue. 1 clear incorrect practice attempt was persisted.",
        evidence: {
          lesson_key: "required-lesson-2",
          outcome: "SUPPORTED_CORRECT",
        },
      },
    ],
    generated_at: "2026-07-25T10:05:00Z",
  };
}

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/teacher/learners/12"]}>
        <Routes>
          <Route
            path="/staff/teacher/learners/:learnerId"
            element={<TeacherLearnerDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TeacherLearnerDetailPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("shows persisted assessment, lesson, attempt, and review evidence", async () => {
    saveTeacherSession();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(learnerDetailPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Dorothy Gale Wright" }),
    ).toBeVisible();
    expect(screen.getByText("Reading lessons · 1 of 6 complete")).toBeVisible();
    expect(screen.getByText("1 of 6")).toBeVisible();
    expect(screen.getByText("Transitioning Reader")).toBeVisible();
    expect(screen.getByText("Item 1: A a")).toBeVisible();
    expect(screen.getByRole("heading", { name: "bag" })).toBeVisible();
    expect(screen.getByText("bat")).toBeVisible();
    expect(screen.getAllByText("Targeted Clue").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: "Revisit Word reading item 1",
      }),
    ).toBeVisible();
    expect(screen.queryByText("Reset password")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit Learner")).not.toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/teacher/3/learners/12",
      expect.objectContaining({
        headers: expect.any(Object),
      }),
    );
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(request.headers).get("Authorization")).toBe(
      `Bearer ${"teacher-session-token".repeat(4)}`,
    );
  });

  it("explains when the Learner is outside the teacher scope", async () => {
    saveTeacherSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Not Found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderPage();

    expect(
      await screen.findByText(
        "This Learner is not assigned to your class or is unavailable.",
      ),
    ).toBeVisible();
  });
});
