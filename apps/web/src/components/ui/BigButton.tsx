import type { ButtonHTMLAttributes, ReactNode } from "react";

type BigButtonVariant =
  | "primary"
  | "primary-vertical"
  | "unavailable"
  | "unavailable-vertical"
  | "secondary"
  | "quiet";
type BigButtonSize = "regular" | "large";

interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BigButtonVariant;
  size?: BigButtonSize;
  leadingIcon?: ReactNode;
  busy?: boolean;
  busyLabel?: string;
  committing?: boolean;
}

function joinClasses(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function BigButton({
  variant = "primary",
  size = "large",
  leadingIcon,
  busy = false,
  busyLabel = "Please wait",
  committing = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: BigButtonProps) {
  const isDisabled =
    disabled ||
    busy ||
    committing ||
    variant === "unavailable" ||
    variant === "unavailable-vertical";

  return (
    <button
      {...props}
      type={type}
      className={joinClasses(
        "big-button",
        `big-button--${variant}`,
        `big-button--${size}`,
        className,
      )}
      data-press-state={committing ? "committing" : "idle"}
      disabled={isDisabled}
      aria-busy={busy || undefined}
    >
      {leadingIcon ? (
        <span className="big-button__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <span>{busy ? busyLabel : children}</span>
    </button>
  );
}
