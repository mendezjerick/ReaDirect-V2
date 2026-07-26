import { expect, test } from "@playwright/test";

test("intro fits the viewport and continues to home", async ({ page }) => {
  await page.goto("/");

  const title = page.getByRole("heading", { name: "ReaDirect" });
  const continueButton = page.getByRole("button", { name: "Tap to continue" });
  const meadowTheme = page.getByRole("button", { name: "Use Meadow theme" });
  const winterTheme = page.getByRole("button", { name: "Use Winter theme" });

  await expect(title).toBeVisible();
  await expect(continueButton).toBeVisible();
  await expect(meadowTheme).toBeVisible();
  await expect(winterTheme).toBeVisible();
  await expect(page.locator(".clara-stage")).toBeVisible();
  await expect(page.locator(".clara-stage__canvas")).toHaveCount(1);
  await expect(page.getByAltText("Ma'am Clara")).toHaveCount(0);
  await expect(page.locator("main.intro-page")).toHaveCSS(
    "font-family",
    /Jersey 20/,
  );
  const continueFontSize = await continueButton.evaluate(
    (element) => window.getComputedStyle(element).fontSize,
  );
  expect(Number.parseFloat(continueFontSize)).toBeGreaterThanOrEqual(30);

  const fixedTransitionPaletteBeforeThemeChange = await page.evaluate(() =>
    [
      "--color-link-start-fixed-prism-pink",
      "--color-link-start-fixed-prism-yellow",
      "--color-link-start-fixed-prism-crimson",
      "--color-link-start-fixed-prism-violet",
      "--color-link-start-fixed-prism-coral",
      "--color-link-start-fixed-prism-glass",
    ].map((token) =>
      getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
    ),
  );

  const themeChoiceSize = await winterTheme.boundingBox();
  expect(themeChoiceSize).not.toBeNull();
  expect(
    Math.abs(themeChoiceSize!.width - themeChoiceSize!.height),
  ).toBeLessThan(1);

  await winterTheme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "t2");
  await expect(winterTheme).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".clara-stage__canvas")).toHaveCount(1);
  const winterPrimaryColor = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-action-primary")
      .trim(),
  );
  expect(winterPrimaryColor).toBe("#355fa8");
  const fixedTransitionPaletteAfterThemeChange = await page.evaluate(() =>
    [
      "--color-link-start-fixed-prism-pink",
      "--color-link-start-fixed-prism-yellow",
      "--color-link-start-fixed-prism-crimson",
      "--color-link-start-fixed-prism-violet",
      "--color-link-start-fixed-prism-coral",
      "--color-link-start-fixed-prism-glass",
    ].map((token) =>
      getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
    ),
  );
  expect(fixedTransitionPaletteAfterThemeChange).toEqual(
    fixedTransitionPaletteBeforeThemeChange,
  );

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
  await expect(page.locator("html")).toHaveAttribute("data-theme", "t2");
  await expect(page.locator("main.home-page")).toHaveCSS(
    "background-image",
    /T2(?:mobile|desktop)\.jpg/,
  );

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
  await expect(page).toHaveURL(/\/staff\/login$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();

  const dashboardPageSize = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dashboardPageSize.scrollWidth).toBeLessThanOrEqual(
    dashboardPageSize.clientWidth,
  );
});
