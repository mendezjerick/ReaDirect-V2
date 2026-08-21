import { expect, test } from "@playwright/test";

test("hero scrolls away instead of staying pinned over later sections", async ({
  page,
}) => {
  await page.goto("/landing");

  const hero = page.locator(".browser-landing__hero");
  await expect(hero).toBeVisible();
  await expect(hero).toHaveCSS("position", "relative");

  const initialTop = await hero.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  const heroHeight = await hero.evaluate((element) => element.clientHeight);

  await page.evaluate(
    (scrollTop) => window.scrollTo(0, scrollTop),
    heroHeight + 200,
  );

  const scrolledTop = await hero.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(scrolledTop).toBeLessThan(initialTop - 100);
});
