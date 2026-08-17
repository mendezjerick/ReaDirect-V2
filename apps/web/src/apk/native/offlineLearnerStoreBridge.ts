import { Capacitor, registerPlugin } from "@capacitor/core";

export type OfflineLearnerStoreSnapshot = {
  revision: number;
  stateJson: string | null;
  backupRevision: number;
  backupStateJson: string | null;
};

export interface OfflineLearnerStoreNativePlugin {
  load(): Promise<OfflineLearnerStoreSnapshot>;
  save(options: {
    expectedRevision: number;
    stateJson: string;
  }): Promise<{ revision: number }>;
}

const NativeOfflineLearnerStore =
  registerPlugin<OfflineLearnerStoreNativePlugin>("OfflineLearnerStore");

function assertAndroidRuntime() {
  if (Capacitor.getPlatform() !== "android") {
    throw new Error(
      "Offline learner progress is available only inside the ReaDirect Android app.",
    );
  }
}

export const offlineLearnerStoreBridge: OfflineLearnerStoreNativePlugin = {
  async load() {
    assertAndroidRuntime();
    return NativeOfflineLearnerStore.load();
  },
  async save(options) {
    assertAndroidRuntime();
    return NativeOfflineLearnerStore.save(options);
  },
};
