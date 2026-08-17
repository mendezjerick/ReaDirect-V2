import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const publicRoot = path.join(webRoot, "public");
const manifestPath = path.join(webRoot, "offline-journey-assets.json");
const refreshManifest = process.argv.includes("--refresh-manifest");

const achievementAssets = [
  "assets/icons/achievements/ready-reader.png",
  "assets/icons/achievements/letter-leader.png",
  "assets/icons/achievements/word-wizard.png",
  "assets/icons/achievements/phrase-pro.png",
  "assets/icons/achievements/sentence-star.png",
  "assets/icons/achievements/passage-explorer.png",
  "assets/icons/achievements/question-detective.png",
  "assets/icons/achievements/readirect-champion.png",
];

async function inspectAsset(relativePath) {
  const absolutePath = path.join(publicRoot, ...relativePath.split("/"));
  const metadata = await stat(absolutePath);
  if (!metadata.isFile()) {
    throw new Error(`Offline journey asset is not a file: ${relativePath}`);
  }
  const contents = await readFile(absolutePath);
  return {
    source: relativePath,
    output: relativePath,
    bytes: contents.length,
    sha256: createHash("sha256").update(contents).digest("hex"),
  };
}

async function buildManifest() {
  const assets = [];
  for (const relativePath of achievementAssets) {
    assets.push(await inspectAsset(relativePath));
  }
  return {
    schemaVersion: 1,
    bundleId: "reading-journey-offline-ui-v1",
    assetCount: assets.length,
    totalBytes: assets.reduce((total, asset) => total + asset.bytes, 0),
    assets,
  };
}

const actual = await buildManifest();
if (refreshManifest) {
  await writeFile(manifestPath, `${JSON.stringify(actual, null, 2)}\n`);
  console.log(
    `Refreshed offline journey manifest with ${actual.assetCount} assets.`,
  );
} else {
  const expected = JSON.parse(await readFile(manifestPath, "utf8"));
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(
      "Offline journey assets no longer match offline-journey-assets.json. Review the UI change, then refresh the manifest explicitly.",
    );
  }
}

console.log(
  `Offline journey assets verified: ${actual.assetCount} files, ${actual.totalBytes} bytes.`,
);
