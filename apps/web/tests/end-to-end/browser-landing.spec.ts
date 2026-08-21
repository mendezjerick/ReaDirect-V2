import { expect, test } from "@playwright/test";

test("uses the Jersey font and the responsive PNG landing background", async ({
  page,
}) => {
  await page.goto("/landing");

  const landingStyles = await page
    .locator(".browser-landing")
    .evaluate((element) => {
      const styles = window.getComputedStyle(element);

      return {
        backgroundImage: styles.backgroundImage,
        fontFamily: styles.fontFamily,
      };
    });
  const expectedBackground =
    (page.viewportSize()?.width ?? 0) >= 861 ? "Ldesktop.png" : "Lmobile.png";

  expect(landingStyles.fontFamily).toContain("Jersey 20");
  expect(landingStyles.backgroundImage).toContain(expectedBackground);

  const backgroundResponse = await page.request.get(
    `/assets/backgrounds/${expectedBackground}`,
  );
  expect(backgroundResponse.ok()).toBe(true);
  expect(backgroundResponse.headers()["content-type"]).toContain("image/png");
});

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

test("keeps angular landing panels responsive while supplied artwork stays fitted", async ({
  page,
}) => {
  await page.goto("/landing");

  const artworkSlots = page.getByTestId("landing-art-slot");
  const expectedArtwork = [
    ["offline", "/assets/illustrations/offline.png"],
    ["voice", "/assets/illustrations/speak.png"],
    ["clara", "/assets/illustrations/learn.png"],
    ["progress", "/assets/illustrations/keep.png"],
  ];
  await expect(artworkSlots).toHaveCount(4);

  for (const [index, [kind, source]] of expectedArtwork.entries()) {
    const slot = artworkSlots.nth(index);
    await expect(slot).toHaveAttribute("data-art-slot", kind);
    await expect(slot).toHaveAttribute("src", source);
    await expect(slot).toHaveJSProperty("complete", true);
    expect(
      await slot.evaluate((image: HTMLImageElement) => image.naturalWidth),
    ).toBeGreaterThan(0);
  }

  await expect(page.locator(".browser-landing__mark").first()).toHaveAttribute(
    "src",
    "/assets/icons/rd.png",
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "/assets/icons/rd.png",
  );

  const featureGridColumns = await page
    .locator(".browser-landing__feature-grid")
    .evaluate(
      (element) =>
        window.getComputedStyle(element).gridTemplateColumns.split(" ").length,
    );
  const angularClipPath = await page
    .locator(".landing-feature-card")
    .first()
    .evaluate((element) => window.getComputedStyle(element).clipPath);
  const mistButtonColor = await page
    .locator(".landing-button--mist")
    .first()
    .evaluate((element) => window.getComputedStyle(element).color);
  const primaryButtonColor = await page
    .locator(".landing-button--primary")
    .first()
    .evaluate((element) => window.getComputedStyle(element).color);
  const viewportWidth = page.viewportSize()?.width ?? 0;

  expect(featureGridColumns).toBe(viewportWidth > 900 ? 3 : 1);
  expect(angularClipPath).not.toBe("none");
  expect(mistButtonColor).toBe("rgb(23, 63, 77)");
  expect(primaryButtonColor).toBe("rgb(23, 63, 77)");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("centers and enlarges the desktop hero panel and actions", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 900);
  await page.goto("/landing");

  const heroBox = await page
    .locator(".browser-landing__hero-copy")
    .boundingBox();
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const primaryStyles = await page
    .locator(".landing-button--primary")
    .first()
    .evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        fontSize: Number.parseFloat(styles.fontSize),
        minHeight: Number.parseFloat(styles.minHeight),
      };
    });

  expect(heroBox).not.toBeNull();
  expect(heroBox!.width).toBeGreaterThanOrEqual(viewportWidth * 0.8);
  expect(
    Math.abs(heroBox!.x - (viewportWidth - heroBox!.width) / 2),
  ).toBeLessThanOrEqual(2);
  expect(primaryStyles.fontSize).toBeGreaterThanOrEqual(24);
  expect(primaryStyles.minHeight).toBeGreaterThanOrEqual(64);
});
