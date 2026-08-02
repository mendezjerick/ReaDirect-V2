import { describe, expect, it, vi } from "vitest";
import { GAME_ASSETS } from "./assetRegistry";
import { loadGameAssets } from "./loadGameAssets";

describe("loadGameAssets", () => {
  it("registers required sprites with KAPLAY", () => {
    const runtime = {
      loadSprite: vi.fn()
    };

    loadGameAssets(runtime);

    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "learner-walk",
      GAME_ASSETS.learnerWalk.path,
      expect.objectContaining({
        sliceX: 4,
        sliceY: 4,
        anims: expect.objectContaining({
          walkDown: expect.objectContaining({ frames: [0, 4, 8, 12] }),
          walkUp: expect.objectContaining({ frames: [1, 5, 9, 13] }),
          walkLeft: expect.objectContaining({ frames: [2, 6, 10, 14] }),
          walkRight: expect.objectContaining({ frames: [3, 7, 11, 15] })
        })
      })
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "tileset-water",
      GAME_ASSETS.tilesetWater.path,
      expect.objectContaining({ sliceX: 28, sliceY: 17 })
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "npc-lolo-ambo",
      GAME_ASSETS.npcLoloAmbo.path,
      expect.objectContaining({ sliceX: 4, sliceY: 1 })
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "ambient-miss-yuuri",
      GAME_ASSETS.ambientMissYuuri.path,
      expect.objectContaining({ sliceX: 4, sliceY: 4 })
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "ambient-mang-panda",
      GAME_ASSETS.ambientMangPanda.path,
      expect.objectContaining({ sliceX: 4, sliceY: 4 })
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "ambient-mr-kikushibu",
      GAME_ASSETS.ambientMrKikushibu.path,
      expect.objectContaining({ sliceX: 4, sliceY: 4 })
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "river-boat",
      GAME_ASSETS.riverBoat.path
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "reading-shrine",
      GAME_ASSETS.readingShrine.path
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "map-fragment",
      GAME_ASSETS.mapFragment.path
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "village-learning-hall",
      GAME_ASSETS.villageLearningHall.path
    );
  });

  it("throws a friendly error when sprite loading is unavailable", () => {
    expect(() => loadGameAssets({})).toThrow(/sprite loading is unavailable/i);
  });
});
