import { useNavigate } from "react-router-dom";

import { StaffButton } from "./StaffButton";
import { StaffNotice } from "./StaffNotice";

interface TemporaryCredentialsNoticeProps {
  active: boolean;
}

export function TemporaryCredentialsNotice({
  active,
}: TemporaryCredentialsNoticeProps) {
  const navigate = useNavigate();

  if (!active) return null;

  return (
    <StaffNotice
      tone="warning"
      title="Temporary credentials are active."
      actions={
        <StaffButton
          size="compact"
          tone="secondary"
          onClick={() => navigate("/staff/security")}
        >
          Review account security
        </StaffButton>
      }
    >
      <p>
        You may keep using your current password. Changing it is recommended,
        but it is optional and does not restrict your staff workspace.
      </p>
    </StaffNotice>
  );
}
