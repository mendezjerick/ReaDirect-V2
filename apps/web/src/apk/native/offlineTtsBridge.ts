import { Capacitor, registerPlugin } from "@capacitor/core";

export type OfflineTtsCatalogSummary = {
  catalogId: "clara-sh-offline-apk-v2";
  languages: readonly ["en", "fil-PH"];
  assetCount: number;
  totalBytes: number;
  totalDurationMs: number;
};

export type OfflineTtsPlaybackResult = {
  key: string;
  language: OfflineTtsLanguage;
  durationMs: number;
  completed: true;
};

export type OfflineTtsRuntimeState = {
  prepared: boolean;
  playing: boolean;
  preparing: boolean;
  key: string | null;
  language: OfflineTtsLanguage | null;
  assetCount: number;
  totalBytes: number;
};

export interface OfflineTtsNativePlugin {
  prepare(): Promise<OfflineTtsCatalogSummary>;
  play(options: {
    key: string;
    language: OfflineTtsLanguage;
  }): Promise<OfflineTtsPlaybackResult>;
  stop(): Promise<void>;
  getRuntimeState(): Promise<OfflineTtsRuntimeState>;
  shutdown(): Promise<void>;
}

export type OfflineTtsLanguage = "en" | "fil-PH";

const NativeOfflineTts = registerPlugin<OfflineTtsNativePlugin>("OfflineTts");

function assertAndroidRuntime() {
  if (Capacitor.getPlatform() !== "android") {
    throw new Error(
      "Offline Clara speech is available only inside the ReaDirect Android app.",
    );
  }
}

export async function prepareOfflineTts(
  plugin: OfflineTtsNativePlugin,
): Promise<OfflineTtsCatalogSummary> {
  const catalog = await plugin.prepare();
  if (catalog.catalogId !== "clara-sh-offline-apk-v2") {
    throw new Error(`Unsupported offline speech catalog: ${catalog.catalogId}`);
  }
  if (catalog.assetCount < 1 || catalog.totalBytes < 1) {
    throw new Error("The offline speech catalog is empty.");
  }
  if (
    catalog.languages.length !== 2 ||
    catalog.languages[0] !== "en" ||
    catalog.languages[1] !== "fil-PH"
  ) {
    throw new Error("The offline speech catalog is missing a language.");
  }
  return catalog;
}

export async function playPreparedOfflineTts(
  plugin: OfflineTtsNativePlugin,
  key: string,
  language: OfflineTtsLanguage,
): Promise<OfflineTtsPlaybackResult> {
  if (!/^[A-Za-z0-9-]+$/.test(key)) {
    throw new Error(
      "Offline speech keys may contain only letters, numbers, and hyphens.",
    );
  }
  const result = await plugin.play({ key, language });
  if (
    result.key !== key ||
    result.language !== language ||
    result.completed !== true
  ) {
    throw new Error(
      `Offline speech playback returned an invalid result for ${key}.`,
    );
  }
  return result;
}

export const offlineTtsBridge = {
  async prepare(): Promise<OfflineTtsCatalogSummary> {
    assertAndroidRuntime();
    return prepareOfflineTts(NativeOfflineTts);
  },

  async play(
    key: string,
    language: OfflineTtsLanguage,
  ): Promise<OfflineTtsPlaybackResult> {
    assertAndroidRuntime();
    return playPreparedOfflineTts(NativeOfflineTts, key, language);
  },

  async stop(): Promise<void> {
    assertAndroidRuntime();
    await NativeOfflineTts.stop();
  },

  async getRuntimeState(): Promise<OfflineTtsRuntimeState> {
    assertAndroidRuntime();
    return NativeOfflineTts.getRuntimeState();
  },

  async shutdown(): Promise<void> {
    assertAndroidRuntime();
    await NativeOfflineTts.shutdown();
  },
};
