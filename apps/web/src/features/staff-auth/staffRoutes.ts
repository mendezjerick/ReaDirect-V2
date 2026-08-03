import type { StaffSession } from "./staffApi";

export function staffHomeRoute(session: StaffSession): string {
  if (session.staff.role === "system_admin") {
    return "/staff/system-admin";
  }

  if (session.staff.role === "school_admin") {
    return session.staff.requires_school_setup
      ? "/staff/school-admin/setup-school"
      : "/staff/school-admin";
  }

  return "/staff/teacher";
}
