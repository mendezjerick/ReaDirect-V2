import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { TeacherLearnerImportPage } from "../src/features/staff-dashboard/TeacherLearnerImportPage";
import { parseLearnerImportCsv } from "../src/features/staff-dashboard/learnerImportCsv";

function saveTeacherSession() {
  saveStaffSession({
    token: "teacher-import-session-token".repeat(3),
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

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter>
        <TeacherLearnerImportPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Teacher Learner import", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("parses the exact roster contract including quoted values", () => {
    expect(
      parseLearnerImportCsv(
        'first_name,middle_name,last_name,suffix,lrn\r\n"Dorothy","Gale","Wright, Cruz",,10001\r\n',
      ),
    ).toEqual([
      {
        first_name: "Dorothy",
        middle_name: "Gale",
        last_name: "Wright, Cruz",
        suffix: "",
        lrn: "10001",
      },
    ]);
  });

  it("rejects a roster with missing required names", () => {
    expect(() =>
      parseLearnerImportCsv(
        "first_name,middle_name,last_name,suffix,lrn\nDorothy,,Wright,,",
      ),
    ).toThrow("Row 2 requires first, middle, and last names.");
  });

  it("imports the validated roster and reveals credentials once", async () => {
    saveTeacherSession();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          learners: [
            {
              id: 10,
              learner_code: "AA010",
              full_name: "Dorothy Gale Wright",
              temporary_password: "lemon310",
            },
          ],
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    const file = {
      name: "learners.csv",
      text: () =>
        Promise.resolve(
          "first_name,middle_name,last_name,suffix,lrn\nDorothy,Gale,Wright,,10001",
        ),
    };
    fireEvent.change(screen.getByLabelText("Roster CSV"), {
      target: { files: [file] },
    });

    expect(await screen.findByText("1 Learners ready")).toBeVisible();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Import 1 Learners" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
      await Promise.resolve();
      await vi.runAllTimersAsync();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/teacher/3/learners/import",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          learners: [
            {
              first_name: "Dorothy",
              middle_name: "Gale",
              last_name: "Wright",
              suffix: "",
              lrn: "10001",
            },
          ],
        }),
      }),
    );
    expect(screen.getByText("lemon310")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Credentials saved" }));
    expect(screen.queryByText("lemon310")).not.toBeInTheDocument();
  });
});
