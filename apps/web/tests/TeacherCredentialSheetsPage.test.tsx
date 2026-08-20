import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { TeacherCredentialSheetsPage } from "../src/features/staff-dashboard/TeacherCredentialSheetsPage";

function saveTeacherSession() {
  saveStaffSession({
    token: "teacher-credential-session-token".repeat(3),
    session: { expires_at: "2099-01-01T00:00:00Z" },
    staff: {
      id: 3,
      username: "teacher-test",
      email: null,
      display_name: "Teacher",
      role: "teacher",
      school: { id: 4, name: "Northfield Elementary School" },
      requires_school_setup: false,
      requires_credential_setup: false,
      grade_level: 1,
      section: "Maple",
      requires_assignment_acknowledgement: false,
    },
  });
}

describe("TeacherCredentialSheetsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("requires confirmation before issuing printable replacement credentials", async () => {
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
        if (init?.method === "POST") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                learners: [
                  {
                    id: learner.id,
                    learner_code: learner.learner_code,
                    full_name: learner.full_name,
                    temporary_password: "apple712",
                  },
                ],
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

    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <MemoryRouter>
          <TeacherCredentialSheetsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: /Dorothy Gale Wright/,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Prepare credential sheet" }),
    );

    expect(
      screen.getByRole("group", { name: "Confirm credential sheet" }),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and issue" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
      await Promise.resolve();
      await vi.runAllTimersAsync();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/teacher/3/learners/credential-sheet",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ learner_ids: [12] }),
      }),
    );
    expect(screen.getByText("apple712")).toBeVisible();
    expect(
      screen.getByText("Existing sessions were signed out.", { exact: false }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Credentials saved" }));
    expect(screen.queryByText("apple712")).not.toBeInTheDocument();
  }, 15_000);
});
