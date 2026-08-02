import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import {
  loadStaffSession,
  saveStaffSession,
} from "../src/features/staff-auth/staffApi";
import { StaffSecurityPage } from "../src/features/staff-auth/StaffSecurityPage";

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/security"]}>
        <StaffSecurityPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function saveTeacherSession(options?: {
  email?: string | null;
  emailVerifiedAt?: string | null;
}) {
  saveStaffSession({
    token: "security-page-token".repeat(4),
    session: { expires_at: "2099-01-01T00:00:00Z" },
    staff: {
      id: 7,
      username: "security-teacher",
      email: options?.email ?? null,
      email_verified_at: options?.emailVerifiedAt ?? null,
      display_name: "Security Teacher",
      role: "teacher",
      school: { id: 4, name: "Northfield Elementary School" },
      requires_school_setup: false,
      requires_credential_setup: true,
      grade_level: 1,
      section: "Maple",
      requires_assignment_acknowledgement: false,
    },
  });
}

describe("StaffSecurityPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("keeps temporary credentials optional while binding a verified email", async () => {
    saveTeacherSession();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            verification_sent: true,
            expires_in_seconds: 600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            email: "teacher@example.com",
            email_verified_at: "2026-08-02T12:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    expect(
      screen.getByText(/you may continue using your current password/i),
    ).toBeVisible();
    expect(screen.getByText(/does not block staff tools/i)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "Teacher@Example.com" },
    });
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "temporary-password" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );

    expect(
      await screen.findByLabelText("Email authentication code"),
    ).toBeVisible();
    const emailRequest = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
    ) as Record<string, string>;
    expect(emailRequest).toEqual({
      email: "Teacher@Example.com",
      current_password: "temporary-password",
    });

    fireEvent.change(screen.getByLabelText("Email authentication code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify email" }));

    expect(await screen.findByText("Email binding complete")).toBeVisible();
    expect(screen.getAllByText("teacher@example.com")).toHaveLength(2);
    expect(loadStaffSession()?.staff.email_verified_at).toBe(
      "2026-08-02T12:00:00Z",
    );
  });

  it("changes a password only after the verified-email code step", async () => {
    saveTeacherSession({
      email: "teacher@example.com",
      emailVerifiedAt: "2026-08-02T12:00:00Z",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            verification_sent: true,
            expires_in_seconds: 600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ password_changed: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "temporary-password" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Send password-change code" }),
    );

    expect(await screen.findByLabelText("Password-change code")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Password-change code"), {
      target: { value: "654321" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-secure-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText("Password changed")).toBeVisible();
    const passwordRequest = JSON.parse(
      String((fetchMock.mock.calls[1]?.[1] as RequestInit).body),
    ) as Record<string, string>;
    expect(passwordRequest).toEqual({
      code: "654321",
      password: "new-secure-password",
      password_confirmation: "new-secure-password",
      current_password: "temporary-password",
    });
    expect(loadStaffSession()?.staff.requires_credential_setup).toBe(false);
  });
});
