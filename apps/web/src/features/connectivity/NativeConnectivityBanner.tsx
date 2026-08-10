import { Capacitor } from "@capacitor/core";
import { useLocation } from "react-router-dom";

import { useConnectivity } from "./connectivityContext";
import "./native-connectivity-banner.css";

export function NativeConnectivityBanner() {
  const location = useLocation();
  const connectivity = useConnectivity();

  if (
    !Capacitor.isNativePlatform() ||
    (!location.pathname.startsWith("/learner") && location.pathname !== "/")
  ) {
    return null;
  }

  const message =
    connectivity.device === "offline"
      ? "No Internet Connection"
      : connectivity.api === "unreachable"
        ? "Online Learning is unavailable right now."
        : connectivity.api === "unauthorized"
          ? "Your online session has expired. Sign in again to continue."
          : null;

  if (!message) return null;

  return (
    <div
      className="native-connectivity-banner"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
