import { expect, test } from "@playwright/test";

const teacherSession = {
  token: "teacher-e2e-session-token".repeat(2),
  session: { expires_at: "2099-01-01T00:00:00Z" },
  staff: {
    id: 3,
    username: "teacher-test",
    email: null,
    display_name: "Teacher",
    role: "teacher",
    school: { id: 4, name: "Northfield Elementary School" },
    requires_school_setup: false,
    requires_credential_setup: true,
    grade_level: 1,
    section: "Maple",
    requires_assignment_acknowledgement: true,
  },
};

test("Teacher login opens the assigned class dashboard", async ({ page }) => {
  let learnerCreated = false;
  await page.route("**/api/staff/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(teacherSession),
    });
  });
  await page.route("**/api/staff/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        staff: teacherSession.staff,
        session: teacherSession.session,
      }),
    });
  });
  await page.route("**/api/staff/teacher/3/overview", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        school: { id: 4, name: "Northfield Elementary School" },
        assignment: { grade_level: 1, section: "Maple" },
        metrics: {
          total_learners: 0,
          diagnostic_complete: 0,
          diagnostic_pending: 0,
          ready_for_final: 0,
          final_complete: 0,
        },
        part_one_distribution: [
          { label: "Full Refresher", value: 0 },
          { label: "Moderate Refresher", value: 0 },
          { label: "Light Refresher", value: 0 },
          { label: "Grade Ready", value: 0 },
        ],
        diagnostic_reading_profile_distribution: [],
        final_reading_profile_distribution: [],
        recent_learner_activity: [],
        teacher_lessons: [],
        requires_assignment_acknowledgement: true,
        requires_credential_setup: true,
        generated_at: "2026-07-20T10:00:00+00:00",
      }),
    });
  });
  await page.route(
    "**/api/staff/teacher/3/assignment-acknowledgement",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          requires_assignment_acknowledgement: false,
          acknowledged_at: "2026-07-20T10:05:00+00:00",
        }),
      });
    },
  );
  await page.route("**/api/staff/teacher/3/learners", async (route) => {
    const learner = {
      id: 1,
      learner_code: "AA000",
      first_name: "Dorothy",
      middle_name: "Gale",
      last_name: "Wright",
      suffix: null,
      full_name: "Dorothy Gale Wright",
      lrn: null,
      grade_level: 1,
      section: "Maple",
      is_active: true,
      created_at: "2026-07-20T10:10:00+00:00",
    };

    if (route.request().method() === "POST") {
      learnerCreated = true;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          learner: { ...learner, temporary_password: "apple123" },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ learners: learnerCreated ? [learner] : [] }),
    });
  });

  await page.goto("/staff/login");
  await page.getByLabel("Username or email").fill("teacher-test");
  await page.getByLabel("Password").fill("temporary-pass");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/staff\/teacher$/);
  await expect(
    page.getByRole("heading", { name: "Grade 1 · Section Maple" }),
  ).toBeVisible();
  const assignmentNotice = page
    .getByRole("heading", {
      name: "You are part of Grade 1 Section Maple",
      level: 2,
    })
    .locator("xpath=ancestor::*[contains(@class, 'staff-card')][1]");
  await expect(assignmentNotice).toBeVisible();
  await expect(
    assignmentNotice.getByText("Northfield Elementary School", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("AI services")).toHaveCount(0);
  await expect(page.getByText("School profile")).toHaveCount(0);

  await page.getByRole("button", { name: "Got it" }).click();
  await expect(assignmentNotice).toHaveCount(0);

  await page.getByRole("button", { name: "Create Learner" }).click();
  await expect(page).toHaveURL(/\/staff\/teacher\/learners$/);
  await expect(page.getByRole("heading", { name: "Learners" })).toBeVisible();

  await page.getByLabel("First name").fill("Dorothy");
  await page.getByLabel("Middle name").fill("Gale");
  await page.getByLabel("Last name").fill("Wright");
  await page.getByRole("button", { name: "Create Learner" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Save Dorothy Gale Wright's credentials",
    }),
  ).toBeVisible();
  const credentialCard = page
    .getByRole("heading", {
      name: "Save Dorothy Gale Wright's credentials",
    })
    .locator("xpath=ancestor::*[contains(@class, 'staff-card')][1]");
  await expect(
    credentialCard.getByText("AA000", { exact: true }),
  ).toBeVisible();
  await expect(
    credentialCard.getByText("apple123", { exact: true }),
  ).toBeVisible();

  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(
      page.locator("#staff-mobile-navigation").getByText("Learners", {
        exact: true,
      }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("navigation", { name: "Dashboard navigation" }),
    ).toBeVisible();
  }

  const pageSize = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.clientWidth);
});
