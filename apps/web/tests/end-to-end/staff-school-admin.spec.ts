import { expect, test } from "@playwright/test";

const schoolAdminWithoutSchool = {
  staff: {
    id: 2,
    username: "school-admin-test",
    email: null,
    display_name: "School Administrator",
    role: "school_admin",
    school: null,
    requires_school_setup: true,
    requires_credential_setup: true,
  },
};

const schoolAdminWithSchool = {
  staff: {
    ...schoolAdminWithoutSchool.staff,
    school: { id: 3, name: "Northfield Elementary School" },
    requires_school_setup: false,
  },
};

test("School Administrator completes school setup before opening the dashboard", async ({
  page,
}) => {
  let teacherCreated = false;
  await page.route("**/api/staff/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(schoolAdminWithoutSchool),
    });
  });
  await page.route("**/api/staff/school-admin/2/school", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(schoolAdminWithSchool),
    });
  });
  await page.route("**/api/staff/school-admin/2/overview", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        school: { id: 3, name: "Northfield Elementary School" },
        metrics: {
          total_teachers: 0,
          total_learners: 0,
          active_learners: 0,
        },
        part_one_distribution: [
          { label: "Full Refresher", value: 0 },
          { label: "Moderate Refresher", value: 0 },
          { label: "Light Refresher", value: 0 },
          { label: "Grade Ready", value: 0 },
        ],
        recent_assessment_activity: [],
        requires_credential_setup: true,
        generated_at: "2026-07-20T10:00:00+00:00",
      }),
    });
  });
  await page.route("**/api/staff/school-admin/2/teachers", async (route) => {
    const teacher = {
      id: 14,
      username: "grade4.maple",
      display_name: "Teacher",
      is_active: true,
      grade_level: 4,
      section: "Maple",
      requires_credential_setup: true,
      created_at: "2026-07-20T10:00:00+00:00",
    };

    if (route.request().method() === "POST") {
      teacherCreated = true;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ teacher }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ teachers: teacherCreated ? [teacher] : [] }),
    });
  });

  await page.goto("/staff/login");
  await page.getByLabel("Username or email").fill("school-admin-test");
  await page.getByLabel("Password").fill("temporary-pass");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/staff\/school-admin\/setup-school$/);
  await expect(
    page.getByRole("heading", { name: "Tell us your school" }),
  ).toBeVisible();

  await page.getByLabel("School name").fill("Northfield Elementary School");
  await page.getByRole("button", { name: "Continue to dashboard" }).click();

  await expect(page).toHaveURL(/\/staff\/school-admin$/);
  await expect(
    page.getByRole("heading", { name: "Northfield Elementary School" }),
  ).toBeVisible();
  await expect(page.getByText("Total teachers")).toBeVisible();
  await expect(page.getByText("AI services")).toHaveCount(0);

  await page.getByRole("button", { name: "Create Teacher" }).click();
  await expect(page).toHaveURL(/\/staff\/school-admin\/teachers$/);
  await expect(page.getByRole("heading", { name: "Teachers" })).toBeVisible();

  await page.getByLabel("Username").fill("grade4.maple");
  await page.getByLabel("Temporary password").fill("temporary-pass");
  await page.getByLabel("Grade level").selectOption("4");
  await page.getByLabel("Section").fill("Maple");
  await page.getByRole("button", { name: "Create Teacher" }).click();

  await expect(page.getByText("Teacher created.")).toBeVisible();
  await expect(page.getByText("grade4.maple").last()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Grade 4" })).toBeVisible();

  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(
      page.getByRole("navigation", { name: "Dashboard navigation" }),
    ).toBeVisible();
    await expect(
      page
        .locator("#staff-mobile-navigation")
        .getByText("Teachers", { exact: true }),
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
