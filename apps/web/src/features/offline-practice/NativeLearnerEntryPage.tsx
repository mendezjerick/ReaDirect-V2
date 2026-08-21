import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  LINK_START_DURATION_MS,
  LinkStartTransition,
} from "../../components/transitions/LinkStartTransition";
import { BigButton } from "../../components/ui/BigButton";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { useConnectivity } from "../connectivity/connectivityContext";
import { probeApiReachability } from "../connectivity/connectivityProbe";
import { ThemeSelector } from "../theme/ThemeSelector";
import { useTheme } from "../theme/themeContext";
import "./offline-practice.css";

const NATIVE_STARTUP_DURATION_MS = 5000;

function EntryBookIcon() {
  return <PixelIcon name="book" />;
}

function OfflineLeafIcon() {
  return <PixelIcon name="leaf" />;
}

function OnlineModeArtwork() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" focusable="false">
      <circle cx="100" cy="57" r="37" />
      <path d="M63 57h74M100 20c12 11 18 23 18 37s-6 26-18 37M100 20c-12 11-18 23-18 37s6 26 18 37M68 40c18 9 46 9 64 0M68 74c18-9 46-9 64 0" />
      <path d="M25 52c0-7 6-12 13-12 4 0 8 2 10 5 2-2 5-3 8-3 7 0 12 5 12 12v4H25v-6Z" />
      <path d="M84 92c11-9 21-9 32 0M91 101c6-5 12-5 18 0M102 110h1" />
    </svg>
  );
}

function OfflineModeArtwork() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" focusable="false">
      <path d="M20 102h120" />
      <path d="m33 101 19-42 19 42H33ZM94 101l20-51 22 51H94Z" />
      <path d="m45 101 13-28 13 28H45ZM84 101l16-35 16 35H84Z" />
      <path d="M24 84h18M110 84h24" />
      <path d="M75 101V69" />
    </svg>
  );
}

function WifiOffIcon() {
  return <PixelIcon name="wifi-off" />;
}

function WarningIcon() {
  return <PixelIcon name="warning" />;
}

function NativeStaticClara() {
  const { theme } = useTheme();
  const source =
    theme === "t2"
      ? "/assets/live2d/clara/stills/clara-t2.png"
      : theme === "t3"
        ? "/assets/live2d/clara/stills/clara-t3.png"
        : theme === "t4"
          ? "/assets/live2d/clara/stills/clara-t4.png"
          : theme === "t5"
            ? "/assets/live2d/clara/stills/clara-t5.png"
            : theme === "t6"
              ? "/assets/live2d/clara/stills/clara-t6.png"
              : theme === "t7"
                ? "/assets/live2d/clara/stills/clara-t7.png"
                : theme === "t8"
                  ? "/assets/live2d/clara/stills/clara-t8.png"
                  : "/assets/live2d/clara/stills/clara-default.png";

  return (
    <figure
      className="clara-stage native-entry__clara"
      aria-label="Ma'am Clara"
    >
      <div className="clara-stage__viewport">
        <img
          className="native-entry__clara-image"
          src={source}
          alt=""
          aria-hidden="true"
        />
      </div>
    </figure>
  );
}

function NativeStartupScreen() {
  const { theme } = useTheme();
  const source =
    theme === "t2"
      ? "/assets/backgrounds/T2mobile.png"
      : theme === "t3"
        ? "/assets/backgrounds/T3mobile.png"
        : theme === "t4"
          ? "/assets/backgrounds/T4mobile.png"
          : theme === "t5"
            ? "/assets/backgrounds/T5mobile.png"
            : theme === "t6"
              ? "/assets/backgrounds/T6mobile.png"
              : theme === "t7"
                ? "/assets/backgrounds/T7mobile.png"
                : theme === "t8"
                  ? "/assets/backgrounds/T8mobile.png"
                  : "/assets/backgrounds/T1mobile.png";
  return (
    <main
      className="native-startup-splash"
      aria-label="Loading ReaDirect"
      role="status"
    >
      <img
        className="native-startup-splash__background"
        src={source}
        alt=""
        aria-hidden="true"
      />
      <img
        className="native-startup-splash__icon"
        src="/assets/icons/rd.png"
        alt="ReaDirect"
      />
      <span className="native-startup-splash__loader" aria-hidden="true" />
      <span className="visually-hidden">Loading ReaDirect</span>
    </main>
  );
}

