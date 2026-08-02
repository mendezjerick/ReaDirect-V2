import {
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import {
  loadStaffSession,
  staffFetch,
  staffSessionChangedEvent,
  type StaffSession,
} from "./staffApi";

const defaultHeartbeatIntervalSeconds = 30;

export function StaffSessionLifecycleProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState(loadStaffSession);

  useEffect(() => {
    const synchronizeSession = () => setSession(loadStaffSession());

    window.addEventListener(staffSessionChangedEvent, synchronizeSession);
    return () =>
      window.removeEventListener(staffSessionChangedEvent, synchronizeSession);
  }, []);

  useEffect(() => {
    if (!session || session.session.remembered) {
      return;
    }

    const heartbeat = async () => {
      try {
        await staffFetch("/api/staff/session/heartbeat", {
          method: "POST",
          headers: { Accept: "application/json" },
        });
      } catch {
        // The server lease safely expires if the browser or network disappears.
      }
    };
    const heartbeatInterval = window.setInterval(
      () => void heartbeat(),
      heartbeatIntervalMilliseconds(session),
    );
    const heartbeatWhenActive = () => {
      if (document.visibilityState === "visible") {
        void heartbeat();
      }
    };

    void heartbeat();
    window.addEventListener("focus", heartbeatWhenActive);
    document.addEventListener("visibilitychange", heartbeatWhenActive);

    return () => {
      window.clearInterval(heartbeatInterval);
      window.removeEventListener("focus", heartbeatWhenActive);
      document.removeEventListener("visibilitychange", heartbeatWhenActive);
    };
  }, [session]);

  return children;
}

function heartbeatIntervalMilliseconds(session: StaffSession): number {
  return (
    session.session.heartbeat_interval_seconds ??
    defaultHeartbeatIntervalSeconds
  ) * 1_000;
}
