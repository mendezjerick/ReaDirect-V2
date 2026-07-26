import type { HTMLAttributes, PropsWithChildren } from "react";

type StaffBadgeTone =
  "neutral" | "accent" | "success" | "warning" | "danger" | "muted";

type StaffBadgeProps = PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & {
    tone?: StaffBadgeTone;
  }
>;

function joinClasses(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function StaffBadge({
  tone = "neutral",
  className,
  children,
  ...props
}: StaffBadgeProps) {
  return (
    <span
      {...props}
      className={joinClasses("staff-badge", `staff-badge--${tone}`, className)}
    >
      {children}
    </span>
  );
}
