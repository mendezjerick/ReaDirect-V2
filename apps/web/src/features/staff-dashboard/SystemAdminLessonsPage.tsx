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
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { systemAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getSystemAdminLessonCatalog,
} from "../staff-auth/staffApi";

export function SystemAdminLessonsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const catalogQuery = useQuery({
    queryKey: ["system-admin-learning-content", "lessons"],
    queryFn: getSystemAdminLessonCatalog,
  });
  const summary = catalogQuery.data?.summary;

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
      <StaffWorkspacePage className="learning-content-page">
        <StaffPageHeader
          eyebrow="Learning content"
          title="Lessons"
          description="Review every published lesson pool, its session demand, and the selection rule that protects learner variety."
          badge={
            <StaffBadge tone="accent">
              Published {summary?.version ?? "v1"}
            </StaffBadge>
          }
        />

        <StaffNotice tone="neutral" title="Learner snapshots stay isolated.">
          <span>
            {catalogQuery.data?.governance.message ??
              "Lesson pools are being checked without selecting content for a learner."}
          </span>
        </StaffNotice>

        {catalogQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="Lesson content could not be inspected."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void catalogQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API and content files, then retry.</span>
          </StaffNotice>
        ) : null}

        <section
          className="staff-metric-grid"
          aria-label="Lesson catalog summary"
        >
          <MetricCard
            label="Published version"
            value={summary?.version ?? null}
            detail={summary?.publication_state}
          />
          <MetricCard
            label="Active lesson targets"
            value={summary?.active_items ?? null}
          />
          <MetricCard
            label="Ready lessons"
            value={
              summary
                ? `${summary.ready_lessons}/${summary.total_lessons}`
                : null
            }
            detail="Pool eligibility checked"
          />
          <MetricCard
            label="Selection"
            value="Cycling"
            detail="Without replacement"
          />
        </section>

        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="Required sequence"
            title="Published lesson pools"
            description="Pool size is checked against what one short learning session needs."
            meta={
              <StaffBadge
                tone={
                  summary?.ready_lessons === summary?.total_lessons
                    ? "success"
                    : "warning"
                }
              >
                {summary?.ready_lessons === summary?.total_lessons
                  ? "All pools ready"
                  : "Review needed"}
              </StaffBadge>
            }
          />

          {catalogQuery.isLoading ? (
            <StaffState compact title="Checking lesson pools…" />
          ) : null}

          {catalogQuery.data ? (
            <div className="learning-content-grid learning-content-grid--lessons">
              {catalogQuery.data.lessons.map((lesson) => (
                <article className="learning-content-item" key={lesson.key}>
                  <header>
                    <span className="learning-content-item__key">
                      {lesson.key.replace("-", " ")}
                    </span>
                    <StaffBadge
                      tone={lesson.status === "ready" ? "success" : "warning"}
                    >
                      {lesson.status === "ready" ? "Ready" : "Attention"}
                    </StaffBadge>
                  </header>
                  <h3>{lesson.label}</h3>
                  <dl className="learning-content-item__facts">
                    <div>
                      <dt>Active pool</dt>
                      <dd>{lesson.active_items}</dd>
                    </div>
                    <div>
                      <dt>Per session</dt>
                      <dd>{lesson.session_items}</dd>
                    </div>
                    <div>
                      <dt>Missions</dt>
                      <dd>{lesson.missions}</dd>
                    </div>
                  </dl>
                  <p>{lesson.selection}</p>
                  <small>
                    Minimum {lesson.minimum_active_items} · {lesson.source_file}
                  </small>
                </article>
              ))}
            </div>
          ) : null}
        </StaffCard>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
