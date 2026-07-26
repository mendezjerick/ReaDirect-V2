import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

import { StaffCard } from "./StaffCard";

type StaffNoticeTone = "neutral" | "accent" | "success" | "warning" | "danger";

type StaffNoticeProps = PropsWithChildren<
  Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
    tone?: StaffNoticeTone;
    title?: ReactNode;
    actions?: ReactNode;
  }
>;

export function StaffNotice({
  tone = "neutral",
  title,
  actions,
  children,
  className,
  ...props
}: StaffNoticeProps) {
  const role = props.role ?? (tone === "danger" ? "alert" : undefined);

  return (
    <StaffCard
      {...props}
      role={role}
      padding="compact"
      depth="flat"
      tone={tone === "neutral" ? "muted" : tone}
      className={["staff-notice", className].filter(Boolean).join(" ")}
    >
      <div className="staff-notice__copy">
        {title ? <h2>{title}</h2> : null}
        {children}
      </div>
      {actions ? <div className="staff-notice__actions">{actions}</div> : null}
    </StaffCard>
  );
}
