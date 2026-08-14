import type { BackButtonListenerEvent } from "@capacitor/app";

export interface NativeLifecycleHandler {
  onPause?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onBackButton?: (event: BackButtonListenerEvent) => boolean | Promise<boolean>;
}

const handlers = new Set<NativeLifecycleHandler>();

export function nativeBackDestination(
  pathname: string,
  search = "",
): string | null {
  if (pathname !== "/learner/offline") return null;

  return new URLSearchParams(search).get("from") === "dashboard"
    ? "/learner/dashboard"
    : "/learner/modes";
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
