import { useState, type PropsWithChildren, type ReactNode } from "react";

import { StaffButton } from "./StaffButton";
import { StaffNavigation } from "./SystemAdminNavigation";
import {
  systemAdminNavigationGroups,
  type StaffNavigationGroup,
} from "./staffNavigation";

interface StaffShellProps extends PropsWithChildren {
  accountLabel: string;
  exitCommitting: boolean;
  onExit: () => void;
  brandIcon: ReactNode;
  workspaceLabel?: string;
  avatarLabel?: string;
  accountMeta?: string;
  administrationLabel?: string;
  navigationGroups?: StaffNavigationGroup[];
}

export function StaffShell({
  accountLabel,
  exitCommitting,
  onExit,
  brandIcon,
  workspaceLabel = "System Admin",
  avatarLabel = "SA",
  accountMeta = "Development account",
  administrationLabel = "System administration",
  navigationGroups = systemAdminNavigationGroups,
  children,
}: StaffShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const brand = (
    <div className="staff-sidebar__brand">
      <span className="staff-sidebar__brand-icon">{brandIcon}</span>
      <span>
        <strong>ReaDirect</strong>
        <small>{workspaceLabel}</small>
      </span>
    </div>
  );

  const account = (
    <div className="staff-sidebar__account">
      <span className="staff-sidebar__avatar" aria-hidden="true">
        {avatarLabel}
      </span>
      <span>
        <strong>{accountLabel}</strong>
        <small>{accountMeta}</small>
      </span>
    </div>
  );

  return (
    <main className="staff-shell" data-route-focus tabIndex={-1}>
      <aside className="staff-sidebar" aria-label={administrationLabel}>
        {brand}
        <StaffNavigation groups={navigationGroups} />
        {account}

        <StaffButton
          className="staff-sidebar__exit"
          tone="secondary"
          size="regular"
          committing={exitCommitting}
          onClick={onExit}
        >
          Exit staff view
        </StaffButton>
      </aside>

      <div className="staff-shell__content">
        <header className="staff-mobile-header">
          <button
            className="staff-mobile-header__menu"
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="staff-mobile-navigation"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="staff-mobile-header__menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>Menu</span>
          </button>

          <div className="staff-mobile-header__brand">
            <span className="staff-mobile-header__icon">{brandIcon}</span>
            <span>
              <strong>ReaDirect</strong>
              <small>{workspaceLabel}</small>
            </span>
          </div>

          <StaffButton
            className="staff-mobile-header__exit"
            tone="quiet"
            size="regular"
            committing={exitCommitting}
            onClick={onExit}
          >
            Exit
          </StaffButton>
        </header>

        {mobileMenuOpen ? (
          <>
            <button
              className="staff-mobile-drawer__backdrop"
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
            />

            <aside
              className="staff-mobile-drawer"
              id="staff-mobile-navigation"
              aria-label={administrationLabel}
            >
              <div className="staff-mobile-drawer__header">
                {brand}
                <button
                  className="staff-mobile-drawer__close"
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <StaffNavigation
                groups={navigationGroups}
                onNavigate={() => setMobileMenuOpen(false)}
              />
              {account}
              <StaffButton
                className="staff-sidebar__exit"
                tone="secondary"
                size="regular"
                committing={exitCommitting}
                onClick={onExit}
              >
                Exit staff view
              </StaffButton>
            </aside>
          </>
        ) : null}

        {children}
      </div>
    </main>
  );
}
