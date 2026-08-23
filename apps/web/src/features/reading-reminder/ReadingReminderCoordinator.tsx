import { Capacitor } from "@capacitor/core";
import { useEffect, useRef } from "react";

import { registerNativeLifecycleHandler } from "../../app/nativeLifecycle";
import {
  learnerSessionChangedEvent,
  loadLearnerSession,
  type LearnerSession,
} from "../learner-auth/learnerApi";
import {
  getReadingReminderService,
  type ReadingReminderService,
} from "./readingReminderService";

type ReminderOwnerSession = {
  learner: Pick<LearnerSession["learner"], "id" | "account_purpose">;
} | null;

export function getReadingReminderOwnerKey(
  session: ReminderOwnerSession,
): string | null {
  if (!session) return null;
  const prefix =
    session.learner.account_purpose === "guest" ? "guest" : "learner";
  return `${prefix}:${session.learner.id}`;
}

export function ReadingReminderCoordinator() {
  const serviceRef = useRef<ReadingReminderService | null>(null);

  serviceRef.current ??= getReadingReminderService();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    const service = serviceRef.current;
    if (!service) return;

    const reconcile = () => {
      if (!active) return;
      const ownerKey = getReadingReminderOwnerKey(loadLearnerSession());
      void service.reconcile(ownerKey).catch(() => undefined);
    };

    reconcile();
    window.addEventListener(learnerSessionChangedEvent, reconcile);
    const unregisterLifecycle = registerNativeLifecycleHandler({
      onResume: reconcile,
    });

    return () => {
      active = false;
      window.removeEventListener(learnerSessionChangedEvent, reconcile);
      unregisterLifecycle();
    };
  }, []);

  return null;
}
