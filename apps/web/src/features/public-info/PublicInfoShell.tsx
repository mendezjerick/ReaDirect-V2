import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PixelIcon } from "../../components/ui/PixelIcon";

import "./public-info-shell.css";

type PublicInfoShellProps = {
  children: ReactNode;
  className?: string;
};

export function PublicInfoShell({ children, className }: PublicInfoShellProps) {
  const shellClassName = ["public-info-shell", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName} data-route-focus tabIndex={-1}>
      <header className="public-info-shell__header">
        <div className="public-info-shell__header-inner">
          <Link
            className="public-info-shell__brand"
            to="/landing"
            aria-label="ReaDirect landing page"
          >
            <img
              className="public-info-shell__mark"
              src="/assets/icons/rd.png"
              alt=""
              aria-hidden="true"
            />
            <span>ReaDirect</span>
          </Link>
          <Link
            className="public-info-shell__back"
            to="/landing"
            aria-label="Back to ReaDirect"
          >
            <PixelIcon name="arrow-left" />
            <span className="public-info-shell__back-full" aria-hidden="true">
              Back to ReaDirect
            </span>
            <span className="public-info-shell__back-short" aria-hidden="true">
              Back
            </span>
          </Link>
        </div>
      </header>

      <main className="public-info-shell__body">{children}</main>

      <footer className="public-info-shell__footer">
        <div className="public-info-shell__footer-inner">
          <span>© {new Date().getFullYear()} ReaDirect</span>
          <span>Public guidance for learners, families, and schools.</span>
          <Link to="/landing">
            Return to landing <PixelIcon name="arrow-up" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
