import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { claraBackDestination } from "../../app/nativeLifecycle";

/**
 * Keeps Clara's dashboard and practice modules as a small navigation tree.
 * Browser Back emits popstate before React Router can expose the previous
 * practice route, so resolve that event to the explicit Clara parent instead
 * of replaying the user's practice history.
 */
export function useLearnWithClaraBackNavigation(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const destination = claraBackDestination(pathname);

  useEffect(() => {
    if (!destination) return;

    const handlePopState = () => {
      navigate(destination, { replace: true });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [destination, navigate]);
}
