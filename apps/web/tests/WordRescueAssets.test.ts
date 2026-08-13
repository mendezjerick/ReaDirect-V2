import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createWordRescueAssetRegistry,
  getWordRescueAsset,
  wordRescueAssetRegistry,
} from "../src/features/lesson/word-rescue/wordRescueAssets";
import { wordRescueAssetReview } from "../src/features/lesson/word-rescue/wordRescueAssetReview";

const assetDirectory = resolve(
  process.cwd(),
  "src/features/lesson/word-rescue/assets/vocabulary",
);

describe("Word Rescue vocabulary assets", () => {
  it("registers 27 approved images, five approved icons, and one review-pending icon", () => {
    const entries = Object.entries(wordRescueAssetRegistry);
    const contentIds = entries.map(([, asset]) => asset.contentId);

    expect(entries).toHaveLength(33);
    expect(new Set(entries.map(([visualKey]) => visualKey)).size).toBe(33);
    expect(new Set(contentIds).size).toBe(33);
    expect(
      entries.filter(([, asset]) => asset.visualKind === "image"),
    ).toHaveLength(27);
    expect(
      entries.filter(([, asset]) => asset.visualKind === "icon"),
    ).toHaveLength(6);
    expect(
      entries.filter(([, asset]) => asset.reviewStatus === "approved"),
    ).toHaveLength(32);
    expect(
      entries.filter(([, asset]) => asset.reviewStatus === "needs_review"),
    ).toHaveLength(1);
    expect(
      entries
        .filter(([, asset]) => asset.reviewStatus === "needs_review")
        .map(([visualKey]) => visualKey),
    ).toEqual(["word-jog"]);
  });

  it("maps every registry key to an existing WebP within the asset budget", () => {
    for (const [visualKey, asset] of Object.entries(wordRescueAssetReview)) {
      const fileName = asset.file.replace("assets/vocabulary/", "");
      const filePath = resolve(assetDirectory, fileName);
      expect(visualKey).toMatch(/^word-[a-z]+$/);
      expect(existsSync(filePath)).toBe(true);
      expect(fileName).toMatch(/^word-[a-z]+\.webp$/);
      const bytes = readFileSync(filePath);
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
      expect(asset.width).toBeGreaterThanOrEqual(256);
      expect(asset.height).toBeGreaterThanOrEqual(256);
      expect(asset.width).toBeLessThanOrEqual(1536);
      expect(asset.height).toBeLessThanOrEqual(1536);
      expect(asset.byteSize).toBeLessThanOrEqual(100_000);
      expect(statSync(filePath).size).toBe(asset.byteSize);
    }
  });

  it("fails safely for an unknown visual key and has no text-only registrations", () => {
    expect(getWordRescueAsset("word-not-approved")).toBeNull();
    expect(getWordRescueAsset("word-big")).toBeNull();
    expect(
      Object.values(wordRescueAssetRegistry).every((asset) =>
        ["image", "icon"].includes(asset.visualKind),
      ),
    ).toBe(true);
  });

  it("rejects duplicate visual keys and duplicate content IDs", () => {
    const first = Object.values(wordRescueAssetRegistry)[0];

    expect(() => createWordRescueAssetRegistry([first, first])).toThrow(
      "Duplicate Word Rescue visual key",
    );
    expect(() =>
      createWordRescueAssetRegistry([
        first,
        { ...first, visualKey: "word-another" },
      ]),
    ).toThrow("Duplicate Word Rescue content ID");
  });

  it("keeps registry content IDs and visual keys aligned with review metadata", () => {
    for (const [visualKey, asset] of Object.entries(wordRescueAssetRegistry)) {
      expect(asset.visualKey).toBe(visualKey);
      expect(asset.contentId).toBe(
        wordRescueAssetReview[visualKey as keyof typeof wordRescueAssetReview]
          .contentId,
      );
    }
  });
});
