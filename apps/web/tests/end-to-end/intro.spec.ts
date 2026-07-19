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
});
