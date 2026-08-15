import { useLocation, useNavigate } from "react-router-dom";

import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearPagePortalOrigin,
  getPagePortalReturnPath,
} from "../../app/navigationContext";

export function LearnerActivityHomeButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const homeCommit = useButtonCommit();
  const pagePortalReturnPath = getPagePortalReturnPath();
  const routeEntrySource = (location.state as { entrySource?: string } | null)
    ?.entrySource;
  const isPagePortalEntry =
    pagePortalReturnPath !== null || routeEntrySource === "page-portal";
  const pagePortalDestination =
    pagePortalReturnPath ??
    (routeEntrySource === "page-portal"
      ? "/staff/system-admin/page-portals"
      : null);

  return (
    <button
      type="button"
      className="assessment-home-button"
      aria-label={
        isPagePortalEntry ? "Back to Page Portals" : "Back to dashboard"
      }
      title={isPagePortalEntry ? "Back to Page Portals" : "Back to dashboard"}
      data-press-state={homeCommit.committing ? "committing" : "idle"}
      disabled={homeCommit.committing}
      onClick={() =>
        homeCommit.commit(() => {
          if (isPagePortalEntry && pagePortalDestination) {
            clearPagePortalOrigin();
            navigate(pagePortalDestination, { replace: true });
            return;
          }
          navigate("/learner/dashboard");
        })
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 10.5 8.5-7 8.5 7" />
        <path d="M5.5 9.2V21h13V9.2" />
        <path d="M9.2 21v-6.4h5.6V21" />
      </svg>
    </button>
  );
}
