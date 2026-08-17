import { createHash } from "node:crypto";
import {
  copyFile,
  link,
  mkdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mobileModelsRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(mobileModelsRoot, "..", "..", "..");
const catalogPath = path.join(mobileModelsRoot, "artifacts.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const verifyOnly = process.argv.includes("--verify-only");
const expectedTierOrder = ["low", "medium", "high"];
const playAssetPackModelsDirectory = path.resolve(
  repositoryRoot,
  "apps/web/android-apk/offline_models/src/main/assets/asr/models",
);

function assertCatalog(condition, message) {
  if (!condition) {
    throw new Error(`Invalid mobile ASR catalog: ${message}`);
  }
}

async function digest(file, algorithm) {
  const hash = createHash(algorithm);

  for await (const chunk of createReadStream(file)) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

async function verifyArtifact(tier, model) {
  const artifact = model.deployment_artifact;
  const sourcePath = path.resolve(repositoryRoot, artifact.local_path);
  let sourceStat;

  try {
    sourceStat = await stat(sourcePath);
  } catch {
    throw new Error(
      `${model.user_facing_name} ASR artifact is missing: ${artifact.local_path}`,
    );
  }

  if (!sourceStat.isFile() || sourceStat.size !== artifact.size_bytes) {
    throw new Error(
      `${model.user_facing_name} ASR artifact size mismatch: expected ${artifact.size_bytes}, received ${sourceStat.size}.`,
    );
  }

  const sha256 = await digest(sourcePath, "sha256");
  if (sha256 !== artifact.sha256) {
    throw new Error(
      `${model.user_facing_name} ASR artifact SHA-256 mismatch: ${sha256}.`,
    );
  }

  return {
    tier,
    sourcePath,
    packageFilename: artifact.package_filename,
    sizeBytes: sourceStat.size,
    sha256,
  };
}

async function stageArtifact(artifact, modelsDirectory) {
  const destination = path.join(modelsDirectory, artifact.packageFilename);

  try {
    const existingStat = await stat(destination);
    if (
      existingStat.isFile() &&
      existingStat.size === artifact.sizeBytes &&
      (await digest(destination, "sha256")) === artifact.sha256
    ) {
      return { ...artifact, destination, operation: "reused" };
    }

    await unlink(destination);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  try {
    await link(artifact.sourcePath, destination);
    return { ...artifact, destination, operation: "linked" };
  } catch (error) {
    if (!["EXDEV", "EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      throw error;
    }

    await copyFile(artifact.sourcePath, destination);
    return { ...artifact, destination, operation: "copied" };
  }
}

assertCatalog(catalog.schema_version === "2.0", "unsupported schema version");
assertCatalog(
  JSON.stringify(catalog.package.tier_order) ===
    JSON.stringify(expectedTierOrder),
  "tier order must be Low, Medium, High",
);
assertCatalog(
  JSON.stringify(Object.keys(catalog.models)) ===
    JSON.stringify(expectedTierOrder),
  "models must contain exactly Low, Medium, and High",
);

const verifiedArtifacts = [];
for (const tier of expectedTierOrder) {
  const model = catalog.models[tier];
  const expectedName = tier[0].toUpperCase() + tier.slice(1);

  assertCatalog(
    model.user_facing_name === expectedName,
    `${tier} must use the user-facing name ${expectedName}`,
  );
  verifiedArtifacts.push(await verifyArtifact(tier, model));
}

const verifiedBytes = verifiedArtifacts.reduce(
  (total, artifact) => total + artifact.sizeBytes,
  0,
);
assertCatalog(
  verifiedBytes === catalog.package.total_model_bytes,
  `total_model_bytes must equal ${verifiedBytes}`,
);

if (verifyOnly) {
  console.log(
    JSON.stringify(
      {
        status: "passed",
        mode: "verify-only",
        tiers: expectedTierOrder,
        model_bytes: verifiedBytes,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const packageRoot = path.resolve(
  repositoryRoot,
  catalog.package.output_directory,
);
const modelsDirectory = path.join(
  packageRoot,
  ...catalog.package.asset_directory.split("/"),
);
await mkdir(modelsDirectory, { recursive: true });

const stagedArtifacts = [];
for (const artifact of verifiedArtifacts) {
  stagedArtifacts.push(await stageArtifact(artifact, modelsDirectory));
}

await mkdir(playAssetPackModelsDirectory, { recursive: true });
for (const artifact of verifiedArtifacts) {
  await stageArtifact(artifact, playAssetPackModelsDirectory);
}

const runtimeCatalog = {
  schema_version: catalog.schema_version,
  runtime: {
    name: catalog.runtime.name,
    commit: catalog.runtime.commit,
    language: catalog.runtime.language,
  },
  tier_order: expectedTierOrder,
  models: Object.fromEntries(
    stagedArtifacts.map((artifact) => {
      const sourceModel = catalog.models[artifact.tier];
      return [
        artifact.tier,
        {
          user_facing_name: sourceModel.user_facing_name,
          technical_name: sourceModel.technical_name,
          asset_path: `${catalog.package.asset_directory}/${artifact.packageFilename}`,
          size_bytes: artifact.sizeBytes,
          sha256: artifact.sha256,
          quantization: sourceModel.deployment_artifact.quantization,
        },
      ];
    }),
  ),
};

await writeFile(
  path.join(packageRoot, "catalog.json"),
  `${JSON.stringify(runtimeCatalog, null, 2)}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      mode: "prepared",
      package_directory: path.relative(repositoryRoot, packageRoot),
      play_asset_pack_directory: path.relative(
        repositoryRoot,
        playAssetPackModelsDirectory,
      ),
      model_bytes: verifiedBytes,
      tiers: stagedArtifacts.map(({ tier, operation }) => ({
        tier,
        operation,
      })),
    },
    null,
    2,
  ),
);
