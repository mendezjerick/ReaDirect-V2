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

test("System Admin navigation and account creation adapt to the viewport", async ({
  page,
}) => {
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
