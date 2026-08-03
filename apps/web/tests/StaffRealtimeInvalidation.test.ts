import { describe, expect, it } from "vitest";

import type { StaffSession } from "../src/features/staff-auth/staffApi";
import { queryKeysForRealtimeTopics } from "../src/features/realtime/staffRealtimeInvalidation";

type StaffAccount = StaffSession["staff"];

describe("staff realtime invalidation", () => {
  it("maps system topics only to system administration queries", () => {
    expect(
      queryKeysForRealtimeTopics(staff("system_admin", 1), [
        "overview",
        "schools",
        "teachers",
        "learners",
        "learner-detail",
        "operations",
      ]),
    ).toEqual([
      ["system-admin-overview"],
      ["system-admin-schools"],
      ["system-admin-teachers"],
      ["system-admin-learners"],
      ["system-admin-page-portals"],
      ["system-admin-operations"],
    ]);
  });

  it("maps progress topics to the affected school administration views", () => {
    expect(
      queryKeysForRealtimeTopics(staff("school_admin", 12), [
        "overview",
        "learners",
        "learner-detail",
        "reports",
        "instructional-insights",
      ]),
    ).toEqual([
      ["school-admin-overview", 12],
      ["school-admin-learners", 12],
      ["school-admin-learner-detail", 12],
      ["school-admin-teacher-dashboard", 12],
      ["school-admin-report", 12],
      ["school-admin-instructional-insights", 12],
    ]);
  });

  it("maps and deduplicates teacher query prefixes", () => {
    expect(
      queryKeysForRealtimeTopics(staff("teacher", 27), [
        "overview",
        "learners",
        "learner-detail",
        "analytics",
        "reports",
        "audio-reviews",
        "assessment-reviews",
        "overview",
      ]),
    ).toEqual([
      ["teacher-overview", 27],
      ["teacher-learners", 27],
      ["teacher-learner-detail", 27],
      ["teacher-analytics", 27],
      ["teacher-report", 27],
      ["teacher-audio-reviews", 27],
      ["teacher-assessment-review"],
    ]);
  });
});

function staff(role: StaffAccount["role"], id: number): StaffAccount {
  return {
    id,
    username: `${role}-${id}`,
    email: null,
    display_name: role,
    role,
    school:
      role === "system_admin" ? null : { id: 90, name: "Realtime School" },
    requires_school_setup: false,
    requires_credential_setup: false,
  };
}
