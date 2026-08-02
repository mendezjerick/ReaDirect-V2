import { describe, expect, it } from "vitest";
import { canOccupy } from "../physics/collision";
import {
  isShopExit,
  SHOP_INTERIOR_COLLISION_MAP,
  SHOP_INTERIOR_EXIT,
  SHOP_INTERIOR_SPAWN
} from "./shopInteriorMap";

describe("shop interior map", () => {
  it("spawns the learner in an open aisle", () => {
    expect(canOccupy(SHOP_INTERIOR_SPAWN, 12, SHOP_INTERIOR_COLLISION_MAP)).toBe(true);
  });

  it("blocks shelves and the market counter", () => {
    expect(canOccupy({ x: 120, y: 120 }, 12, SHOP_INTERIOR_COLLISION_MAP)).toBe(false);
    expect(canOccupy({ x: 320, y: 150 }, 12, SHOP_INTERIOR_COLLISION_MAP)).toBe(false);
  });

  it("only exits through the centered bottom doorway", () => {
    expect(isShopExit({ x: 320, y: SHOP_INTERIOR_EXIT.thresholdY })).toBe(true);
    expect(isShopExit({ x: SHOP_INTERIOR_EXIT.left - 1, y: SHOP_INTERIOR_EXIT.thresholdY })).toBe(false);
    expect(isShopExit({ x: 320, y: SHOP_INTERIOR_EXIT.thresholdY - 1 })).toBe(false);
  });
});
