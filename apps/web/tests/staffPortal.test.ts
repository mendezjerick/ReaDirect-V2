import { describe, expect, it, vi } from "vitest";

const isNativePlatform = vi.hoisted(() => vi.fn(() => false));
const openNativeBrowser = vi.hoisted(() => vi.fn());

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform },
}));

vi.mock("@capacitor/browser", () => ({
  Browser: { open: openNativeBrowser },
}));

import {
  STAFF_PORTAL_URL,
  createStaffPortalRuntime,
  openStaffPortal,
} from "../src/features/staff-auth/staffPortal";

describe("createStaffPortalRuntime", () => {
  it("adapts the official Browser plugin for a native staff portal launch", async () => {
    const navigate = vi.fn();
    isNativePlatform.mockReturnValue(true);
    openNativeBrowser.mockResolvedValue(undefined);

    await openStaffPortal(createStaffPortalRuntime(navigate));

    expect(openNativeBrowser).toHaveBeenCalledWith({
      url: "https://app.readirect.org/staff/login",
    });
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("openStaffPortal", () => {
  it("opens the production staff portal in the native browser without SPA navigation", async () => {
    const openNativeBrowser = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();

    await openStaffPortal({
      native: true,
      openNativeBrowser,
      navigate,
    });

    expect(openNativeBrowser).toHaveBeenCalledWith(
      "https://app.readirect.org/staff/login",
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("uses the existing staff SPA login route in a browser without opening a native browser", async () => {
    const openNativeBrowser = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();

    await openStaffPortal({
      native: false,
      openNativeBrowser,
      navigate,
    });

    expect(navigate).toHaveBeenCalledWith("/staff/login");
    expect(openNativeBrowser).not.toHaveBeenCalled();
  });

  it("exposes the fixed production staff login URL", () => {
    expect(STAFF_PORTAL_URL).toBe("https://app.readirect.org/staff/login");
  });
});
