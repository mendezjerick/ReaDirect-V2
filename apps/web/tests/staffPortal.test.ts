import { describe, expect, it, vi } from "vitest";

import {
  STAFF_PORTAL_URL,
  openStaffPortal,
} from "../src/features/staff-auth/staffPortal";

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
