import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { HomePage } from "../src/features/home/HomePage";
import { saveLearnerSession } from "../src/features/learner-auth/learnerApi";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { ThemeProvider } from "../src/features/theme/ThemeProvider";

const learnerSession = {
  token: "learner-token",
  learner: {
    id: 1,
    learner_code: "KW000",
    full_name: "Kristen Rhine Wright",
    first_name: "Kristen",
    account_purpose: "standard" as const,
    speech_language: "en" as const,
    school: null,
    grade_level: null,
    section: null,
    achievement_keys: [],
    progress: {
      stage: "before_diagnostic",
      current_required_lesson_order: null,
    },
  },
  session: { expires_at: "2026-12-31T12:00:00+00:00" },
};

const staffSession = {
  token: "staff-token-that-is-long-enough-for-the-schema",
  staff: {
    id: 2,
    username: "admin",
    email: "admin@example.test",
    email_verified_at: null,
    display_name: "Admin",
    role: "system_admin" as const,
    school: null,
    requires_school_setup: false,
    requires_credential_setup: false,
  },
  session: {
    expires_at: "2026-12-31T12:00:00+00:00",
    remembered: false,
    heartbeat_interval_seconds: null,
  },
};

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <ThemeProvider>
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route
            path="/learner/dashboard"
            element={<div>Learner dashboard</div>}
          />
          <Route
            path="/staff/system-admin"
            element={<div>Admin dashboard</div>}
          />
          <Route path="/learner/login" element={<div>Learner login</div>} />
          <Route path="/staff/login" element={<div>Staff login</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("HomePage role-aware landing", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("offers the learner dashboard without showing a learner login", async () => {
    await saveLearnerSession(learnerSession);
    renderHome();

    expect(
      screen.getByRole("button", { name: "Let’s Keep Reading!" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Let's Read!" }),
    ).not.toBeInTheDocument();
  });

  it("offers the role-specific admin dashboard", async () => {
    await saveStaffSession(staffSession);
    renderHome();

    expect(
      screen.getByRole("button", { name: "Admin Dashboard" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Switch account" }),
    ).toBeVisible();
  });
});
