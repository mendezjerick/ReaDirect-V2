import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { SystemAdminSchoolsPage } from "../src/features/staff-dashboard/SystemAdminSchoolsPage";

const directoryResponse = {
  summary: {
    total_schools: 2,
    active_school_administrators: 1,
    active_teachers: 2,
    active_learners: 12,
    unassigned_school_administrators: 1,
  },
  schools: [
    {
      id: 1,
      name: "Alpha Elementary",
      school_administrators: { total: 2, active: 1 },
      teachers: { total: 2, active: 2 },
      learners: { total: 13, active: 12 },
      created_at: "2026-07-20T10:00:00+00:00",
    },
    {
      id: 2,
      name: "Bravo Elementary",
      school_administrators: { total: 0, active: 0 },
      teachers: { total: 0, active: 0 },
      learners: { total: 0, active: 0 },
      created_at: "2026-07-21T10:00:00+00:00",
    },
  ],
  generated_at: "2026-07-29T10:00:00+00:00",
};

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/system-admin/schools"]}>
        <SystemAdminSchoolsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SystemAdminSchoolsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows truthful school account counts and setup states", async () => {
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
      screen.getByRole("heading", { name: "Schools" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Schools" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await screen.findByText("Alpha Elementary")).toBeVisible();
    expect(screen.getByText("Bravo Elementary")).toBeVisible();
    expect(screen.getByText("1 active · 2 total")).toBeVisible();
    expect(screen.getByText("12 active · 13 total")).toBeVisible();
    expect(screen.getByText("Admin assigned")).toBeVisible();
    expect(screen.getByText("Admin needed")).toBeVisible();
    expect(
      screen.getByText("1 School Administrator account needs school setup."),
    ).toBeVisible();
  });

  it("filters the directory by school name without another request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(directoryResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(await screen.findByText("Alpha Elementary")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Search schools"), {
      target: { value: "bravo" },
    });

    expect(screen.queryByText("Alpha Elementary")).not.toBeInTheDocument();
    expect(screen.getByText("Bravo Elementary")).toBeVisible();
    expect(screen.getByText("1 shown")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
