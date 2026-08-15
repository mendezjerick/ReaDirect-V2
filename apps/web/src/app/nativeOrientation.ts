import { Capacitor, registerPlugin } from "@capacitor/core";

interface NativeScreenOrientationPlugin {
  lockPortrait(): Promise<void>;
  unlock(): Promise<void>;
}

const ScreenOrientation =
  registerPlugin<NativeScreenOrientationPlugin>("ScreenOrientation");

const APPROVED_GAME_ROUTES = [
  "/learner/games/game-one",
  "/learner/games/game-two",
] as const;

export function isApprovedGameRoute(pathname: string): boolean {
  return APPROVED_GAME_ROUTES.includes(
    pathname as (typeof APPROVED_GAME_ROUTES)[number],
  );
}

export async function applyNativeOrientation(pathname: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  if (isApprovedGameRoute(pathname)) {
    // Games may use either portrait or landscape. Let Android's sensor and
    // the learner's device preference decide instead of forcing a rotation.
    await ScreenOrientation.unlock();
    return;
  }

  await ScreenOrientation.lockPortrait();
}

export { APPROVED_GAME_ROUTES };
