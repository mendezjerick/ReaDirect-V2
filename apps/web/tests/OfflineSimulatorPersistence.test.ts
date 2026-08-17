import { describe, expect, it } from "vitest";

import { BrowserOfflineLearnerStore } from "../src/apk/simulator/simulatorPersistence";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("browser offline learner persistence", () => {
  it("persists primary and backup revisions across adapter instances", async () => {
    const storage = new MemoryStorage();
    const first = new BrowserOfflineLearnerStore(storage);

    expect(await first.load()).toEqual({
      revision: 0,
      stateJson: null,
      backupRevision: 0,
      backupStateJson: null,
    });
    expect(
      await first.save({ expectedRevision: 0, stateJson: '{"step":1}' }),
    ).toEqual({ revision: 1 });
    expect(
      await first.save({ expectedRevision: 1, stateJson: '{"step":2}' }),
    ).toEqual({ revision: 2 });

    const refreshed = new BrowserOfflineLearnerStore(storage);
    expect(await refreshed.load()).toEqual({
      revision: 2,
      stateJson: '{"step":2}',
      backupRevision: 1,
      backupStateJson: '{"step":1}',
    });
  });

  it("rejects stale writes with the Android persistence error code", async () => {
    const store = new BrowserOfflineLearnerStore(new MemoryStorage());
    await store.save({ expectedRevision: 0, stateJson: '{"step":1}' });

    await expect(
      store.save({ expectedRevision: 0, stateJson: '{"step":2}' }),
    ).rejects.toMatchObject({ code: "LOCAL_PROGRESS_STALE_WRITE" });
  });

  it("clears only its learner-state key", async () => {
    const storage = new MemoryStorage();
    storage.setItem("unrelated", "keep");
    const store = new BrowserOfflineLearnerStore(storage);
    await store.save({ expectedRevision: 0, stateJson: '{"step":1}' });

    store.clear();

    expect(storage.getItem("unrelated")).toBe("keep");
    expect(await store.load()).toEqual({
      revision: 0,
      stateJson: null,
      backupRevision: 0,
      backupStateJson: null,
    });
  });
});
