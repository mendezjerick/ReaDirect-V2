import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const contract = JSON.parse(
  await readFile(path.join(webRoot, "offline-apk-boundary.json"), "utf8"),
);
const outputRoot = path.join(webRoot, contract.output_directory);
const manifestPath = path.join(outputRoot, ".vite", "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const buildMarker = JSON.parse(
  await readFile(path.join(outputRoot, "offline-apk-build.json"), "utf8"),
);

if (
  buildMarker.target !== contract.target ||
  buildMarker.entry !== contract.entry
) {
  throw new Error(
    `Offline APK build marker does not match ${contract.target}:${contract.entry}.`,
  );
}

const manifestEntries = Object.values(manifest).filter((item) => item.isEntry);
if (manifestEntries.length !== 1 || manifestEntries[0].src !== "index.html") {
  throw new Error(
    "Offline APK must contain exactly one HTML application entry.",
  );
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(resolved)));
    } else {
      files.push(resolved);
    }
  }

  return files;
}

const emittedFiles = await collectFiles(outputRoot);
const inspectableFiles = emittedFiles.filter((file) =>
  [".css", ".html", ".js"].includes(path.extname(file)),
);

for (const file of inspectableFiles) {
  const contents = await readFile(file, "utf8");
  const violation = contract.forbidden_bundle_tokens.find((token) =>
    contents.includes(token),
  );

  if (violation) {
    throw new Error(
      `Offline APK artifact ${path.relative(outputRoot, file)} contains forbidden token ${violation}.`,
    );
  }
}

const totalBytes = (
  await Promise.all(emittedFiles.map((file) => stat(file)))
).reduce((total, item) => total + item.size, 0);

console.log(
  JSON.stringify(
    {
      target: contract.target,
      entry: contract.entry,
      files: emittedFiles.length,
      bytes: totalBytes,
      forbidden_tokens_found: 0,
      status: "passed",
    },
    null,
    2,
  ),
);
