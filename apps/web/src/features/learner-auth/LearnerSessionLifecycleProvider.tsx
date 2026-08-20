import { useEffect, useState, type PropsWithChildren } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  clearLearnerSession,
  heartbeatLearnerSession,
  learnerSessionChangedEvent,
  LearnerSessionInvalidError,
  loadLearnerSession,
} from "./learnerApi";

const heartbeatIntervalMilliseconds = 30_000;

/** Keeps an active browser learner session alive and handles expiry clearly. */
export function LearnerSessionLifecycleProvider({
  children,
}: PropsWithChildren) {
  const [session, setSession] = useState(loadLearnerSession);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const synchronizeSession = () => setSession(loadLearnerSession());
    window.addEventListener(learnerSessionChangedEvent, synchronizeSession);
    return () =>
      window.removeEventListener(
        learnerSessionChangedEvent,
        synchronizeSession,
      );
  }, []);

  useEffect(() => {
    if (
      !session ||
      !location.pathname.startsWith("/learner/") ||
      location.pathname === "/learner/login"
    ) {
      return;
    }

    let active = true;
    let heartbeatInFlight = false;
    const heartbeat = async () => {
      if (
        !active ||
        heartbeatInFlight ||
        document.visibilityState !== "visible"
      ) {
        return;
      }
      heartbeatInFlight = true;
      try {
        await heartbeatLearnerSession(session.token);
      } catch (error) {
        if (active && error instanceof LearnerSessionInvalidError) {
          clearLearnerSession();
          const returnTo = `${location.pathname}${location.search}${location.hash}`;
          navigate(`/learner/login?returnTo=${encodeURIComponent(returnTo)}`, {
            replace: true,
          });
        }
      } finally {
        heartbeatInFlight = false;
      }
    };

    const heartbeatWhenActive = () => {
      if (document.visibilityState === "visible") void heartbeat();
    };

    void heartbeat();
    const interval = window.setInterval(
      () => void heartbeat(),
      heartbeatIntervalMilliseconds,
    );
    window.addEventListener("focus", heartbeatWhenActive);
    document.addEventListener("visibilitychange", heartbeatWhenActive);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", heartbeatWhenActive);
      document.removeEventListener("visibilitychange", heartbeatWhenActive);
    };
  }, [location.hash, location.pathname, location.search, navigate, session]);

  return children;
}
