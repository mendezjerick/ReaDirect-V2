import { expect, test } from "@playwright/test";

const learnerSession = {
  learner: {
    id: 10,
    learner_code: "KW000",
    full_name: "Kristen Rhine Wright",
    first_name: "Kristen",
    account_purpose: "portal_system",
    school: null,
    grade_level: null,
    section: null,
    progress: {
      stage: "before_diagnostic",
      current_required_lesson_order: null,
    },
  },
  session: { expires_at: "2026-07-20T18:00:00+00:00" },
};

test("Learner entry stays focused and opens the saved learner dashboard", async ({
  page,
}) => {
  await page.route("**/api/learners/**", async (route) => {
    if (
      route.request().method() === "POST" &&
      route.request().url().endsWith("/login")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "learner-e2e-token", ...learnerSession }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(learnerSession),
    });
  });

  await page.goto("/learner/login");
  await expect(
    page.getByRole("heading", { name: "Ready to read?" }),
  ).toBeVisible();
  const expectedBackground =
    (page.viewportSize()?.width ?? 0) >= 768 ? "T1desktop.png" : "T1mobile.png";
  await expect(page.locator("main.learner-flow-page")).toHaveCSS(
    "background-image",
    new RegExp(expectedBackground),
  );
  await page.getByLabel("Learner Code").fill("kw000");
  await page.getByLabel("Password").fill("rhine359");
  await page.getByRole("button", { name: "Let's go!" }).click();

  const routeTransition = page.locator('[data-route-transition="link-start"]');
  await expect(routeTransition).toBeVisible();
  await expect(page).toHaveURL(/\/learner\/login$/);

  await expect(
    page.getByRole("heading", { name: "Welcome, Kristen!" }),
  ).toBeVisible();
  await expect(routeTransition).toBeHidden();
  await expect(page.getByText("KW000")).toBeVisible();
  const primaryActionFontSize = await page
    .getByRole("button", { name: "Start Diagnostic Assessment" })
    .evaluate((element) => window.getComputedStyle(element).fontSize);
  expect(Number.parseFloat(primaryActionFontSize)).toBeGreaterThanOrEqual(30);
  await expect(page.locator("main.learner-flow-page")).toHaveCSS(
    "background-image",
    new RegExp(expectedBackground),
  );
  await expect(page.locator("main.learner-flow-page")).toHaveCSS(
    "font-family",
    /Jersey 20/,
  );
  const learnerHeaderBackground = await page
    .locator(".learner-dashboard__header-surface")
    .evaluate((element) => window.getComputedStyle(element).backgroundColor);
  expect(learnerHeaderBackground).not.toBe("rgba(0, 0, 0, 0)");

  const pageSize = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.clientWidth);
});
