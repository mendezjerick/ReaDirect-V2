import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { TeacherAccountsPage } from "../src/features/staff-dashboard/TeacherAccountsPage";

function saveSchoolAdminSession() {
  saveStaffSession({
    token: "school-admin-token".repeat(4),
    session: { expires_at: "2099-01-01T00:00:00Z" },
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
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/school-admin/teachers"]}>
        <TeacherAccountsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TeacherAccountsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("requires the School Administrator school setup", () => {
    saveStaffSession({
      token: "school-admin-token".repeat(4),
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
    });

    renderPage();

    expect(
      screen.getByRole("heading", { name: "School setup required" }),
    ).toBeVisible();
    expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
  });

  it("creates a school-scoped Teacher after the tactile commit interval", async () => {
    vi.useFakeTimers();
    saveSchoolAdminSession();
    let created = false;
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
    const fetchMock = vi
      .fn()
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          created = true;

          return Promise.resolve(
            new Response(JSON.stringify({ teacher }), {
              status: 201,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify({ teachers: created ? [teacher] : [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "grade4.maple" },
    });
    fireEvent.change(screen.getByLabelText("Temporary password"), {
      target: { value: "temporary-pass" },
    });
    fireEvent.change(screen.getByLabelText("Grade level"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Section"), {
      target: { value: "Maple" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Teacher" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/school-admin/2/teachers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "grade4.maple",
          temporary_password: "temporary-pass",
          grade_level: 4,
          section: "Maple",
        }),
      }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText("Teacher created.")).toBeVisible();
    expect(screen.getAllByText("grade4.maple").length).toBeGreaterThan(0);
    expect(screen.getByRole("cell", { name: "Grade 4" })).toBeVisible();
  });
});
