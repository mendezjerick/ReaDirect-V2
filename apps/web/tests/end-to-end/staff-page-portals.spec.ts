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
    available: false,
    reason:
      "Portal destinations will activate after assessment and lesson save records are implemented.",
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
