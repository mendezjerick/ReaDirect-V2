import { describe, expect, it } from "vitest";
import {
  createInitialShopTaskState,
  getNearestShopInteractionTarget,
  getShopTaskObjective,
  interactWithShopTarget
} from "./shopTask";

describe("shop reading task", () => {
  it("starts the clue hunt after talking to the Market Vendor", () => {
    const result = interactWithShopTarget(createInitialShopTaskState(), "market-vendor");

    expect(result.nextState.stage).toBe("searching");
    expect(getShopTaskObjective(result.nextState, "en").text).toContain("green herbs");
  });

  it("finds the map paper at the correct shelf and returns it to the vendor", () => {
    const started = interactWithShopTarget(createInitialShopTaskState(), "market-vendor").nextState;
    const found = interactWithShopTarget(started, "map-shelf").nextState;
    const completed = interactWithShopTarget(found, "market-vendor").nextState;

    expect(found.stage).toBe("paper-found");
    expect(completed.stage).toBe("completed");
  });

  it("does not advance at an incorrect display", () => {
    const started = interactWithShopTarget(createInitialShopTaskState(), "market-vendor").nextState;
    const result = interactWithShopTarget(started, "apple-display");

    expect(result.nextState.stage).toBe("searching");
    expect(result.nextState.inspectedIds).toContain("apple-display");
  });

  it("offers a free clue at the reading table", () => {
    const started = interactWithShopTarget(createInitialShopTaskState(), "market-vendor").nextState;
    const result = interactWithShopTarget(started, "reading-table");

    expect(result.nextState.stage).toBe("searching");
    expect(result.nextState.hintUsed).toBe(true);
    expect(result.dialogue.pages.fil[0]).toContain("green herbs");
  });

  it("detects only nearby shop interaction targets", () => {
    expect(getNearestShopInteractionTarget({ x: 320, y: 220 })?.id).toBe("market-vendor");
    expect(getNearestShopInteractionTarget({ x: 320, y: 408 })).toBeNull();
  });
});
