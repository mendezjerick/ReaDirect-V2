import { Capacitor } from "@capacitor/core";

import {
  createDefaultReadingReminderSettings,
  createCapacitorReadingReminderPreferenceStore,
  readingReminderPreferenceSchema,
  type ReadingReminderPreference,
  type ReadingReminderPreferenceStore,
} from "./readingReminderPreferences";
import {
  buildReadingReminderNotifications,
  getReadingReminderIds,
  READING_REMINDER_NOTIFICATION_ID_LIST,
} from "./readingReminderSchedule";
import {
  nativeLocalNotificationAdapter,
  type LocalNotificationAdapter,
} from "./localNotificationAdapter";

export type ReadingReminderSettingsInput = Pick<
  ReadingReminderPreference,
  "enabled" | "time" | "repeat" | "days"
>;

export type ReadingReminderResult =
  | { ok: true; preference: ReadingReminderPreference }
  | {
      ok: false;
      code:
        | "unsupported-platform"
        | "invalid-owner"
        | "invalid-settings"
        | "permission-denied"
        | "schedule-failed"
        | "cancel-failed"
        | "preference-failed";
      message: string;
    };

export interface ReadingReminderServiceDependencies {
  adapter?: LocalNotificationAdapter;
  preferences: ReadingReminderPreferenceStore;
  isNativePlatform?: () => boolean;
  getTimezoneOffsetMinutes?: () => number;
}

const allReservedDescriptors = READING_REMINDER_NOTIFICATION_ID_LIST.map(
  (id) => ({ id }),
);
const reservedNotificationIdSet = new Set<number>(
  READING_REMINDER_NOTIFICATION_ID_LIST,
);

const messages = {
  unsupported: "Reading reminders are available on the ReaDirect mobile app.",
  invalidOwner: "We couldn't identify this learner. Please sign in again.",
  invalidSettings: "Choose a valid time and reminder schedule.",
  permissionDenied:
    "Notifications are off for ReaDirect. Allow them in Android Settings, then try again.",
  scheduleFailed: "We couldn't save your reminder. Please try again.",
  cancelFailed: "We couldn't turn off the reminder yet. Please try again.",
  preferenceFailed: "We couldn't save your reminder. Please try again.",
} as const;

function setsMatch(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false;
  const expected = new Set(right);
  return left.every((id) => expected.has(id));
}

export class ReadingReminderService {
  private readonly adapter: LocalNotificationAdapter;
  private readonly preferences: ReadingReminderPreferenceStore;
  private readonly isNativePlatform: () => boolean;
  private readonly getTimezoneOffsetMinutes: () => number;
  private mutation: Promise<unknown> = Promise.resolve();

  constructor(dependencies: ReadingReminderServiceDependencies) {
    this.adapter = dependencies.adapter ?? nativeLocalNotificationAdapter;
    this.preferences = dependencies.preferences;
    this.isNativePlatform =
      dependencies.isNativePlatform ?? (() => Capacitor.isNativePlatform());
    this.getTimezoneOffsetMinutes =
      dependencies.getTimezoneOffsetMinutes ??
      (() => new Date().getTimezoneOffset());
  }

  save(
    input: ReadingReminderSettingsInput,
    ownerKey: string,
  ): Promise<ReadingReminderResult> {
    return this.enqueue(() => this.saveInternal(input, ownerKey));
  }

  load(ownerKey: string | null): Promise<ReadingReminderPreference> {
    return this.enqueue(async () => {
      const fallback = createDefaultReadingReminderSettings(
        this.getTimezoneOffsetMinutes(),
      );
      if (!this.isNativePlatform() || !ownerKey) return fallback;

      const stored = await this.preferences.get().catch(() => null);
      return stored?.ownerKey === ownerKey ? stored : fallback;
    });
  }

