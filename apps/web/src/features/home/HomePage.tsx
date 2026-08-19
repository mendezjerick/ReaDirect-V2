import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { ThemeSelector } from "../theme/ThemeSelector";
import { AboutReaDirectDialog } from "./AboutReaDirectDialog";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
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
  { kind: "learner" } | { kind: "staff"; session: StaffSession } | null;

function readLandingIdentity(): LandingIdentity {
  const staff = loadStaffSession();
  if (staff) {
    return { kind: "staff", session: staff };
  }

  return loadLearnerSession() ? { kind: "learner" } : null;
}

function BookIcon() {
  return (
    <svg
      className="home-page__read-icon"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 6.5c4.8-.7 8.8.4 12 3.2v16.1c-3.2-2.8-7.2-3.9-12-3.2V6.5Z" />
      <path d="M28 6.5c-4.8-.7-8.8.4-12 3.2v16.1c3.2-2.8 7.2-3.9 12-3.2V6.5Z" />
    </svg>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const learnerLoginCommit = useButtonCommit();
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
    identity?.kind === "learner"
      ? "/learner/dashboard"
      : identity?.kind === "staff"
        ? staffHomeRoute(identity.session)
        : "/learner/login";
  const primaryLabel =
    identity?.kind === "learner"
      ? "Let’s Keep Reading!"
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
          leadingIcon={<BookIcon />}
          committing={learnerLoginCommit.committing}
          onClick={openPrimaryAction}
        >
          {primaryLabel}
        </BigButton>

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
