import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { GAME_ASSETS, REQUIRED_ASSET_KEYS, validateRequiredAssets } from "./assetRegistry";

const GAME_ASSET_DIRECTORY = fileURLToPath(new URL("../../assets/game/", import.meta.url));
const ROOT_PUBLIC_GAME_DIRECTORY = fileURLToPath(
  new URL("../../../../../../public/assets/game/", import.meta.url)
);

describe("asset registry", () => {
  it("contains all required Phase 2 and Phase 3 asset entries", () => {
    const validation = validateRequiredAssets();

    expect(validation.valid).toBe(true);
    expect(REQUIRED_ASSET_KEYS).toContain("learnerWalk");
    expect(REQUIRED_ASSET_KEYS).toContain("tilesetWater");
    expect(REQUIRED_ASSET_KEYS).toEqual(
      expect.arrayContaining([
        "npcMissEstelle",
        "npcLoloAmbo",
        "npcMarketVendor",
        "npcBridgeKeeper",
        "ambientMissYuuri",
        "ambientMangPanda",
        "ambientMrKikushibu",
        "riverBoat",
        "readingShrine",
        "mapFragment"
      ])
    );
    expect(GAME_ASSETS.ninjaAdventureLicense.path).toMatch(/ninja-adventure-cc0-license\.txt/);
  });

  it("records verified sprite-sheet dimensions", () => {
    expect(GAME_ASSETS.learnerWalk.metadata).toMatchObject({
      width: 1024,
      height: 1024,
      frameWidth: 256,
      frameHeight: 256,
      columns: 4,
      rows: 4
    });
    expect(GAME_ASSETS.tilesetNature.metadata).toMatchObject({
      width: 384,
      height: 336,
      frameWidth: 16,
      frameHeight: 16
    });
    expect(GAME_ASSETS.npcMissEstelle.metadata).toMatchObject({
      width: 64,
      height: 16,
      frameWidth: 16,
      frameHeight: 16,
      columns: 4,
      rows: 1
    });
    expect(GAME_ASSETS.learnerWalk.sourcePath).toContain("d4c6a1ba-d0ca-4d2a-a1ac-a817cb123472.png");
    expect(GAME_ASSETS.ambientMissYuuri.metadata).toMatchObject({ width: 64, height: 64, frameWidth: 16, frameHeight: 16 });
    expect(GAME_ASSETS.ambientMangPanda.metadata).toMatchObject({ width: 64, height: 64, frameWidth: 16, frameHeight: 16 });
    expect(GAME_ASSETS.ambientMrKikushibu.metadata).toMatchObject({ width: 64, height: 64, frameWidth: 16, frameHeight: 16 });
  });

  it("uses isolated atlas regions for village houses", () => {
    const structures = [
      GAME_ASSETS.villageRedHouse,
      GAME_ASSETS.villageLearningHall,
      GAME_ASSETS.villageEastHouse,
      GAME_ASSETS.villageMarketShop
    ];

    expect(structures.every((asset) => asset.path === GAME_ASSETS.villageRedHouse.path)).toBe(true);
    expect(GAME_ASSETS.villageRedHouse.region).toMatchObject({ width: 64, height: 48 });
    expect(GAME_ASSETS.villageLearningHall.region).toMatchObject({ width: 64, height: 48 });
    expect(GAME_ASSETS.villageEastHouse.region).toMatchObject({ width: 64, height: 48 });
    expect(GAME_ASSETS.villageMarketShop).toMatchObject({
      key: "village-market-shop",
      region: { x: 64, y: 0, width: 64, height: 48 }
    });
  });

  it("keeps game assets inside the game-one package", () => {
    expect(existsSync(GAME_ASSET_DIRECTORY)).toBe(true);
    expect(existsSync(join(GAME_ASSET_DIRECTORY, "vehicles", "river-boat.png"))).toBe(true);
    expect(existsSync(join(GAME_ASSET_DIRECTORY, "props", "reading-shrine.png"))).toBe(true);
    expect(existsSync(ROOT_PUBLIC_GAME_DIRECTORY)).toBe(false);
    expect(Object.values(GAME_ASSETS).every((asset) => !asset.path.startsWith("/assets/game/"))).toBe(true);
  });
});
