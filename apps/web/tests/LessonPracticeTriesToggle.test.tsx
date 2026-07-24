import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LessonPracticeTriesToggle } from "../src/features/lesson/LessonPracticeTriesToggle";

const practiceTries = {
  count: 2,
  entries: [
    {
      attempt_id: 12,
      mission_key: "mission-1",
      mission_number: 1,
      item_key: "lesson-v1-phrase-cat-on-a-mat",
      item_order: 3,
      attempt_number: 2,
      final_transcript: "a on a mat",
    },
    {
      attempt_id: 11,
      mission_key: "mission-1",
      mission_number: 1,
      item_key: "lesson-v1-phrase-sad-man",
      item_order: 2,
      attempt_number: 1,
      final_transcript: "amen",
    },
  ],
};

describe("LessonPracticeTriesToggle", () => {
  it("opens the persisted final-transcript history and closes it", async () => {
    const user = userEvent.setup();
    render(<LessonPracticeTriesToggle practiceTries={practiceTries} />);

    const toggle = screen.getByRole("button", {
      name: "Practice tries, 2",
    });
    await user.click(toggle);

    expect(
      await screen.findByRole("dialog", { name: "Practice tries" }),
    ).toBeVisible();
    expect(screen.getByText("a on a mat")).toBeVisible();
    expect(screen.getByText("amen")).toBeVisible();
    expect(screen.getByText("Mission 1 · Item 3 · Try 2")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Close practice tries" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a neutral empty state when no incorrect attempts exist", async () => {
    const user = userEvent.setup();
    render(
      <LessonPracticeTriesToggle practiceTries={{ count: 0, entries: [] }} />,
    );

    await user.click(screen.getByRole("button", { name: "Practice tries, 0" }));

    expect(await screen.findByText("No practice tries yet.")).toBeVisible();
  });
});
