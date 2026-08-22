import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

import { BigButton } from "../../components/ui/BigButton";
import { StaffLoginPage } from "./StaffLoginPage";
import { createStaffPortalRuntime, openStaffPortal } from "./staffPortal";

const browserOpenError =
  "We couldn't open the staff portal. Check your connection and try again.";

export function NativeStaffLoginRedirect() {
  const navigate = useNavigate();
  const native = Capacitor.isNativePlatform();
  const [error, setError] = useState<string | null>(null);

  const openNativeStaffPortal = useCallback(async () => {
    setError(null);

    try {
      await openStaffPortal(createStaffPortalRuntime(navigate));

      if (native) {
        navigate("/home", { replace: true });
      }
    } catch {
      setError(browserOpenError);
    }
  }, [native, navigate]);

  useEffect(() => {
    if (native) {
      void openNativeStaffPortal();
    }
  }, [native, openNativeStaffPortal]);

  if (!native) {
    return <StaffLoginPage />;
  }

  if (error) {
    return (
      <main className="route-loading" aria-live="polite">
        <p role="alert">{error}</p>
        <BigButton onClick={() => void openNativeStaffPortal()}>
          Retry
        </BigButton>
      </main>
    );
  }

  return (
    <main className="route-loading" aria-live="polite" aria-busy="true">
      <img
        className="route-loading__icon"
        src="/assets/icons/rd.png"
        alt=""
        aria-hidden="true"
      />
      <span>Opening ReaDirect…</span>
    </main>
  );
}
