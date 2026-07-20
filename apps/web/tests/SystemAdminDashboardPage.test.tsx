import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/AppProviders";
import { SystemAdminDashboardPage } from "../src/features/staff-dashboard/SystemAdminDashboardPage";

const overviewResponse = {
  metrics: {
    total_schools: 0,
    total_teachers: 0,
    total_learners: 0,
    sandbox_attempts: 0,
  },
  part_one_distribution: [
    { label: "Full Refresher", value: 0 },
    { label: "Moderate Refresher", value: 0 },
    { label: "Light Refresher", value: 0 },
    { label: "Grade Ready", value: 0 },
  ],
  reading_profile_distribution: [],
  system_health: [
    { service: "API", status: "online", detail: "API is responding." },
    {
      service: "Database",
      status: "online",
      detail: "PostgreSQL is connected.",
    },
  ],
  recent_assessment_activity: [],
  recent_actions: [
    {
      id: 1,
      description: "Development account prepared.",
      actor: "System Administrator",
      occurred_at: "2026-07-19T10:00:00+00:00",
    },
  ],
  generated_at: "2026-07-19T10:00:00+00:00",
};

function renderDashboard() {
  const queryClient = createAppQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/staff/system-admin"]}>
        <SystemAdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SystemAdminDashboardPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the documented system overview data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(overviewResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderDashboard();

    expect(
      screen.getByRole("heading", { name: "System overview" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("PostgreSQL is connected.")).toBeVisible();
    expect(screen.getByText("Development account prepared.")).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Dashboard navigation" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "School administrators" }),
    ).toHaveAttribute("href", "/staff/system-admin/school-administrators");
  });
});
