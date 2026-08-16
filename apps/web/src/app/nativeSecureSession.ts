import { Capacitor, registerPlugin } from "@capacitor/core";

interface NativeSecureSessionPlugin {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}

const SecureSession =
  registerPlugin<NativeSecureSessionPlugin>("SecureSession");
const cache = new Map<string, string | null>();

export const isNativeSecureSessionAvailable = () =>
  Capacitor.isNativePlatform();

export function getNativeSessionCache(key: string): string | null | undefined {
  return cache.get(key);
}

export function setNativeSessionCache(key: string, value: string | null): void {
  cache.set(key, value);
}

export async function hydrateNativeSessions(keys: string[]): Promise<void> {
  if (!isNativeSecureSessionAvailable()) return;

  await Promise.all(
    keys.map(async (key) => {
      try {
        const result = await SecureSession.get({ key });
        cache.set(key, result.value ?? null);
      } catch {
        // A missing/invalid native store is treated as signed out.
        cache.set(key, null);
      }
    }),
  );
}

export async function persistNativeSession(
  key: string,
  value: string,
): Promise<void> {
  if (!isNativeSecureSessionAvailable()) return;
  await SecureSession.set({ key, value });
}

export async function removeNativeSession(key: string): Promise<void> {
  if (!isNativeSecureSessionAvailable()) return;
  await SecureSession.remove({ key });
}
