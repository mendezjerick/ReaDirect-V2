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
  await expect(page).toHaveURL(/\/home$/);
});
