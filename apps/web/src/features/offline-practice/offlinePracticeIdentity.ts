import { loadLearnerSession } from "../learner-auth/learnerApi";
import { OfflinePracticeRepository } from "./offlinePracticeRepository";
import { isSafeLocalPathSegment } from "./offlinePracticePathSafety";

const ACTIVE_PROFILE_KEY = "readirect.offline-practice.active-profile";
const INSTALL_SALT_KEY = "readirect.offline-practice.install-salt";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function randomOpaqueValue(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid.replaceAll("-", "");
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function readOrCreateInstallSalt(): string {
  const store = storage();
  const existing = store?.getItem(INSTALL_SALT_KEY);
  if (existing && isSafeLocalPathSegment(existing)) return existing;

  const salt = `s-${randomOpaqueValue()}`;
  store?.setItem(INSTALL_SALT_KEY, salt);
  return salt;
}

async function sha256Hex(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle)
    throw new Error("Secure local practice identity is unavailable.");

  const digest = await subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function resolveOfflinePracticeProfileId(): Promise<string> {
  const session = loadLearnerSession();
  const store = storage();

  if (session) {
    const profileId = `p-${await sha256Hex(
      `${readOrCreateInstallSalt()}:learner:${session.learner.id}`,
    )}`;
    store?.setItem(ACTIVE_PROFILE_KEY, profileId);
    return profileId;
  }

  const existing = store?.getItem(ACTIVE_PROFILE_KEY);
  if (existing && isSafeLocalPathSegment(existing)) return existing;

  const profileId = `d-${randomOpaqueValue()}`;
  store?.setItem(ACTIVE_PROFILE_KEY, profileId);
  return profileId;
}

export function activeOfflinePracticeProfileId(): string | null {
  const value = storage()?.getItem(ACTIVE_PROFILE_KEY) ?? null;
  return value && isSafeLocalPathSegment(value) ? value : null;
}

export async function clearActiveOfflinePracticeProfile(): Promise<void> {
  const profileId = activeOfflinePracticeProfileId();
  if (profileId) {
    await new OfflinePracticeRepository().deleteLocalProfile(profileId);
  }
  storage()?.removeItem(ACTIVE_PROFILE_KEY);
}
