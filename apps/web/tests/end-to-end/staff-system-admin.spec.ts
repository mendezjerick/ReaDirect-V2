import { expect, test } from "@playwright/test";

const schoolAdministrator = {
  id: 8,
  username: "northfield-admin",
  display_name: "School Administrator",
  is_active: true,
  school: null,
  requires_school_setup: true,
  requires_credential_setup: true,
  created_at: "2026-07-20T10:00:00+00:00",
};

const systemAdminSession = {
  token: "system-admin-e2e-session-token".repeat(2),
  session: { expires_at: "2099-01-01T00:00:00Z" },
  staff: {
    id: 1,
    username: "system-admin-test",
    email: null,
    display_name: "System Administrator",
    role: "system_admin",
    school: null,
    requires_school_setup: false,
    requires_credential_setup: false,
  },
};

test("System Admin navigation and account creation adapt to the viewport", async ({
  page,
}) => {
  await page.addInitScript((session) => {
    window.sessionStorage.setItem(
      "readirect.staff-session",
      JSON.stringify(session),
    );
  }, systemAdminSession);
  await page.route("**/api/staff/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        staff: systemAdminSession.staff,
        session: systemAdminSession.session,
      }),
    });
  });
  await page.route(
    "**/api/staff/system-admin/school-administrators",
    async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ school_administrator: schoolAdministrator }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ school_administrators: [schoolAdministrator] }),
      });
    },
  );

  await page.goto("/staff/system-admin/school-administrators");

  await expect(
    page.getByRole("heading", {
      name: "School administrators",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.getByText("northfield-admin").first()).toBeVisible();

  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(
      page.getByRole("navigation", { name: "Dashboard navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "School administrators" }),
    ).toHaveAttribute("aria-current", "page");
    await page
      .getByRole("button", { name: "Close navigation menu" })
      .last()
      .click();
  } else {
    await expect(
      page.getByRole("navigation", { name: "Dashboard navigation" }),
    ).toBeVisible();
  }

  await page.getByLabel("Username").fill("northfield-admin-two");
  await page.getByLabel("Temporary password").fill("temporary-pass");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Account created.")).toBeVisible();

  const pageSize = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.clientWidth);
});
