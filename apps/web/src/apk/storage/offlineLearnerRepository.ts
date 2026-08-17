import { offlineLearnerStoreBridge } from "../native/offlineLearnerStoreBridge";
import {
  createInitialOfflineLearnerState,
  migrateOfflineLearnerState,
  offlineLearnerStateSchema,
  type OfflineLearnerState,
} from "./offlineLearnerState";

import type { OfflineLearnerStoreNativePlugin } from "../native/offlineLearnerStoreBridge";

type Clock = () => string;
type IdFactory = () => string;
type StateMutation = (
  state: OfflineLearnerState,
  now: string,
) => OfflineLearnerState;

function defaultClock(): string {
  return new Date().toISOString();
}

function defaultIdFactory(): string {
  return crypto.randomUUID();
}

function parseStoredState(
  stateJson: string | null,
  expectedRevision: number,
): OfflineLearnerState | null {
  if (!stateJson) return null;
  try {
    const parsed = offlineLearnerStateSchema.safeParse(
      migrateOfflineLearnerState(JSON.parse(stateJson)),
    );
    return parsed.success && parsed.data.revision === expectedRevision
      ? parsed.data
      : null;
  } catch {
    return null;
  }
}

function isStaleWrite(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "LOCAL_PROGRESS_STALE_WRITE"
  );
}

export class OfflineLearnerRepository {
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly persistence: OfflineLearnerStoreNativePlugin,
    private readonly clock: Clock = defaultClock,
    private readonly idFactory: IdFactory = defaultIdFactory,
  ) {}

  initialize(): Promise<OfflineLearnerState> {
    return this.runExclusive(() => this.loadOrRecover());
  }

  read(): Promise<OfflineLearnerState> {
    return this.runExclusive(() => this.loadOrRecover());
  }

  update(mutate: StateMutation): Promise<OfflineLearnerState> {
    return this.runExclusive(async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const current = await this.loadOrRecover();
        const now = this.clock();
        const mutated = offlineLearnerStateSchema.parse(mutate(current, now));
        const next = offlineLearnerStateSchema.parse({
          ...mutated,
          revision: current.revision + 1,
        });

        try {
          const saved = await this.persistence.save({
            expectedRevision: current.revision,
            stateJson: JSON.stringify(next),
          });
          if (saved.revision !== next.revision) {
            throw new Error(
              "Android returned an unexpected local progress revision.",
            );
          }
          return next;
        } catch (error) {
          if (!isStaleWrite(error) || attempt === 2) throw error;
        }
      }

      throw new Error("Offline learner progress could not be updated.");
    });
  }

  private async loadOrRecover(): Promise<OfflineLearnerState> {
    const snapshot = await this.persistence.load();
    const primary = parseStoredState(snapshot.stateJson, snapshot.revision);
    if (primary) return primary;

    const backup = parseStoredState(
      snapshot.backupStateJson,
      snapshot.backupRevision,
    );
    const recovered = backup
      ? offlineLearnerStateSchema.parse({
          ...backup,
          revision: snapshot.revision + 1,
        })
      : createInitialOfflineLearnerState({
          id: this.idFactory(),
          now: this.clock(),
          revision: snapshot.revision + 1,
        });

    const saved = await this.persistence.save({
      expectedRevision: snapshot.revision,
      stateJson: JSON.stringify(recovered),
    });
    if (saved.revision !== recovered.revision) {
      throw new Error("Android returned an unexpected recovery revision.");
    }
    return recovered;
  }

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

export const offlineLearnerRepository = new OfflineLearnerRepository(
  offlineLearnerStoreBridge,
);
