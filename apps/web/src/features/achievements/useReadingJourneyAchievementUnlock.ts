import { useState } from "react";

import {
  readingJourneyAchievements,
  type ReadingJourneyAchievement,
} from "./readingJourneyAchievements";

type ReadingJourneyAchievementUnlockOptions = {
  sourceId: string | null;
  achievementKey: string | null;
  presentationReady: boolean;
};

type ReadingJourneyAchievementUnlock = {
  achievement: ReadingJourneyAchievement | null;
  pending: boolean;
  open: boolean;
  dismiss: () => void;
};

function getUnlockSessionKey(sourceId: string, achievementKey: string): string {
  return `readirect.achievement-unlock.${sourceId}.${achievementKey}`;
}

function wasDismissed(sessionKey: string | null): boolean {
  if (!sessionKey) return true;
  try {
    return window.sessionStorage.getItem(sessionKey) === "dismissed";
  } catch {
    return false;
  }
}

export function useReadingJourneyAchievementUnlock({
  sourceId,
  achievementKey,
  presentationReady,
}: ReadingJourneyAchievementUnlockOptions): ReadingJourneyAchievementUnlock {
  const [dismissedSessionKey, setDismissedSessionKey] = useState<string | null>(
    null,
  );
  const achievement =
    readingJourneyAchievements.find(
      (candidate) => candidate.key === achievementKey,
    ) ?? null;
  const sessionKey =
    sourceId && achievement
      ? getUnlockSessionKey(sourceId, achievement.key)
      : null;
  const pending =
    sessionKey !== null &&
    dismissedSessionKey !== sessionKey &&
    !wasDismissed(sessionKey);

  const dismiss = () => {
    if (!sessionKey) return;
    try {
      window.sessionStorage.setItem(sessionKey, "dismissed");
    } catch {
      // The mounted page still remembers the acknowledgement in memory.
    }
    setDismissedSessionKey(sessionKey);
  };

  return {
    achievement,
    pending,
    open: pending && presentationReady,
    dismiss,
  };
}
