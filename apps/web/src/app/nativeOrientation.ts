import { Capacitor, registerPlugin } from "@capacitor/core";

interface NativeScreenOrientationPlugin {
  lockPortrait(): Promise<void>;
  lockLandscape(): Promise<void>;
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
    // The games own their viewport in landscape while active. The lifecycle
    // provider calls this again with the application route on exit, restoring
    // the normal portrait policy.
    await ScreenOrientation.lockLandscape();
    return;
  }

  await ScreenOrientation.lockPortrait();
}

export { APPROVED_GAME_ROUTES };
