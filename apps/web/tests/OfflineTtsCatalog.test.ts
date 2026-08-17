import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

type Catalog = {
  language: "en" | "fil-PH";
  schemaVersion: number;
  assetCount: number;
  totalBytes: number;
  assets: Array<{
    key: string;
    path: string;
    sha256: string;
    channels: number;
    bitsPerSample: number;
    sampleRateHz: number;
  }>;
};

type ReleaseCatalog = {
  languages: ["en", "fil-PH"];
  schemaVersion: number;
  sourceTotalBytes: number;
  totalBytes: number;
  assetCount: number;
  encoding: {
    container: string;
    codec: string;
    channels: number;
    sampleRateHz: number;
  };
  assets: Array<{
    language: "en" | "fil-PH";
    path: string;
    sha256: string;
    sourceSha256: string;
  }>;
};

async function readCatalog(language: "en" | "fil-PH" = "en"): Promise<Catalog> {
  const catalogPath = path.resolve(
    process.cwd(),
    language === "en"
      ? "../../services/tts/offline_catalog/artifacts.json"
      : "../../services/tts/offline_catalog/artifacts.fil-PH.json",
  );
  return JSON.parse(await readFile(catalogPath, "utf8")) as Catalog;
}

async function readReleaseCatalog(): Promise<ReleaseCatalog> {
  return JSON.parse(
    await readFile(
      path.resolve(
        process.cwd(),
        "../../services/tts/storage/offline-apk-package/tts/catalog.json",
      ),
      "utf8",
    ),
  ) as ReleaseCatalog;
}

describe("offline TTS catalog", () => {
  it("contains only APK lesson-journey speech", async () => {
    const english = await readCatalog("en");
    const filipino = await readCatalog("fil-PH");

    for (const catalog of [english, filipino]) {
      expect(catalog.schemaVersion).toBe(1);
      expect(catalog.assetCount).toBe(293);
      expect(catalog.assets).toHaveLength(293);
      expect(
        catalog.assets.some(({ path }) => path.startsWith("learn-with-clara/")),
      ).toBe(false);
      expect(new Set(catalog.assets.map(({ key }) => key)).size).toBe(293);
    }
    expect(filipino.assets.map(({ key }) => key)).toEqual(
      english.assets.map(({ key }) => key),
    );
  });

  it("pins each compatible PCM WAV by SHA-256", async () => {
    const english = await readCatalog("en");
    const filipino = await readCatalog("fil-PH");

    expect(english.totalBytes).toBe(110_881_372);
    expect(filipino.totalBytes).toBe(142_108_252);
    for (const catalog of [english, filipino]) {
      for (const asset of catalog.assets) {
        expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(asset.channels).toBe(1);
        expect(asset.bitsPerSample).toBe(16);
        expect(asset.sampleRateHz).toBe(48_000);
      }
    }
  });

  it("packages checksum-pinned Vorbis speech below twelve percent of PCM", async () => {
    const catalog = await readReleaseCatalog();

    expect(catalog).toMatchObject({
      schemaVersion: 3,
      languages: ["en", "fil-PH"],
      assetCount: 586,
      encoding: {
        container: "ogg",
        codec: "vorbis",
        channels: 1,
        sampleRateHz: 32_000,
      },
    });
    expect(catalog.sourceTotalBytes).toBe(252_989_624);
    expect(catalog.totalBytes / catalog.sourceTotalBytes).toBeLessThan(0.12);
    for (const asset of catalog.assets) {
      expect(asset.path).toMatch(new RegExp(`^${asset.language}/.+\\.ogg$`));
      expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(asset.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
