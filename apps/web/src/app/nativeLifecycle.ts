import type { BackButtonListenerEvent } from "@capacitor/app";

export interface NativeLifecycleHandler {
  onPause?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onBackButton?: (event: BackButtonListenerEvent) => boolean | Promise<boolean>;
}

export const CLARA_DASHBOARD_ROUTE = "/learner/learn-with-clara";

const CLARA_PRACTICE_ROUTES = new Set([
  "/learner/learn-with-clara/letters",
  "/learner/learn-with-clara/words",
]);

export function claraBackDestination(pathname: string): string | null {
  if (pathname === CLARA_DASHBOARD_ROUTE) {
    return "/learner/dashboard";
  }

  if (
    CLARA_PRACTICE_ROUTES.has(pathname) ||
    pathname.startsWith(`${CLARA_DASHBOARD_ROUTE}/practice/`)
  ) {
    return CLARA_DASHBOARD_ROUTE;
  }

  return null;
}

const handlers = new Set<NativeLifecycleHandler>();

export function nativeBackDestination(
  pathname: string,
  search = "",
): string | null {
  const from = new URLSearchParams(search).get("from");

  if (pathname === "/home" && from === "native-mode-selection") {
    return "/learner/modes";
  }

  const claraDestination = claraBackDestination(pathname);
  if (claraDestination) return claraDestination;

  if (pathname !== "/learner/offline") return null;

  return from === "dashboard" ? "/learner/dashboard" : "/learner/modes";
}

export function registerNativeLifecycleHandler(
  handler: NativeLifecycleHandler,
): () => void {
  handlers.add(handler);

  return () => {
    handlers.delete(handler);
  };
}

export async function notifyNativePause(): Promise<void> {
  await Promise.all(
    [...handlers].map((handler) => Promise.resolve(handler.onPause?.())),
  );
}

export async function notifyNativeResume(): Promise<void> {
  await Promise.all(
    [...handlers].map((handler) => Promise.resolve(handler.onResume?.())),
  );
}

export async function notifyNativeBackButton(
  event: BackButtonListenerEvent,
): Promise<boolean> {
  const registeredHandlers = [...handlers].reverse();

  for (const handler of registeredHandlers) {
    if (await handler.onBackButton?.(event)) {
      return true;
    }
  }

  return false;
}
