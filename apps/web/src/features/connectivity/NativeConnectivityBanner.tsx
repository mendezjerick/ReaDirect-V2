import { Capacitor } from "@capacitor/core";
import { useLocation } from "react-router-dom";

import { useConnectivity } from "./connectivityContext";
import { PixelIcon } from "../../components/ui/PixelIcon";
import "./native-connectivity-banner.css";

function WifiOffIcon() {
  return (
    <PixelIcon className="native-connectivity-banner__icon" name="wifi-off" />
  );
}

function WarningIcon() {
  return (
    <PixelIcon
      className="native-connectivity-banner__icon native-connectivity-banner__icon--warning"
      name="warning"
    />
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
