import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const publicRoot = path.join(webRoot, "public");
const manifestPath = path.join(webRoot, "offline-clara-assets.json");
const refreshManifest = process.argv.includes("--refresh-manifest");

const fixedAssets = [
  "assets/live2d/core/live2dcubismcore.min.js",
  "assets/live2d/clara/CherryGoth.model3.json",
  "assets/live2d/clara/CherryGoth.moc3",
  "assets/live2d/clara/CherryGoth.physics3.json",
  "assets/live2d/clara/CherryGoth.8192/texture_00.png",
  "assets/live2d/clara/stills/clara-default.png",
];

async function listShaderAssets() {
  const directory = path.join(publicRoot, "assets/live2d/shaders");
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => `assets/live2d/shaders/${entry.name}`)
    .sort();
}

async function inspectAsset(relativePath) {
  const absolutePath = path.join(publicRoot, ...relativePath.split("/"));
  const metadata = await stat(absolutePath);
  if (!metadata.isFile()) {
    throw new Error(`Offline Clara asset is not a file: ${relativePath}`);
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
  const paths = [...fixedAssets, ...(await listShaderAssets())].sort();
  const assets = [];
  for (const relativePath of paths)
    assets.push(await inspectAsset(relativePath));
  return {
    schemaVersion: 1,
    bundleId: "clara-offline-visuals-v1",
    staticPortrait: "assets/live2d/clara/stills/clara-default.png",
    dynamicCore: "assets/live2d/core/live2dcubismcore.min.js",
    dynamicManifest: "assets/live2d/clara/CherryGoth.model3.json",
    assetCount: assets.length,
    totalBytes: assets.reduce((total, asset) => total + asset.bytes, 0),
    assets,
  };
}

const actual = await buildManifest();
if (refreshManifest) {
  await writeFile(manifestPath, `${JSON.stringify(actual, null, 2)}\n`);
  console.log(
    `Refreshed offline Clara manifest with ${actual.assetCount} assets.`,
  );
} else {
  const expected = JSON.parse(await readFile(manifestPath, "utf8"));
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(
      "Offline Clara assets no longer match offline-clara-assets.json. Review the visual change, then refresh the manifest explicitly.",
    );
  }
}

console.log(
  `Offline Clara assets verified: ${actual.assetCount} files, ${actual.totalBytes} bytes.`,
);
