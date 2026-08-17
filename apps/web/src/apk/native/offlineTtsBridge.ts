import { Capacitor, registerPlugin } from "@capacitor/core";

export type OfflineTtsCatalogSummary = {
  catalogId: "clara-sh-offline-apk-v1";
  assetCount: number;
  totalBytes: number;
  totalDurationMs: number;
};

export type OfflineTtsPlaybackResult = {
  key: string;
  durationMs: number;
  completed: true;
};

export type OfflineTtsRuntimeState = {
  prepared: boolean;
  playing: boolean;
  preparing: boolean;
  key: string | null;
  assetCount: number;
  totalBytes: number;
};

export interface OfflineTtsNativePlugin {
  prepare(): Promise<OfflineTtsCatalogSummary>;
  play(options: { key: string }): Promise<OfflineTtsPlaybackResult>;
  stop(): Promise<void>;
  getRuntimeState(): Promise<OfflineTtsRuntimeState>;
  shutdown(): Promise<void>;
}

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
  if (catalog.catalogId !== "clara-sh-offline-apk-v1") {
    throw new Error(`Unsupported offline speech catalog: ${catalog.catalogId}`);
  }
  if (catalog.assetCount < 1 || catalog.totalBytes < 1) {
    throw new Error("The offline speech catalog is empty.");
  }
  return catalog;
}

export async function playPreparedOfflineTts(
  plugin: OfflineTtsNativePlugin,
  key: string,
): Promise<OfflineTtsPlaybackResult> {
  if (!/^[A-Za-z0-9-]+$/.test(key)) {
    throw new Error(
      "Offline speech keys may contain only letters, numbers, and hyphens.",
    );
  }
  const result = await plugin.play({ key });
  if (result.key !== key || result.completed !== true) {
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

  async play(key: string): Promise<OfflineTtsPlaybackResult> {
    assertAndroidRuntime();
    return playPreparedOfflineTts(NativeOfflineTts, key);
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
