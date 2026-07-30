import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { SystemAdminLearnersPage } from "../src/features/staff-dashboard/SystemAdminLearnersPage";

const directoryResponse = {
  summary: {
    total_learners: 3,
    active_learners: 2,
    diagnostic_completed: 2,
    final_assessment_completed: 1,
    without_teacher: 1,
    schools_represented: 2,
  },
  learners: [
    {
      id: 1,
      learner_code: "AA001",
      full_name: "Ana Santos",
      is_active: true,
      school: { id: 1, name: "Alpha Elementary" },
      teacher: {
        id: 10,
        username: "alpha-teacher",
        display_name: "Teacher",
        is_active: true,
      },
      grade_level: 2,
      section: "Maple",
      progress: {
        stage: "required-lesson-3",
        current_required_lesson_order: 3,
        diagnostic_completed: true,
        final_assessment_completed: false,
        last_confirmed_at: "2026-07-29T10:00:00+00:00",
      },
      created_at: "2026-07-20T10:00:00+00:00",
    },
    {
      id: 2,
      learner_code: "BB001",
      full_name: "Ben Reyes",
      is_active: false,
      school: { id: 2, name: "Bravo Elementary" },
      teacher: null,
      grade_level: 4,
      section: "Rizal",
      progress: {
        stage: "reading_journey_complete",
        current_required_lesson_order: null,
        diagnostic_completed: true,
        final_assessment_completed: true,
        last_confirmed_at: "2026-07-28T10:00:00+00:00",
      },
      created_at: "2026-07-21T10:00:00+00:00",
    },
    {
      id: 3,
      learner_code: "CC001",
      full_name: "Cara Lim",
      is_active: true,
      school: { id: 1, name: "Alpha Elementary" },
      teacher: {
        id: 11,
        username: "inactive-teacher",
        display_name: "Teacher",
        is_active: false,
      },
      grade_level: 1,
      section: "Acacia",
      progress: {
        stage: "before_diagnostic",
        current_required_lesson_order: null,
        diagnostic_completed: false,
        final_assessment_completed: false,
        last_confirmed_at: null,
      },
      created_at: "2026-07-22T10:00:00+00:00",
    },
  ],
  generated_at: "2026-07-29T10:00:00+00:00",
};

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/system-admin/learners"]}>
        <SystemAdminLearnersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SystemAdminLearnersPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows standard Learner assignment and progress truth", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(directoryResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderPage();

    expect(
      screen.getByRole("heading", { name: "Learners" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Learners" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await screen.findByText("Ana Santos")).toBeVisible();
    expect(screen.getByText("Ben Reyes")).toBeVisible();
    expect(screen.getByText("Cara Lim")).toBeVisible();
    expect(screen.getByText("Lesson 3")).toBeVisible();
    expect(screen.getByText("Reading journey complete")).toBeVisible();
    expect(screen.getByText("Inactive Teacher account")).toBeVisible();
    expect(
      screen.getByText("1 Learner is not assigned to a Teacher."),
    ).toBeVisible();
    expect(screen.queryByText("KW000")).not.toBeInTheDocument();
  });

  it("filters Learners locally by search and account status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(directoryResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(await screen.findByText("Ana Santos")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Search Learners"), {
      target: { value: "ben" },
    });

    expect(screen.queryByText("Ana Santos")).not.toBeInTheDocument();
    expect(screen.getByText("Ben Reyes")).toBeVisible();
    expect(screen.getByText("1 shown")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Account status"), {
      target: { value: "active" },
    });

    expect(screen.getByText("No Learners match these filters.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
