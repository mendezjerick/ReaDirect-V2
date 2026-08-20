import { expect, test } from "@playwright/test";

const learnerSession = {
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
  session: { expires_at: "2099-01-01T00:00:00Z" },
};

test("Game One preserves the lobby and saves authenticated progress before exit", async ({
  page,
}) => {
  let profileCreated = false;
  let saveRevision = 0;
  let saveWrites = 0;
  const authorizationHeaders: string[] = [];
  const profilePayloads: unknown[] = [];

  await page.addInitScript((session) => {
    window.sessionStorage.setItem(
      "readirect.learner-session",
      JSON.stringify(session),
    );
    window.localStorage.setItem(
      "readirect-rpg:language-preference:v1:anonymous",
      JSON.stringify({ version: 1, language: "en" }),
    );
  }, learnerSession);

  await page.route("**/api/learners/session/heartbeat", async (route) => {
    await route.fulfill({ status: 204 });
  });

  await page.route("**/api/learners/games/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    authorizationHeaders.push(request.headers().authorization ?? "");

    if (url.pathname.endsWith("/profile")) {
      if (request.method() === "POST") {
        profileCreated = true;
        profilePayloads.push(request.postDataJSON());
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            profile: {
              audience: "learner",
              username: "Reader7",
              discriminator: "0042",
              public_handle: "Reader7#0042",
              is_active: true,
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ profile: null }),
      });
      return;
    }

    if (url.pathname.endsWith("/save") && request.method() === "GET") {
      if (!profileCreated) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ message: "Create a game profile first." }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          game_key: "chronicles-of-the-lost-kingdom",
          save: null,
        }),
      });
      return;
    }

    if (url.pathname.endsWith("/save") && request.method() === "PUT") {
      const payload = request.postDataJSON() as {
        checkpoint_key: string;
        save_schema_version: number;
        state: Record<string, unknown>;
        expected_revision: number;
      };
      expect(payload.expected_revision).toBe(saveRevision);
      saveRevision += 1;
      saveWrites += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          game_key: "chronicles-of-the-lost-kingdom",
          save: {
            checkpoint_key: payload.checkpoint_key,
            save_schema_version: payload.save_schema_version,
            state: payload.state,
            revision: saveRevision,
            saved_at: "2026-07-26T12:00:00+00:00",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: "Unexpected Game One request." }),
    });
  });

  await page.goto("/learner/games");
  await page.getByLabel("Game username").fill("Reader7");
  await page.getByRole("button", { name: "Enter the Lobby" }).click();
  await expect(page.getByText(/^Reader7#\d{4}$/)).toBeVisible();
  await stabilizeVisualState(page);
  const lobbySignatureBefore = await readLobbyVisualSignature(page);

  const lobbyBefore = await page.screenshot({
    animations: "disabled",
    fullPage: true,
    style:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });

  await page.getByRole("button", { name: "Open Readscape" }).click();
  await expect(page).toHaveURL(/\/learner\/games\/game-one$/);
  await expect(
    page.getByRole("heading", { name: /Lost Kingdom/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Skip Tutorial" }).click();
  const skipDialog = page.getByRole("alertdialog", {
    name: "Skip the tutorial?",
  });
  await expect(skipDialog).toBeVisible();
  await skipDialog.getByRole("button", { name: "Skip Tutorial" }).click();

  const exitButton = page.getByRole("button", { name: "Exit" });
  await expect(exitButton).toBeEnabled();
  await exitButton.click();
  const exitDialog = page.getByRole("dialog", {
    name: "Exit the minigame?",
  });
  await exitDialog.getByRole("button", { name: "Exit to Lobby" }).click();

  await expect(page).toHaveURL(/\/learner\/games$/);
  await expect(page.getByText(/^Reader7#\d{4}$/)).toBeVisible();
  await expect.poll(() => saveWrites).toBeGreaterThan(0);
  await stabilizeVisualState(page);
  const lobbySignatureAfter = await readLobbyVisualSignature(page);

  const lobbyAfter = await page.screenshot({
    animations: "disabled",
    fullPage: true,
    style:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  expect(lobbySignatureAfter).toEqual(lobbySignatureBefore);
  expect(lobbyBefore.byteLength).toBeGreaterThan(0);
  expect(lobbyAfter.byteLength).toBeGreaterThan(0);

  expect(profilePayloads.length).toBeGreaterThan(0);
  expect(
    profilePayloads.every(
      (payload) =>
        JSON.stringify(payload) === JSON.stringify({ username: "Reader7" }),
    ),
  ).toBe(true);
  expect(authorizationHeaders.length).toBeGreaterThan(0);
  expect(
    authorizationHeaders.every(
      (value) => value === "Bearer cookie-session",
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => ({
      gameRoutes: document.querySelectorAll(".game-route").length,
      canvases: document.querySelectorAll("canvas").length,
      bodyOverflow: document.body.style.overflow,
      bodyTouchAction: document.body.style.touchAction,
    })),
  ).toEqual({
    gameRoutes: 0,
    canvases: 0,
    bodyOverflow: "",
    bodyTouchAction: "",
  });
});

async function stabilizeVisualState(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await document.fonts.ready;
  });
  await page.waitForTimeout(100);
}

async function readLobbyVisualSignature(
  page: import("@playwright/test").Page,
) {
  return page.evaluate(() => {
    const selectors = [
      "body",
      "main.game-lobby",
      ".game-lobby__header",
      ".game-lobby__profile",
      ".game-lobby__game-grid",
      ".game-lobby__game-card",
    ];

    return selectors.map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return { selector, missing: true };
      const style = window.getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return {
        selector,
        className: element.className,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        color: style.color,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        borderRadius: style.borderRadius,
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      };
    });
  });
}
