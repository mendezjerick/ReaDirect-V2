import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { SchoolAdminDashboardPage } from "../src/features/staff-dashboard/SchoolAdminDashboardPage";

describe("SchoolAdminDashboardPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("shows only the assigned school workspace", async () => {
    saveStaffSession({
      token: "school-admin-token".repeat(4),
      session: { expires_at: "2099-01-01T00:00:00Z" },
      staff: {
        id: 2,
        username: "school-admin-test",
        email: null,
        display_name: "School Administrator",
        role: "school_admin",
        school: { id: 3, name: "Northfield Elementary School" },
        requires_school_setup: false,
        requires_credential_setup: true,
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            school: { id: 3, name: "Northfield Elementary School" },
            metrics: {
              total_teachers: 0,
              total_learners: 0,
              active_learners: 0,
            },
            part_one_distribution: [
              { label: "Full Refresher", value: 0 },
              { label: "Moderate Refresher", value: 0 },
              { label: "Light Refresher", value: 0 },
              { label: "Grade Ready", value: 0 },
            ],
            recent_assessment_activity: [
              {
                id: 12,
                learner_id: 20,
                learner_code: "AA250",
                learner_name: "Dorothy Gale Wright",
                teacher_username: "teacher-maple",
                assessment_type: "diagnostic",
                assessment_label: "Diagnostic Assessment",
                status: "completed",
                score: 82,
                profile: "Developing Reader",
                occurred_at: "2026-07-25T10:00:00Z",
              },
            ],
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

    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <MemoryRouter initialEntries={["/staff/school-admin"]}>
          <SchoolAdminDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Northfield Elementary School",
      }),
    ).toBeVisible();
    expect(screen.getByText("Temporary credentials are active.")).toBeVisible();
    expect(screen.queryByText("AI services")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Teachers" })[0],
    ).toHaveAttribute("href", "/staff/school-admin/teachers");
    expect(
      screen.getByRole("button", { name: "Create Teacher" }),
    ).toBeEnabled();
    expect(await screen.findByText("Dorothy Gale Wright")).toBeVisible();
    for (const label of [
      "School Profile",
      "Manage Learners",
      "Manage Classes",
      "School Reports",
      "Teacher Dashboards",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeEnabled();
    }
    expect(screen.queryByText(/next|later/i)).not.toBeInTheDocument();
  });
});
