import { expect, test } from "@playwright/test";

const systemAdminSession = {
  token: "cookie-session",
  session: { expires_at: "2099-01-01T00:00:00Z" },
  staff: {
    id: 1,
    username: "system-admin-demo-test",
    email: null,
    display_name: "System Administrator",
    role: "system_admin",
    school: null,
    requires_school_setup: false,
    requires_credential_setup: false,
  },
};

test("System Admin demos are protected, playable, and viewport-safe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.addInitScript((session) => {
    window.sessionStorage.setItem(
      "readirect.staff-session",
      JSON.stringify(session),
    );
  }, systemAdminSession);
  await page.route("**/api/staff/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(systemAdminSession),
    });
  });

  await page.goto("/staff/system-admin/demos");

  await expect(
    page.getByRole("heading", { name: "Demos", exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("6 available")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Create a School Administrator",
      level: 2,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Set Up a School and Teacher",
      level: 2,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Review Learner Progression",
      level: 2,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Understand Achievements",
      level: 2,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Explore Games",
      level: 2,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Learn with Ma’am Clara",
      level: 2,
    }),
  ).toBeVisible();

  for (const [label, poster] of [
    [
      "Create a School Administrator demonstration",
      "/assets/demos/system-admin/create-school-administrator-poster.webp",
    ],
    [
      "Set Up a School and Teacher demonstration",
      "/assets/demos/system-admin/school-setup-and-teacher-poster.webp",
    ],
    [
      "Review Learner Progression demonstration",
      "/assets/demos/system-admin/learner-progression-poster.webp",
    ],
    [
      "Understand Achievements demonstration",
      "/assets/demos/system-admin/understand-achievements-poster.webp",
    ],
    [
      "Explore Games demonstration",
      "/assets/demos/system-admin/explore-games-poster.webp",
    ],
    [
      "Learn with Ma’am Clara demonstration",
      "/assets/demos/system-admin/learn-with-clara-poster.webp",
    ],
  ]) {
    const demonstration = page.getByLabel(label);
    await expect(demonstration).toHaveAttribute("controls", "");
    await expect(demonstration).not.toHaveAttribute("autoplay", "");
    await expect(demonstration).toHaveAttribute("poster", poster);
    await expect(demonstration.locator("track")).toHaveCount(0);
  }

  const firstDemo = page.locator(
    "[aria-labelledby='create-school-administrator-title']",
  );
  await firstDemo.getByText("Read the walkthrough").click();
  await expect(
    firstDemo.getByText("Enter a temporary username and password."),
  ).toBeVisible();

  const secondDemo = page.locator(
    "[aria-labelledby='school-setup-and-teacher-title']",
  );
  await secondDemo.getByText("Read the walkthrough").click();
  await expect(
    secondDemo.getByText("Assign the Teacher to a grade and section."),
  ).toBeVisible();

  const thirdDemo = page.locator(
    "[aria-labelledby='learner-progression-title']",
  );
  await thirdDemo.getByText("Read the walkthrough").click();
  await expect(
    thirdDemo.getByText("Inspect saved lesson evidence."),
  ).toBeVisible();

  const fourthDemo = page.locator(
    "[aria-labelledby='understand-achievements-title']",
  );
  await fourthDemo.getByText("Read the walkthrough").click();
  await expect(
    fourthDemo.getByText(
      "Select a locked badge to see its completion requirement.",
    ),
  ).toBeVisible();

  const fifthDemo = page.locator("[aria-labelledby='explore-games-title']");
  await fifthDemo.getByText("Read the walkthrough").click();
  await expect(
    fifthDemo.getByText("See how Ottertale practices simple words."),
  ).toBeVisible();

  const sixthDemo = page.locator("[aria-labelledby='learn-with-clara-title']");
  await sixthDemo.getByText("Read the walkthrough").click();
  await expect(
    sixthDemo.getByText("See the gentle response to an incorrect choice."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Planned demonstrations" }),
  ).toHaveCount(0);

  const pageSize = await page.evaluate(() => ({
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(pageSize.innerWidth).toBe(360);
  expect(pageSize.innerHeight).toBe(740);
  expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.clientWidth);
});
