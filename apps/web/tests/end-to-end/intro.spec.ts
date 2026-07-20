import { expect, test } from "@playwright/test";

test("intro fits the viewport and continues to home", async ({ page }) => {
  await page.goto("/");

  const title = page.getByRole("heading", { name: "ReaDirect" });
  const continueButton = page.getByRole("button", { name: "Tap to continue" });

  await expect(title).toBeVisible();
  await expect(continueButton).toBeVisible();
  await expect(page.getByAltText("Ma'am Clara")).toBeVisible();

  const pageSize = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.clientWidth);
  expect(pageSize.scrollHeight).toBeLessThanOrEqual(pageSize.clientHeight);

  await continueButton.click();

  const routeTransition = page.locator('[data-route-transition="link-start"]');
  await expect(routeTransition).toBeVisible();
  await expect(page).toHaveURL(/\/home$/);
  await expect(routeTransition).toBeHidden();
  await expect(page.getByRole("button", { name: "Let's Read!" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Staff login" })).toBeVisible();

  const homePageSize = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(homePageSize.scrollWidth).toBeLessThanOrEqual(
    homePageSize.clientWidth,
  );
  expect(homePageSize.scrollHeight).toBeLessThanOrEqual(
    homePageSize.clientHeight,
  );

  await page.getByRole("button", { name: "Staff login" }).click();
  await expect(page).toHaveURL(/\/staff\/login$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByLabel("Username or email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  const staffLoginPageSize = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(staffLoginPageSize.scrollWidth).toBeLessThanOrEqual(
    staffLoginPageSize.clientWidth,
  );

  await page.goto("/staff/system-admin");
  await expect(
    page.getByRole("heading", { name: "System overview" }),
  ).toBeVisible();
  await expect(
    page.getByText("PostgreSQL connection is healthy."),
  ).toBeVisible();

  const dashboardPageSize = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dashboardPageSize.scrollWidth).toBeLessThanOrEqual(
    dashboardPageSize.clientWidth,
  );
});
