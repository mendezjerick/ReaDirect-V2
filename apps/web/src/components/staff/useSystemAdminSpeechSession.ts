import { loadStaffSession } from "../../features/staff-auth/staffApi";

export function useSystemAdminSpeechSession(): number | null {
  const session = loadStaffSession();
  return session?.staff.role === "system_admin" ? session.staff.id : null;
}
