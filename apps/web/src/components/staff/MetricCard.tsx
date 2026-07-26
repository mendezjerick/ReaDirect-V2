import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  detail?: ReactNode;
}

export function MetricCard({ label, value, icon, detail }: MetricCardProps) {
  return (
    <article className="staff-metric-card">
      {icon ? (
        <div className="staff-metric-card__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div>
        <p>{label}</p>
        <strong>{value ?? "—"}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}
