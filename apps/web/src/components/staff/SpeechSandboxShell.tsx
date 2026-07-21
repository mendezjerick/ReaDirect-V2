import type { PropsWithChildren, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
  loadStaffSession,
  clearStaffSession,
} from "../../features/staff-auth/staffApi";
import { BigButton } from "../ui/BigButton";
import { Surface } from "../ui/Surface";
import { useButtonCommit } from "../ui/useButtonCommit";
import { StaffBrandIcon } from "./StaffBrandIcon";
import { StaffPageHeader } from "./StaffPageHeader";
import { StaffShell } from "./StaffShell";

interface SpeechSandboxShellProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description: string;
  badge: ReactNode;
  sessionPurpose?: string;
}

export function useSystemAdminSpeechSession(): number | null {
  const session = loadStaffSession();
  return session?.staff.role === "system_admin" ? session.staff.id : null;
}

export function SpeechSandboxShell({
  eyebrow,
  title,
  description,
  badge,
  sessionPurpose = "speech sandboxes",
  children,
}: SpeechSandboxShellProps) {
  const navigate = useNavigate();
  const session = loadStaffSession();
  const staffUserId =
    session?.staff.role === "system_admin" ? session.staff.id : null;
  const staffDisplayName =
    session?.staff.display_name ?? "System Administrator";
  const exitCommit = useButtonCommit();

  if (staffUserId === null) {
    return (
      <main className="staff-session-required" data-route-focus tabIndex={-1}>
        <Surface kind="panel" padding="roomy">
          <h1>System Administrator sign-in required</h1>
          <p>
            Sign in with the System Administrator account to use{" "}
            {sessionPurpose}.
          </p>
          <BigButton size="regular" onClick={() => navigate("/staff/login")}>
            Staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  return (
    <StaffShell
      accountLabel={staffDisplayName}
      exitCommitting={exitCommit.committing}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      brandIcon={<StaffBrandIcon />}
    >
      <div className="staff-workspace-page speech-sandbox-page">
        <StaffPageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          badge={badge}
        />
        {children}
      </div>
    </StaffShell>
  );
}
