import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/AppProviders";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { SchoolAdminSetupPage } from "../src/features/staff-dashboard/SchoolAdminSetupPage";

function renderSetupPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/school-admin/setup-school"]}>
        <Routes>
          <Route
            path="/staff/school-admin/setup-school"
            element={<SchoolAdminSetupPage />}
          />
          <Route
            path="/staff/school-admin"
            element={<div>School dashboard route</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SchoolAdminSetupPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("requires the School Administrator to enter a school", () => {
    saveStaffSession({
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
    });

    renderSetupPage();

    expect(
      screen.getByRole("heading", { name: "Tell us your school" }),
    ).toBeVisible();
    expect(screen.getByLabelText("School name")).toBeRequired();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it("saves the school and opens the dashboard", async () => {
    saveStaffSession({
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
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            staff: {
              id: 2,
              username: "school-admin-test",
              email: null,
              display_name: "School Administrator",
              role: "school_admin",
              school: { id: 3, name: "Northfield Elementary School" },
              requires_school_setup: false,
              requires_credential_setup: true,
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    renderSetupPage();

    fireEvent.change(screen.getByLabelText("School name"), {
      target: { value: "Northfield Elementary School" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to dashboard" }),
    );

    expect(await screen.findByText("School dashboard route")).toBeVisible();
  });
});
