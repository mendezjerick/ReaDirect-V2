import { expect, test } from "@playwright/test";

const schoolAdminWithoutSchool = {
  token: "school-admin-e2e-session-token".repeat(2),
  session: { expires_at: "2099-01-01T00:00:00Z" },
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
  ...schoolAdminWithoutSchool,
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
  let schoolSetupComplete = false;
  await page.route("**/api/staff/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(schoolAdminWithoutSchool),
    });
  });
  await page.route("**/api/staff/session/heartbeat", async (route) => {
    await route.fulfill({ status: 204 });
  });
  await page.route("**/api/staff/session", async (route) => {
    const session = schoolSetupComplete
      ? schoolAdminWithSchool
      : schoolAdminWithoutSchool;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        staff: session.staff,
        session: session.session,
      }),
    });
  });
  await page.route("**/api/staff/realtime/config", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        enabled: false,
        app_key: null,
        auth_endpoint: "/api/staff/broadcasting/auth",
        channel: "staff.users.2",
        data_channels: ["schools.3"],
      }),
    });
  });
  await page.route("**/api/staff/school-admin/2/school", async (route) => {
    schoolSetupComplete = true;
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
  await page.route("**/api/staff/school-admin/2/classes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        classes: [
          {
            id: 14,
            teacher_name: "Teacher",
            username: "perlica",
            grade_level: 1,
            section: "AK",
            is_active: true,
            learner_count: 1,
            active_learner_count: 1,
          },
        ],
      }),
    });
  });
  await page.route(
    "**/api/staff/school-admin/2/instructional-insights",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          school: { id: 3, name: "Northfield Elementary School" },
          generated_at: "2026-07-26T10:00:00Z",
          read_only: true,
          rules_version: "school-instructional-insights-v1",
          summary: {
            active_learners: 1,
            learners_with_evidence: 1,
            assessment_skips: 1,
            whole_diagnostic_skips: 0,
            lesson_skips: 0,
            review_recommended_items: 1,
            teaching_priorities: 1,
          },
          priorities: [
            {
              rank: 1,
              key: "word-reading",
              title: "Teach word reading face-to-face",
              topic: "Word reading",
              reason:
                "1 active learner has 2 persisted evidence items for this instructional topic.",
              affected_learners: 1,
              evidence_items: 2,
              assessment_skips: 1,
              lesson_skips: 0,
              review_recommended_items: 1,
              affected_classes: 1,
            },
          ],
          assessment_breakdown: [
            {
              task_key: "task-2b",
              title: "Word Pronunciation",
              topic_key: "word-reading",
              diagnostic_skips: 1,
              final_skips: 0,
              affected_learners: 1,
            },
          ],
          lesson_breakdown: [
            {
              lesson_key: "required-lesson-2",
              order: 2,
              title: "Word reading",
              topic_key: "word-reading",
              skipped_items: 0,
              review_recommended_items: 1,
              affected_learners: 1,
            },
          ],
          class_breakdown: [
            {
              key: "14:1:AK",
              teacher: {
                id: 14,
                name: "Teacher",
                username: "perlica",
              },
              grade_level: 1,
              section: "AK",
              cohort_size: 1,
              assessment_skips: 1,
              lesson_skips: 0,
              review_recommended_items: 1,
              affected_learners: 1,
              evidence_items: 2,
            },
          ],
        }),
      });
    },
  );
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

  const verticalGaps = await page.evaluate(() => {
    const notice = document.querySelector(".staff-notice");
    const metrics = document.querySelector(".staff-metric-grid--school");
    const content = document.querySelector(".staff-content-grid--two");

    if (!notice || !metrics || !content) {
      return null;
    }

    const noticeBox = notice.getBoundingClientRect();
    const metricsBox = metrics.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();

    return {
      noticeToMetrics: metricsBox.top - noticeBox.bottom,
      metricsToContent: contentBox.top - metricsBox.bottom,
    };
  });

  expect(verticalGaps).not.toBeNull();
  expect(verticalGaps!.noticeToMetrics).toBeCloseTo(16, 0);
  expect(verticalGaps!.metricsToContent).toBeCloseTo(16, 0);

  await page.getByRole("button", { name: "Manage Classes" }).click();
  await expect(page).toHaveURL(/\/staff\/school-admin\/classes$/);
  await expect(
    page.getByRole("heading", { name: "Classes", exact: true }),
  ).toBeVisible();

  const classPageGap = await page.evaluate(() => {
    const notice = document.querySelector(".staff-notice");
    const content = document.querySelector(".staff-content-grid--sidebar");

    if (!notice || !content) {
      return null;
    }

    return (
      content.getBoundingClientRect().top -
      notice.getBoundingClientRect().bottom
    );
  });

  expect(classPageGap).toBeCloseTo(16, 0);

  await page.goto("/staff/school-admin/instructional-insights");
  await expect(
    page.getByRole("heading", { name: "Instructional Insights" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Teach word reading face-to-face",
    }),
  ).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page.getByRole("button", { name: "Menu" }).click();
  }
  const reviewNavigation = page
    .getByRole("navigation", { name: "Dashboard navigation" })
    .getByText(/Instructional Insights|Reports/, { exact: true });
  await expect(reviewNavigation).toHaveCount(2);
  expect(await reviewNavigation.allTextContents()).toEqual([
    "Instructional Insights",
    "Reports",
  ]);

  await page.goto("/staff/school-admin");
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
