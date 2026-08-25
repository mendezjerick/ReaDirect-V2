import { clearLearnerSession } from "../features/learner-auth/learnerApi";
import { clearStaffSession } from "../features/staff-auth/staffApi";

export function clearAllAccountSessions(): void {
  clearLearnerSession();
  clearStaffSession();
}
