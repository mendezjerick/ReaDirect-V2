import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  copyFile,
  link,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const speechSources = [
  {
    language: "en",
    catalogId: "clara-sh-offline-apk-v1",
    voice: "Ma'am Clara (SH)",
    sourceRoot: path.join(
      repositoryRoot,
      "apps/api/storage/app/private/tts/catalog/sh",
    ),
    manifestPath: path.join(scriptDirectory, "artifacts.json"),
  },
  {
    language: "fil-PH",
    catalogId: "clara-sh-fil-offline-apk-v1",
    voice: "Ma'am Clara (SH Filipino)",
    sourceRoot: path.join(
      repositoryRoot,
      "apps/api/storage/app/private/tts/staging/fil-PH-v1/sh-fil",
    ),
    manifestPath: path.join(scriptDirectory, "artifacts.fil-PH.json"),
  },
];
const packageRoot = path.join(
  repositoryRoot,
  "services/tts/storage/offline-apk-package",
);
const compressedCacheRoot = path.join(
  repositoryRoot,
  "services/tts/storage/offline-apk-vorbis-cache",
);
const refreshManifest = process.argv.includes("--refresh-manifest");
const verifyOnly = process.argv.includes("--verify-only");
const runFile = promisify(execFile);

const RELEASE_ENCODING = {
  id: "vorbis-q3-32khz-mono-v1",
  container: "ogg",
  codec: "vorbis",
  channels: 1,
  sampleRateHz: 32_000,
  quality: 3,
};

const EXPECTED_FORMAT = {
  audioFormat: 1,
  channels: 1,
  bitsPerSample: 16,
  sampleRateHz: 48_000,
};

async function walk(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      if (
        relativePath === "learn-with-clara" ||
        relativePath === "unresolved"
      ) {
        continue;
      }
      files.push(
        ...(await walk(path.join(directory, entry.name), relativePath)),
      );
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".wav")) {
      files.push(relativePath);
    }
  }

  return files;
}

function parseWav(buffer, relativePath) {
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error(`${relativePath} is not a valid RIFF/WAVE file.`);
  }

  let offset = 12;
  let format;
  let dataBytes;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkBytes = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkStart + chunkBytes > buffer.length) {
      throw new Error(`${relativePath} contains a truncated ${chunkId} chunk.`);
    }

    if (chunkId === "fmt " && chunkBytes >= 16) {
      format = {
        audioFormat: buffer.readUInt16LE(chunkStart),
        channels: buffer.readUInt16LE(chunkStart + 2),
        sampleRateHz: buffer.readUInt32LE(chunkStart + 4),
        byteRate: buffer.readUInt32LE(chunkStart + 8),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14),
      };
    } else if (chunkId === "data") {
      dataBytes = chunkBytes;
    }

    offset = chunkStart + chunkBytes + (chunkBytes % 2);
  }

  if (!format || dataBytes === undefined) {
    throw new Error(`${relativePath} is missing required WAV chunks.`);
  }

  for (const [field, expected] of Object.entries(EXPECTED_FORMAT)) {
    if (format[field] !== expected) {
      throw new Error(
        `${relativePath} has ${field}=${format[field]}; expected ${expected}.`,
      );
    }
  }

  return {
    durationMs: Math.round((dataBytes / format.byteRate) * 1_000),
    sampleRateHz: format.sampleRateHz,
    channels: format.channels,
    bitsPerSample: format.bitsPerSample,
  };
}

async function inspectSource(source, relativePath) {
  const absolutePath = path.join(source.sourceRoot, ...relativePath.split("/"));
  const buffer = await readFile(absolutePath);
  const wav = parseWav(buffer, relativePath);

  return {
    key: path.posix.basename(relativePath, ".wav"),
    path: relativePath,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    ...wav,
  };
}

async function buildManifest(source) {
  const sourcePaths = await walk(source.sourceRoot);
  const assets = [];

  for (const relativePath of sourcePaths) {
    assets.push(await inspectSource(source, relativePath));
  }

  assets.sort((left, right) => left.key.localeCompare(right.key));
  const keyCount = new Set(assets.map(({ key }) => key)).size;
  if (keyCount !== assets.length) {
    throw new Error(
      "Offline TTS filenames must be globally unique speech keys.",
    );
  }

  return {
    schemaVersion: 1,
    catalogId: source.catalogId,
    language: source.language,
    voice: source.voice,
    excludedFeatures: ["learn-with-clara"],
    assetCount: assets.length,
    totalBytes: assets.reduce((total, asset) => total + asset.bytes, 0),
    totalDurationMs: assets.reduce(
      (total, asset) => total + asset.durationMs,
      0,
    ),
    assets,
  };
}

function assertManifestsMatch(expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(
      "The offline TTS source no longer matches artifacts.json. Review the audio change, then run this script with --refresh-manifest.",
    );
  }
}

async function hardlinkOrCopy(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  try {
    await link(source, destination);
  } catch (error) {
    if (!["EXDEV", "EPERM", "EACCES", "ENOTSUP"].includes(error.code)) {
      throw error;
    }
    await copyFile(source, destination);
  }
}

function releasePath(sourcePath) {
  return sourcePath.replace(/\.wav$/i, ".ogg");
}

async function sha256File(file) {
  const buffer = await readFile(file);
  return createHash("sha256").update(buffer).digest("hex");
}

