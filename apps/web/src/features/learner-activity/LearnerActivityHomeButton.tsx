import { useLocation, useNavigate } from "react-router-dom";

import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { PixelIcon } from "../../components/ui/PixelIcon";
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
      <PixelIcon name="home" />
    </button>
  );
}
