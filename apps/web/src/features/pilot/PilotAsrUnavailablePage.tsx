import type { PropsWithChildren } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import {
  PILOT_ASR_UNAVAILABLE_MESSAGE,
  PILOT_MODE,
} from "../../deployment/pilot";
import "./pilot.css";

export function PilotAsrRoute({ children }: PropsWithChildren) {
  return PILOT_MODE ? <PilotAsrUnavailablePage /> : children;
}

export function PilotPublishedSpeechRoute({ children }: PropsWithChildren) {
  return PILOT_MODE ? <PilotPublishedSpeechUnavailablePage /> : children;
}

export function PilotAsrUnavailablePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const staffRoute = location.pathname.startsWith("/staff/");

  return (
    <main
      className="pilot-unavailable"
      aria-labelledby="pilot-unavailable-title"
      data-route-focus
      tabIndex={-1}
    >
      <Surface className="pilot-unavailable__card" kind="frame" padding="roomy">
        <div className="pilot-unavailable__badge" aria-hidden="true">
          PILOT
        </div>
        <p className="pilot-unavailable__eyebrow">ReaDirect pilot test</p>
        <h1 id="pilot-unavailable-title">{PILOT_ASR_UNAVAILABLE_MESSAGE}</h1>
        <p>
          Activities that check recorded reading are temporarily turned off.
          Clara&apos;s published voice guidance and the rest of the available
          pilot experience can still be used.
        </p>
        <BigButton
          size="regular"
          onClick={() =>
            navigate(staffRoute ? "/staff/system-admin" : "/learner/dashboard")
          }
        >
          {staffRoute ? "Return to system dashboard" : "Return to my dashboard"}
        </BigButton>
      </Surface>
    </main>
  );
}

export function PilotPublishedSpeechUnavailablePage() {
  const navigate = useNavigate();

  return (
    <main
      className="pilot-unavailable"
      aria-labelledby="pilot-unavailable-title"
      data-route-focus
      tabIndex={-1}
    >
      <Surface className="pilot-unavailable__card" kind="frame" padding="roomy">
        <div className="pilot-unavailable__badge" aria-hidden="true">
          PILOT
        </div>
        <p className="pilot-unavailable__eyebrow">ReaDirect pilot test</p>
        <h1 id="pilot-unavailable-title">
          This Clara word activity is unavailable during pilot testing.
        </h1>
        <p>
          Its seven new voice lines are not part of the approved published
          catalog yet. The pilot will not generate them with Vox. Other Clara
          activities continue to use the approved prerecorded catalog.
        </p>
        <BigButton
          size="regular"
          onClick={() => navigate("/learner/learn-with-clara")}
        >
          Return to Clara&apos;s classes
        </BigButton>
      </Surface>
    </main>
  );
}
