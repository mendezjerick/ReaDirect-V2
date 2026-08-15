import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { SystemAdminAgentSettingsPage } from "../src/features/staff-dashboard/SystemAdminAgentSettingsPage";
import { SystemAdminAiServicesPage } from "../src/features/staff-dashboard/SystemAdminAiServicesPage";
import { SystemAdminPromptTemplatesPage } from "../src/features/staff-dashboard/SystemAdminPromptTemplatesPage";

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
    { service: "TTS", status: "degraded", detail: "Voice is warming." },
    { service: "Queue", status: "online", detail: "Queue is configured." },
    { service: "Environment", status: "online", detail: "Local environment." },
  ],
  speech_processing: {
    conditional_mu_noise_reduction_enabled: false,
    default_mode: "raw_first",
  },
  recent_assessment_activity: [],
  recent_speech_failures: [],
  recent_actions: [],
  generated_at: "2026-07-30T10:00:00+00:00",
};

describe("System Admin Agents and AI workspaces", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    document.cookie = "readirect_staff_signed_in=; Max-Age=0; Path=/";
    vi.unstubAllGlobals();
  });

  it("shows live service health and protects the existing Mu setting with confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(overviewResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    window.sessionStorage.setItem(
      "readirect.staff-session",
      JSON.stringify({
        token: "cookie-session",
        staff: {
          id: 1,
          username: "system-admin",
          email: null,
          display_name: "System Administrator",
          role: "system_admin",
          school: null,
          requires_school_setup: false,
          requires_credential_setup: false,
        },
        session: { expires_at: "2026-07-31T10:00:00+00:00" },
      }),
    );

    renderPage(
      "/staff/system-admin/ai-services",
      <SystemAdminAiServicesPage />,
    );

    expect(
      screen.getByRole("heading", { name: "AI services" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AI services" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await screen.findByText("Mu and Nu are ready.")).toBeVisible();
    expect(screen.getByText("Voice is warming.")).toBeVisible();
    expect(screen.getByText("1 need attention")).toBeVisible();

    fireEvent.click(
      screen.getByRole("switch", {
        name: "Conditional Mu noise reduction",
      }),
    );

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Enable conditional Mu noise reduction?",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows source-controlled agent, typography, and published voice contracts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            agent: {
              name: "Ma'am Clara",
              role: "Reading teacher and learner guide",
              display: {
                mode: "Live2D",
                fallback: "Approved static Clara render",
                ownership: "Source controlled",
              },
              typography: {
                learner_interface: "Jersey 20",
                authored_reading_content: "Lexend",
                ownership: "Design-system controlled",
              },
              voice: {
                stable_key: "clara-sh-v1",
                engine: "VoxCPM2",
                reference_set: "sh",
                conditioning_version: "v1",
                status: "published",
                published_lines: 247,
                reference_roles: [
                  { role: "instruction", published_lines: 120 },
                  { role: "question", published_lines: 80 },
                ],
              },
              speech_processing: {
                mu_default_mode: "raw_first",
                conditional_mu_noise_reduction_enabled: false,
                nu_noise_reduction: false,
              },
              lightweight_mode: {
                enabled: false,
                static_clara: true,
                published_speech_only: true,
                display_mode: "live2d",
                speech_mode: "hybrid",
                revision: "default-v1",
                applies_on_next_learner_load: true,
              },
            },
            governance: {
              read_only: true,
              message: "Display and voice are source-controlled.",
              lightweight_mode_mutable: true,
            },
            generated_at: "2026-07-30T10:00:00+00:00",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    renderPage(
      "/staff/system-admin/agent-settings",
      <SystemAdminAgentSettingsPage />,
    );

    expect(
      screen.getByRole("heading", { name: "Agent settings" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Ma'am Clara")).toBeVisible();
    expect(screen.getAllByText("Jersey 20").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lexend").length).toBeGreaterThan(0);
    expect(screen.getAllByText("clara-sh-v1").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("switch", { name: "Lightweight mode" }),
    ).toBeVisible();
  });

  it("searches the published fixed-speech catalog without inventing an LLM registry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          summary: {
            published_voice: "clara-sh-v1",
            published_templates: 2,
            groups: [
              { group: "Assessments", published_templates: 1 },
              { group: "Required lessons", published_templates: 1 },
            ],
            generative_prompt_registry_configured: false,
          },
          templates: [
            {
              speech_key: "assessment-orientation",
              text: "Let us check your microphone.",
              reference_role: "instruction",
              group: "Assessments",
              status: "published",
            },
            {
              speech_key: "lesson-1-mission-1",
              text: "Say the letter name.",
              reference_role: "instruction",
              group: "Required lessons",
              status: "published",
            },
          ],
          governance: {
            read_only: true,
            message: "Approved fixed Clara speech only.",
          },
          generated_at: "2026-07-30T10:00:00+00:00",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage(
      "/staff/system-admin/prompt-templates",
      <SystemAdminPromptTemplatesPage />,
    );

    expect(
      screen.getByRole("heading", { name: "Prompt templates" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No generative prompt registry is active."),
    ).toBeVisible();
    expect(await screen.findByText("assessment-orientation")).toBeVisible();
    expect(screen.getByText("lesson-1-mission-1")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Search templates"), {
      target: { value: "microphone" },
    });

    expect(screen.getByText("assessment-orientation")).toBeVisible();
    expect(screen.queryByText("lesson-1-mission-1")).not.toBeInTheDocument();
    expect(screen.getByText("1 matching")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
