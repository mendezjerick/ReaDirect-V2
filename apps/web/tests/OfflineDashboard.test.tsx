import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OfflineDashboard } from "../src/apk/dashboard/OfflineDashboard";
import {
  completeOfflineAssessment,
  completeOfflineLesson,
  createInitialOfflineLearnerState,
} from "../src/apk/storage/offlineLearnerState";

const now = "2026-08-17T01:00:00.000Z";

describe("offline dashboard", () => {
  it("shows only the persisted journey and its connected achievements", () => {
    const learner = createInitialOfflineLearnerState({
      id: "5bc9dfb4-8163-4b59-aeab-f510fc2793e3",
      now,
    });
    render(<OfflineDashboard learner={learner} />);

    expect(
      screen.getByRole("heading", { name: "Your Reading Journey" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^Step \d$/)).toHaveLength(8);
    expect(screen.getByText("Diagnostic Assessment")).toBeInTheDocument();
    expect(screen.getByText("Lesson 6: Comprehension")).toBeInTheDocument();
    expect(screen.getByText("Final Assessment")).toBeInTheDocument();
    expect(screen.getByText("0/8")).toBeInTheDocument();
    expect(screen.queryByText(/Games/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Learn with/i)).not.toBeInTheDocument();
  });

  it("makes skipping the Diagnostic clear and requires confirmation", async () => {
    const learner = createInitialOfflineLearnerState({
      id: "5bc9dfb4-8163-4b59-aeab-f510fc2793e3",
      now,
    });
    const onSkipDiagnostic = vi.fn().mockResolvedValue(undefined);
    render(
      <OfflineDashboard
        learner={learner}
        onSkipDiagnostic={onSkipDiagnostic}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Skip Diagnostic" }));
    expect(onSkipDiagnostic).not.toHaveBeenCalled();
    expect(
      screen.getByRole("group", { name: "Confirm skipping diagnostic" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Yes, skip Diagnostic" }),
    );
    expect(onSkipDiagnostic).toHaveBeenCalledOnce();
  });

  it("reflects completed milestones and earned achievement details", () => {
    const initial = createInitialOfflineLearnerState({
      id: "5bc9dfb4-8163-4b59-aeab-f510fc2793e3",
      now,
    });
    const afterDiagnostic = completeOfflineAssessment(
      initial,
      "diagnostic",
      { score: 20, maximum: 30 },
      "2026-08-17T01:01:00.000Z",
    );
    const learner = completeOfflineLesson(
      afterDiagnostic,
      1,
      "2026-08-17T01:02:00.000Z",
    );
    render(<OfflineDashboard learner={learner} />);

    expect(screen.getByText("1/6")).toBeInTheDocument();
    expect(screen.getByText("2/8")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "View Letter Leader: Earned",
      }),
    );
    expect(screen.getByText("Complete Lesson 1: Letters")).toBeInTheDocument();
  });

  it("places reset at the dashboard bottom and requires confirmation", () => {
    const initial = createInitialOfflineLearnerState({
      id: "5bc9dfb4-8163-4b59-aeab-f510fc2793e3",
      now,
    });
    const learner = completeOfflineAssessment(
      initial,
      "diagnostic",
      { score: 24, maximum: 36 },
      "2026-08-17T01:01:00.000Z",
    );
    const onResetProgress = vi.fn().mockResolvedValue(undefined);
    render(
      <OfflineDashboard learner={learner} onResetProgress={onResetProgress} />,
    );

    const resetHeading = screen.getByRole("heading", {
      name: "Reset progress",
    });
    expect(
      resetHeading.compareDocumentPosition(
        screen.getByRole("heading", { name: "Achievements" }),
      ) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));
    expect(onResetProgress).not.toHaveBeenCalled();
    expect(
      screen.getByRole("group", { name: "Confirm resetting progress" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Yes, reset progress" }),
    );
    expect(onResetProgress).toHaveBeenCalledOnce();
  });
});
