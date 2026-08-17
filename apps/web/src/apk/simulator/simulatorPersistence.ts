import type {
  OfflineLearnerStoreNativePlugin,
  OfflineLearnerStoreSnapshot,
} from "../native/offlineLearnerStoreBridge";

const defaultStorageKey = "readirect.offline.simulator.learner.v1";

const emptySnapshot: OfflineLearnerStoreSnapshot = {
  revision: 0,
  stateJson: null,
  backupRevision: 0,
  backupStateJson: null,
};

function parseSnapshot(value: string | null): OfflineLearnerStoreSnapshot {
  if (!value) return { ...emptySnapshot };
  try {
    const parsed = JSON.parse(value) as Partial<OfflineLearnerStoreSnapshot>;
    if (
      !Number.isInteger(parsed.revision) ||
      Number(parsed.revision) < 0 ||
      !Number.isInteger(parsed.backupRevision) ||
      Number(parsed.backupRevision) < 0 ||
      (parsed.stateJson !== null && typeof parsed.stateJson !== "string") ||
      (parsed.backupStateJson !== null &&
        typeof parsed.backupStateJson !== "string")
    ) {
      return { ...emptySnapshot };
    }
    return {
      revision: Number(parsed.revision),
      stateJson: parsed.stateJson ?? null,
      backupRevision: Number(parsed.backupRevision),
      backupStateJson: parsed.backupStateJson ?? null,
    };
  } catch {
    return { ...emptySnapshot };
  }
}

function staleWriteError() {
  return Object.assign(
    new Error("The simulated learner state changed before it could be saved."),
    { code: "LOCAL_PROGRESS_STALE_WRITE" as const },
  );
}

export class BrowserOfflineLearnerStore implements OfflineLearnerStoreNativePlugin {
  constructor(
    private readonly storage: Storage,
    private readonly key = defaultStorageKey,
  ) {}

  async load(): Promise<OfflineLearnerStoreSnapshot> {
    return parseSnapshot(this.storage.getItem(this.key));
  }

  async save(options: {
    expectedRevision: number;
    stateJson: string;
  }): Promise<{ revision: number }> {
    const current = await this.load();
    if (current.revision !== options.expectedRevision) {
      throw staleWriteError();
    }

    const revision = options.expectedRevision + 1;
    const next: OfflineLearnerStoreSnapshot = {
      revision,
      stateJson: options.stateJson,
      backupRevision: current.revision,
      backupStateJson: current.stateJson,
    };
    this.storage.setItem(this.key, JSON.stringify(next));
    return { revision };
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }
}
