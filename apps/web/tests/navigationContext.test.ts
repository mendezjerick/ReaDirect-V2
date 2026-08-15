import { afterEach, describe, expect, it } from "vitest";

import {
  clearPagePortalOrigin,
  getPagePortalReturnPath,
  pagePortalNavigationState,
  setPagePortalOrigin,
} from "../src/app/navigationContext";

describe("navigation origins", () => {
  afterEach(() => {
    clearPagePortalOrigin();
  });

  it("keeps Page Portal return context outside academic state", () => {
    expect(getPagePortalReturnPath()).toBeNull();

    setPagePortalOrigin();

    expect(getPagePortalReturnPath()).toBe("/staff/system-admin/page-portals");
    expect(pagePortalNavigationState()).toEqual({ entrySource: "page-portal" });

    clearPagePortalOrigin();
    expect(getPagePortalReturnPath()).toBeNull();
  });
});
