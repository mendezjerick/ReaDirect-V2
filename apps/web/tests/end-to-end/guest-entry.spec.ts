import { expect, test } from "@playwright/test";

test.describe("unsupported Guest game entry", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.clear();
      document.cookie =
        "readirect_learner_signed_in=; Max-Age=0; Path=/; SameSite=Lax";
    });
  });

  test("shows an immediate unavailable state and offers learner login", async ({
    page,
  }) => {
    const guestApiRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/learners/games")) {
        guestApiRequests.push(request.url());
      }
    });

    await page.goto("/learner/games");

    await expect(
      page.getByRole("heading", { name: "Currently unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Guest Mode is not available right now. Please sign in as a learner to continue.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Game username")).toHaveCount(0);
    await expect(page.getByText("Loading...", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Go to Learner Login" }),
    ).toBeEnabled();
    await expect(page.getByRole("button", { name: "Back" })).toBeEnabled();
    expect(guestApiRequests).toHaveLength(0);

    await page.getByRole("button", { name: "Go to Learner Login" }).click();
    await expect(page).toHaveURL(/\/learner\/login$/);
  });

  test("returns to the previous safe page with Back", async ({ page }) => {
    await page.goto("/home");
    await page.goto("/learner/games");
    await expect(
      page.getByRole("heading", { name: "Currently unavailable" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("keeps the existing lobby for an authenticated learner", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem(
        "readirect.learner-session",
        JSON.stringify({
          token: "cookie-session",
          learner: {
            id: 31,
            learner_code: "GO001",
            full_name: "Game One Learner",
            first_name: "Game",
            account_purpose: "standard",
            school: "ReaDirect School",
            grade_level: 3,
            section: "A",
            progress: {
              stage: "before_diagnostic",
              current_required_lesson_order: null,
            },
            achievement_keys: [],
          },
          reading_path: {
            diagnostic: { status: "required", score: null },
            lessons: [1, 2, 3, 4, 5, 6].map((order) => ({
              order,
              status: "not_started",
            })),
            completed_lesson_count: 0,
            final_assessment: { status: "locked" },
          },
          session: { expires_at: "2026-07-27T00:00:00+00:00" },
        }),
      );
    });
    await page.route("**/api/learners/experience/settings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          revision: "test",
          display_mode: "static",
          speech_mode: "published_only",
        }),
      });
    });

    await page.goto("/learner/games");

    await expect(
      page.getByRole("heading", { name: "Choose a Game" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Currently unavailable" }),
    ).toHaveCount(0);
    await page.getByLabel("Game username").fill("Reader7");
    await page.getByRole("button", { name: "Enter the Lobby" }).click();
    await expect(
      page.getByRole("button", { name: "Open Readscape" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open Game Two" }),
    ).toBeVisible();
  });
});
