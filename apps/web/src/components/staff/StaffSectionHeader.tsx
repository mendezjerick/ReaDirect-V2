import type { HTMLAttributes, ReactNode } from "react";

interface StaffSectionHeaderProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "title"
> {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  bordered?: boolean;
}

function joinClasses(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function StaffSectionHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  bordered = false,
  className,
  ...props
}: StaffSectionHeaderProps) {
  return (
    <header
      {...props}
      className={joinClasses(
        "staff-section-heading",
        bordered && "staff-section-heading--bordered",
        className,
      )}
    >
      <div className="staff-section-heading__copy">
        {eyebrow ? (
          <p className="staff-section-heading__eyebrow">{eyebrow}</p>
        ) : null}
        <h2>{title}</h2>
        {description ? (
          <div className="staff-section-heading__description">
            {description}
          </div>
        ) : null}
      </div>
      {meta || actions ? (
        <div className="staff-section-heading__aside">
          {meta}
          {actions}
        </div>
      ) : null}
    </header>
  );
}
