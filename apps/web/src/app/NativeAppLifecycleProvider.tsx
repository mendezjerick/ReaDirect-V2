import { App } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { useEffect, useRef, type PropsWithChildren } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { stopAllClaraSpeech } from "../features/clara-audio/claraSpeech";
import {
  nativeBackDestination,
  notifyNativeBackButton,
  notifyNativePause,
  notifyNativeResume,
} from "./nativeLifecycle";

export function NativeAppLifecycleProvider({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(location.pathname);
  const searchRef = useRef(location.search);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    pathnameRef.current = location.pathname;
    searchRef.current = location.search;
  }, [location.pathname, location.search]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let disposed = false;
    const listenerHandles: PluginListenerHandle[] = [];

    const registerListeners = async () => {
      const [pauseHandle, resumeHandle, backHandle] = await Promise.all([
        App.addListener("pause", () => {
          void notifyNativePause();
          stopAllClaraSpeech();
        }),
        App.addListener("resume", () => {
          void notifyNativeResume();
        }),
        App.addListener("backButton", async (event) => {
          if (await notifyNativeBackButton(event)) {
            return;
          }

          stopAllClaraSpeech();

          const pathname = pathnameRef.current;
          const destination = nativeBackDestination(pathname, searchRef.current);
          if (destination) {
            navigateRef.current(destination, { replace: true });
            return;
          }

          if (event.canGoBack) {
            navigateRef.current(-1);
            return;
          }

          if (pathname === "/") {
            await App.exitApp();
            return;
          }

          if (pathname === "/learner/dashboard") return;

          navigateRef.current(
            pathname.startsWith("/learner/") ? "/learner/dashboard" : "/",
            { replace: true },
          );
        }),
      ]);

      if (disposed) {
        void Promise.all([
          pauseHandle.remove(),
          resumeHandle.remove(),
          backHandle.remove(),
        ]);
        return;
      }

      listenerHandles.push(pauseHandle, resumeHandle, backHandle);
    };

    void registerListeners();

    return () => {
      disposed = true;
      void Promise.all(listenerHandles.map((handle) => handle.remove()));
    };
  }, []);

  return children;
}
