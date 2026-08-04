import { expect, test } from "@playwright/test";
import type { LearnerReadingPath } from "../../src/features/learner-auth/learnerApi";

const freshReadingPath: LearnerReadingPath = {
  diagnostic: { status: "required", score: null },
  lessons: [1, 2, 3, 4, 5, 6].map((order) => ({
    order: order as 1 | 2 | 3 | 4 | 5 | 6,
    status: "not_started",
  })),
  completed_lesson_count: 0,
  final_assessment: { status: "locked" },
};

const learnerSession = {
  reading_path: freshReadingPath,
  learner: {
    id: 10,
    learner_code: "AA001",
    full_name: "Avery Test Learner",
    first_name: "Avery",
    account_purpose: "standard",
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
  let readingPath = freshReadingPath;
  await page.route("**/api/learners/**", async (route) => {
    if (
      route.request().method() === "POST" &&
      route.request().url().endsWith("/assessments/diagnostic/skip")
    ) {
      readingPath = {
        ...freshReadingPath,
        diagnostic: { status: "completed", score: 0 },
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reading_path: readingPath }),
      });
      return;
    }

    if (
      route.request().method() === "POST" &&
      route.request().url().endsWith("/login")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "learner-e2e-token",
          ...learnerSession,
          reading_path: readingPath,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...learnerSession, reading_path: readingPath }),
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
  await page.getByLabel("Learner Code").fill("aa001");
  await page.getByLabel("Password").fill("ReadReady2026!");
  await page.getByRole("button", { name: "Let's go!" }).click();

  const routeTransition = page.locator('[data-route-transition="link-start"]');
  await expect(routeTransition).toBeVisible();
  await expect(page).toHaveURL(/\/learner\/login$/);

  await expect(
    page.getByRole("heading", { name: "Welcome, Avery!" }),
  ).toBeVisible();
  await expect(routeTransition).toBeHidden();
  await expect(page.getByText("AA001")).toBeVisible();
  const primaryActionFontSize = await page
    .getByRole("button", { name: "Open Reading Journey" })
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

  await page.getByRole("button", { name: "Open Reading Journey" }).click();
  await expect(page).toHaveURL(/\/learner\/lesson-intro$/);
  await expect(
    page.getByRole("heading", { name: "My Reading Journey" }),
  ).toBeVisible();
  await expect(page.getByLabel("0 of 6 lessons complete")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Diagnostic Assessment. Start. Find your best starting point",
    }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: /Lesson 1\. Locked/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /Final Assessment\. Locked/ }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
  await expect(page.locator(".clara-stage, .clara-speech-loader")).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: "Skip Diagnostic" }).click();
  const skipDialog = page.getByRole("alertdialog", {
    name: "Skip the Diagnostic?",
  });
  await expect(skipDialog).toContainText("score of 0");
  await skipDialog
    .getByRole("button", { name: "Skip and unlock lessons" })
    .click();
  await expect(page.getByText("Completed · Score 0")).toBeVisible();
  for (const order of [1, 2, 3, 4, 5, 6]) {
    await expect(
      page.getByRole("button", {
        name: `Lesson ${order}. Start. Ready when you are`,
      }),
    ).toBeEnabled();
  }
});
