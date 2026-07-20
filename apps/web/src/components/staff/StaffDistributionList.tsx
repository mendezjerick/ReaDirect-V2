import type { CSSProperties } from "react";

interface StaffDistributionItem {
  label: string;
  value: number;
}

interface StaffDistributionListProps {
  items: StaffDistributionItem[];
}

export function StaffDistributionList({ items }: StaffDistributionListProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="staff-distribution-list">
      {items.map((item) => {
        const percentage = total === 0 ? 0 : (item.value / total) * 100;
        const style = {
          "--staff-distribution-width": `${percentage}%`,
        } as CSSProperties;

        return (
          <div className="staff-distribution" key={item.label}>
            <div className="staff-distribution__label">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="staff-distribution__track" aria-hidden="true">
              <span style={style} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
