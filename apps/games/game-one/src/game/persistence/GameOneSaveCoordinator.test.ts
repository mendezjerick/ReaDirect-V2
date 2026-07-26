import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  GameOneHostAdapter,
  GameOneSaveRequest
} from "../../host/GameOneHostAdapter";
import { GameOneSaveCoordinator } from "./GameOneSaveCoordinator";

afterEach(() => {
  vi.useRealTimers();
});

describe("GameOneSaveCoordinator", () => {
  it("coalesces changes and advances the server revision serially", async () => {
    vi.useFakeTimers();
    const requests: GameOneSaveRequest[] = [];
    const host = hostAdapter(async (request) => {
      requests.push(request);
      return remoteSave(request.expectedRevision + 1, request.state);
    });
    const coordinator = new GameOneSaveCoordinator(host, 3, () => undefined, 50);

    coordinator.schedule(pendingSave({ step: 1 }));
    coordinator.schedule(pendingSave({ step: 2 }));
    await vi.advanceTimersByTimeAsync(50);
    await coordinator.flush();

    coordinator.schedule(pendingSave({ step: 3 }));
    await vi.advanceTimersByTimeAsync(50);
    await coordinator.flush();

    expect(requests).toHaveLength(2);
    expect(requests[0]).toMatchObject({ expectedRevision: 3, state: { step: 2 } });
    expect(requests[1]).toMatchObject({ expectedRevision: 4, state: { step: 3 } });
    expect(coordinator.getRevision()).toBe(5);
  });

  it("stops writing after a revision conflict and reports it once", async () => {
    vi.useFakeTimers();
    const error = new Error("Game One progress changed elsewhere.");
    const save = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    const coordinator = new GameOneSaveCoordinator(
      hostAdapter(save),
      2,
      onError,
      10
    );

    coordinator.schedule(pendingSave({ step: 1 }));
    await vi.advanceTimersByTimeAsync(10);
    await expect(coordinator.flush()).rejects.toThrow(/changed elsewhere/i);
    coordinator.schedule(pendingSave({ step: 2 }));
    await vi.advanceTimersByTimeAsync(10);

    expect(save).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("resets only through the host using the latest revision", async () => {
    const reset = vi.fn().mockResolvedValue(undefined);
    const coordinator = new GameOneSaveCoordinator(
      { ...hostAdapter(), reset },
      7,
      () => undefined
    );

    await coordinator.reset();

    expect(reset).toHaveBeenCalledWith(7);
    expect(coordinator.getRevision()).toBe(0);
  });

  it("surfaces a reset revision conflict without clearing the local revision", async () => {
    const onError = vi.fn();
    const coordinator = new GameOneSaveCoordinator(
      {
        ...hostAdapter(),
        reset: vi.fn().mockRejectedValue(
          new Error("Game One progress changed elsewhere.")
        )
      },
      9,
      onError
    );

    await expect(coordinator.reset()).rejects.toThrow(/changed elsewhere/i);
    expect(coordinator.getRevision()).toBe(9);
    expect(onError).toHaveBeenCalledOnce();
  });
});

function pendingSave(state: Record<string, unknown>) {
  return {
    checkpointKey: "mission-1",
    saveSchemaVersion: 1,
    state
  };
}

function remoteSave(revision: number, state: unknown) {
  return {
    checkpointKey: "mission-1",
    saveSchemaVersion: 1,
    state,
    revision,
    savedAt: "2026-07-26T08:00:00Z"
  };
}

function hostAdapter(
  save: GameOneHostAdapter["save"] = async (request) =>
    remoteSave(request.expectedRevision + 1, request.state)
): GameOneHostAdapter {
  return {
    load: async () => null,
    save,
    reset: async () => undefined
  };
}
