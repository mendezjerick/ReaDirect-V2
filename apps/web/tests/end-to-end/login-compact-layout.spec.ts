import { expect, test, type Page } from "@playwright/test";

async function expectCompactCard(
  page: Page,
  selector: string,
) {
  const viewport = page.viewportSize();
  test.skip((viewport?.width ?? 0) < 768, "Desktop layout only");

  const card = page.locator(selector);
  await expect(card).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const box = await card.boundingBox();

  expect(box).not.toBeNull();
  if (!box || !viewport) {
    throw new Error("Expected a desktop login card and viewport.");
  }

  expect(box.height).toBeGreaterThanOrEqual(560);
  expect(box.height).toBeLessThanOrEqual(620);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

test("learner login stays compact on desktop", async ({ page }) => {
  await page.goto("/learner/login");
  await expectCompactCard(page, ".learner-login-card");
});

test("staff login stays compact on desktop", async ({ page }) => {
  await page.goto("/staff/login");
  await expectCompactCard(page, ".staff-login-card");
});
