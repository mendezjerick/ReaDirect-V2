import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { saveStaffSession } from "../src/features/staff-auth/staffApi";
import { TeacherAudioReviewPage } from "../src/features/staff-dashboard/TeacherAudioReviewPage";

function saveTeacherSession() {
  saveStaffSession({
    token: "teacher-audio-session-token".repeat(3),
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

describe("TeacherAudioReviewPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads audio through staff auth and saves only a staff review overlay", async () => {
    saveTeacherSession();
    const reviewPayload = {
      summary: { recordings: 1, reviewed: 0, pending: 1 },
      items: [
        {
          id: "assessment:8",
          response_kind: "assessment",
          response_id: 8,
          learner: {
            id: 12,
            learner_code: "AA012",
            full_name: "Dorothy Gale Wright",
          },
          source_title: "Diagnostic Assessment",
          group_key: "task-3a",
          item_key: "passage-1",
          original_transcript: "the learner said bat",
          original_decision: "INCORRECT",
          occurred_at: "2026-07-25T12:00:00Z",
          audio_url: "/api/staff/teacher/3/audio-reviews/assessment/8/audio",
          latest_review: null,
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/audio")) {
          return Promise.resolve(
            new Response("audio-bytes", {
              status: 200,
              headers: { "Content-Type": "audio/webm" },
            }),
          );
        }
        if (init?.method === "POST") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                review: {
                  id: 1,
                  reviewed_transcript: "the learner said bag",
                  reviewed_decision: "CORRECT",
                  notes: "Confirmed from audio.",
                  reviewed_at: "2026-07-25T12:10:00Z",
                },
                canonical_records_changed: false,
              }),
              {
                status: 201,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify(reviewPayload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:secure-audio");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <MemoryRouter>
          <TeacherAudioReviewPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: /Dorothy Gale Wright/,
      }),
    );
    expect(screen.getAllByText("the learner said bat")[0]).toBeVisible();
    expect(screen.getByLabelText("Reviewed transcript")).toHaveValue(
      "the learner said bat",
    );
    expect(
      screen.getByText("never overwrites the original transcript", {
        exact: false,
      }),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Load secure recording" }),
    );
    await waitFor(() =>
      expect(document.querySelector("audio")).toHaveAttribute(
        "src",
        "blob:secure-audio",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/teacher/3/audio-reviews/assessment/8/audio",
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );

    fireEvent.change(screen.getByLabelText("Reviewed transcript"), {
      target: { value: "the learner said bag" },
    });
    fireEvent.change(screen.getByLabelText("Reviewed decision"), {
      target: { value: "CORRECT" },
    });
    fireEvent.change(screen.getByLabelText("Review note (optional)"), {
      target: { value: "Confirmed from audio." },
    });
    vi.useFakeTimers();
    fireEvent.click(
      screen.getByRole("button", { name: "Save staff-only review" }),
    );

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
      await Promise.resolve();
      await vi.runAllTimersAsync();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/teacher/3/audio-reviews/assessment/8",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          reviewed_transcript: "the learner said bag",
          reviewed_decision: "CORRECT",
          notes: "Confirmed from audio.",
        }),
      }),
    );
    expect(
      screen.getByText("Canonical learner records were not changed.", {
        exact: false,
      }),
    ).toBeVisible();
  });
});
