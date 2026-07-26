import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from "react";

interface StaffFact {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
}

export function StaffWorkspacePage({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={["staff-workspace-page", "staff-workspace-stack", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

interface StaffFactGridProps extends HTMLAttributes<HTMLDListElement> {
  facts: StaffFact[];
}

export function StaffFactGrid({
  facts,
  className,
  ...props
}: StaffFactGridProps) {
  return (
    <dl
      {...props}
      className={["staff-fact-grid", className].filter(Boolean).join(" ")}
    >
      {facts.map((fact, index) => (
        <div key={index}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
          {fact.detail ? <small>{fact.detail}</small> : null}
        </div>
      ))}
    </dl>
  );
}

export function StaffSelectionList({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={["staff-selection-list", className].filter(Boolean).join(" ")}
    />
  );
}

type StaffSelectionButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    selected?: boolean;
  }
>;

export function StaffSelectionButton({
  selected = false,
  className,
  children,
  type = "button",
  ...props
}: StaffSelectionButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={selected}
      className={[
        "staff-selection-button",
        selected && "staff-selection-button--selected",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

export function StaffContentGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={["staff-content-grid", className].filter(Boolean).join(" ")}
    />
  );
}

interface StaffDisclosureProps extends PropsWithChildren {
  eyebrow?: ReactNode;
  title: ReactNode;
  status?: ReactNode;
  meta?: ReactNode;
  open?: boolean;
}

export function StaffDisclosure({
  eyebrow,
  title,
  status,
  meta,
  open,
  children,
}: StaffDisclosureProps) {
  return (
    <details className="staff-disclosure" open={open}>
      <summary>
        <span className="staff-disclosure__identity">
          {eyebrow ? <small>{eyebrow}</small> : null}
          <strong>{title}</strong>
        </span>
        <span className="staff-disclosure__summary">
          {status}
          {meta ? <small>{meta}</small> : null}
        </span>
      </summary>
      <div className="staff-disclosure__body">{children}</div>
    </details>
  );
}
