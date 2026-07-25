import { expect, test } from "@playwright/test";

const portalState = {
  learner: {
    id: 10,
    learner_code: "KW000",
    full_name: "Kristen Rhine Wright",
    account_purpose: "portal_system",
    is_active: true,
    analytics_excluded: true,
    progress_stage: "before_diagnostic",
    last_reset_at: null,
    active_standard_sessions: 1,
    active_portal_run: null,
  },
  portal_launch: {
    available: true,
    reason:
      "The Learner Dashboard and all implemented workflow checkpoints are ready for persisted testing.",
    targets: [
      {
        key: "learner-dashboard",
        label: "Learner Dashboard",
        description: "Open Kristen at the normal learner starting dashboard.",
        task: "Dashboard",
      },
      {
        key: "assessment-orientation",
        label: "Microphone check",
        description: "Open Part 1 before the first scored item.",
        task: "Setup",
      },
      {
        key: "assessment-task-1a",
        label: "Letters",
        description: "Start Task 1A at its first letter pair.",
        task: "Task 1A",
      },
      {
        key: "assessment-task-2a",
        label: "Rhyme Yes / No",
        description: "Use the low branch and open its first rhyme pair.",
        task: "Task 2A",
      },
      {
        key: "assessment-task-2b",
        label: "Words",
        description: "Use the high branch and open its first word.",
        task: "Task 2B",
      },
      {
        key: "assessment-part-1-results",
        label: "Part 1 Results",
        description: "Open a persisted high-branch Part 1 result.",
        task: "Result",
      },
      {
        key: "assessment-story-selection",
        label: "Choose a story",
        description: "Open the unscored story choice before passage reading.",
        task: "Part 2",
      },
      {
        key: "assessment-task-3a",
        label: "Passage reading",
        description: "Open the selected story at the passage recording task.",
        task: "Task 3A",
      },
      {
        key: "assessment-task-3b",
        label: "Comprehension",
        description: "Open the first linked 5W question.",
        task: "Task 3B",
      },
      {
        key: "assessment-part-2-results",
        label: "Part 2 Results",
        description: "Open a completed Part 2 result.",
        task: "Result",
      },
      {
        key: "assessment-complete",
        label: "Assessment Complete",
        description: "Open the final assessment completion screen.",
        task: "Completion",
      },
    ],
  },
};

test("System Admin Page Portals protects Kristen across viewports", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "readirect.staff-session",
      JSON.stringify({
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
      }),
    );
  });
  await page.route(
    "**/api/staff/system-admin/1/page-portals**",
    async (route) => {
      const isReset = route.request().method() === "POST";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          isReset
            ? {
                ...portalState,
                learner: {
                  ...portalState.learner,
                  active_standard_sessions: 0,
                  last_reset_at: "2026-07-20T12:00:00+00:00",
                },
              }
            : portalState,
        ),
      });
    },
  );

  await page.goto("/staff/system-admin/page-portals");
  await expect(
    page.getByRole("heading", { name: "Page portals" }),
  ).toBeVisible();
  await expect(page.getByText("Kristen Rhine Wright")).toBeVisible();
  await expect(page.getByText("Excluded")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Rhyme Yes / No portal" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Passage reading portal" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Assessment Complete portal" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reset Kristen's progress" }).click();
  await expect(page.getByText("Reset Kristen now?")).toBeVisible();
  await page.getByRole("button", { name: "Confirm reset" }).click();
  await expect(page.getByText(/Kristen is back at the start/i)).toBeVisible();

  const pageSize = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.clientWidth);
});
