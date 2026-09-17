import { afterEach, describe, expect, it, vi } from "vitest";

import {
  setActiveStaffSchoolYear,
  staffFetch,
} from "../src/features/staff-auth/staffApi";

describe("staff school-year request context", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    setActiveStaffSchoolYear(null);
    vi.unstubAllGlobals();
  });

  it("adds the selected school year to staff requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setActiveStaffSchoolYear("2026-2027");

    await staffFetch("/api/staff/school-admin/12/learners");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/school-admin/12/learners?school_year=2026-2027",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("does not add a stale year to identity or initial school setup requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setActiveStaffSchoolYear("2026-2027");

    await staffFetch("/api/staff/session");
    await staffFetch("/api/staff/school-admin/12/school", {
      method: "POST",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/staff/session",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/staff/school-admin/12/school",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
