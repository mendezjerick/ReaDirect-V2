import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { SystemAdminTeachersPage } from "../src/features/staff-dashboard/SystemAdminTeachersPage";

const directoryResponse = {
  summary: {
    total_teachers: 3,
    active_teachers: 2,
    active_standard_learners: 10,
    pending_assignment_acknowledgements: 1,
    incomplete_assignments: 1,
    schools_represented: 2,
  },
  teachers: [
    {
      id: 1,
      username: "alpha-teacher",
      display_name: "Teacher",
      is_active: true,
      school: { id: 1, name: "Alpha Elementary" },
      grade_level: 2,
      section: "Maple",
      assignment_complete: true,
      requires_assignment_acknowledgement: false,
      requires_credential_setup: false,
      learners: { total: 10, active: 9 },
      created_at: "2026-07-20T10:00:00+00:00",
    },
    {
      id: 2,
      username: "bravo-teacher",
      display_name: "Teacher",
      is_active: false,
      school: { id: 2, name: "Bravo Elementary" },
      grade_level: 4,
      section: "Rizal",
      assignment_complete: true,
      requires_assignment_acknowledgement: true,
      requires_credential_setup: true,
      learners: { total: 1, active: 1 },
      created_at: "2026-07-21T10:00:00+00:00",
    },
    {
      id: 3,
      username: "unassigned-teacher",
      display_name: "Teacher",
      is_active: true,
      school: null,
      grade_level: null,
      section: null,
      assignment_complete: false,
      requires_assignment_acknowledgement: false,
      requires_credential_setup: false,
      learners: { total: 0, active: 0 },
      created_at: "2026-07-22T10:00:00+00:00",
    },
  ],
  generated_at: "2026-07-29T10:00:00+00:00",
};

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/system-admin/teachers"]}>
        <SystemAdminTeachersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SystemAdminTeachersPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows global Teacher assignment and account truth", async () => {
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
      screen.getByRole("heading", { name: "Teachers" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Teachers" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await screen.findByText("alpha-teacher")).toBeVisible();
    expect(screen.getByText("bravo-teacher")).toBeVisible();
    expect(screen.getByText("unassigned-teacher")).toBeVisible();
    expect(screen.getByText("9 active · 10 total")).toBeVisible();
    expect(
      screen.getAllByText("Awaiting acknowledgement").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Assignment incomplete").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText("1 Teacher account has an incomplete assignment."),
    ).toBeVisible();
  });

  it("filters Teachers locally by search and account status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(directoryResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(await screen.findByText("alpha-teacher")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Search teachers"), {
      target: { value: "bravo" },
    });

    expect(screen.queryByText("alpha-teacher")).not.toBeInTheDocument();
    expect(screen.getByText("bravo-teacher")).toBeVisible();
    expect(screen.getByText("1 shown")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Account status"), {
      target: { value: "active" },
    });

    expect(screen.getByText("No Teachers match these filters.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
