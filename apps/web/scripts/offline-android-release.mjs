import { readFileSync } from "node:fs";
import path from "node:path";

const ANDROID_VERSION_PATTERN = /^[0-9]+(?:\.[0-9]+)*$/;

export function resolveOfflineAndroidRelease({
  gradlePath,
  outputDirectory,
}) {
  const gradleSource = readFileSync(gradlePath, "utf8");
  const versionName = gradleSource.match(
    /\bversionName\s+["']([^"']+)["']/,
  )?.[1];

  if (!versionName || !ANDROID_VERSION_PATTERN.test(versionName)) {
    throw new Error(
      `Unable to resolve a valid Android versionName from ${gradlePath}.`,
    );
  }

  const artifactPrefix = `ReaDirect-Offline-${versionName}`;
  return {
    versionName,
    signedApk: path.join(outputDirectory, `${artifactPrefix}.apk`),
    signedAab: path.join(outputDirectory, `${artifactPrefix}.aab`),
    localTestingApks: path.join(
      outputDirectory,
      `${artifactPrefix}-local-testing.apks`,
    ),
  };
}
