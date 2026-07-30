import { useNavigate } from "react-router-dom";

import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffCard } from "../../components/staff/StaffCard";
import { StaffWorkspacePage } from "../../components/staff/StaffContentPatterns";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { clearStaffSession } from "../staff-auth/staffApi";
import {
  plannedSystemAdminDemos,
  systemAdminDemos,
} from "./systemAdminDemoCatalog";

export function SystemAdminDemosPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();

  return (
    <StaffShell
      accountLabel="System Administrator"
      exitCommitting={exitCommit.committing}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      brandIcon={<StaffBrandIcon />}
    >
      <StaffWorkspacePage className="staff-demos-page">
        <StaffPageHeader
          eyebrow="Guided walkthroughs"
          title="Demos"
          description="Short, task-focused tours of ReaDirect. Every demonstration uses fictional data and cannot change live records."
          badge={<StaffBadge>{systemAdminDemos.length} available</StaffBadge>}
        />

        <div className="staff-demo-layout">
          <div className="staff-demo-library" aria-label="Available demos">
            {systemAdminDemos.map((demo, index) => (
              <StaffCard
                className="staff-demo-feature"
                padding="compact"
                aria-labelledby={`${demo.id}-title`}
                key={demo.id}
              >
                <div className="staff-demo-feature__copy">
                  <span className="staff-demo-feature__eyebrow">
                    {index === 0 ? "Start here" : `Walkthrough ${index + 1}`}
                  </span>
                  <h2 id={`${demo.id}-title`}>{demo.title}</h2>
                  <p>{demo.description}</p>
                  <StaffBadge tone="neutral">{demo.duration}</StaffBadge>
                </div>

                <div className="staff-demo-player">
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    width="360"
                    height="740"
                    poster={demo.posterSource}
                    aria-label={`${demo.title} demonstration`}
                  >
                    <source src={demo.videoSource} type="video/webm" />
                    Your browser does not support this demonstration video.
                  </video>
                </div>

                <details className="staff-demo-transcript">
                  <summary>Read the walkthrough</summary>
                  <ol>
                    {demo.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </details>
              </StaffCard>
            ))}
          </div>

          {plannedSystemAdminDemos.length > 0 ? (
            <StaffCard
              className="staff-demo-planned"
              padding="compact"
              tone="muted"
            >
              <div>
                <span className="staff-demo-feature__eyebrow">Coming next</span>
                <h2>Planned demonstrations</h2>
                <p>
                  These walkthroughs will use the same safe, repeatable
                  recording process.
                </p>
              </div>
              <ul>
                {plannedSystemAdminDemos.map((title) => (
                  <li key={title}>
                    <span>{title}</span>
                    <StaffBadge tone="neutral">Planned</StaffBadge>
                  </li>
                ))}
              </ul>
            </StaffCard>
          ) : null}
        </div>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
