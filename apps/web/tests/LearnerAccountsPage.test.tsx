import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/AppProviders";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { LearnerAccountsPage } from "../src/features/staff-dashboard/LearnerAccountsPage";

function saveTeacherSession() {
  saveStaffSession({
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
});
