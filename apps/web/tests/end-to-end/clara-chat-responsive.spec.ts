import { expect, test } from "@playwright/test";

const guestStore = {
  version: 1,
  active: true,
  updatedAt: "2026-12-31T00:00:00Z",
  speechLanguage: "en",
  readingPath: {
    diagnostic: { status: "required", score: null },
    lessons: [1, 2, 3, 4, 5, 6].map((order) => ({
      order,
      status: "not_started",
    })),
    completed_lesson_count: 0,
    final_assessment: { status: "locked" },
  },
  achievementKeys: [],
  assessments: {
    diagnostic: {
      runId: 1,
      partOneStage: "orientation",
      partOneIndex: 0,
      partOneScore: 0,
      partTwoStage: "story-selection",
      selectedStoryKey: null,
      comprehensionIndex: 0,
      comprehensionScore: 0,
      passageScore: 0,
      completed: false,
    },
    final: {
      runId: 2,
      partOneStage: "orientation",
      partOneIndex: 0,
      partOneScore: 0,
      partTwoStage: "story-selection",
      selectedStoryKey: null,
      comprehensionIndex: 0,
      comprehensionScore: 0,
      passageScore: 0,
      completed: false,
    },
  },
  lessons: {},
  gameProfile: null,
  gameSaves: {},
};

const viewports = [
  [320, 568],
  [360, 640],
  [375, 667],
  [390, 844],
  [412, 915],
  [480, 800],
  [600, 960],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1536, 864],
  [1920, 1080],
  [2560, 1440],
  [639, 800],
  [640, 800],
  [641, 800],
  [767, 900],
  [768, 900],
  [769, 900],
  [1023, 768],
  [1024, 768],
  [1025, 768],
  [1279, 800],
  [1280, 800],
  [1281, 800],
] as const;

test("Clara Chat remains usable across the supported viewport matrix", async ({
  page,
}) => {
  await page.addInitScript((store) => {
    window.sessionStorage.removeItem("readirect.learner-session");
    window.localStorage.setItem(
      "readirect.guest-profile.v1",
      JSON.stringify(store),
    );
  }, guestStore);
  await page.goto("/learner/learn-with-clara/chat");
  await expect(page.getByRole("heading", { name: "Clara Chat" })).toBeVisible({
    timeout: 60_000,
  });

  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });

    const metrics = await page.evaluate(() => {
      const visibleSelectors = [
        ".clara-chat",
        ".clara-chat__navbar",
        ".clara-chat__catalogue-button",
        ".clara-chat__theme-switch",
        ".theme-selector",
        ".theme-selector__choice",
        ".clara-chat__stage",
        ".clara-chat__clara .clara-stage",
        ".clara-chat__composer",
        ".clara-chat__back",
        ".clara-chat__status",
        "#clara-chat-input",
        ".clara-chat__send",
      ];
      const rectFor = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      };

      return {
        documentWidth: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
        documentHeight: Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        ),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        rects: Object.fromEntries(
          visibleSelectors.map((selector) => [selector, rectFor(selector)]),
        ),
        hasDialogue: Boolean(document.querySelector(".clara-chat__dialogue")),
        hasSuggestions: Boolean(
          document.querySelector(".clara-chat__suggestions"),
        ),
        fonts: [".clara-chat", ".clara-chat h1", "#clara-chat-input"].map(
          (selector) =>
            document.querySelector(selector)
              ? getComputedStyle(document.querySelector(selector)!).fontFamily
              : "",
        ),
      };
    });

    expect(metrics.viewportWidth, `${width}x${height}`).toBe(width);
    expect(metrics.viewportHeight, `${width}x${height}`).toBe(height);
    expect(metrics.documentWidth, `${width}x${height}`).toBeLessThanOrEqual(
      width,
    );
    expect(metrics.documentHeight, `${width}x${height}`).toBeLessThanOrEqual(
      height,
    );
    expect(metrics.hasDialogue, `${width}x${height}`).toBe(false);
    expect(metrics.hasSuggestions, `${width}x${height}`).toBe(false);

    for (const [selector, rect] of Object.entries(metrics.rects)) {
      expect(rect, `${selector} missing at ${width}x${height}`).not.toBeNull();
      if (!rect) continue;
      expect(
        rect.left,
        `${selector} left at ${width}x${height}`,
      ).toBeGreaterThanOrEqual(-1);
      expect(
        rect.right,
        `${selector} right at ${width}x${height}`,
      ).toBeLessThanOrEqual(width + 1);
      expect(
        rect.top,
        `${selector} top at ${width}x${height}`,
      ).toBeGreaterThanOrEqual(-1);
      expect(
        rect.bottom,
        `${selector} bottom at ${width}x${height}`,
      ).toBeLessThanOrEqual(height + 1);
    }

    expect(metrics.rects[".clara-chat__back"]?.width).toBeGreaterThanOrEqual(
      43.5,
    );
    expect(metrics.rects[".clara-chat__back"]?.height).toBeGreaterThanOrEqual(
      43.5,
    );
    expect(metrics.rects[".clara-chat__send"]?.width).toBeGreaterThanOrEqual(
      43.5,
    );
    expect(metrics.rects[".clara-chat__send"]?.height).toBeGreaterThanOrEqual(
      43.5,
    );
    expect(
      metrics.rects[".clara-chat__catalogue-button"]?.width,
    ).toBeGreaterThanOrEqual(43.5);
    expect(
      metrics.rects[".clara-chat__catalogue-button"]?.height,
    ).toBeGreaterThanOrEqual(43.5);
    expect(metrics.fonts.every((font) => font.includes("Jersey 20"))).toBe(
      true,
    );
  }

  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole("button", { name: "Open word catalogue" }).click();

  const catalogue = page.getByRole("region", { name: "Word catalogue" });
  await expect(catalogue).toBeVisible();
  await expect(
    catalogue.getByRole("button", { name: "Ask Clara to say dog" }),
  ).toBeVisible();
  expect(
    await catalogue.getByRole("button", { name: /Ask Clara to say/ }).count(),
  ).toBe(49);

  const catalogueBounds = await catalogue.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
    };
  });
  expect(catalogueBounds.left).toBeGreaterThanOrEqual(0);
  expect(catalogueBounds.right).toBeLessThanOrEqual(320);
  expect(catalogueBounds.top).toBeGreaterThanOrEqual(0);
  expect(catalogueBounds.bottom).toBeLessThanOrEqual(568);

  await page.keyboard.press("Escape");
  await expect(catalogue).not.toBeVisible();
});
