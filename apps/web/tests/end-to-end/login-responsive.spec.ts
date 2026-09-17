import { expect, test } from "@playwright/test";

const loginPages = [
  {
    name: "staff",
    path: "/staff/login",
    heading: "Welcome back",
    submit: "Sign in",
  },
  {
    name: "learner",
    path: "/learner/login",
    heading: "Ready to read?",
    submit: "Let's go!",
  },
] as const;

for (const loginPage of loginPages) {
  test(`${loginPage.name} login adapts to the configured viewport`, async ({
    page,
  }) => {
    await page.goto(loginPage.path);
    await expect(
      page.getByRole("heading", { name: loginPage.heading }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const pageMetrics = await page.locator("main").evaluate((main) => {
      const submit = main.querySelector<HTMLButtonElement>(
        'form button[type="submit"]',
      );
      const documentElement = document.documentElement;

      return {
        clientHeight: documentElement.clientHeight,
        clientWidth: documentElement.clientWidth,
        scrollHeight: documentElement.scrollHeight,
        scrollWidth: documentElement.scrollWidth,
        overflowY: getComputedStyle(main).overflowY,
        submitHeight: submit?.getBoundingClientRect().height ?? 0,
      };
    });

    expect(pageMetrics.scrollWidth).toBeLessThanOrEqual(
      pageMetrics.clientWidth,
    );
    expect(pageMetrics.submitHeight).toBeLessThanOrEqual(64);

    const viewportWidth = page.viewportSize()?.width ?? 0;
    if (viewportWidth >= 768) {
      expect(pageMetrics.scrollHeight).toBeLessThanOrEqual(
        pageMetrics.clientHeight,
      );
    } else {
      expect(pageMetrics.overflowY).toBe("auto");
    }

    await expect(
      page.getByRole("button", { name: loginPage.submit }),
    ).toBeVisible();
  });
}
