import { afterEach, describe, expect, it } from "vitest";

import {
  guestStorageKey,
  loadGuestStore,
  markGuestDiagnosticSkipped,
  startGuestSession,
  updateGuestStore,
} from "../src/features/guest/guestSession";

describe("Guest Diagnostic skip", () => {
  afterEach(() => {
    window.localStorage.removeItem(guestStorageKey);
  });

  it("records the same completed zero-score progression locally", () => {
    startGuestSession();

    expect(markGuestDiagnosticSkipped().diagnostic).toEqual({
      status: "completed",
      score: 0,
    });

    const store = loadGuestStore();
    expect(store?.assessments.diagnostic).toMatchObject({
      completed: true,
      partTwoStage: "assessment-complete",
    });
    expect(store?.achievementKeys).toContain("reading.ready_reader");
    expect(store?.readingPath.lessons).toEqual([
      { order: 1, status: "not_started" },
      { order: 2, status: "not_started" },
      { order: 3, status: "not_started" },
      { order: 4, status: "not_started" },
      { order: 5, status: "not_started" },
      { order: 6, status: "not_started" },
    ]);
  });

  it("keeps earned points when finishing the remaining Diagnostic items as zero", () => {
    startGuestSession();
    updateGuestStore((current) => ({
      ...current,
      assessments: {
        ...current.assessments,
        diagnostic: {
          ...current.assessments.diagnostic,
          partOneStage: "task-1a",
          partOneIndex: 1,
          partOneScore: 1,
        },
      },
      readingPath: {
        ...current.readingPath,
        diagnostic: { status: "in_progress", score: null },
      },
    }));

    expect(markGuestDiagnosticSkipped().diagnostic).toEqual({
      status: "completed",
      score: 2,
    });

    const store = loadGuestStore();
    expect(store?.assessments.diagnostic.partOneScore).toBe(1);
    expect(store?.achievementKeys).toContain("reading.ready_reader");
  });
});
