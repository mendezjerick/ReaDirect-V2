import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { readingJourneyAchievements } from "../src/features/achievements/readingJourneyAchievements";
import { useReadingJourneyAchievementUnlock } from "../src/features/achievements/useReadingJourneyAchievementUnlock";

function UnlockHarness({
  achievementKey,
  ready,
}: {
  achievementKey: string;
  ready: boolean;
}) {
  const unlock = useReadingJourneyAchievementUnlock({
    sourceId: "lesson-run:42",
    achievementKey,
    presentationReady: ready,
  });

  return (
    <div>
      <span>{unlock.achievement?.name ?? "No achievement"}</span>
      <span>{unlock.pending ? "Pending" : "Acknowledged"}</span>
      <span>{unlock.open ? "Open" : "Closed"}</span>
      <button type="button" onClick={unlock.dismiss}>
        Dismiss
      </button>
    </div>
  );
}

describe("useReadingJourneyAchievementUnlock", () => {
  afterEach(() => window.sessionStorage.clear());

  it.each(readingJourneyAchievements)(
    "resolves and acknowledges $name from its authoritative key",
    (achievement) => {
      const { rerender } = render(
        <UnlockHarness achievementKey={achievement.key} ready={false} />,
      );

      expect(screen.getByText(achievement.name)).toBeVisible();
      expect(screen.getByText("Pending")).toBeVisible();
      expect(screen.getByText("Closed")).toBeVisible();

      rerender(<UnlockHarness achievementKey={achievement.key} ready />);
      expect(screen.getByText("Open")).toBeVisible();

      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(screen.getByText("Acknowledged")).toBeVisible();
      expect(screen.getByText("Closed")).toBeVisible();
      expect(
        window.sessionStorage.getItem(
          `readirect.achievement-unlock.lesson-run:42.${achievement.key}`,
        ),
      ).toBe("dismissed");
    },
  );
});
