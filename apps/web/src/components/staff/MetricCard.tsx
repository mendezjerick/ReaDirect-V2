import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: number | null;
  icon: ReactNode;
}

export function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <article className="staff-metric-card">
      <div className="staff-metric-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p>{label}</p>
        <strong>{value ?? "—"}</strong>
      </div>
    </article>
  );
}
