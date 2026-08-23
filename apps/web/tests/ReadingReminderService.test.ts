import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  READING_REMINDER_NOTIFICATION_IDS,
  READING_REMINDER_NOTIFICATION_ID_LIST,
} from "../src/features/reading-reminder/readingReminderSchedule";
import type {
  LocalNotificationSchema,
  PendingLocalNotificationSchema,
} from "@capacitor/local-notifications";
import {
  DEFAULT_READING_REMINDER_SETTINGS,
  type ReadingReminderPreference,
  type ReadingReminderPreferenceStore,
} from "../src/features/reading-reminder/readingReminderPreferences";
import {
  ReadingReminderService,
  type LocalNotificationAdapter,
} from "../src/features/reading-reminder/readingReminderService";

function createStore(
  initial: ReadingReminderPreference | null = null,
): ReadingReminderPreferenceStore & {
  value: ReadingReminderPreference | null;
} {
  return {
    value: initial,
    async get() {
      return this.value;
    },
    async set(value) {
      this.value = value;
    },
    async remove() {
      this.value = null;
    },
  };
}

function createAdapter() {
  const adapter = {
    pending: [] as number[],
    scheduleCalls: [] as unknown[],
    checkPermissions: vi.fn().mockResolvedValue({ display: "granted" }),
    requestPermissions: vi.fn().mockResolvedValue({ display: "granted" }),
    createChannel: vi.fn().mockResolvedValue(undefined),
    schedule: vi.fn(
      async ({
        notifications,
      }: {
        notifications: LocalNotificationSchema[];
      }) => {
        adapter.scheduleCalls.push(notifications);
        adapter.pending = notifications.map(({ id }) => id);
      },
    ),
    getPending: vi.fn(
      async (): Promise<{
        notifications: PendingLocalNotificationSchema[];
      }> => ({
        notifications: adapter.pending.map((id) => ({
          id,
          title: "",
          body: "",
        })),
      }),
    ),
    cancel: vi.fn(
      async ({ notifications }: { notifications: Array<{ id: number }> }) => {
        const canceled = new Set(notifications.map(({ id }) => id));
        adapter.pending = adapter.pending.filter((id) => !canceled.has(id));
      },
    ),
  } satisfies LocalNotificationAdapter & {
    pending: number[];
    scheduleCalls: unknown[];
  };
  return adapter;
}

const enabledSettings = {
  ...DEFAULT_READING_REMINDER_SETTINGS,
  enabled: true,
  time: "19:15",
  ownerKey: "learner:1",
  timezoneOffsetMinutes: -480,
};

