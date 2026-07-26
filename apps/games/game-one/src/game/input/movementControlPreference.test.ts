import { describe, expect, it } from "vitest";
import {
  loadMovementControlPreference,
  MOVEMENT_CONTROL_PREFERENCE_KEY,
  saveMovementControlPreference
} from "./movementControlPreference";

describe("movement control preference", () => {
  it("defaults to the D-pad and restores a saved joystick", () => {
    expect(loadMovementControlPreference()).toBe("dpad");
    saveMovementControlPreference("joystick");
    expect(loadMovementControlPreference()).toBe("joystick");
  });

  it("falls back safely when saved data is invalid", () => {
    localStorage.setItem(MOVEMENT_CONTROL_PREFERENCE_KEY, "{\"version\":1,\"mode\":\"unknown\"}");
    expect(loadMovementControlPreference()).toBe("dpad");
  });
});
