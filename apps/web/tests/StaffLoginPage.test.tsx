import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    useReducedMotion: () => false,
  };
});

import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "../src/app/AppProviders";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { StaffLoginPage } from "../src/features/staff-auth/StaffLoginPage";

function renderStaffLogin() {
  const queryClient = createAppQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/staff/login"]}>
        <Routes>
          <Route path="/staff/login" element={<StaffLoginPage />} />
          <Route path="/home" element={<div>Home route</div>} />
          <Route
            path="/staff/system-admin"
            element={<div>Dashboard route</div>}
          />
          <Route
            path="/staff/school-admin/setup-school"
            element={<div>School setup route</div>}
          />
          <Route
            path="/staff/school-admin"
            element={<div>School dashboard route</div>}
          />
          <Route
            path="/staff/teacher"
            element={<div>Teacher dashboard route</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StaffLoginPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders the focused staff sign-in form", () => {
    renderStaffLogin();

    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username or email")).toHaveAttribute(
      "autocomplete",
      "username",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("allows the password to be shown and hidden", () => {
    renderStaffLogin();
    const password = screen.getByLabelText("Password");
    const toggle = screen.getByRole("button", { name: "Show" });

    fireEvent.click(toggle);
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("requires both staff credentials", async () => {
    renderStaffLogin();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter your username or email."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Enter your password.")).toBeInTheDocument();
  });

  it("holds the back button press before returning home", () => {
    vi.useFakeTimers();

    try {
      renderStaffLogin();
      const backButton = screen.getByRole("button", { name: "Back to home" });

      fireEvent.click(backButton);
      expect(backButton).toBeDisabled();
      expect(screen.queryByText("Home route")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS));
      expect(screen.getByText("Home route")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the System Admin dashboard after valid API credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            staff: {
              id: 1,
              username: "system-admin-test",
              email: null,
              display_name: "System Administrator",
              role: "system_admin",
              school: null,
              requires_school_setup: false,
              requires_credential_setup: false,
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    renderStaffLogin();

    fireEvent.change(screen.getByLabelText("Username or email"), {
      target: { value: "system-admin-test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "local-test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Dashboard route")).toBeInTheDocument();
  });

  it("sends a new School Administrator to mandatory school setup", async () => {
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
              school: null,
              requires_school_setup: true,
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

    renderStaffLogin();

    fireEvent.change(screen.getByLabelText("Username or email"), {
      target: { value: "school-admin-test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "temporary-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("School setup route")).toBeInTheDocument();
  });

  it("opens the Teacher dashboard with the assigned class session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
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
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    renderStaffLogin();

    fireEvent.change(screen.getByLabelText("Username or email"), {
      target: { value: "teacher-test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "temporary-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Teacher dashboard route"),
    ).toBeInTheDocument();
  });
});
