import { expect, test } from "@playwright/test";

test.describe("Phase C recoverable loading", () => {
  test("falls back to the bundled Clara view when intro settings stall", async ({
    page,
  }) => {
    await page.route("**/api/experience/intro/settings", async () => {
      await new Promise(() => undefined);
    });

    await page.goto("/");

    await expect(
      page.locator("[data-clara-display-mode='static']"),
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator(".clara-stage__static-image")).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.getByText(
        "Clara's animation is unavailable, so a simple view is ready.",
      ),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("returns a stalled learner login to a retryable state", async ({
    page,
  }) => {
    await page.route("**/api/learners/session", async (route) => {
      await route.fulfill({ status: 401, body: JSON.stringify({}) });
    });
    await page.route("**/api/learners/login", async () => {
      await new Promise(() => undefined);
    });

    await page.goto("/learner/login");
    await page.getByLabel("Learner Code").fill("AA001");
    await page.getByLabel("Password").fill("ReadReady2026!");
    const submit = page.getByRole("button", { name: "Let's go!" });
    await submit.click();

    await expect(
      page.getByText("We couldn't sign you in right now. Please try again."),
    ).toBeVisible({ timeout: 20_000 });
    await expect(submit).toBeEnabled();
  });

  test("keeps the retry action reachable in phone landscape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.route("**/api/learners/session", async (route) => {
      await route.fulfill({ status: 401, body: JSON.stringify({}) });
    });
    await page.route("**/api/learners/login", async () => {
      await new Promise(() => undefined);
    });

    await page.goto("/learner/login");
    await page.getByLabel("Learner Code").fill("AA001");
    await page.getByLabel("Password").fill("ReadReady2026!");
    const submit = page.getByRole("button", { name: "Let's go!" });
    await submit.click();

    await expect(
      page.getByText("We couldn't sign you in right now. Please try again."),
    ).toBeVisible({ timeout: 20_000 });
    await expect(submit).toBeEnabled();
    const pageSize = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.clientWidth);
  });
});
