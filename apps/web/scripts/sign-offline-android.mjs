import { createHash } from "node:crypto";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { resolveOfflineAndroidRelease } from "./offline-android-release.mjs";

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(webRoot, "../..");
const androidRoot = path.join(webRoot, "android-apk");
const privateDirectory = path.join(
  repositoryRoot,
  "apps",
  "api",
  "storage",
  "app",
  "private",
  "offline-apk-release",
);
const secretsPath = path.join(privateDirectory, "signing-secrets.json");
const outputDirectory = path.join(repositoryRoot, "output", "releases");
const release = resolveOfflineAndroidRelease({
  gradlePath: path.join(androidRoot, "app", "build.gradle"),
  outputDirectory,
});
const unsignedApk = path.join(
  androidRoot,
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release-unsigned.apk",
);
const unsignedAab = path.join(
  androidRoot,
  "app",
  "build",
  "outputs",
  "bundle",
  "release",
  "app-release.aab",
);
const alignedApk = path.join(outputDirectory, ".readirect-offline-aligned.apk");
const { signedApk, signedAab } = release;

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

function resolveBuildTool(name) {
  const sdkRoot =
    process.env.ANDROID_HOME ??
    process.env.ANDROID_SDK_ROOT ??
    (process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk")
      : undefined);
  if (!sdkRoot) throw new Error("Android SDK location is unavailable.");
  const buildToolsRoot = path.join(sdkRoot, "build-tools");
  const versions = readFileSync(
    path.join(androidRoot, "variables.gradle"),
    "utf8",
  );
  const compileSdk = versions.match(/compileSdkVersion\s*=\s*(\d+)/)?.[1];
  const preferred = compileSdk
    ? path.join(buildToolsRoot, `${compileSdk}.0.0`)
    : "";
  const executableName = process.platform === "win32" ? `${name}.bat` : name;
  const exeName = process.platform === "win32" ? `${name}.exe` : name;
  for (const candidate of [
    path.join(preferred, exeName),
    path.join(preferred, executableName),
  ]) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  throw new Error(`Android build tool ${name} was not found.`);
}

function run(command, argumentsList, environment = {}) {
  const isWindowsBatch =
    process.platform === "win32" && command.toLowerCase().endsWith(".bat");
  const executable = isWindowsBatch
    ? (process.env.ComSpec ?? "cmd.exe")
    : command;
  const resolvedArguments = isWindowsBatch
    ? ["/d", "/s", "/c", command, ...argumentsList]
    : argumentsList;
  const result = spawnSync(executable, resolvedArguments, {
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
  return `${result.stdout}${result.stderr}`.trim();
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex").toUpperCase();
}

if (!existsSync(secretsPath)) {
  throw new Error(
    "Release signing material is missing. Run the signing setup first.",
  );
}
for (const artifact of [unsignedApk, unsignedAab]) {
  if (!existsSync(artifact)) {
    throw new Error(`Unsigned release artifact is missing: ${artifact}`);
  }
}

const secrets = JSON.parse(readFileSync(secretsPath, "utf8"));
if (secrets.schemaVersion !== 1) {
  throw new Error("The release signing secrets have an unsupported schema.");
}

mkdirSync(outputDirectory, { recursive: true });
for (const output of [alignedApk, signedApk, signedAab]) {
  rmSync(output, { force: true });
}

const zipalign = resolveBuildTool("zipalign");
const apksignerLauncher = resolveBuildTool("apksigner");
const apksignerJar = path.join(
  path.dirname(apksignerLauncher),
  "lib",
  "apksigner.jar",
);
if (!existsSync(apksignerJar)) {
  throw new Error(`Android APK signer library was not found: ${apksignerJar}`);
}
const java = resolveJavaTool("java");
const apksignerArguments = ["-jar", apksignerJar];
run(zipalign, ["-p", "-f", "4", unsignedApk, alignedApk]);

const appKeystore = path.join(privateDirectory, secrets.appSigning.keystore);
run(
  java,
  [
    ...apksignerArguments,
    "sign",
    "--ks",
    appKeystore,
    "--ks-key-alias",
    secrets.appSigning.alias,
    "--ks-pass",
    "env:READIRECT_APP_STORE_PASSWORD",
    "--key-pass",
    "env:READIRECT_APP_KEY_PASSWORD",
    "--out",
    signedApk,
    alignedApk,
  ],
  {
    READIRECT_APP_STORE_PASSWORD: secrets.appSigning.storePassword,
    READIRECT_APP_KEY_PASSWORD: secrets.appSigning.keyPassword,
  },
);
rmSync(alignedApk, { force: true });

const uploadKeystore = path.join(privateDirectory, secrets.playUpload.keystore);
run(
  resolveJavaTool("jarsigner"),
  [
    "-keystore",
    uploadKeystore,
    "-storetype",
    "PKCS12",
    "-storepass:env",
    "READIRECT_UPLOAD_STORE_PASSWORD",
    "-keypass:env",
    "READIRECT_UPLOAD_KEY_PASSWORD",
    "-sigalg",
    "SHA256withRSA",
    "-digestalg",
    "SHA-256",
    "-signedjar",
    signedAab,
    unsignedAab,
    secrets.playUpload.alias,
  ],
  {
    READIRECT_UPLOAD_STORE_PASSWORD: secrets.playUpload.storePassword,
    READIRECT_UPLOAD_KEY_PASSWORD: secrets.playUpload.keyPassword,
  },
);

run(zipalign, ["-c", "-v", "4", signedApk]);
const apkVerification = run(java, [
  ...apksignerArguments,
  "verify",
  "--verbose",
  "--print-certs",
  signedApk,
]);
const aabVerification = run(resolveJavaTool("jarsigner"), [
  "-verify",
  "-verbose",
  "-certs",
  signedAab,
]);
if (!/Verified using v2 scheme.*true/i.test(apkVerification)) {
  throw new Error("The APK did not verify with APK Signature Scheme v2.");
}
if (!/jar verified/i.test(aabVerification)) {
  throw new Error("The AAB JAR signature did not verify.");
}

for (const identity of [secrets.appSigning, secrets.playUpload]) {
  copyFileSync(
    path.join(privateDirectory, identity.certificate),
    path.join(outputDirectory, identity.certificate),
  );
}

const artifacts = await Promise.all(
  [signedApk, signedAab].map(async (filePath) => ({
    file: path.basename(filePath),
    bytes: statSync(filePath).size,
    sha256: await sha256(filePath),
  })),
);
writeFileSync(
  path.join(outputDirectory, "SHA256SUMS.txt"),
  `${artifacts.map((artifact) => `${artifact.sha256}  ${artifact.file}`).join("\n")}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      status: "signed-and-verified",
      outputDirectory: path.relative(repositoryRoot, outputDirectory),
      artifacts,
      apkSignatureSchemeV2: true,
      aabJarSignature: true,
    },
    null,
    2,
  ),
);
