import { describe, expect, it } from "vitest";

import { createGameOnePreviewHostAdapter } from "./gameOnePreviewHostAdapter";

describe("createGameOnePreviewHostAdapter", () => {
  it("keeps disposable progress only inside the current preview host", async () => {
    const host = createGameOnePreviewHostAdapter();

    await expect(host.load()).resolves.toBeNull();
    await expect(
      host.save({
        checkpointKey: "mission-2",
        saveSchemaVersion: 1,
        state: { mission: 2 },
        expectedRevision: 0,
      }),
    ).resolves.toMatchObject({
      checkpointKey: "mission-2",
      revision: 1,
      state: { mission: 2 },
    });
    await expect(host.load()).resolves.toMatchObject({ revision: 1 });

    await host.newGame(1);
    await expect(host.load()).resolves.toBeNull();
    await expect(createGameOnePreviewHostAdapter().load()).resolves.toBeNull();
  });

  it("retains revision conflict protection without using a database", async () => {
    const host = createGameOnePreviewHostAdapter();

    await expect(
      host.save({
        checkpointKey: "mission-1",
        saveSchemaVersion: 1,
        state: {},
        expectedRevision: 3,
      }),
    ).rejects.toThrow(/Preview progress changed unexpectedly/);
  });
});
