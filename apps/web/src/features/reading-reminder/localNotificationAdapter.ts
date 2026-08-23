import { Capacitor, type PermissionState } from "@capacitor/core";
import {
  LocalNotifications,
  type Channel,
  type LocalNotificationSchema,
  type PendingLocalNotificationSchema,
} from "@capacitor/local-notifications";

import {
  READING_REMINDER_CHANNEL_ID,
  READING_REMINDER_CHANNEL_NAME,
  READING_REMINDER_CHANNEL_DESCRIPTION,
} from "./readingReminderSchedule";

export interface LocalNotificationAdapter {
  checkPermissions(): Promise<{ display: PermissionState }>;
  requestPermissions(): Promise<{ display: PermissionState }>;
  createChannel(): Promise<void>;
  schedule(options: {
    notifications: LocalNotificationSchema[];
  }): Promise<void>;
  getPending(): Promise<{ notifications: PendingLocalNotificationSchema[] }>;
  cancel(options: { notifications: Array<{ id: number }> }): Promise<void>;
}

export const nativeLocalNotificationAdapter: LocalNotificationAdapter = {
  checkPermissions() {
    return LocalNotifications.checkPermissions();
  },
  requestPermissions() {
    return LocalNotifications.requestPermissions();
  },
  createChannel() {
    const channel: Channel = {
      id: READING_REMINDER_CHANNEL_ID,
      name: READING_REMINDER_CHANNEL_NAME,
      description: READING_REMINDER_CHANNEL_DESCRIPTION,
      importance: 3,
      visibility: 0,
      vibration: true,
    };
    return LocalNotifications.createChannel(channel);
  },
  schedule(options) {
    return LocalNotifications.schedule(options).then(() => undefined);
  },
  getPending() {
    return LocalNotifications.getPending();
  },
  cancel(options) {
    return LocalNotifications.cancel(options);
  },
};

export function isNativeReadingReminderAvailable(): boolean {
  return Capacitor.isNativePlatform();
}
