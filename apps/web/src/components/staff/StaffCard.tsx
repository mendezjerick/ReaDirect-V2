import type { ComponentProps } from "react";

import { Surface } from "../ui/Surface";

type StaffCardPadding = "none" | "compact" | "normal" | "roomy";
type StaffCardTone =
  "default" | "muted" | "accent" | "success" | "warning" | "danger";
type StaffCardDepth = "flat" | "raised";

type StaffCardProps = Omit<
  ComponentProps<typeof Surface>,
  "kind" | "padding"
> & {
  padding?: StaffCardPadding;
  tone?: StaffCardTone;
  depth?: StaffCardDepth;
};

function joinClasses(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function StaffCard({
  padding = "normal",
  tone = "default",
  depth = "raised",
  className,
  ...props
}: StaffCardProps) {
  return (
    <Surface
      {...props}
      kind="panel"
      padding={padding}
      className={joinClasses(
        "staff-card",
        `staff-card--${tone}`,
        `staff-card--${depth}`,
        className,
      )}
    />
  );
}
