import { Capacitor } from "@capacitor/core";
import { useLocation } from "react-router-dom";

import { useConnectivity } from "./connectivityContext";
import "./native-connectivity-banner.css";

function WifiOffIcon() {
  return (
    <svg
      className="native-connectivity-banner__icon"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 11.5a18 18 0 0 1 24 0M8.5 16a11.5 11.5 0 0 1 15 0M13 20.5a5.5 5.5 0 0 1 6 0M16 25h.01" />
      <path d="M5 5 27 27" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      className="native-connectivity-banner__icon native-connectivity-banner__icon--warning"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m16 4 13 24H3L16 4Z" />
      <path d="M16 11v8M16 23h.01" />
    </svg>
  );
}

export function NativeConnectivityBanner() {
  const location = useLocation();
  const connectivity = useConnectivity();
  const isModeSelection =
    location.pathname === "/" || location.pathname === "/learner/modes";
  const isOfflinePractice = location.pathname.startsWith("/learner/offline");

  if (
    !Capacitor.isNativePlatform() ||
    isModeSelection ||
    isOfflinePractice ||
    !location.pathname.startsWith("/learner")
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
      aria-atomic="true"
    >
      <WifiOffIcon />
      <span className="native-connectivity-banner__message">{message}</span>
      <WarningIcon />
    </div>
  );
}
