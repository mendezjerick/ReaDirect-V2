import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { SystemAdminAuditLogsPage } from "../src/features/staff-dashboard/SystemAdminAuditLogsPage";
import { SystemAdminGamesPlayersPage } from "../src/features/staff-dashboard/SystemAdminGamesPlayersPage";
import { SystemAdminMonitoringPage } from "../src/features/staff-dashboard/SystemAdminMonitoringPage";
import { SystemAdminSpeechToolsPage } from "../src/features/staff-dashboard/SystemAdminSpeechToolsPage";

function renderPage(path: string, page: ReactNode) {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const overviewResponse = {
  metrics: {
    total_schools: 1,
    total_teachers: 2,
    total_learners: 3,
    sandbox_attempts: 4,
  },
  part_one_distribution: [],
  reading_profile_distribution: [],
  system_health: [
    { service: "API", status: "online", detail: "Laravel responded." },
    { service: "Database", status: "online", detail: "Database responded." },
    { service: "ASR", status: "online", detail: "Mu and Nu are ready." },
    { service: "TTS", status: "online", detail: "Clara voice is ready." },
    { service: "Queue", status: "online", detail: "Queue is configured." },
    { service: "Environment", status: "online", detail: "Local environment." },
  ],
  speech_processing: {
    conditional_mu_noise_reduction_enabled: false,
    default_mode: "raw_first",
  },
  recent_assessment_activity: [],
  recent_speech_failures: [
    {
      id: 1,
      source: "True Sandbox",
      mode: "general",
      status_code: 503,
      summary: "The ASR service returned HTTP 503.",
      occurred_at: "2026-07-30T10:00:00+00:00",
    },
  ],
  recent_actions: [
    {
      id: 1,
      description: "Updated a system setting.",
      actor: "System Administrator",
      occurred_at: "2026-07-30T10:00:00+00:00",
    },
  ],
  generated_at: "2026-07-30T10:00:00+00:00",
};

describe("System Admin Operations workspaces", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows searchable global audit history without private metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            summary: {
              total_events: 2,
              events_last_24_hours: 2,
              visible_events: 2,
              unique_actors: 1,
              retention_note: "Showing the 500 most recent events.",
            },
            logs: [
              {
                id: 2,
                action_key: "system.seeded",
                description: "System data prepared.",
                actor: "System",
                actor_role: null,
                occurred_at: "2026-07-30T10:00:00+00:00",
              },
              {
                id: 1,
                action_key: "speech.setting_changed",
                description: "Changed speech processing.",
                actor: "System Administrator",
                actor_role: "system_admin",
                occurred_at: "2026-07-30T09:00:00+00:00",
              },
            ],
            generated_at: "2026-07-30T10:00:00+00:00",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    renderPage("/staff/system-admin/audit-logs", <SystemAdminAuditLogsPage />);

    expect(
      screen.getByRole("heading", { name: "Audit logs" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("System data prepared.")).toBeVisible();
    expect(screen.getByText("Changed speech processing.")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Search audit events"), {
      target: { value: "speech" },
    });

    expect(screen.queryByText("System data prepared.")).not.toBeInTheDocument();
    expect(screen.getByText("1 matching")).toBeVisible();
    expect(screen.queryByText("private_token")).not.toBeInTheDocument();
  });

  it("shows live health and recent speech failures without repair controls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(overviewResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderPage(
      "/staff/system-admin/system-monitoring",
      <SystemAdminMonitoringPage />,
    );

    expect(
      screen.getByRole("heading", { name: "System monitoring" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Mu and Nu are ready.")).toBeVisible();
    expect(
      screen.getByText("The ASR service returned HTTP 503."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /repair|restart|delete/i }),
    ).not.toBeInTheDocument();
  });

  it("provides one safe hub for all approved speech operations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(overviewResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderPage(
      "/staff/system-admin/speech-tools",
      <SystemAdminSpeechToolsPage />,
    );

    expect(
      screen.getByRole("heading", { name: "Speech tools" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Clara voice is ready.")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "IsoLetter Sandbox" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "True Sandbox" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Equivalence Book" }),
    ).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Open tool" })).toHaveLength(
      6,
    );
  });

  it("shows standard-Learner player and save metadata without game state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            summary: {
              catalog_games: 1,
              active_games: 1,
              player_profiles: 2,
              active_player_profiles: 2,
              players_with_saves: 1,
              save_slots: 1,
              guest_game_persistence_available: false,
            },
            games: [
              {
                id: 1,
                game_key: "chronicles-of-the-lost-kingdom",
                display_title: "Chronicles of the Lost Kingdom",
                slot: "game-one",
                engine: "kaplay",
                contract_version: 1,
                ruleset_version: "v1",
                has_meaningful_progression: true,
                is_active: true,
                player_count: 1,
                save_count: 1,
              },
            ],
            players: [
              {
                id: 1,
                handle: "Reader7#4821",
                is_active: true,
                username_changed_at: null,
                learner: {
                  id: 1,
                  learner_code: "AA001",
                  full_name: "Ana Reader",
                  school_name: "Northfield Elementary",
                  is_active: true,
                },
                saves: [
                  {
                    game_key: "chronicles-of-the-lost-kingdom",
                    game_title: "Chronicles of the Lost Kingdom",
                    checkpoint_key: "forest-gate",
                    save_schema_version: 1,
                    revision: 3,
                    saved_at: "2026-07-30T10:00:00+00:00",
                  },
                ],
              },
              {
                id: 2,
                handle: "BookKid#1000",
                is_active: true,
                username_changed_at: null,
                learner: {
                  id: 2,
                  learner_code: "AA002",
                  full_name: "Ben Reader",
                  school_name: "Northfield Elementary",
                  is_active: true,
                },
                saves: [],
              },
            ],
            governance: {
              read_only: true,
              message: "Player inspection is read-only.",
            },
            generated_at: "2026-07-30T10:00:00+00:00",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    renderPage(
      "/staff/system-admin/games-and-players",
      <SystemAdminGamesPlayersPage />,
    );

    expect(
      screen.getByRole("heading", { name: "Games and players" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Guest game persistence is not connected yet."),
    ).toBeVisible();
    expect(await screen.findByText("Reader7#4821")).toBeVisible();
    expect(screen.getByText("BookKid#1000")).toBeVisible();
    expect(screen.getByText("forest-gate · revision 3")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Save state"), {
      target: { value: "without-saves" },
    });

    expect(screen.queryByText("Reader7#4821")).not.toBeInTheDocument();
    expect(screen.getByText("BookKid#1000")).toBeVisible();
    expect(screen.queryByText("private_world_state")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /reset|delete/i }),
    ).not.toBeInTheDocument();
  });
});
