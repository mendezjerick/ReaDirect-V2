import { describe, expect, it } from "vitest";
import { PROTOTYPE_MAP } from "../map/prototypeMap";
import { canOccupy } from "../physics/collision";
import {
  advanceAmbientWalker,
  AMBIENT_WALKER_RADIUS,
  AMBIENT_WALKERS,
  createAmbientWalkerStates
} from "./ambientWalkers";
import { getInteractionTargets } from "../interactions/interactionSystem";

describe("ambient walkers", () => {
  it("defines the three requested named characters with unique sprites", () => {
    expect(AMBIENT_WALKERS.map(({ displayName }) => displayName)).toEqual([
      "Miss Yuuri",
      "Mang Panda",
      "Mr. Kikushibu"
    ]);
    expect(new Set(AMBIENT_WALKERS.map(({ assetKey }) => assetKey))).toHaveLength(3);
    expect(
      AMBIENT_WALKERS.every(({ spawn }) =>
        canOccupy(spawn, AMBIENT_WALKER_RADIUS, PROTOTYPE_MAP)
      )
    ).toBe(true);
  });

  it("keeps each walker inside its assigned area and out of map collision", () => {
    let states = createAmbientWalkerStates();
    let elapsed = 0;
    const randomValues = [0.91, 0.18, 0.75, 0.39, 0.62];
    let randomIndex = 0;
    const random = () => randomValues[randomIndex++ % randomValues.length];

    for (let frame = 0; frame < 1800; frame += 1) {
      elapsed += 1 / 60;
      states = states.map((state) =>
        advanceAmbientWalker(state, 1 / 60, elapsed, PROTOTYPE_MAP, undefined, random)
      );
    }

    states.forEach((state) => {
      expect(canOccupy(state.position, AMBIENT_WALKER_RADIUS, PROTOTYPE_MAP)).toBe(true);
      expect(state.position.x).toBeGreaterThanOrEqual(state.bounds.x + AMBIENT_WALKER_RADIUS);
      expect(state.position.x).toBeLessThanOrEqual(
        state.bounds.x + state.bounds.width - AMBIENT_WALKER_RADIUS
      );
      expect(state.position.y).toBeGreaterThanOrEqual(state.bounds.y + AMBIENT_WALKER_RADIUS);
      expect(state.position.y).toBeLessThanOrEqual(
        state.bounds.y + state.bounds.height - AMBIENT_WALKER_RADIUS
      );
    });
  });

  it("matches each walking character to an optional dialogue target", () => {
    const targets = getInteractionTargets();

    for (const walker of AMBIENT_WALKERS) {
      const target = targets.find(({ npcId }) => npcId === walker.id);
      expect(target).toMatchObject({
        optional: true,
        position: walker.spawn,
        indicatorPosition: walker.spawn
      });
    }
  });
});
