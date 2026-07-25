import { NavLink } from "react-router-dom";
import {
  systemAdminNavigationGroups,
  type StaffNavigationGroup,
} from "./staffNavigation";

interface StaffNavigationProps {
  groups?: StaffNavigationGroup[];
  onNavigate?: () => void;
}

export function StaffNavigation({
  groups = systemAdminNavigationGroups,
  onNavigate,
}: StaffNavigationProps) {
  return (
    <nav className="staff-sidebar__nav" aria-label="Dashboard navigation">
      {groups.map((group) => (
        <section className="staff-sidebar__nav-group" key={group.label}>
          <p className="staff-sidebar__nav-label">{group.label}</p>
          <div className="staff-sidebar__nav-list">
            {group.items.map((item) =>
              item.to ? (
                <NavLink
                  className={({ isActive }) =>
                    [
                      "staff-sidebar__nav-item",
                      isActive ? "staff-sidebar__nav-item--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  end={item.end ?? true}
                  key={item.label}
                  onClick={onNavigate}
                  to={item.to}
                >
                  <span className="staff-sidebar__nav-dot" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ) : (
                <span
                  className="staff-sidebar__nav-item staff-sidebar__nav-item--disabled"
                  aria-disabled="true"
                  key={item.label}
                  title="This workspace will be added in a later development pass."
                >
                  <span className="staff-sidebar__nav-dot" aria-hidden="true" />
                  <span>{item.label}</span>
                  <small>Later</small>
                </span>
              ),
            )}
          </div>
        </section>
      ))}
    </nav>
  );
}
