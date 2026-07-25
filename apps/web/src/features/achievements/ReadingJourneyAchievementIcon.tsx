import type { ComponentPropsWithoutRef } from "react";

import type { ReadingJourneyAchievement } from "./readingJourneyAchievements";
import "./readingJourneyAchievementIcon.css";

type ReadingJourneyAchievementIconProps = {
  achievement: ReadingJourneyAchievement;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"span">, "children">;

export function ReadingJourneyAchievementIcon({
  achievement,
  className,
  ...props
}: ReadingJourneyAchievementIconProps) {
  const classes = ["reading-journey-achievement-icon", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden="true" {...props}>
      <img
        src={achievement.iconPath}
        alt=""
        width="32"
        height="32"
        draggable="false"
      />
    </span>
  );
}
