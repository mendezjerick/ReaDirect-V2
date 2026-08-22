import { Network, type ConnectionStatus } from "@capacitor/network";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { loadLearnerSession } from "../learner-auth/learnerApi";
import { isGuestToken } from "../guest/guestSession";
import { registerNativeLifecycleHandler } from "../../app/nativeLifecycle";
import {
  probeApiReachability,
  type ApiReachability,
} from "./connectivityProbe";
import {
  ConnectivityContext,
  type ConnectivityState,
  type DeviceNetworkState,
} from "./connectivityContext";
const NETWORK_EVENT_DEBOUNCE_MS = 350;

function deviceStateFromStatus(status: ConnectionStatus): DeviceNetworkState {
  return status.connected ? "online" : "offline";
}

async function readDeviceState(): Promise<DeviceNetworkState> {
  try {
    return deviceStateFromStatus(await Network.getStatus());
  } catch {
    return typeof navigator === "undefined" || navigator.onLine
      ? "online"
      : "offline";
  }
}

function learnerToken(): string | null {
  return loadLearnerSession()?.token ?? null;
}

export function ConnectivityProvider({ children }: PropsWithChildren) {
  const [device, setDevice] = useState<DeviceNetworkState>("unknown");
  const [api, setApi] = useState<ApiReachability>("unknown");
  const [hasLearnerSession, setHasLearnerSession] = useState(() =>
    Boolean(learnerToken()),
  );
  const [hasAuthenticatedLearnerSession, setHasAuthenticatedLearnerSession] =
    useState(() => {
      const token = learnerToken();
      return Boolean(token && !isGuestToken(token));
    });
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const pausedRef = useRef(false);
  const probeControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (pausedRef.current) return;

    const token = learnerToken();
    const guest = isGuestToken(token);
    const probeToken = guest ? null : token;
    setHasLearnerSession(Boolean(token));
    setHasAuthenticatedLearnerSession(Boolean(token && !guest));
    setDevice(await readDeviceState());
    if (pausedRef.current) return;

    probeControllerRef.current?.abort();
    const controller = new AbortController();
    probeControllerRef.current = controller;
    setApi("checking");

    try {
      const result = await probeApiReachability({
        token: probeToken,
        signal: controller.signal,
      });
      if (!controller.signal.aborted && !pausedRef.current) {
        setApi(result.status);
        setLastCheckedAt(new Date().toISOString());
      }
    } catch (error) {
      if (
        !controller.signal.aborted &&
        !pausedRef.current &&
        !(error instanceof DOMException && error.name === "AbortError")
      ) {
        setApi("unreachable");
        setLastCheckedAt(new Date().toISOString());
      }
    } finally {
      if (probeControllerRef.current === controller) {
        probeControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let debounceTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
    let networkHandle: { remove: () => Promise<void> } | null = null;

    const scheduleRefresh = () => {
      if (debounceTimer !== null) globalThis.clearTimeout(debounceTimer);
      debounceTimer = globalThis.setTimeout(() => {
        debounceTimer = null;
        void refresh();
      }, NETWORK_EVENT_DEBOUNCE_MS);
    };

    const pause = () => {
      pausedRef.current = true;
      if (debounceTimer !== null) globalThis.clearTimeout(debounceTimer);
      debounceTimer = null;
      probeControllerRef.current?.abort();
    };

    const resume = () => {
      pausedRef.current = false;
      scheduleRefresh();
    };

    const onNetworkStatusChange = (status: ConnectionStatus) => {
      setDevice(deviceStateFromStatus(status));
      scheduleRefresh();
    };

    const onVisibilityChange = () => {
      if (document.hidden) pause();
      else resume();
    };

    const initialize = async () => {
      try {
        networkHandle = await Network.addListener(
          "networkStatusChange",
          onNetworkStatusChange,
        );
      } catch {
        // Browser fallback and the initial probe remain available when the
        // native plugin cannot register a listener.
      }

      if (!disposed) void refresh();
    };

    const unregisterLifecycle = registerNativeLifecycleHandler({
      onPause: pause,
      onResume: resume,
    });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", scheduleRefresh);
    window.addEventListener("offline", scheduleRefresh);
    void initialize();

    return () => {
      disposed = true;
      unregisterLifecycle();
      pause();
      void networkHandle?.remove();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", scheduleRefresh);
      window.removeEventListener("offline", scheduleRefresh);
    };
  }, [refresh]);

  const value = useMemo<ConnectivityState>(
    () => ({
      device,
      api,
      learnerSession:
        hasAuthenticatedLearnerSession && api === "unauthorized"
          ? "expired"
          : hasLearnerSession
            ? "present"
            : "signed_out",
      lastCheckedAt,
      refresh,
    }),
    [
      api,
      device,
      hasAuthenticatedLearnerSession,
      hasLearnerSession,
      lastCheckedAt,
      refresh,
    ],
  );

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}
