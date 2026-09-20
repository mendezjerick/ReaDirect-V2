import { expect, test, type Page } from "@playwright/test";

async function expectCompactCard(page: Page, selector: string) {
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

  expect(box.height).toBeGreaterThanOrEqual(480);
  expect(box.height).toBeLessThanOrEqual(520);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

async function expectMobileLoginToFit(page: Page, selector: string) {
  const viewport = page.viewportSize();
  test.skip((viewport?.width ?? 0) >= 768, "Mobile layout only");

  const card = page.locator(selector);
  await expect(card).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const metrics = await page.evaluate((cardSelector) => {
    const element = document.querySelector(cardSelector);
    if (!element) {
      throw new Error(`Missing login card: ${cardSelector}`);
    }

    const box = element.getBoundingClientRect();
    return {
      cardBottom: box.bottom,
      clientHeight: document.documentElement.clientHeight,
      horizontalOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
    };
  }, selector);

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight);
  expect(metrics.cardBottom).toBeLessThanOrEqual(metrics.clientHeight);
  expect(metrics.horizontalOverflow).toBe(false);
}

test("learner login stays compact on desktop", async ({ page }) => {
  await page.goto("/learner/login");
  await expectCompactCard(page, ".learner-login-card");
});

test("staff login stays compact on desktop", async ({ page }) => {
  await page.goto("/staff/login");
  await expectCompactCard(page, ".staff-login-card");
});

test("learner login fits a phone viewport", async ({ page }) => {
  await page.goto("/learner/login");
  await expectMobileLoginToFit(page, ".learner-login-card");
});

test("staff login fits a phone viewport", async ({ page }) => {
  await page.goto("/staff/login");
  await expectMobileLoginToFit(page, ".staff-login-card");
});
