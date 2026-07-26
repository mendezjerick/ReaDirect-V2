import { describe, expect, it } from "vitest";
import { chooseFishingResult, createFishingSession, FISHING_SPOTS, fishingReducer, getFishingProximity } from "./fishingSystem";

describe("fishing interaction", () => {
  const spot = FISHING_SPOTS[0];

  it("shows Fish only in range while facing the water", () => {
    expect(getFishingProximity({ x: 0, y: 0 }, "up", spot)).toBe("hidden");
    expect(getFishingProximity({ x: spot.interactionPosition.x, y: spot.interactionPosition.y + 80 }, "up", spot)).toBe("nearby");
    expect(getFishingProximity(spot.interactionPosition, "down", spot)).toBe("face-water");
    expect(getFishingProximity(spot.interactionPosition, "up", spot)).toBe("ready");
    expect(getFishingProximity(spot.interactionPosition, "up", spot, true)).toBe("hidden");
  });

  it("keeps the pull window generous and ignores early pulls", () => {
    const waiting = fishingReducer(createFishingSession(), { type: "CAST" });
    expect(fishingReducer(waiting, { type: "PULL", resultId: "message-bottle" })).toBe(waiting);
    const bite = fishingReducer(waiting, { type: "BITE" });
    expect(fishingReducer(bite, { type: "PULL", resultId: "message-bottle" }).stage).toBe("story");
  });

  it("allows a learning answer retry without restarting fishing", () => {
    let state = createFishingSession();
    state = fishingReducer(state, { type: "CAST" });
    state = fishingReducer(state, { type: "BITE" });
    state = fishingReducer(state, { type: "PULL", resultId: "message-bottle" });
    state = fishingReducer(state, { type: "READ_STORY" });
    state = fishingReducer(state, { type: "ANSWER", choiceId: "water", correctChoiceId: "note" });
    expect(state.answerCorrect).toBe(false);
    expect(fishingReducer(state, { type: "TRY_AGAIN" })).toMatchObject({ stage: "question", attempts: 1 });
  });

  it("does not duplicate the one-time message bottle before common catches", () => {
    expect(chooseFishingResult([], () => 0)).toBe("message-bottle");
    expect(chooseFishingResult(["message-bottle"], () => 0)).toBe("silver-fish");
  });
});
