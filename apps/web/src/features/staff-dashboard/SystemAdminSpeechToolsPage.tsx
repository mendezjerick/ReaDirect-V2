import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import { StaffWorkspacePage } from "../../components/staff/StaffContentPatterns";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { systemAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getSystemAdminOverview,
} from "../staff-auth/staffApi";

const speechTools = [
  {
    title: "AI services",
    eyebrow: "Readiness and processing",
    description:
      "Check ASR and TTS readiness and manage the confirmed conditional Mu option.",
    route: "/staff/system-admin/ai-services",
  },
  {
    title: "IsoLetter Sandbox",
    eyebrow: "Nu letter resolution",
    description:
      "Test isolated letter decisions with controlled recording evidence.",
    route: "/staff/system-admin/isoletter-sandbox",
  },
  {
    title: "True Sandbox",
    eyebrow: "Mu transcription",
    description:
      "Test published spoken targets against Mu's raw transcription evidence.",
    route: "/staff/system-admin/true-sandbox",
  },
  {
    title: "Equivalence Book",
    eyebrow: "Reviewed acceptance",
    description: "Inspect and manage approved transcript-equivalence rules.",
    route: "/staff/system-admin/equivalence-book",
  },
  {
    title: "Confusion Matrix",
    eyebrow: "Raw error evidence",
    description: "Compare expected tokens with untouched recognized output.",
    route: "/staff/system-admin/confusion-matrix",
  },
  {
    title: "Page portals",
    eyebrow: "Controlled learner QA",
    description:
      "Launch a reset, isolated portal learner into approved speech pages.",
    route: "/staff/system-admin/page-portals",
  },
] as const;

export function SystemAdminSpeechToolsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const overviewQuery = useQuery({
    queryKey: ["system-admin-overview"],
    queryFn: getSystemAdminOverview,
  });
  const overview = overviewQuery.data;
  const asr = overview?.system_health.find((item) => item.service === "ASR");
  const tts = overview?.system_health.find((item) => item.service === "TTS");

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
      navigationGroups={systemAdminNavigationGroups}
    >
      <StaffWorkspacePage className="operations-page">
        <StaffPageHeader
          eyebrow="Operations"
          title="Speech tools"
          description="Open the approved speech inspection, evidence, equivalence, and controlled learner-testing workspaces from one operational hub."
          badge={<StaffBadge tone="accent">6 approved tools</StaffBadge>}
        />

        <StaffNotice
          tone="neutral"
          title="Production evidence stays protected."
        >
          <span>
            Sandboxes and Page Portals use their existing isolated contracts.
            This hub does not submit audio, launch a portal, or change a rule by
            itself.
          </span>
        </StaffNotice>

        <section
          className="staff-metric-grid"
          aria-label="Speech tool readiness"
        >
          <MetricCard
            label="ASR"
            value={
              asr ? (asr.status === "online" ? "Ready" : asr.status) : null
            }
            detail={asr?.detail}
          />
          <MetricCard
            label="TTS"
            value={
              tts ? (tts.status === "online" ? "Ready" : tts.status) : null
            }
            detail={tts?.detail}
          />
          <MetricCard
            label="Mu default"
            value={overview ? "Raw first" : null}
            detail="Original audio is preserved"
          />
          <MetricCard
            label="Recent failures"
            value={overview?.recent_speech_failures.length ?? null}
            detail="Sandbox service failures"
          />
        </section>

        <section
          className="operations-tool-grid"
          aria-label="Speech tool catalog"
        >
          {speechTools.map((tool) => (
            <StaffCard className="operations-tool-card" key={tool.title}>
              <div>
                <p>{tool.eyebrow}</p>
                <h2>{tool.title}</h2>
                <span>{tool.description}</span>
              </div>
              <StaffButton
                size="compact"
                tone="secondary"
                onClick={() => navigate(tool.route)}
              >
                Open tool
              </StaffButton>
            </StaffCard>
          ))}
        </section>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
