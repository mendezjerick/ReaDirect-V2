import { describe, expect, it } from "vitest";

import { nativeBackDestination } from "../src/app/nativeLifecycle";
import {
  APPROVED_GAME_ROUTES,
  isApprovedGameRoute,
} from "../src/app/nativeOrientation";

describe("native navigation policy", () => {
  it("returns Online Learning and Offline Mode to mode selection", () => {
    expect(nativeBackDestination("/home", "?from=native-mode-selection")).toBe(
      "/learner/modes",
    );
    expect(
      nativeBackDestination("/learner/offline", "?from=native-mode-selection"),
    ).toBe("/learner/modes");
  });

  it("recognizes only the approved Open Games routes", () => {
    for (const route of APPROVED_GAME_ROUTES) {
      expect(isApprovedGameRoute(route)).toBe(true);
    }
    expect(isApprovedGameRoute("/learner/lessons/1")).toBe(false);
    expect(isApprovedGameRoute("/learner/games")).toBe(false);
  });
});
