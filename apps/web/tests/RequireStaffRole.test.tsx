import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RequireStaffRole } from "../src/components/staff/RequireStaffRole";
import {
  saveStaffSession,
  type StaffRole,
  type StaffSession,
} from "../src/features/staff-auth/staffApi";

function makeSession(role: StaffRole, remembered = false): StaffSession {
  return {
    token: "staff-session-token-that-is-long-enough",
    staff: {
      id: 7,
      username: `${role}-user`,
      email: null,
      display_name: "Staff User",
      role,
      school: role === "system_admin" ? null : { id: 2, name: "Test School" },
      requires_school_setup: false,
      requires_credential_setup: false,
    },
    session: {
      expires_at: "2099-01-01T00:00:00.000000Z",
      remembered,
      heartbeat_interval_seconds: remembered ? null : 30,
    },
  };
}

function renderProtectedRoute(allowedRoles: StaffRole[]) {
  return render(
    <MemoryRouter initialEntries={["/staff/system-admin/protected"]}>
      <Routes>
        <Route path="/staff/login" element={<div>Staff sign in</div>} />
        <Route path="/staff/teacher" element={<div>Teacher home</div>} />
        <Route element={<RequireStaffRole allowedRoles={allowedRoles} />}>
          <Route
            path="/staff/system-admin/protected"
            element={<div>Protected dashboard</div>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireStaffRole", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("redirects a browser without a staff session to staff sign in", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderProtectedRoute(["system_admin"]);

    expect(screen.getByText("Staff sign in")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("verifies the bearer session before rendering a protected route", async () => {
    const session = makeSession("system_admin");
    saveStaffSession(session);
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            staff: session.staff,
            session: session.session,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderProtectedRoute(["system_admin"]);

    expect(
      screen.getByText("Checking your staff session..."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Protected dashboard")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer cookie-session",
    );
  });

  it("restores a remembered session with its bound browser device", async () => {
    const session = makeSession("system_admin", true);
    window.localStorage.setItem(
      "readirect.staff-device",
      "remembered-browser-device",
    );
    saveStaffSession(session);
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            staff: session.staff,
            session: session.session,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const firstMount = renderProtectedRoute(["system_admin"]);
    expect(await screen.findByText("Protected dashboard")).toBeInTheDocument();
    firstMount.unmount();

    renderProtectedRoute(["system_admin"]);
    expect(await screen.findByText("Protected dashboard")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    for (const [, request] of fetchMock.mock.calls as [string, RequestInit][]) {
      const headers = new Headers(request.headers);
      expect(headers.get("Authorization")).toBe("Bearer cookie-session");
      expect(headers.get("X-ReaDirect-Device")).toBe(
        "remembered-browser-device",
      );
    }
  });

  it("returns a verified staff member to their own role workspace", async () => {
    const session = makeSession("teacher");
    saveStaffSession(session);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            staff: session.staff,
            session: session.session,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    renderProtectedRoute(["system_admin"]);

    await waitFor(() => {
      expect(screen.getByText("Teacher home")).toBeInTheDocument();
    });
    expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
  });
});
