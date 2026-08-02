import { describe, expect, it } from "vitest";
import { getTerrainAtPoint, PROTOTYPE_MAP, TILE_SIZE } from "../map/prototypeMap";
import { canOccupy } from "../physics/collision";
import {
  boardRiverBoat,
  createRiverBoatState,
  getAvailableRiverBoatDock,
  getNearestRiverBoatLanding,
  getRiverBoatBoardingPoint,
  getRiverBoatDock,
  getRiverBoatProximity,
  leaveRiverBoat,
  moveRiverBoat,
  isRiverBoatPositionAllowed
} from "./riverBoat";

describe("river boat", () => {
  it("can only be boarded from the dock while facing the river", () => {
    const state = createRiverBoatState();
    const dock = getRiverBoatDock("south-bank-dock");

    expect(canOccupy(dock.landPosition, 12, PROTOTYPE_MAP)).toBe(true);
    expect(walkableExitCount(dock.landPosition)).toBeGreaterThanOrEqual(2);
    expect(getRiverBoatProximity(dock.landPosition, "left", state)).toBe("face-water");
    expect(getRiverBoatProximity(dock.landPosition, dock.requiredFacing, state)).toBe("ready");
  });

  it("offers boarding from the nearest walkable bank beside the boat", () => {
    const state = createRiverBoatState();
    const boardingPoint = getRiverBoatBoardingPoint(state, { x: state.position.x, y: 0 });

    expect(boardingPoint).not.toBeNull();
    expect(getTerrainAtPoint(boardingPoint!.position).id).not.toBe("water");
    expect(getRiverBoatProximity(boardingPoint!.position, boardingPoint!.requiredFacing, state)).toBe("ready");
  });

  it("keeps a ridden boat inside the eastern water channel", () => {
    let state = boardRiverBoat(createRiverBoatState());

    for (let frame = 0; frame < 1200; frame += 1) {
      const input = frame < 300
        ? { x: -1, y: 0 }
        : frame < 600
          ? { x: 0, y: -1 }
          : frame < 900
            ? { x: 1, y: 0 }
            : { x: 0, y: 1 };
      state = moveRiverBoat(state, input, 1 / 60);
      expect(getTerrainAtPoint(state.position).id).toBe("water");
    }

    expect(isRiverBoatPositionAllowed(state.position, state.facing)).toBe(true);
  });

  it("turns through the east bend into the vertical river", () => {
    let state = boardRiverBoat(createRiverBoatState());

    for (let frame = 0; frame < 700; frame += 1) {
      state = moveRiverBoat(state, { x: 1, y: 0 }, 1 / 60);
    }
    for (let frame = 0; frame < 700; frame += 1) {
      state = moveRiverBoat(state, { x: 0, y: 1 }, 1 / 60);
    }

    expect(state.position.x).toBeGreaterThan(50 * PROTOTYPE_MAP.tileSize);
    expect(state.position.y).toBeGreaterThan(11 * PROTOTYPE_MAP.tileSize);
    expect(state.facing).toBe("down");
    expect(isRiverBoatPositionAllowed(state.position, state.facing)).toBe(true);
  });

  it("can sail through the extended channel into the southern river cove", () => {
    let state = boardRiverBoat(createRiverBoatState());

    for (let frame = 0; frame < 700; frame += 1) {
      state = moveRiverBoat(state, { x: 1, y: 0 }, 1 / 60);
    }
    for (let frame = 0; frame < 1400; frame += 1) {
      state = moveRiverBoat(state, { x: 0, y: 1 }, 1 / 60);
    }

    expect(state.position.y).toBeGreaterThan(46 * PROTOTYPE_MAP.tileSize);
    expect(getTerrainAtPoint(state.position).id).toBe("water");
    expect(isRiverBoatPositionAllowed(state.position, state.facing)).toBe(true);
  });

  it("finds a walkable bank when leaving away from a dock", () => {
    let state = boardRiverBoat(createRiverBoatState());
    for (let frame = 0; frame < 90; frame += 1) {
      state = moveRiverBoat(state, { x: -1, y: 0 }, 1 / 60);
    }

    expect(getRiverBoatProximity(state.position, "up", state)).toBe("riding");
    const landing = getNearestRiverBoatLanding(state);
    expect(landing).not.toBeNull();
    expect(getTerrainAtPoint(landing!.position).id).not.toBe("water");
    expect(canOccupy(landing!.position, 12, PROTOTYPE_MAP)).toBe(true);
    expect(leaveRiverBoat(state).riding).toBe(false);

    state = {
      ...state,
      position: { ...getRiverBoatDock("south-bank-dock").boatPosition }
    };
    expect(leaveRiverBoat(state).riding).toBe(false);
  });

  it("gets off and can reboard at the vertical river landing", () => {
    const dock = getRiverBoatDock("east-channel-dock");
    let state = {
      ...boardRiverBoat(createRiverBoatState()),
      position: { ...dock.boatPosition },
      facing: "down" as const
    };

    expect(canOccupy(dock.landPosition, 12, PROTOTYPE_MAP)).toBe(true);
    expect(walkableExitCount(dock.landPosition)).toBeGreaterThanOrEqual(2);
    expect(getAvailableRiverBoatDock(state)?.id).toBe(dock.id);
    state = leaveRiverBoat(state);
    expect(state).toMatchObject({
      riding: false,
      dockId: dock.id,
      position: dock.boatPosition
    });
    expect(
      getRiverBoatProximity(dock.landPosition, dock.requiredFacing, state)
    ).toBe("ready");
    expect(boardRiverBoat(state).riding).toBe(true);
  });

  it("provides a reliable landing and reboarding point in the southern cove", () => {
    const dock = getRiverBoatDock("river-cove-dock");
    let state = {
      ...boardRiverBoat(createRiverBoatState()),
      position: { ...dock.boatPosition },
      facing: "down" as const
    };

    expect(canOccupy(dock.landPosition, 12, PROTOTYPE_MAP)).toBe(true);
    expect(getAvailableRiverBoatDock(state)?.id).toBe(dock.id);
    state = leaveRiverBoat(state);
    expect(state).toMatchObject({ riding: false, dockId: dock.id, position: dock.boatPosition });
    expect(getRiverBoatProximity(dock.landPosition, dock.requiredFacing, state)).toBe("ready");
  });

  it("turns from the southern cove into the lower right-hand channel", () => {
    let state = {
      ...boardRiverBoat(createRiverBoatState()),
      position: { x: 57.5 * TILE_SIZE, y: 47.5 * TILE_SIZE },
      facing: "down" as const
    };

    for (let frame = 0; frame < 900; frame += 1) {
      state = moveRiverBoat(state, { x: 0, y: 1 }, 1 / 60);
    }

    expect(state.position.y).toBeGreaterThan(59 * TILE_SIZE);
    expect(getTerrainAtPoint(state.position).id).toBe("water");
    expect(isRiverBoatPositionAllowed(state.position, state.facing)).toBe(true);
  });

  it("provides a landing and reboarding point on the right-hand channel", () => {
    const dock = getRiverBoatDock("east-river-channel-dock");
    let state = {
      ...boardRiverBoat(createRiverBoatState()),
      position: { ...dock.boatPosition },
      facing: "up" as const
    };

    expect(canOccupy(dock.landPosition, 12, PROTOTYPE_MAP)).toBe(true);
    expect(getAvailableRiverBoatDock(state)?.id).toBe(dock.id);
    state = leaveRiverBoat(state);
    expect(state).toMatchObject({ riding: false, dockId: dock.id, position: dock.boatPosition });
    expect(getRiverBoatProximity(dock.landPosition, dock.requiredFacing, state)).toBe("ready");
  });
});

function walkableExitCount(position: { x: number; y: number }) {
  return [
    { x: position.x - TILE_SIZE / 2, y: position.y },
    { x: position.x + TILE_SIZE / 2, y: position.y },
    { x: position.x, y: position.y - TILE_SIZE / 2 },
    { x: position.x, y: position.y + TILE_SIZE / 2 }
  ].filter((point) => canOccupy(point, 12, PROTOTYPE_MAP)).length;
}
