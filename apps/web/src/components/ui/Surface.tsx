import type { HTMLAttributes, PropsWithChildren } from "react";

type SurfaceKind = "frame" | "panel" | "notice";
type SurfacePadding = "none" | "compact" | "normal" | "roomy";

type SurfaceProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    kind?: SurfaceKind;
    padding?: SurfacePadding;
  }
>;

function joinClasses(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function Surface({
  kind = "panel",
  padding = "normal",
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={joinClasses(
        "surface",
        `surface--${kind}`,
        `surface--padding-${padding}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
