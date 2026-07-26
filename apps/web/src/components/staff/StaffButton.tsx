import type { ComponentProps } from "react";

import { BigButton } from "../ui/BigButton";

type StaffButtonTone = "primary" | "secondary" | "quiet";
type StaffButtonSize = "compact" | "regular" | "roomy";

type StaffButtonProps = Omit<
  ComponentProps<typeof BigButton>,
  "size" | "variant"
> & {
  tone?: StaffButtonTone;
  size?: StaffButtonSize;
};

function joinClasses(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function StaffButton({
  tone = "secondary",
  size = "regular",
  className,
  ...props
}: StaffButtonProps) {
  return (
    <BigButton
      {...props}
      variant={tone}
      size="regular"
      className={joinClasses(
        "staff-button",
        `staff-button--${size}`,
        className,
      )}
    />
  );
}
