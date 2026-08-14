import { expect, test } from "@playwright/test";

test("Offline Practice renders a usable empty state while the API is unavailable", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.route("**/api/experience/intro/settings", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: "{}",
    });
  });

  for (const viewport of [
    { width: 360, height: 800 },
    { width: 600, height: 320 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/learner/offline");
    await expect(
      page.getByRole("heading", { name: "Practice Offline" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No packs downloaded yet" }),
    ).toBeVisible();

    const pageSize = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.clientWidth);

    if (viewport.width === 360) {
      const signIn = page.getByRole("button", { name: "Sign in to download" });
      await signIn.focus();
      await expect(signIn).toBeFocused();
    }
  }

  expect(consoleErrors).toEqual([]);
});
