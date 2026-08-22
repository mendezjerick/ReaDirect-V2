import type { MouseEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PixelIcon } from "../../components/ui/PixelIcon";

import "./public-info-shell.css";

type PublicInfoShellProps = {
  children: ReactNode;
  className?: string;
  returnTo?: string;
};

export function PublicInfoShell({
  children,
  className,
  returnTo = "/landing",
}: PublicInfoShellProps) {
  const navigate = useNavigate();
  const shellClassName = ["public-info-shell", className]
    .filter(Boolean)
    .join(" ");

  const returnToSource = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(returnTo, { replace: true });
  };

  return (
    <div className={shellClassName} data-route-focus tabIndex={-1}>
      <header className="public-info-shell__header">
        <div className="public-info-shell__header-inner">
          <Link
            className="public-info-shell__brand"
            to={returnTo}
            aria-label="ReaDirect landing page"
            onClick={returnToSource}
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
            to={returnTo}
            aria-label="Back to ReaDirect"
            onClick={returnToSource}
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
          <Link to={returnTo} onClick={returnToSource}>
            Return to landing <PixelIcon name="arrow-up" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
