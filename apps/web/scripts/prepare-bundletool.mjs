import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "1.18.3";
const EXPECTED_SHA256 =
  "a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29";
const DOWNLOAD_URL = `https://github.com/google/bundletool/releases/download/${VERSION}/bundletool-all-${VERSION}.jar`;
const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(webRoot, "../..");
const destinationDirectory = path.join(repositoryRoot, ".cache", "bundletool");
const destination = path.join(
  destinationDirectory,
  `bundletool-all-${VERSION}.jar`,
);
const temporary = `${destination}.download`;

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function download(url, destinationPath, redirectsRemaining = 5) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { "User-Agent": "ReaDirect-release-build" } },
      (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location &&
          redirectsRemaining > 0
        ) {
          response.resume();
          download(
            new URL(response.headers.location, url).toString(),
            destinationPath,
            redirectsRemaining - 1,
          ).then(resolve, reject);
          return;
        }
        if (response.statusCode !== 200) {
          response.resume();
          reject(
            new Error(
              `Bundletool download returned HTTP ${response.statusCode}.`,
            ),
          );
          return;
        }
        const output = createWriteStream(destinationPath, { flags: "wx" });
        response.pipe(output);
        output.on("finish", () => output.close(resolve));
        output.on("error", reject);
      },
    );
    request.on("error", reject);
  });
}

mkdirSync(destinationDirectory, { recursive: true });
if (existsSync(destination)) {
  const observed = await sha256(destination);
  if (observed !== EXPECTED_SHA256) {
    throw new Error(
      "Cached Bundletool checksum does not match the pinned release.",
    );
  }
  console.log(`Bundletool ${VERSION} verified from cache.`);
  process.exit(0);
}

rmSync(temporary, { force: true });
try {
  await download(DOWNLOAD_URL, temporary);
  const observed = await sha256(temporary);
  if (observed !== EXPECTED_SHA256) {
    throw new Error(
      `Bundletool checksum mismatch: expected ${EXPECTED_SHA256}, observed ${observed}.`,
    );
  }
  renameSync(temporary, destination);
} finally {
  rmSync(temporary, { force: true });
}

console.log(`Bundletool ${VERSION} downloaded and checksum-verified.`);
