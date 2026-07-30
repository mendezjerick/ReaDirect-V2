import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { SystemAdminAssessmentsPage } from "../src/features/staff-dashboard/SystemAdminAssessmentsPage";
import { SystemAdminLearningRulesPage } from "../src/features/staff-dashboard/SystemAdminLearningRulesPage";
import { SystemAdminLessonsPage } from "../src/features/staff-dashboard/SystemAdminLessonsPage";

function renderPage(path: string, page: ReactNode) {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("System Admin learning content workspaces", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows assessment form readiness without editing controls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            summary: {
              version: "v1",
              active_items: 42,
              ready_tasks: 5,
              total_tasks: 5,
              publication_state: "Published",
            },
            tasks: [
              {
                key: "task-1a",
                label: "Letter knowledge",
                version: "v1",
                active_items: 10,
                expected_items: 10,
                delivery: "Fixed order",
                status: "ready",
                source_file: "assessments/v1/shared/task-1a-letters.csv",
              },
            ],
            governance: {
              read_only: true,
              message: "Published assessment forms are protected.",
            },
            generated_at: "2026-07-30T10:00:00+00:00",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    renderPage(
      "/staff/system-admin/assessments",
      <SystemAdminAssessmentsPage />,
    );

    expect(
      screen.getByRole("heading", { name: "Assessments" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Assessments" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await screen.findByText("Letter knowledge")).toBeVisible();
    expect(screen.getByText("All tasks ready")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /publish|edit|activate/i }),
    ).not.toBeInTheDocument();
  });

  it("shows lesson pool capacity and session demand", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            summary: {
              version: "v1",
              active_items: 130,
              ready_lessons: 6,
              total_lessons: 6,
              publication_state: "Published",
            },
            lessons: [
              {
                key: "lesson-1",
                label: "Letters",
                version: "v1",
                active_items: 26,
                minimum_active_items: 15,
                session_items: 15,
                missions: 3,
                selection: "Without replacement, then cycle",
                status: "ready",
                source_file: "lessons/v1/lesson-1-letter-items.csv",
              },
            ],
            governance: {
              read_only: true,
              message: "Learner snapshots remain unchanged.",
            },
            generated_at: "2026-07-30T10:00:00+00:00",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    renderPage("/staff/system-admin/lessons", <SystemAdminLessonsPage />);

    expect(
      screen.getByRole("heading", { name: "Lessons" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Letters")).toBeVisible();
    expect(screen.getByText("26")).toBeVisible();
    expect(screen.getByText("Without replacement, then cycle")).toBeVisible();
    expect(screen.getByText("All pools ready")).toBeVisible();
  });

  it("shows exact placement bands and routes equivalence work to its owner", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            part_one: {
              maximum_score: 30,
              bands: [
                { minimum: 0, maximum: 10, label: "Full Refresher" },
                { minimum: 11, maximum: 16, label: "Moderate Refresher" },
                { minimum: 17, maximum: 26, label: "Light Refresher" },
                { minimum: 27, maximum: 30, label: "Grade Ready" },
              ],
            },
            final_reading: {
              comprehension_weight_percent: 60,
              reading_accuracy_weight_percent: 40,
              bands: [
                {
                  minimum: 91,
                  maximum: 100,
                  label: "Reading at Grade Level",
                },
              ],
            },
            delivery_guards: [
              {
                title: "Snapshot immutability",
                description: "Started activities keep their snapshot.",
              },
            ],
            governance: {
              read_only: true,
              message: "Runtime rules require reviewed source changes.",
            },
            generated_at: "2026-07-30T10:00:00+00:00",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    renderPage(
      "/staff/system-admin/rules-and-thresholds",
      <SystemAdminLearningRulesPage />,
    );

    expect(
      screen.getByRole("heading", { name: "Rules and thresholds" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Light Refresher")).toBeVisible();
    expect(screen.getByText("17–26")).toBeVisible();
    expect(
      screen.getByText("60% comprehension + 40% reading accuracy"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Open Equivalence Book" }),
    ).toBeVisible();
  });
});
