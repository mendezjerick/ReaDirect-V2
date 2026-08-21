import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { ThemeSelector } from "../theme/ThemeSelector";
import { AboutReaDirectDialog } from "./AboutReaDirectDialog";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  enterGuestMode,
  learnerSessionChangedEvent,
  loadLearnerSession,
} from "../learner-auth/learnerApi";
import {
  loadStaffSession,
  staffSessionChangedEvent,
  type StaffSession,
} from "../staff-auth/staffApi";
import { staffHomeRoute } from "../staff-auth/staffRoutes";

type LandingIdentity =
  | { kind: "learner" }
  | { kind: "guest" }
  | { kind: "staff"; session: StaffSession }
  | null;

function readLandingIdentity(): LandingIdentity {
  const staff = loadStaffSession();
  if (staff) {
    return { kind: "staff", session: staff };
  }

  const learner = loadLearnerSession();
  return learner
    ? {
        kind: learner.learner.account_purpose === "guest" ? "guest" : "learner",
      }
    : null;
}

export function HomePage() {
  const navigate = useNavigate();
  const learnerLoginCommit = useButtonCommit();
  const guestLoginCommit = useButtonCommit();
  const staffLoginCommit = useButtonCommit();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [identity, setIdentity] =
    useState<LandingIdentity>(readLandingIdentity);

  useEffect(() => {
    const synchronizeIdentity = () => setIdentity(readLandingIdentity());
    window.addEventListener(learnerSessionChangedEvent, synchronizeIdentity);
    window.addEventListener(staffSessionChangedEvent, synchronizeIdentity);
    return () => {
      window.removeEventListener(
        learnerSessionChangedEvent,
        synchronizeIdentity,
      );
      window.removeEventListener(staffSessionChangedEvent, synchronizeIdentity);
    };
  }, []);

  const destination =
    identity?.kind === "learner" || identity?.kind === "guest"
      ? "/learner/dashboard"
      : identity?.kind === "staff"
        ? staffHomeRoute(identity.session)
        : "/learner/login";
  const primaryLabel =
    identity?.kind === "learner" || identity?.kind === "guest"
      ? identity.kind === "guest"
        ? "Continue as Guest"
        : "Let’s Keep Reading!"
      : identity?.kind === "staff"
        ? identity.session.staff.role === "system_admin"
          ? "Admin Dashboard"
          : "Staff Dashboard"
        : "Let's Read!";
  const secondaryLabel = identity ? "Switch account" : "Staff login";

  const openPrimaryAction = () => {
    learnerLoginCommit.commit(() => navigate(destination));
  };

  const openStaffLogin = () => {
    staffLoginCommit.commit(() => navigate("/staff/login"));
  };

  const openGuestLogin = () => {
    guestLoginCommit.commit(() => {
      enterGuestMode();
      navigate("/learner/dashboard");
    });
  };

  return (
    <main
      className="home-page learner-flow-page"
      aria-label="ReaDirect home"
      data-route-focus
      tabIndex={-1}
    >
      <h1 className="visually-hidden">ReaDirect home</h1>
      <ThemeSelector />

      <section className="home-page__actions" aria-label="Home actions">
        <BigButton
          className="home-page__read-button"
          leadingIcon={
            <PixelIcon className="home-page__read-icon" name="book" />
          }
          committing={learnerLoginCommit.committing}
          onClick={openPrimaryAction}
        >
          {primaryLabel}
        </BigButton>

        {!identity ? (
          <BigButton
            className="home-page__guest-button"
            size="regular"
            committing={guestLoginCommit.committing}
            onClick={openGuestLogin}
          >
            Continue as Guest
          </BigButton>
        ) : null}

        <BigButton
          className="home-page__staff-button"
          variant="secondary"
          size="regular"
          committing={staffLoginCommit.committing}
          onClick={openStaffLogin}
        >
          {secondaryLabel}
        </BigButton>
      </section>

      <button
        type="button"
        className="home-page__about-trigger"
        aria-haspopup="dialog"
        aria-expanded={aboutOpen}
        onClick={() => setAboutOpen(true)}
      >
        About ReaDirect
      </button>

      {aboutOpen ? (
        <AboutReaDirectDialog onClose={() => setAboutOpen(false)} />
      ) : null}
    </main>
  );
}
