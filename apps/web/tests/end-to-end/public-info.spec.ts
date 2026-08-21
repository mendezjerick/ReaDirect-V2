import { expect, test } from "@playwright/test";

test("shares one responsive alpine shell across documentation and credits", async ({
  page,
}) => {
  for (const route of ["/docs/for-teachers", "/credits-licenses"]) {
    await page.goto(route);

    const shell = page.locator(".public-info-shell");
    const bodyStyles = await page
      .locator(".public-info-shell__body")
      .evaluate((element) => {
        const styles = window.getComputedStyle(element);
        return {
          backgroundImage: styles.backgroundImage,
          fontFamily: styles.fontFamily,
        };
      });
    const expectedBackground =
      (page.viewportSize()?.width ?? 0) > 900 ? "Ldesktop.png" : "Lmobile.png";

    await expect(shell).toBeVisible();
    await expect(page.getByRole("banner")).toHaveClass(
      /public-info-shell__header/,
    );
    await expect(page.getByRole("contentinfo")).toHaveClass(
      /public-info-shell__footer/,
    );
    expect(bodyStyles.backgroundImage).toContain(expectedBackground);
    expect(bodyStyles.fontFamily).toContain("Jersey 20");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("switches documentation navigation without clipping content", async ({
  page,
}) => {
  await page.goto("/docs/for-teachers");

  const desktop = (page.viewportSize()?.width ?? 0) > 900;
  if (desktop) {
    await expect(page.locator(".public-docs__side-nav")).toBeVisible();
    await expect(page.locator(".public-docs__mobile-nav")).toBeHidden();
  } else {
    await expect(page.locator(".public-docs__side-nav")).toBeHidden();
    await expect(page.locator(".public-docs__mobile-nav")).toBeVisible();
  }

  const heroClipPath = await page
    .locator(".public-docs__article-hero")
    .evaluate((element) => window.getComputedStyle(element).clipPath);
  expect(heroClipPath).not.toBe("none");
});
