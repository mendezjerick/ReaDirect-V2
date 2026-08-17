import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

async function loadReleaseMetadata() {
  return import("../scripts/offline-android-release.mjs");
}

function gradleFixture(content: string) {
  const directory = mkdtempSync(path.join(tmpdir(), "readirect-release-"));
  temporaryDirectories.push(directory);
  const gradlePath = path.join(directory, "build.gradle");
  writeFileSync(gradlePath, content, "utf8");
  return { directory, gradlePath };
}

describe("offline Android release metadata", () => {
  it("uses the Android version name for every release artifact", async () => {
    const { resolveOfflineAndroidRelease } = await loadReleaseMetadata();
    const fixture = gradleFixture('versionName "1.4"');

    const release = resolveOfflineAndroidRelease({
      gradlePath: fixture.gradlePath,
      outputDirectory: fixture.directory,
    });

    expect(path.basename(release.signedApk)).toBe("ReaDirect-Offline-1.4.apk");
    expect(path.basename(release.signedAab)).toBe("ReaDirect-Offline-1.4.aab");
    expect(path.basename(release.localTestingApks)).toBe(
      "ReaDirect-Offline-1.4-local-testing.apks",
    );
  });

  it("rejects Android metadata without a valid version name", async () => {
    const { resolveOfflineAndroidRelease } = await loadReleaseMetadata();
    const fixture = gradleFixture("versionCode 5");

    expect(() =>
      resolveOfflineAndroidRelease({
        gradlePath: fixture.gradlePath,
        outputDirectory: fixture.directory,
      }),
    ).toThrow("Unable to resolve a valid Android versionName");
  });
});