  reconcile(ownerKey: string | null): Promise<ReadingReminderResult> {
    return this.enqueue(() => this.reconcileInternal(ownerKey));
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.mutation.then(operation, operation);
    this.mutation = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async saveInternal(
    input: ReadingReminderSettingsInput,
    ownerKey: string,
  ): Promise<ReadingReminderResult> {
    if (!this.isNativePlatform()) {
      return {
        ok: false,
        code: "unsupported-platform",
        message: messages.unsupported,
      };
    }
    if (!ownerKey.trim()) {
      return {
        ok: false,
        code: "invalid-owner",
        message: messages.invalidOwner,
      };
    }

    const preference = this.buildPreference(input, ownerKey);
    if (!preference) {
      return {
        ok: false,
        code: "invalid-settings",
        message: messages.invalidSettings,
      };
    }

    if (preference.enabled) {
      const permission = await this.ensurePermission();
      if (permission !== null) return permission;
    }

    if (!preference.enabled) {
      const canceled = await this.cancelAndVerify();
      if (!canceled) {
        return {
          ok: false,
          code: "cancel-failed",
          message: messages.cancelFailed,
        };
      }
      try {
        await this.preferences.set(preference);
        return { ok: true, preference };
      } catch {
        return {
          ok: false,
          code: "preference-failed",
          message: messages.preferenceFailed,
        };
      }
    }

    let previous: ReadingReminderPreference | null = null;
    try {
      await this.adapter.createChannel();
      previous = await this.preferences.get();
    } catch {
      return {
        ok: false,
        code: "preference-failed",
        message: messages.preferenceFailed,
      };
    }

    try {
      if (!(await this.cancelAndVerify()))
        throw new Error("Unable to clear old schedule.");
      await this.scheduleAndVerify(preference);
      await this.preferences.set(preference);
      return { ok: true, preference };
    } catch {
      const restored = await this.restorePrevious(previous, ownerKey);
      if (!restored) {
        await this.preferences.remove().catch(() => undefined);
      }
      return {
        ok: false,
        code: "schedule-failed",
        message: messages.scheduleFailed,
      };
    }
  }

  private async reconcileInternal(
    ownerKey: string | null,
  ): Promise<ReadingReminderResult> {
    if (!this.isNativePlatform()) {
      return {
        ok: false,
        code: "unsupported-platform",
        message: messages.unsupported,
      };
    }

    let stored: ReadingReminderPreference | null;
    try {
      stored = await this.preferences.get();
    } catch {
      stored = null;
    }

    if (
      !ownerKey ||
      !stored ||
      stored.ownerKey !== ownerKey ||
      !stored.enabled
    ) {
      const canceled = await this.cancelAndVerify();
      if (!canceled) {
        return {
          ok: false,
          code: "cancel-failed",
          message: messages.cancelFailed,
        };
      }
      if (!stored || stored.ownerKey !== ownerKey || !ownerKey) {
        await this.preferences.remove().catch(() => undefined);
      }
      return {
        ok: true,
        preference:
          stored ??
          createDefaultReadingReminderSettings(this.getTimezoneOffsetMinutes()),
      };
    }

    const permission = await this.adapter
      .checkPermissions()
      .catch(() => ({ display: "denied" }));
    if (permission.display !== "granted") {
      await this.cancelAndVerify();
      await this.preferences.remove().catch(() => undefined);
      return {
        ok: false,
        code: "permission-denied",
        message: messages.permissionDenied,
      };
    }

    const pending = await this.adapter
      .getPending()
      .catch(() => ({ notifications: [] }));
    const expectedIds = getReadingReminderIds(stored);
    const pendingIds = pending.notifications
      .map(({ id }) => id)
      .filter((id) => reservedNotificationIdSet.has(id));
    const timezoneChanged =
      stored.timezoneOffsetMinutes !== this.getTimezoneOffsetMinutes();

    if (setsMatch(pendingIds, expectedIds) && !timezoneChanged) {
      return { ok: true, preference: stored };
    }

    const updated = {
      ...stored,
      timezoneOffsetMinutes: this.getTimezoneOffsetMinutes(),
    };
    try {
      await this.adapter.createChannel();
      if (!(await this.cancelAndVerify()))
        throw new Error("Unable to clear schedule.");
      await this.scheduleAndVerify(updated);
      await this.preferences.set(updated);
      return { ok: true, preference: updated };
    } catch {
      await this.cancelAndVerify();
      await this.preferences.remove().catch(() => undefined);
      return {
        ok: false,
        code: "schedule-failed",
        message: messages.scheduleFailed,
      };
    }
  }

  private buildPreference(
    input: ReadingReminderSettingsInput,
    ownerKey: string,
  ): ReadingReminderPreference | null {
    const result = readingReminderPreferenceSchema.safeParse({
      schemaVersion: 1,
      ...input,
      ownerKey,
      timezoneOffsetMinutes: this.getTimezoneOffsetMinutes(),
    });
    return result.success ? result.data : null;
  }

  private async ensurePermission(): Promise<Extract<
    ReadingReminderResult,
    { ok: false }
  > | null> {
    const checked = await this.adapter
      .checkPermissions()
      .catch(() => ({ display: "denied" }));
    if (checked.display === "granted") return null;

    const requested = await this.adapter
      .requestPermissions()
      .catch(() => ({ display: "denied" }));
    if (requested.display === "granted") return null;
    return {
      ok: false,
      code: "permission-denied",
      message: messages.permissionDenied,
    };
  }

  private async scheduleAndVerify(
    preference: ReadingReminderPreference,
  ): Promise<void> {
    await this.adapter.schedule({
      notifications: buildReadingReminderNotifications(preference),
    });
    const pending = await this.adapter.getPending();
    const pendingIds = pending.notifications
      .map(({ id }) => id)
      .filter((id) => reservedNotificationIdSet.has(id));
    const expectedIds = getReadingReminderIds(preference);
    if (!setsMatch(pendingIds, expectedIds)) {
      throw new Error(
        "Pending reminder IDs did not match the requested schedule.",
      );
    }
  }

  private async cancelAndVerify(): Promise<boolean> {
    try {
      await this.adapter.cancel({ notifications: allReservedDescriptors });
      const pending = await this.adapter.getPending();
      return !pending.notifications.some(({ id }) =>
        reservedNotificationIdSet.has(id),
      );
    } catch {
      return false;
    }
  }

  private async restorePrevious(
    previous: ReadingReminderPreference | null,
    ownerKey: string,
  ): Promise<boolean> {
    if (!previous?.enabled || previous.ownerKey !== ownerKey) return true;

    try {
      await this.adapter.createChannel();
      await this.scheduleAndVerify(previous);
      return true;
    } catch {
      return false;
    }
  }
}

export type { LocalNotificationAdapter } from "./localNotificationAdapter";

let sharedReadingReminderService: ReadingReminderService | null = null;

export function getReadingReminderService(): ReadingReminderService {
  sharedReadingReminderService ??= new ReadingReminderService({
    preferences: createCapacitorReadingReminderPreferenceStore(),
  });
  return sharedReadingReminderService;
}
