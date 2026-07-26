import { describe, expect, it } from "vitest";
import { PROTOTYPE_MAP } from "../map/prototypeMap";
import { canOccupy } from "../physics/collision";
import {
  advanceRoamingAnimal,
  createRoamingAnimalStates,
  ROAMING_ANIMALS
} from "./roamingAnimals";

describe("roaming animals", () => {
  it("places rabbits, chickens, and a duck at safe map positions", () => {
    expect(new Set(ROAMING_ANIMALS.map(({ kind }) => kind))).toEqual(
      new Set(["rabbit", "chicken", "duck"])
    );
    expect(ROAMING_ANIMALS).toHaveLength(5);
    expect(ROAMING_ANIMALS.every(({ spawn }) => canOccupy(spawn, 7, PROTOTYPE_MAP))).toBe(true);
  });

  it("keeps every animal inside its area and out of map collision", () => {
    let states = createRoamingAnimalStates();
    let elapsed = 0;
    const randomValues = [0.9, 0.1, 0.8, 0.4, 0.7];
    let randomIndex = 0;
    const random = () => randomValues[randomIndex++ % randomValues.length];

    for (let frame = 0; frame < 1200; frame += 1) {
      elapsed += 1 / 60;
      states = states.map((state) => advanceRoamingAnimal(
        state,
        1 / 60,
        elapsed,
        PROTOTYPE_MAP,
        undefined,
        random
      ));
    }

    states.forEach((state) => {
      expect(canOccupy(state.position, 7, PROTOTYPE_MAP)).toBe(true);
      expect(state.position.x).toBeGreaterThanOrEqual(state.bounds.x + 7);
      expect(state.position.x).toBeLessThanOrEqual(state.bounds.x + state.bounds.width - 7);
      expect(state.position.y).toBeGreaterThanOrEqual(state.bounds.y + 7);
      expect(state.position.y).toBeLessThanOrEqual(state.bounds.y + state.bounds.height - 7);
    });
  });
});
