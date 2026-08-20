import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { LearnerAccountsPage } from "../src/features/staff-dashboard/LearnerAccountsPage";

function saveTeacherSession() {
  saveStaffSession({
    token: "teacher-session-token".repeat(4),
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
      requires_assignment_acknowledgement: false,
    },
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/teacher/learners"]}>
        <LearnerAccountsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LearnerAccountsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("requires all three Learner name fields", async () => {
    saveTeacherSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ learners: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Create Learner" }));

    expect(
      await screen.findByText("Enter the Learner's first name."),
    ).toBeVisible();
    expect(screen.getByText("Enter the Learner's middle name.")).toBeVisible();
    expect(screen.getByText("Enter the Learner's last name.")).toBeVisible();
  });

  it("creates an assigned Learner and shows generated credentials once", async () => {
    vi.useFakeTimers();
    saveTeacherSession();
    let created = false;
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
      created_at: "2026-07-20T10:00:00+00:00",
    };
    const fetchMock = vi
      .fn()
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          created = true;

          return Promise.resolve(
            new Response(
              JSON.stringify({
                learner: { ...learner, temporary_password: "apple123" },
              }),
              {
                status: 201,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify({ learners: created ? [learner] : [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Dorothy" },
    });
    fireEvent.change(screen.getByLabelText("Middle name"), {
      target: { value: "Gale" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Wright" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Learner" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/teacher/3/learners",
      expect.objectContaining({
        credentials: "include",
        signal: expect.any(AbortSignal),
        method: "POST",
        body: JSON.stringify({
          first_name: "Dorothy",
          middle_name: "Gale",
          last_name: "Wright",
          suffix: "",
          lrn: "",
        }),
      }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(
      screen.getByRole("heading", {
        name: "Save Dorothy Gale Wright's credentials",
      }),
    ).toBeVisible();
    expect(screen.getAllByText("AA000").length).toBeGreaterThan(0);
    expect(screen.getByText("apple123")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Credentials saved" }));
    expect(screen.queryByText("apple123")).not.toBeInTheDocument();
    expect(screen.getByText("Dorothy Gale Wright")).toBeVisible();
  });

  it("confirms a password reset and shows the replacement credentials once", async () => {
    saveTeacherSession();
    const learner = {
      id: 12,
      learner_code: "AA012",
      first_name: "Dorothy",
      middle_name: "Gale",
      last_name: "Wright",
      suffix: null,
      full_name: "Dorothy Gale Wright",
      lrn: null,
      grade_level: 1,
      section: "Maple",
      is_active: true,
      created_at: "2026-07-20T10:00:00Z",
    };
    const fetchMock = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        if (
          String(input) === "/api/staff/teacher/3/learners/12/reset-password" &&
          init?.method === "POST"
        ) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                learner: {
                  id: learner.id,
                  learner_code: learner.learner_code,
                  full_name: learner.full_name,
                  temporary_password: "orange407",
                },
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify({ learners: [learner] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    const resetButton = await screen.findByRole("button", {
      name: "Reset password for Dorothy Gale Wright",
    });
    fireEvent.click(resetButton);

    expect(
      screen.getByRole("group", {
        name: "Confirm password reset for Dorothy Gale Wright",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("Learning progress will not be changed.", {
        exact: false,
      }),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("group", {
        name: "Confirm password reset for Dorothy Gale Wright",
      }),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(resetButton);
    vi.useFakeTimers();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm password reset" }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
      await Promise.resolve();
      await vi.runAllTimersAsync();
    });

    const resetCall = fetchMock.mock.calls.find(
      ([input]) =>
        String(input) === "/api/staff/teacher/3/learners/12/reset-password",
    );
    expect(resetCall?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
      }),
    );
    const resetHeaders = new Headers(resetCall?.[1]?.headers);
    expect(resetHeaders.get("Accept")).toBe("application/json");
    expect(resetHeaders.get("Authorization")).toContain("Bearer ");
    expect(
      screen.getByRole("heading", {
        name: "Save Dorothy Gale Wright's new credentials",
      }),
    ).toBeVisible();
    expect(screen.getByText("orange407")).toBeVisible();
    expect(
      screen.getByText("Existing Learner sessions have been signed out.", {
        exact: false,
      }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Credentials saved" }));
    expect(screen.queryByText("orange407")).not.toBeInTheDocument();
  });

  it("opens the read-only progress workspace from the directory", async () => {
    saveTeacherSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            learners: [
              {
                id: 12,
                learner_code: "AA012",
                first_name: "Dorothy",
                middle_name: "Gale",
                last_name: "Wright",
                suffix: null,
                full_name: "Dorothy Gale Wright",
                lrn: null,
                grade_level: 1,
                section: "Maple",
                is_active: true,
                created_at: "2026-07-20T10:00:00Z",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <MemoryRouter initialEntries={["/staff/teacher/learners"]}>
          <Routes>
            <Route
              path="/staff/teacher/learners"
              element={<LearnerAccountsPage />}
            />
            <Route
              path="/staff/teacher/learners/:learnerId"
              element={<div>Progress workspace opened</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("button", { name: "View progress" }),
    ).toBeEnabled();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "View progress" }));

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
    });

    expect(screen.getByText("Progress workspace opened")).toBeVisible();
  });
});
