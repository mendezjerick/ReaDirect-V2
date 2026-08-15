import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
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
    {
      service: "ASR",
      status: "degraded",
      detail: "The ASR service responded, but its model is not ready.",
    },
    {
      service: "TTS",
      status: "offline",
      detail: "The runtime voice service did not answer.",
    },
  ],
  speech_processing: {
    conditional_mu_noise_reduction_enabled: false,
    default_mode: "raw_first",
  },
  recent_assessment_activity: [
    {
      id: 12,
      learner_id: 7,
      learner_code: "AA001",
      learner_name: "Ana Santos",
      school_name: "Northfield Elementary",
      assessment_type: "final",
      assessment_label: "Final Assessment",
      status: "completed",
      score: 29,
      profile: "Reading at Grade Level",
      occurred_at: "2026-07-19T09:55:00+00:00",
    },
  ],
  recent_speech_failures: [
    {
      id: 4,
      source: "True Sandbox",
      mode: "general",
      status_code: 503,
      summary: "The ASR service returned HTTP 503.",
      occurred_at: "2026-07-19T09:58:00+00:00",
    },
  ],
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
  saveStaffSession({
    token: "system-admin-token".repeat(4),
    session: { expires_at: "2099-01-01T00:00:00Z" },
    staff: {
      id: 1,
      username: "rd07170",
      email: null,
      display_name: "System Administrator",
      role: "system_admin",
      school: null,
      requires_school_setup: false,
      requires_credential_setup: false,
    },
  });
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
    vi.useRealTimers();
    window.sessionStorage.clear();
    document.cookie = "readirect_staff_signed_in=; Max-Age=0; Path=/";
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
    expect(screen.getByText("Ana Santos")).toBeVisible();
    expect(
      screen.getByText("Northfield Elementary", { exact: false }),
    ).toBeVisible();
    expect(
      screen.getByText("The ASR service returned HTTP 503."),
    ).toBeVisible();
    expect(screen.getByText("Degraded")).toBeVisible();
    expect(screen.getByText("Offline")).toBeVisible();
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
    expect(
      screen.getByRole("switch", { name: "Conditional Mu noise reduction" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("requires confirmation before enabling conditional Mu noise reduction", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(overviewResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            speech_processing: {
              conditional_mu_noise_reduction_enabled: true,
              default_mode: "raw_first",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderDashboard();
    const toggle = await screen.findByRole("switch", {
      name: "Conditional Mu noise reduction",
    });
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("Enable conditional Mu noise reduction?"),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "/api/staff/system-admin/1/speech-settings/mu-noise-reduction",
    );
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ enabled: true }),
    });
  });

  it("switches to truthful circle charts without replacing the card view data", async () => {
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

    fireEvent.click(
      await screen.findByRole("button", { name: "Circle charts" }),
    );

    expect(
      screen.getByRole("region", { name: "System totals as circular KPIs" }),
    ).toBeVisible();
    expect(
      screen.getAllByText(
        "The pie chart shows the same counts as the Overview list.",
      ),
    ).toHaveLength(2);
    expect(
      screen.getByRole("img", { name: "Part 1 Score levels: 0 total" }),
    ).toBeVisible();
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(
      screen
        .getAllByRole("img")
        .every((chart) => chart.getAttribute("data-chart-type") === "pie"),
    ).toBe(true);
    expect(screen.getByText("Cards")).toBeVisible();
  });

  it("draws a pie slice for each populated distribution level", async () => {
    const populatedOverview = {
      ...overviewResponse,
      part_one_distribution: [
        { label: "Full Refresher", value: 2 },
        { label: "Moderate Refresher", value: 3 },
      ],
      reading_profile_distribution: [
        { label: "Reading at Grade Level", value: 4 },
        { label: "Needs Support", value: 1 },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(populatedOverview), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderDashboard();
    fireEvent.click(
      await screen.findByRole("button", { name: "Circle charts" }),
    );

    expect(
      screen
        .getAllByRole("img")
        .map((chart) => chart.querySelectorAll("path").length),
    ).toEqual([2, 2]);
  });
});
