import {
  existsSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BUNDLETOOL_VERSION = "1.18.3";
const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(webRoot, "../..");
const privateDirectory = path.join(
  repositoryRoot,
  "apps",
  "api",
  "storage",
  "app",
  "private",
  "offline-apk-release",
);
const bundletool = path.join(
  repositoryRoot,
  ".cache",
  "bundletool",
  `bundletool-all-${BUNDLETOOL_VERSION}.jar`,
);
const signedAab = path.join(
  repositoryRoot,
  "output",
  "releases",
  "ReaDirect-Offline-1.0.aab",
);
const localTestingApks = path.join(
  repositoryRoot,
  "output",
  "releases",
  "ReaDirect-Offline-1.0-local-testing.apks",
);
const secretsPath = path.join(privateDirectory, "signing-secrets.json");
const storePasswordPath = path.join(
  privateDirectory,
  ".bundletool-store-password",
);
const keyPasswordPath = path.join(privateDirectory, ".bundletool-key-password");

function resolveJavaTool(name) {
  let javaHome = process.env.JAVA_HOME;
  if (javaHome && path.basename(javaHome).toLowerCase() === "bin") {
    javaHome = path.dirname(javaHome);
  }
  if (javaHome) {
    const candidate = path.join(
      javaHome,
      "bin",
      process.platform === "win32" ? `${name}.exe` : name,
    );
    if (existsSync(candidate)) return candidate;
  }
  return name;
}

function run(command, argumentsList, environment = {}) {
  const result = spawnSync(command, argumentsList, {
    encoding: "utf8",
    env: { ...process.env, ...environment },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (result.status !== 0) {
    const detail =
      result.error?.message ||
      result.stderr?.trim() ||
      result.stdout?.trim() ||
      "No process output was available.";
    throw new Error(
      `${path.basename(command)} failed (${result.status ?? "unknown"}): ${detail}`,
    );
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

for (const required of [bundletool, signedAab, secretsPath]) {
  if (!existsSync(required))
    throw new Error(`Missing release input: ${required}`);
}
const secrets = JSON.parse(readFileSync(secretsPath, "utf8"));
const appSigning = secrets.appSigning;
const appKeystore = path.join(privateDirectory, appSigning.keystore);
const java = resolveJavaTool("java");

const validationOutput = run(java, [
  "-jar",
  bundletool,
  "validate",
  `--bundle=${signedAab}`,
]);
rmSync(localTestingApks, { force: true });
for (const passwordPath of [storePasswordPath, keyPasswordPath]) {
  rmSync(passwordPath, { force: true });
}
try {
  writeFileSync(storePasswordPath, appSigning.storePassword, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  writeFileSync(keyPasswordPath, appSigning.keyPassword, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  run(java, [
    "-jar",
    bundletool,
    "build-apks",
    `--bundle=${signedAab}`,
    `--output=${localTestingApks}`,
    "--local-testing",
    `--ks=${appKeystore}`,
    `--ks-pass=file:${storePasswordPath}`,
    `--ks-key-alias=${appSigning.alias}`,
    `--key-pass=file:${keyPasswordPath}`,
  ]);
} finally {
  for (const passwordPath of [storePasswordPath, keyPasswordPath]) {
    rmSync(passwordPath, { force: true });
  }
}

const archiveEntries = run(resolveJavaTool("jar"), [
  "tf",
  localTestingApks,
]).split(/\r?\n/);
const assetPackEntries = archiveEntries.filter((entry) =>
  entry.includes("offline_models"),
);
if (assetPackEntries.length === 0) {
  throw new Error("Bundletool output does not contain the offline model pack.");
}

console.log(
  JSON.stringify(
    {
      status: "validated",
      bundletoolVersion: BUNDLETOOL_VERSION,
      validation:
        validationOutput.includes("Asset pack: offline_models") &&
        validationOutput.includes("Feature module: base")
          ? "base-and-offline-model-pack-passed"
          : "passed",
      localTestingArchive: path.relative(repositoryRoot, localTestingApks),
      localTestingBytes: statSync(localTestingApks).size,
      assetPackEntries: assetPackEntries.length,
      deviceInstall: "not-run-no-compatible-arm-device",
    },
    null,
    2,
  ),
);
