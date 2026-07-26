import type { HTMLAttributes, ReactNode } from "react";

import { StaffButton } from "./StaffButton";
import { StaffCard } from "./StaffCard";

type StaffStateTone = "neutral" | "danger";

interface StaffStateProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title: ReactNode;
  description?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
  tone?: StaffStateTone;
  compact?: boolean;
}

export function StaffState({
  title,
  description,
  actionLabel,
  onAction,
  busy = false,
  tone = "neutral",
  compact = false,
  className,
  ...props
}: StaffStateProps) {
  return (
    <StaffCard
      {...props}
      depth="flat"
      tone={tone === "danger" ? "danger" : "muted"}
      className={["staff-state", compact && "staff-state--compact", className]
        .filter(Boolean)
        .join(" ")}
    >
      <strong>{title}</strong>
      {description ? <div>{description}</div> : null}
      {actionLabel && onAction ? (
        <StaffButton
          size="compact"
          busy={busy}
          onClick={onAction}
          tone="secondary"
        >
          {actionLabel}
        </StaffButton>
      ) : null}
    </StaffCard>
  );
}
