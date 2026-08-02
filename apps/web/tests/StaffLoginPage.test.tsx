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
import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { StaffLoginPage } from "../src/features/staff-auth/StaffLoginPage";
import {
  getStaffAuthHeaders,
  loadStaffSession,
  saveStaffSession,
  type StaffSession,
} from "../src/features/staff-auth/staffApi";

function rememberedSystemAdminSession(): StaffSession {
  return {
    token: "remembered-system-admin-token".repeat(2),
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
    session: {
      expires_at: "2099-01-01T00:00:00Z",
      remembered: true,
      heartbeat_interval_seconds: null,
    },
  };
}

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
    window.localStorage.clear();
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

  it("restores a remembered System Admin session before showing the login form", async () => {
    const session = rememberedSystemAdminSession();
    window.localStorage.setItem(
      "readirect.staff-device",
      "remembered-browser-device",
    );
    saveStaffSession(session);
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ staff: session.staff, session: session.session }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderStaffLogin();

    expect(
      screen.getByText("Restoring your staff session..."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign in" }),
    ).not.toBeInTheDocument();
    expect(await screen.findByText("Dashboard route")).toBeInTheDocument();

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(request.headers);
    expect(headers.get("Authorization")).toBe(`Bearer ${session.token}`);
    expect(headers.get("X-ReaDirect-Device")).toBe("remembered-browser-device");
  });

  it("shows the login form when the remembered session is rejected", async () => {
    const session = rememberedSystemAdminSession();
    window.localStorage.setItem(
      "readirect.staff-device",
      "remembered-browser-device",
    );
    saveStaffSession(session);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Session expired." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderStaffLogin();

    expect(
      await screen.findByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("readirect.staff-session")).toBeNull();
  });

  it("keeps a remembered session out of the login form during a transient failure", async () => {
    const session = rememberedSystemAdminSession();
    window.localStorage.setItem(
      "readirect.staff-device",
      "remembered-browser-device",
    );
    saveStaffSession(session);
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Network unavailable"))
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({ staff: session.staff, session: session.session }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderStaffLogin();

    expect(
      await screen.findByRole("heading", {
        name: "We could not restore your staff session.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign in" }),
    ).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem("readirect.staff-session"),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry session" }));

    expect(await screen.findByText("Dashboard route")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
            token: "a".repeat(64),
            session: { expires_at: "2099-01-01T00:00:00Z" },
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

  it("binds and persists a remembered session to this browser", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "r".repeat(64),
          session: {
            expires_at: "2099-01-01T00:00:00Z",
            remembered: true,
          },
          staff: {
            id: 4,
            username: "remembered-teacher",
            email: null,
            display_name: "Remembered Teacher",
            role: "teacher",
            school: { id: 4, name: "Northfield Elementary School" },
            requires_school_setup: false,
            requires_credential_setup: false,
            grade_level: 1,
            section: "Maple",
            requires_assignment_acknowledgement: false,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderStaffLogin();
    fireEvent.change(screen.getByLabelText("Username or email"), {
      target: { value: "remembered-teacher" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "temporary-pass" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /remember me on this device/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Teacher dashboard route"),
    ).toBeInTheDocument();
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(payload.remember_me).toBe(true);
    expect(payload.device_id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(window.localStorage.getItem("readirect.staff-session")).toContain(
      '"remembered":true',
    );
    expect(window.sessionStorage.getItem("readirect.staff-session")).toBeNull();

    const storedSession = loadStaffSession();
    expect(storedSession).not.toBeNull();
    expect(getStaffAuthHeaders(storedSession!)).toEqual({
      Authorization: `Bearer ${"r".repeat(64)}`,
      "X-ReaDirect-Device": payload.device_id,
    });
  });

  it("sends a new School Administrator to mandatory school setup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            token: "b".repeat(64),
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
            token: "c".repeat(64),
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
