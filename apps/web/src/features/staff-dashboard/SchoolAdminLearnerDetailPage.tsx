import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import {
  StaffContentGrid,
  StaffWorkspacePage,
} from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { schoolAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { clearStaffSession, loadStaffSession } from "../staff-auth/staffApi";
import { getSchoolAdminLearnerDetail } from "./schoolAdminApi";

function assessmentLabel(
  assessment: {
    status: string;
    final_reading_score: number | null;
    final_reading_profile: string | null;
  } | null,
) {
  if (!assessment) return "Not started";
  if (assessment.status !== "completed") return "In progress";

  return assessment.final_reading_profile
    ? `${assessment.final_reading_score ?? "—"}/100 · ${assessment.final_reading_profile}`
    : "Completed";
}

export function SchoolAdminLearnerDetailPage() {
  const navigate = useNavigate();
  const { learnerId } = useParams();
  const exitCommit = useButtonCommit();
  const backCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const administrator =
    session?.staff.role === "school_admin" ? session.staff : null;
  const parsedLearnerId = Number(learnerId);
  const validLearnerId =
    Number.isInteger(parsedLearnerId) && parsedLearnerId > 0
      ? parsedLearnerId
      : null;
  const detailQuery = useQuery({
    queryKey: [
      "school-admin-learner-detail",
      administrator?.id,
      validLearnerId,
    ],
    queryFn: () =>
      getSchoolAdminLearnerDetail(administrator!.id, validLearnerId!),
    enabled: Boolean(administrator?.school && validLearnerId),
    retry: false,
  });

  if (!administrator || !administrator.school) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>School setup required</h1>
          <BigButton
            onClick={() => navigate("/staff/school-admin/setup-school")}
          >
            Complete school setup
          </BigButton>
        </Surface>
      </main>
    );
  }

  return (
    <StaffShell
      accountLabel={administrator.username ?? administrator.display_name}
      accountMeta={administrator.school.name}
      administrationLabel="School administration"
      avatarLabel="SC"
      brandIcon={<StaffBrandIcon />}
      exitCommitting={exitCommit.committing}
      navigationGroups={schoolAdminNavigationGroups}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      workspaceLabel="School Admin"
    >
      <StaffWorkspacePage>
        <StaffButton
          tone="secondary"
          size="regular"
          committing={backCommit.committing}
          onClick={() =>
            backCommit.commit(() => navigate("/staff/school-admin/learners"))
          }
        >
          Back to Learners
        </StaffButton>

        {detailQuery.isError || validLearnerId === null ? (
          <StaffState
            tone="danger"
            role="alert"
            title="Learner unavailable"
            description={
              detailQuery.error?.message ?? "The Learner identifier is invalid."
            }
          />
        ) : null}

        {detailQuery.data ? (
          <>
            <StaffPageHeader
              eyebrow="School Learner review"
              title={detailQuery.data.learner.full_name}
              description={`Grade ${detailQuery.data.class_context.grade_level ?? "—"} · ${
                detailQuery.data.class_context.section ?? "No section"
              } · ${detailQuery.data.class_context.teacher?.username ?? "Teacher unavailable"}`}
              badge={
                <StaffBadge>{detailQuery.data.learner.learner_code}</StaffBadge>
              }
            />
            <StaffNotice tone="accent">
              <span>
                Read-only persisted evidence. No control on this page can alter
                the Learner’s assessment, lesson, score, progression, or
                achievement records.
              </span>
            </StaffNotice>
            <StaffContentGrid className="staff-content-grid--three">
              <StaffCard>
                <StaffSectionHeader
                  eyebrow="Persisted progression"
                  title={detailQuery.data.progression.stage_label}
                  description={`${detailQuery.data.reading_path.completed_lesson_count} of 6 lessons complete · Diagnostic ${detailQuery.data.reading_path.diagnostic.status.replaceAll("_", " ")}`}
                />
              </StaffCard>
              <StaffCard>
                <StaffSectionHeader
                  eyebrow="Diagnostic Assessment"
                  title={assessmentLabel(
                    detailQuery.data.assessments.diagnostic,
                  )}
                />
              </StaffCard>
              <StaffCard>
                <StaffSectionHeader
                  eyebrow="Final Assessment"
                  title={assessmentLabel(detailQuery.data.assessments.final)}
                />
              </StaffCard>
            </StaffContentGrid>
            <StaffCard padding="none">
              <StaffSectionHeader
                bordered
                eyebrow="Lesson evidence"
                title="Required lesson status"
                description="Counts are taken directly from persisted lesson responses."
              />
              <StaffDataTable
                accessibleLabel="Required lesson status"
                rows={detailQuery.data.lessons}
                rowKey={(lesson) => lesson.lesson_key}
                columns={[
                  {
                    key: "lesson",
                    label: "Lesson",
                    width: "minmax(14rem, 1.5fr)",
                    render: (lesson) => (
                      <span className="staff-primary-value">
                        <strong>
                          Lesson {lesson.order} · {lesson.title}
                        </strong>
                        <small>{lesson.status.replaceAll("_", " ")}</small>
                      </span>
                    ),
                  },
                  {
                    key: "evidence",
                    label: "Persisted evidence",
                    render: (lesson) => (
                      <>
                        {lesson.items_recorded}/{lesson.items_total} items ·{" "}
                        {lesson.performance.review_recommended} review
                      </>
                    ),
                  },
                ]}
              />
            </StaffCard>
            <StaffCard padding="none">
              <StaffSectionHeader
                bordered
                eyebrow="Evidence-based follow-up"
                title="Saved review recommendations"
                description="No AI-generated or unsupported conclusions are added."
              />
              <StaffDataTable
                accessibleLabel="Saved review recommendations"
                rows={detailQuery.data.recommendations}
                rowKey={(recommendation) => recommendation.key}
                columns={[
                  {
                    key: "recommendation",
                    label: "Recommendation",
                    width: "minmax(12rem, 0.8fr)",
                    render: (recommendation) => (
                      <strong>{recommendation.title}</strong>
                    ),
                  },
                  {
                    key: "evidence",
                    label: "Persisted evidence",
                    render: (recommendation) => recommendation.reason,
                  },
                ]}
                empty={
                  <StaffState
                    compact
                    title="No persisted review flags or skipped items."
                  />
                }
              />
            </StaffCard>
          </>
        ) : null}
      </StaffWorkspacePage>
    </StaffShell>
  );
}