describe("ReadingReminderService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("schedules only after permission and pending-ID verification, then persists", async () => {
    const adapter = createAdapter();
    const store = createStore();
    const service = new ReadingReminderService({
      adapter,
      preferences: store,
      isNativePlatform: () => true,
      getTimezoneOffsetMinutes: () => -480,
    });

    const result = await service.save(enabledSettings, "learner:1");

    expect(result.ok).toBe(true);
    expect(adapter.checkPermissions).toHaveBeenCalledTimes(1);
    expect(adapter.createChannel).toHaveBeenCalledTimes(1);
    expect(adapter.schedule).toHaveBeenCalledTimes(1);
    expect(store.value).toMatchObject({
      enabled: true,
      time: "19:15",
      ownerKey: "learner:1",
    });
  });

  it("requests permission only for an enabled explicit save", async () => {
    const adapter = createAdapter();
    const store = createStore();
    const service = new ReadingReminderService({
      adapter,
      preferences: store,
      isNativePlatform: () => true,
    });

    await service.save({ ...enabledSettings, enabled: false }, "learner:1");

    expect(adapter.checkPermissions).not.toHaveBeenCalled();
    expect(adapter.requestPermissions).not.toHaveBeenCalled();
  });

  it("does not schedule or persist enabled state when permission is denied", async () => {
    const adapter = createAdapter();
    vi.mocked(adapter.checkPermissions).mockResolvedValue({
      display: "denied",
    });
    vi.mocked(adapter.requestPermissions).mockResolvedValue({
      display: "denied",
    });
    const store = createStore();
    const service = new ReadingReminderService({
      adapter,
      preferences: store,
      isNativePlatform: () => true,
    });

    const result = await service.save(enabledSettings, "learner:1");

    expect(result).toMatchObject({ ok: false, code: "permission-denied" });
    expect(adapter.schedule).not.toHaveBeenCalled();
    expect(store.value).toBeNull();
  });

  it("replaces schedules with deterministic IDs and never calls cancelAll", async () => {
    const adapter = createAdapter();
    const store = createStore();
    const service = new ReadingReminderService({
      adapter,
      preferences: store,
      isNativePlatform: () => true,
    });

    await service.save(enabledSettings, "learner:1");
    await service.save(
      { ...enabledSettings, repeat: "selected", days: ["SUN", "SAT"] },
      "learner:1",
    );

    expect(adapter.cancel).toHaveBeenCalledWith({
      notifications: READING_REMINDER_NOTIFICATION_ID_LIST.map((id) => ({
        id,
      })),
    });
    expect(adapter.pending).toEqual([
      READING_REMINDER_NOTIFICATION_IDS.SUN,
      READING_REMINDER_NOTIFICATION_IDS.SAT,
    ]);
    expect(adapter).not.toHaveProperty("cancelAll");
  });

  it("cancels and verifies all reserved IDs when disabled", async () => {
    const adapter = createAdapter();
    const store = createStore(enabledSettings);
    adapter.pending = [...READING_REMINDER_NOTIFICATION_ID_LIST];
    const service = new ReadingReminderService({
      adapter,
      preferences: store,
      isNativePlatform: () => true,
    });

    const result = await service.save(
      { ...enabledSettings, enabled: false },
      "learner:1",
    );

    expect(result).toMatchObject({ ok: true });
    expect(adapter.pending).toEqual([]);
    expect(store.value).toMatchObject({ enabled: false });
  });

  it("fails closed outside native", async () => {
    const adapter = createAdapter();
    const store = createStore();
    const service = new ReadingReminderService({
      adapter,
      preferences: store,
      isNativePlatform: () => false,
    });

    const result = await service.save(enabledSettings, "learner:1");

    expect(result).toMatchObject({ ok: false, code: "unsupported-platform" });
    expect(adapter.checkPermissions).not.toHaveBeenCalled();
    expect(store.value).toBeNull();
  });

  it("restores the previous schedule when a replacement cannot be verified", async () => {
    const adapter = createAdapter();
    const previous = { ...enabledSettings, time: "18:00" };
    const store = createStore(previous);
    let scheduleAttempt = 0;
    adapter.schedule.mockImplementation(async ({ notifications }) => {
      scheduleAttempt += 1;
      adapter.scheduleCalls.push(notifications);
      adapter.pending =
        scheduleAttempt === 1
          ? [notifications[0]?.id ?? 0]
          : notifications.map(({ id }) => id);
    });
    const service = new ReadingReminderService({
      adapter,
      preferences: store,
      isNativePlatform: () => true,
    });

    const result = await service.save(
      { ...enabledSettings, time: "19:00" },
      "learner:1",
    );

    expect(result).toMatchObject({ ok: false, code: "schedule-failed" });
    expect(adapter.schedule).toHaveBeenCalledTimes(2);
    expect(store.value).toEqual(previous);
    expect(adapter.pending).toEqual([
      READING_REMINDER_NOTIFICATION_IDS.MON,
      READING_REMINDER_NOTIFICATION_IDS.TUE,
      READING_REMINDER_NOTIFICATION_IDS.WED,
      READING_REMINDER_NOTIFICATION_IDS.THU,
      READING_REMINDER_NOTIFICATION_IDS.FRI,
    ]);
  });

  it("removes preferences when replacement and rollback both fail", async () => {
    const adapter = createAdapter();
    const store = createStore(enabledSettings);
    adapter.schedule.mockRejectedValue(new Error("native schedule failed"));
    const service = new ReadingReminderService({
      adapter,
      preferences: store,
      isNativePlatform: () => true,
    });

    const result = await service.save(
      { ...enabledSettings, time: "20:00" },
      "learner:1",
    );

    expect(result).toMatchObject({ ok: false, code: "schedule-failed" });
    expect(store.value).toBeNull();
  });

  it("cleans stale schedules when the active learner changes", async () => {
    const adapter = createAdapter();
    const store = createStore(enabledSettings);
    adapter.pending = [READING_REMINDER_NOTIFICATION_IDS.MON];
    const service = new ReadingReminderService({
      adapter,
      preferences: store,
      isNativePlatform: () => true,
    });

    const result = await service.reconcile("learner:2");

    expect(result.ok).toBe(true);
    expect(adapter.pending).toEqual([]);
    expect(store.value).toBeNull();
  });

  it("reschedules a valid owner when the device timezone changes without prompting", async () => {
    const adapter = createAdapter();
    const store = createStore({ ...enabledSettings, timezoneOffsetMinutes: 0 });
    adapter.pending = [
      READING_REMINDER_NOTIFICATION_IDS.MON,
      READING_REMINDER_NOTIFICATION_IDS.TUE,
      READING_REMINDER_NOTIFICATION_IDS.WED,
      READING_REMINDER_NOTIFICATION_IDS.THU,
      READING_REMINDER_NOTIFICATION_IDS.FRI,
    ];
    const service = new ReadingReminderService({
      adapter,
      preferences: store,
      isNativePlatform: () => true,
      getTimezoneOffsetMinutes: () => -480,
    });

    const result = await service.reconcile("learner:1");

    expect(result.ok).toBe(true);
    expect(adapter.requestPermissions).not.toHaveBeenCalled();
    expect(store.value?.timezoneOffsetMinutes).toBe(-480);
    expect(adapter.schedule).toHaveBeenCalledTimes(1);
  });

  it("reports cancellation failure instead of claiming a reminder was turned off", async () => {
    const adapter = createAdapter();
    adapter.cancel.mockRejectedValue(new Error("cancel failed"));
    const store = createStore(enabledSettings);
    const service = new ReadingReminderService({
      adapter,
      preferences: store,
      isNativePlatform: () => true,
    });

    const result = await service.save(
      { ...enabledSettings, enabled: false },
      "learner:1",
    );

    expect(result).toMatchObject({ ok: false, code: "cancel-failed" });
    expect(store.value).toEqual(enabledSettings);
  });
});
