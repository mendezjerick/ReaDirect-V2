import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

type Catalog = {
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
    path: string;
    sha256: string;
    sourceSha256: string;
  }>;
};

async function readCatalog(): Promise<Catalog> {
  const catalogPath = path.resolve(
    process.cwd(),
    "../../services/tts/offline_catalog/artifacts.json",
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
    const catalog = await readCatalog();

    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.assetCount).toBe(293);
    expect(catalog.assets).toHaveLength(293);
    expect(
      catalog.assets.some(({ path }) => path.startsWith("learn-with-clara/")),
    ).toBe(false);
    expect(new Set(catalog.assets.map(({ key }) => key)).size).toBe(293);
  });

  it("pins each compatible PCM WAV by SHA-256", async () => {
    const catalog = await readCatalog();

    expect(catalog.totalBytes).toBe(110_881_372);
    for (const asset of catalog.assets) {
      expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(asset.channels).toBe(1);
      expect(asset.bitsPerSample).toBe(16);
      expect(asset.sampleRateHz).toBe(48_000);
    }
  });

  it("packages checksum-pinned Vorbis speech below twelve percent of PCM", async () => {
    const catalog = await readReleaseCatalog();

    expect(catalog).toMatchObject({
      schemaVersion: 2,
      assetCount: 293,
      encoding: {
        container: "ogg",
        codec: "vorbis",
        channels: 1,
        sampleRateHz: 32_000,
      },
    });
    expect(catalog.sourceTotalBytes).toBe(110_881_372);
    expect(catalog.totalBytes / catalog.sourceTotalBytes).toBeLessThan(0.12);
    for (const asset of catalog.assets) {
      expect(asset.path).toMatch(/\.ogg$/);
      expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(asset.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
