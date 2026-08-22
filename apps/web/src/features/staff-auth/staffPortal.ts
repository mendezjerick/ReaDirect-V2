import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

export const STAFF_PORTAL_URL = "https://app.readirect.org/staff/login";

export interface StaffPortalRuntime {
  native: boolean;
  openNativeBrowser(url: string): Promise<void>;
  navigate(path: string): void;
}

export function createStaffPortalRuntime(
  navigate: StaffPortalRuntime["navigate"],
): StaffPortalRuntime {
  return {
    native: Capacitor.isNativePlatform(),
    openNativeBrowser: async (url) => {
      await Browser.open({ url });
    },
    navigate,
  };
}

export async function openStaffPortal(
  runtime: StaffPortalRuntime,
): Promise<void> {
  if (runtime.native) {
    await runtime.openNativeBrowser(STAFF_PORTAL_URL);
    return;
  }

  runtime.navigate("/staff/login");
}
