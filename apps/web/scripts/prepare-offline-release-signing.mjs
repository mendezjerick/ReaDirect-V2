import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
const secretsPath = path.join(privateDirectory, "signing-secrets.json");
const readmePath = path.join(privateDirectory, "README.txt");
const identities = {
  appSigning: {
    alias: "readirect-offline-app",
    keystore: "readirect-offline-app-signing.p12",
    certificate: "readirect-offline-app-signing-certificate.pem",
    commonName: "ReaDirect Offline App Signing",
  },
  playUpload: {
    alias: "readirect-offline-upload",
    keystore: "readirect-offline-play-upload.p12",
    certificate: "readirect-offline-play-upload-certificate.pem",
    commonName: "ReaDirect Offline Play Upload",
  },
};

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

function runKeytool(argumentsList) {
  const result = spawnSync(resolveJavaTool("keytool"), argumentsList, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `keytool failed (${result.status ?? "unknown"}): ${result.stderr.trim()}`,
    );
  }
}

function randomPassword() {
  return randomBytes(36).toString("base64url");
}

function verifyExistingSecrets(value) {
  if (value?.schemaVersion !== 1) {
    throw new Error("The release signing secrets have an unsupported schema.");
  }
  for (const key of Object.keys(identities)) {
    const identity = value[key];
    if (
      !identity?.alias ||
      !identity?.keystore ||
      !identity?.storePassword ||
      !identity?.keyPassword ||
      !existsSync(path.join(privateDirectory, identity.keystore))
    ) {
      throw new Error(`The stored ${key} signing identity is incomplete.`);
    }
  }
}

mkdirSync(privateDirectory, { recursive: true, mode: 0o700 });

if (existsSync(secretsPath)) {
  const existing = JSON.parse(readFileSync(secretsPath, "utf8"));
  verifyExistingSecrets(existing);
  console.log(
    JSON.stringify(
      {
        status: "reused",
        privateDirectory: path.relative(repositoryRoot, privateDirectory),
        identities: Object.keys(identities),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

for (const identity of Object.values(identities)) {
  for (const fileName of [identity.keystore, identity.certificate]) {
    if (existsSync(path.join(privateDirectory, fileName))) {
      throw new Error(
        `Refusing to replace partial release signing material: ${fileName}`,
      );
    }
  }
}

const secrets = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
};

for (const [key, identity] of Object.entries(identities)) {
  const password = randomPassword();
  const keystorePath = path.join(privateDirectory, identity.keystore);
  const certificatePath = path.join(privateDirectory, identity.certificate);
  runKeytool([
    "-genkeypair",
    "-keystore",
    keystorePath,
    "-storetype",
    "PKCS12",
    "-storepass",
    password,
    "-keypass",
    password,
    "-alias",
    identity.alias,
    "-keyalg",
    "RSA",
    "-keysize",
    "4096",
    "-sigalg",
    "SHA256withRSA",
    "-validity",
    "10000",
    "-dname",
    `CN=${identity.commonName}, OU=Mobile, O=ReaDirect, L=Manila, ST=Metro Manila, C=PH`,
  ]);
  runKeytool([
    "-exportcert",
    "-rfc",
    "-keystore",
    keystorePath,
    "-storetype",
    "PKCS12",
    "-storepass",
    password,
    "-alias",
    identity.alias,
    "-file",
    certificatePath,
  ]);
  secrets[key] = {
    alias: identity.alias,
    keystore: identity.keystore,
    certificate: identity.certificate,
    storePassword: password,
    keyPassword: password,
  };
}

writeFileSync(secretsPath, `${JSON.stringify(secrets, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
  flag: "wx",
});
writeFileSync(
  readmePath,
  [
    "ReaDirect offline Android release signing material",
    "",
    "BACK UP THIS ENTIRE DIRECTORY IN AN ENCRYPTED, ACCESS-CONTROLLED VAULT.",
    "Losing the app-signing key prevents updates to direct APK installations.",
    "Do not commit, email, or place these files in ordinary shared storage.",
    "The app-signing identity signs direct APKs.",
    "The Play upload identity signs AAB uploads and may be reset through Play.",
    "When enrolling in Play App Signing, import the app-signing identity so",
    "Play and website installations retain the same Android application identity.",
    "",
  ].join("\n"),
  { encoding: "utf8", mode: 0o600, flag: "wx" },
);

for (const fileName of [
  "signing-secrets.json",
  "README.txt",
  ...Object.values(identities).flatMap((identity) => [
    identity.keystore,
    identity.certificate,
  ]),
]) {
  chmodSync(path.join(privateDirectory, fileName), 0o600);
}

console.log(
  JSON.stringify(
    {
      status: "created",
      privateDirectory: path.relative(repositoryRoot, privateDirectory),
      identities: Object.keys(identities),
      reminder: "Back up the private directory in an encrypted vault.",
    },
    null,
    2,
  ),
);
