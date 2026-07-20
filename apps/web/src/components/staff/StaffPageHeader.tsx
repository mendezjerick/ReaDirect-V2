import type { ReactNode } from "react";

interface StaffPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  badge?: ReactNode;
}

export function StaffPageHeader({
  eyebrow,
  title,
  description,
  badge,
}: StaffPageHeaderProps) {
  return (
    <header className="staff-page-header">
      <div>
        <p className="staff-page-header__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {badge}
    </header>
  );
}
