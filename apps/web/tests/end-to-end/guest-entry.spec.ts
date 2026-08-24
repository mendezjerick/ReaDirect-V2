import { expect, test } from "@playwright/test";

test.describe("browser-local Guest entry", () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto("/home");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
  });

  test("opens the learner dashboard without creating a server account", async ({
    page,
  }) => {
    const accountRequests: string[] = [];
    page.on("request", (request) => {
      if (
        /\/api\/(learners\/login|staff\/system-admin\/guests)/.test(
          request.url(),
        )
      ) {
        accountRequests.push(request.url());
      }
    });

    await page.getByRole("button", { name: "Continue as Guest" }).click();

    await expect(page).toHaveURL(/\/learner\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Welcome, Guest!" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Local progress")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reset progress" }),
    ).toBeVisible();
    expect(accountRequests).toHaveLength(0);
  });

  test("restores guest actions after returning to the home screen", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Continue as Guest" }).click();
    await expect(page).toHaveURL(/\/learner\/dashboard$/);

    await page.goto("/home");
    await expect(
      page.getByRole("button", { name: "Continue as Guest" }),
    ).toHaveAttribute("data-guest", "true");
    await expect(
      page.getByRole("button", { name: "Continue to login" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Continue to login" }).click();
    await expect(page).toHaveURL(/\/learner\/login$/);
  });

  test("returns Guest Dashboard sign-out to the public lobby", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Continue as Guest" }).click();
    await expect(page).toHaveURL(/\/learner\/dashboard$/);

    await page.getByRole("button", { name: "Exit Guest Mode" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(
      page.getByRole("button", { name: "Let's Read!" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue as Guest" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Staff login" }),
    ).toBeVisible();
  });

  test("resets only Guest progress after confirmation", async ({ page }) => {
    await page.getByRole("button", { name: "Continue as Guest" }).click();
    await page.getByRole("button", { name: "Reset progress" }).click();
    await expect(page.getByText("Reset all guest progress?")).toBeVisible({
      timeout: 15_000,
    });
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Reset progress" })
      .click();
    await expect(page.getByText("Guest progress was reset.")).toBeVisible();
  });

  test("uses a local game profile identity", async ({ page }) => {
    await page.getByRole("button", { name: "Continue as Guest" }).click();
    await page.getByRole("button", { name: "Open Game Lobby" }).click();
    await expect(page).toHaveURL(/\/learner\/games$/);
    await page.getByLabel("Game username").fill("GuestRead");
    await page.getByRole("button", { name: "Enter the Lobby" }).click();
    await expect(page.getByText("GuestRead#0000")).toBeVisible();
  });
});
