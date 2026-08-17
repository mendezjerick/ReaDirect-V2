import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("offline distribution verifier", () => {
  it("resolves versioned artifacts without executing verification on import", async () => {
    const repositoryRoot = mkdtempSync(
      path.join(tmpdir(), "readirect-distribution-"),
    );
    temporaryDirectories.push(repositoryRoot);
    const webRoot = path.join(repositoryRoot, "apps", "web");
    const gradlePath = path.join(
      webRoot,
      "android-apk",
      "app",
      "build.gradle",
    );
    const outputDirectory = path.join(repositoryRoot, "output", "releases");
    mkdirSync(path.dirname(gradlePath), { recursive: true });
    writeFileSync(gradlePath, 'versionName "1.4"', "utf8");

    const { resolveDistributionPaths } = await import(
      "../scripts/verify-offline-distribution.mjs"
    );
    const result = resolveDistributionPaths({ repositoryRoot, webRoot });

    expect(result.signedAab).toBe(
      path.join(outputDirectory, "ReaDirect-Offline-1.4.aab"),
    );
    expect(result.localTestingApks).toBe(
      path.join(
        outputDirectory,
        "ReaDirect-Offline-1.4-local-testing.apks",
      ),
    );
  });
});