async function prepareCompressedAsset(sourceDefinition, asset, index) {
  const relativePath = releasePath(asset.path);
  const source = path.join(
    sourceDefinition.sourceRoot,
    ...asset.path.split("/"),
  );
  const cached = path.join(
    compressedCacheRoot,
    sourceDefinition.language,
    ...relativePath.split("/"),
  );
  const marker = `${cached}.source.json`;

  let reusable = false;
  let cachedStat;
  let sha256;
  try {
    cachedStat = await stat(cached);
    const cacheMetadata = JSON.parse(await readFile(marker, "utf8"));
    sha256 = await sha256File(cached);
    reusable =
      cachedStat.isFile() &&
      cachedStat.size > 0 &&
      cacheMetadata.sourceSha256 === asset.sha256 &&
      JSON.stringify(cacheMetadata.encoding) ===
        JSON.stringify(RELEASE_ENCODING) &&
      cacheMetadata.outputBytes === cachedStat.size &&
      cacheMetadata.outputSha256 === sha256;
  } catch {
    reusable = false;
  }

  if (!reusable) {
    await mkdir(path.dirname(cached), { recursive: true });
    const temporary = `${cached}.${process.pid}.tmp.ogg`;
    await rm(temporary, { force: true });
    try {
      await runFile(
        process.env.FFMPEG_PATH || "ffmpeg",
        [
          "-nostdin",
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-i",
          source,
          "-map_metadata",
          "-1",
          "-vn",
          "-ac",
          String(RELEASE_ENCODING.channels),
          "-ar",
          String(RELEASE_ENCODING.sampleRateHz),
          "-c:a",
          "libvorbis",
          "-q:a",
          String(RELEASE_ENCODING.quality),
          "-serial_offset",
          String(index + 1),
          temporary,
        ],
        { windowsHide: true },
      );
      await rm(cached, { force: true });
      await copyFile(temporary, cached);
      cachedStat = await stat(cached);
      sha256 = await sha256File(cached);
      await writeFile(
        marker,
        JSON.stringify({
          sourceSha256: asset.sha256,
          encoding: RELEASE_ENCODING,
          outputBytes: cachedStat.size,
          outputSha256: sha256,
        }),
        "utf8",
      );
    } finally {
      await rm(temporary, { force: true });
    }
  }

  cachedStat ??= await stat(cached);
  sha256 ??= await sha256File(cached);
  const destination = path.join(
    packageRoot,
    "tts/audio",
    sourceDefinition.language,
    ...relativePath.split("/"),
  );
  await hardlinkOrCopy(cached, destination);

  return {
    key: asset.key,
    language: sourceDefinition.language,
    path: path.posix.join(sourceDefinition.language, relativePath),
    bytes: cachedStat.size,
    sha256,
    sourceSha256: asset.sha256,
    durationMs: asset.durationMs,
  };
}

const actualManifests = [];
for (const source of speechSources) {
  const actualManifest = await buildManifest(source);
  actualManifests.push(actualManifest);
  if (refreshManifest) {
    await writeFile(
      source.manifestPath,
      `${JSON.stringify(actualManifest, null, 2)}\n`,
    );
    console.log(
      `Refreshed ${path.relative(repositoryRoot, source.manifestPath)} with ${actualManifest.assetCount} ${source.language} assets.`,
    );
  } else {
    const expectedManifest = JSON.parse(
      await readFile(source.manifestPath, "utf8"),
    );
    assertManifestsMatch(expectedManifest, actualManifest);
  }
}

const sourceTotalBytes = actualManifests.reduce(
  (total, manifest) => total + manifest.totalBytes,
  0,
);
const totalDurationMs = actualManifests.reduce(
  (total, manifest) => total + manifest.totalDurationMs,
  0,
);
const assetCount = actualManifests.reduce(
  (total, manifest) => total + manifest.assetCount,
  0,
);
let packagedBytes = sourceTotalBytes;

if (!verifyOnly) {
  const resolvedPackageRoot = path.resolve(packageRoot);
  const allowedStorageRoot = `${path.resolve(repositoryRoot, "services/tts/storage")}${path.sep}`;
  if (!resolvedPackageRoot.startsWith(allowedStorageRoot)) {
    throw new Error(
      `Refusing to replace unsafe package path: ${resolvedPackageRoot}`,
    );
  }

  await rm(resolvedPackageRoot, { recursive: true, force: true });
  const releaseAssets = [];
  let releaseIndex = 0;
  for (const [sourceIndex, source] of speechSources.entries()) {
    for (const asset of actualManifests[sourceIndex].assets) {
      releaseAssets.push(
        await prepareCompressedAsset(source, asset, releaseIndex),
      );
      releaseIndex += 1;
    }
  }
  const releaseManifest = {
    schemaVersion: 3,
    catalogId: "clara-sh-offline-apk-v2",
    languages: speechSources.map(({ language }) => language),
    voices: Object.fromEntries(
      speechSources.map(({ language, voice }) => [language, voice]),
    ),
    excludedFeatures: ["learn-with-clara"],
    encoding: RELEASE_ENCODING,
    sourceTotalBytes,
    assetCount: releaseAssets.length,
    totalBytes: releaseAssets.reduce((total, asset) => total + asset.bytes, 0),
    totalDurationMs,
    assets: releaseAssets,
  };
  packagedBytes = releaseManifest.totalBytes;
  await mkdir(path.join(resolvedPackageRoot, "tts"), { recursive: true });
  await writeFile(
    path.join(resolvedPackageRoot, "tts/catalog.json"),
    `${JSON.stringify(releaseManifest, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `Compressed offline TTS from ${sourceTotalBytes} to ${releaseManifest.totalBytes} bytes (${((releaseManifest.totalBytes / sourceTotalBytes) * 100).toFixed(1)}%).`,
  );
}

const packageStatus = verifyOnly ? "verified" : "prepared";
console.log(
  `Offline TTS ${packageStatus}: ${assetCount} assets across ${speechSources.length} languages, ${packagedBytes} bytes, ${totalDurationMs} ms.`,
);