function connectionMessage(
  device: ReturnType<typeof useConnectivity>["device"],
  api: ReturnType<typeof useConnectivity>["api"],
  learnerSession: ReturnType<typeof useConnectivity>["learnerSession"],
): string {
  if (learnerSession === "expired") {
    return "Your online session ended. Sign in again to continue Online Learning.";
  }
  if (device === "offline") {
    return "Offline Mode is ready on this device.";
  }
  if (api === "unreachable") {
    return "Offline Mode is available while Online Learning reconnects.";
  }
  if (api === "checking" || api === "unknown") {
    return "You can choose Offline Practice now while we check Online Learning.";
  }
  return "Online Learning is ready when you are.";
}

function onlineFailureMessage(
  device: ReturnType<typeof useConnectivity>["device"],
  api: ReturnType<typeof useConnectivity>["api"],
  learnerSession: ReturnType<typeof useConnectivity>["learnerSession"],
): string {
  if (learnerSession === "expired") {
    return "Your online session ended. Sign in again to continue Online Learning.";
  }

  if (device === "offline" || api === "unreachable") {
    return "No Internet Connection";
  }

  return "Online Learning is still checking the connection. Try again in a moment.";
}

export function NativeLearnerEntryPage({
  initialView = "startup",
}: {
  initialView?: "startup" | "modes";
}) {
  const navigate = useNavigate();
  const connectivity = useConnectivity();
  const onlineCommit = useButtonCommit();
  const offlineCommit = useButtonCommit();
  const [startupReady, setStartupReady] = useState(initialView === "modes");
  const [hasContinued, setHasContinued] = useState(initialView === "modes");
  const [isContinuing, setIsContinuing] = useState(false);
  const [isCheckingOnline, setIsCheckingOnline] = useState(false);
  const [onlineNotice, setOnlineNotice] = useState<string | null>(null);
  const continueTimer = useRef<number | null>(null);

  useEffect(() => {
    if (initialView === "modes") return;

    const startupTimer = window.setTimeout(
      () => setStartupReady(true),
      NATIVE_STARTUP_DURATION_MS,
    );

    return () => window.clearTimeout(startupTimer);
  }, [initialView]);

  useEffect(() => {
    return () => {
      if (continueTimer.current !== null) {
        window.clearTimeout(continueTimer.current);
      }
    };
  }, []);

  const handleContinue = () => {
    if (isContinuing) {
      return;
    }

    setIsContinuing(true);
    continueTimer.current = window.setTimeout(() => {
      continueTimer.current = null;
      setHasContinued(true);
    }, LINK_START_DURATION_MS);
  };

  const openOnlineLearning = async () => {
    if (isCheckingOnline) {
      return;
    }

    if (connectivity.device === "offline") {
      setOnlineNotice(
        onlineFailureMessage(
          connectivity.device,
          connectivity.api,
          connectivity.learnerSession,
        ),
      );
      return;
    }

    let apiStatus = connectivity.api;
    if (apiStatus !== "reachable" && apiStatus !== "unauthorized") {
      setIsCheckingOnline(true);
      try {
        apiStatus = (await probeApiReachability({ timeoutMs: 5_000 })).status;
      } finally {
        setIsCheckingOnline(false);
      }
    }

    if (apiStatus !== "reachable" && apiStatus !== "unauthorized") {
      setOnlineNotice(
        onlineFailureMessage(
          connectivity.device,
          apiStatus,
          connectivity.learnerSession,
        ),
      );
      return;
    }

    onlineCommit.commit(() => navigate("/home?from=native-mode-selection"));
  };

  const openOfflinePractice = () => {
    offlineCommit.commit(() =>
      navigate("/learner/offline?from=native-mode-selection"),
    );
  };

  if (!startupReady) {
    return <NativeStartupScreen />;
  }

  if (!hasContinued) {
    return (
      <main
        className={`intro-page learner-typography-page${isContinuing ? " intro-page--transitioning" : ""}`}
        aria-labelledby="native-entry-title"
        data-route-focus
        tabIndex={-1}
      >
        <ThemeSelector />
        <section className="intro-page__content">
          <div className="intro-page__brand">
            <h1 id="native-entry-title" className="intro-page__title">
              ReaDirect
            </h1>
            <div className="intro-page__continue-wrap">
              <BigButton
                className="intro-page__continue"
                disabled={isContinuing}
                onClick={handleContinue}
              >
                Tap to continue
              </BigButton>
            </div>
          </div>
          <NativeStaticClara />
        </section>
        {isContinuing ? <LinkStartTransition /> : null}
      </main>
    );
  }

  return (
    <main
      className="offline-entry learner-flow-page"
      aria-label="ReaDirect learning choices"
      data-route-focus
      tabIndex={-1}
    >
      <div className="offline-entry__shell">
        <Surface className="offline-entry__header" kind="frame" padding="roomy">
          <p className="offline-practice__eyebrow">Welcome to ReaDirect</p>
          <h1>Choose how you want to learn.</h1>
          <p>
            Learn online when your account is connected, or practice with a
            downloaded pack whenever you need it.
          </p>
          <p
            className="offline-entry__connection"
            role="status"
            aria-live="polite"
          >
            {connectionMessage(
              connectivity.device,
              connectivity.api,
              connectivity.learnerSession,
            )}
          </p>
        </Surface>

        <section className="offline-entry__choices" aria-label="Learning modes">
          <Surface
            className="offline-entry__choice"
            kind="panel"
            padding="roomy"
          >
            <div className="offline-entry__choice-info">
              <span className="offline-entry__icon" aria-hidden="true">
                <EntryBookIcon />
              </span>
              <div>
                <p className="offline-practice__eyebrow">Connected learning</p>
                <h2>Online Learning</h2>
                <p>
                  Open your Reading Journey, lessons, and other online
                  activities.
                </p>
              </div>
              <span className="offline-entry__art" aria-hidden="true">
                <OnlineModeArtwork />
              </span>
            </div>
            <BigButton
              className="offline-entry__action"
              committing={onlineCommit.committing || isCheckingOnline}
              onClick={openOnlineLearning}
            >
              Online Learning
            </BigButton>
          </Surface>

          <Surface
            className="offline-entry__choice"
            kind="panel"
            padding="roomy"
          >
            <div className="offline-entry__choice-info">
              <span
                className="offline-entry__icon offline-entry__icon--offline"
                aria-hidden="true"
              >
                <OfflineLeafIcon />
              </span>
              <div>
                <p className="offline-practice__eyebrow">No internet needed</p>
                <h2>Practice Offline</h2>
                <p>
                  Use a pack saved on this device for practice that stays local.
                </p>
              </div>
              <span
                className="offline-entry__art offline-entry__art--offline"
                aria-hidden="true"
              >
                <OfflineModeArtwork />
              </span>
            </div>
            <BigButton
              className="offline-entry__action"
              variant="secondary"
              committing={offlineCommit.committing}
              onClick={openOfflinePractice}
            >
              Offline Mode
            </BigButton>
          </Surface>
        </section>

        {onlineNotice ? (
          <div
            className="offline-entry__notice offline-entry__notice--warning"
            role="status"
            aria-live="polite"
          >
            <span className="offline-entry__notice-icon" aria-hidden="true">
              <WifiOffIcon />
            </span>
            <span>{onlineNotice}</span>
            <span className="offline-entry__notice-icon" aria-hidden="true">
              <WarningIcon />
            </span>
          </div>
        ) : (
          <p className="offline-entry__notice" role="status" aria-live="polite">
            Practice only — does not change lesson progress.
          </p>
        )}
      </div>
    </main>
  );
}
