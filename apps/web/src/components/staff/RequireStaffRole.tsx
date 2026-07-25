import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import {
  clearStaffSession,
  getCurrentStaffSession,
  loadStaffSession,
  type StaffRole,
  type StaffSession,
} from "../../features/staff-auth/staffApi";

interface RequireStaffRoleProps {
  allowedRoles: StaffRole[];
}

function staffHomeRoute(session: StaffSession): string {
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

export function RequireStaffRole({ allowedRoles }: RequireStaffRoleProps) {
  const [storedSession] = useState(loadStaffSession);
  const [verifiedSession, setVerifiedSession] = useState<StaffSession | null>(
    null,
  );
  const [checking, setChecking] = useState(storedSession !== null);

  useEffect(() => {
    if (!storedSession) {
      return;
    }

    if (new Date(storedSession.session.expires_at).getTime() <= Date.now()) {
      clearStaffSession();
      setChecking(false);
      return;
    }

    let active = true;

    void getCurrentStaffSession()
      .then((session) => {
        if (active) {
          setVerifiedSession(session);
          setChecking(false);
        }
      })
      .catch(() => {
        if (active) {
          clearStaffSession();
          setChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [storedSession]);

  if (checking) {
    return (
      <main
        className="staff-session-required-page"
        aria-live="polite"
        aria-busy="true"
      >
        <p>Checking your staff session...</p>
      </main>
    );
  }

  if (!verifiedSession) {
    return <Navigate to="/staff/login" replace />;
  }

  if (!allowedRoles.includes(verifiedSession.staff.role)) {
    return <Navigate to={staffHomeRoute(verifiedSession)} replace />;
  }

  return <Outlet />;
}
