import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const webRoot = path.resolve(".");

function read(relativePath: string) {
  return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("offline Android native boundary", () => {
  it("uses a dedicated Capacitor Android project", () => {
    const capacitorConfig = read("capacitor.config.ts");

    expect(capacitorConfig).toContain('appId: "com.readirect.offline"');
    expect(capacitorConfig).toContain('path: "android-apk"');
    expect(capacitorConfig).toContain('webDir: "dist-apk"');
  });

  it("allows microphone capture while explicitly removing network permissions", () => {
    const manifest = read("android-apk/app/src/main/AndroidManifest.xml");

    expect(manifest).toContain("android.permission.RECORD_AUDIO");
    expect(manifest).toContain('android:usesCleartextTraffic="false"');

    for (const permission of [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.CHANGE_NETWORK_STATE",
      "android.permission.ACCESS_WIFI_STATE",
    ]) {
      expect(manifest).toMatch(
        new RegExp(`${permission.replaceAll(".", "\\.")}" tools:node="remove"`),
      );
    }
  });

  it("keeps rotation in the same activity and supports long-passage recording", () => {
    const manifest = read("android-apk/app/src/main/AndroidManifest.xml");
    const asrPlugin = read(
      "android-apk/app/src/main/java/com/readirect/offline/asr/OfflineAsrPlugin.java",
    );

    expect(manifest).toContain(
      'android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"',
    );
    expect(asrPlugin).toContain(
      "private static final int MAX_RECORDING_MILLIS = 60000;",
    );
    expect(asrPlugin).toContain("maximumDurationMillis > MAX_RECORDING_MILLIS");
    expect(asrPlugin).toContain("protected void handleOnPause()");
    expect(asrPlugin).toContain("currentRecorder.cancel()");
    const ttsPlugin = read(
      "android-apk/app/src/main/java/com/readirect/offline/tts/OfflineTtsPlugin.java",
    );
    expect(ttsPlugin).toContain("protected void handleOnPause()");
    expect(ttsPlugin).toContain("interruptActiveLocked()");
  });

  it("registers only the required local application plugins", () => {
    const activity = read(
      "android-apk/app/src/main/java/com/readirect/offline/MainActivity.java",
    );

    expect(activity).toContain("registerPlugin(OfflineAsrPlugin.class)");
    expect(activity).toContain(
      "registerPlugin(OfflineLearnerStorePlugin.class)",
    );
    expect(activity).toContain("registerPlugin(OfflineTtsPlugin.class)");
    expect(activity).not.toContain("Http");
  });

  it("uses install-time Play Asset Delivery without changing direct APK assets", () => {
    const appBuild = read("android-apk/app/build.gradle");
    const settings = read("android-apk/settings.gradle");
    const assetPack = read("android-apk/offline_models/build.gradle");

    expect(settings).toContain("include ':offline_models'");
    expect(appBuild).toContain(
      "providers.gradleProperty('readirectPlayStore')",
    );
    expect(appBuild).toContain("assetPacks = [':offline_models']");
    expect(appBuild).toContain("if (!playStoreBundle)");
    expect(assetPack).toContain("id 'com.android.asset-pack'");
    expect(assetPack).toContain("deliveryType = 'install-time'");
  });

  it("pins the native learner store to the migrated schema", () => {
    const learnerStore = read(
      "android-apk/app/src/main/java/com/readirect/offline/learner/OfflineLearnerStorePlugin.java",
    );

    expect(learnerStore).toContain(
      "private static final int SCHEMA_VERSION = 2;",
    );
    expect(learnerStore).toContain('call.getData().opt("expectedRevision")');
    expect(learnerStore).toContain("expectedRevisionValue instanceof Number");
    expect(learnerStore).toContain(
      'state.getInt("schemaVersion") != SCHEMA_VERSION',
    );
  });
});
