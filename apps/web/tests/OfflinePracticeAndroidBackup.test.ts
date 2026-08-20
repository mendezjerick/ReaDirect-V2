import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const androidRoot = resolve(process.cwd(), "android");

describe("Offline Practice Android privacy boundary", () => {
  it("excludes offline packs and WebView session state from Android backup", () => {
    const manifest = readFileSync(
      resolve(androidRoot, "app/src/main/AndroidManifest.xml"),
      "utf8",
    );
    const backupRules = readFileSync(
      resolve(androidRoot, "app/src/main/res/xml/backup_rules.xml"),
      "utf8",
    );
    const extractionRules = readFileSync(
      resolve(androidRoot, "app/src/main/res/xml/data_extraction_rules.xml"),
      "utf8",
    );

    expect(manifest).toContain('android:fullBackupContent="@xml/backup_rules"');
    expect(manifest).toContain(
      'android:dataExtractionRules="@xml/data_extraction_rules"',
    );
    expect(`${backupRules}\n${extractionRules}`).toContain(
      'path="offline-practice"',
    );
    expect(`${backupRules}\n${extractionRules}`).toContain(
      'path="app_webview"',
    );
  });

  it("keeps storage permissions narrow and WebView capture permissions explicit", () => {
    const manifest = readFileSync(
      resolve(androidRoot, "app/src/main/AndroidManifest.xml"),
      "utf8",
    );
    expect(manifest).toContain("android.permission.INTERNET");
    expect(manifest).toContain("android.permission.RECORD_AUDIO");
    expect(manifest).toContain("android.permission.MODIFY_AUDIO_SETTINGS");
    expect(manifest).not.toMatch(
      /READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE/,
    );
  });
});
