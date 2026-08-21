import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { PixelIcon } from "../../components/ui/PixelIcon";
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
  getSystemAdminLearningRules,
} from "../staff-auth/staffApi";

export function SystemAdminLearningRulesPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const rulesQuery = useQuery({
    queryKey: ["system-admin-learning-content", "rules"],
    queryFn: getSystemAdminLearningRules,
  });

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
          title="Rules and thresholds"
          description="See the current placement bands, score weighting, and delivery guards used by the learner flow."
          badge={<StaffBadge tone="neutral">Runtime truth</StaffBadge>}
        />

        <StaffNotice tone="neutral" title="Review before changing source.">
          <span>
            {rulesQuery.data?.governance.message ??
              "Current runtime rules are loading."}
          </span>
        </StaffNotice>

        {rulesQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="Rules and thresholds could not be loaded."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void rulesQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API connection, then retry.</span>
          </StaffNotice>
        ) : null}

        {rulesQuery.isLoading ? (
          <StaffState title="Loading runtime rules…" />
        ) : null}

        {rulesQuery.data ? (
          <>
            <div className="staff-content-grid staff-content-grid--two learning-rules-grid">
              <StaffCard padding="none">
                <StaffSectionHeader
                  bordered
                  eyebrow="Part 1"
                  title="Refresher placement"
                  description={`Score bands out of ${rulesQuery.data.part_one.maximum_score}`}
                />
                <div className="score-band-list">
                  {rulesQuery.data.part_one.bands.map((band) => (
                    <div key={band.label}>
                      <span>
                        {band.minimum}–{band.maximum}
                      </span>
                      <strong>{band.label}</strong>
                    </div>
                  ))}
                </div>
              </StaffCard>

              <StaffCard padding="none">
                <StaffSectionHeader
                  bordered
                  eyebrow="Final reading profile"
                  title="Combined score"
                  description={`${rulesQuery.data.final_reading.comprehension_weight_percent}% comprehension + ${rulesQuery.data.final_reading.reading_accuracy_weight_percent}% reading accuracy`}
                />
                <div className="score-band-list">
                  {rulesQuery.data.final_reading.bands.map((band) => (
                    <div key={band.label}>
                      <span>
                        {band.minimum}–{band.maximum}
                      </span>
                      <strong>{band.label}</strong>
                    </div>
                  ))}
                </div>
              </StaffCard>
            </div>

            <StaffCard padding="none">
              <StaffSectionHeader
                bordered
                eyebrow="Safety contract"
                title="Delivery guards"
                description="These rules prevent content review from changing an activity already in progress."
                actions={
                  <StaffButton
                    size="compact"
                    tone="secondary"
                    onClick={() =>
                      navigate("/staff/system-admin/equivalence-book")
                    }
                  >
                    Open Equivalence Book
                  </StaffButton>
                }
              />
              <div className="learning-guard-grid">
                {rulesQuery.data.delivery_guards.map((guard) => (
                  <article key={guard.title}>
                    <span aria-hidden="true">
                      <PixelIcon name="check" />
                    </span>
                    <div>
                      <h3>{guard.title}</h3>
                      <p>{guard.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </StaffCard>
          </>
        ) : null}
      </StaffWorkspacePage>
    </StaffShell>
  );
}
