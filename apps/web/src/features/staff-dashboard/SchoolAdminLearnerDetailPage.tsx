import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
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
      <div className="staff-workspace-page school-admin-learner-detail-page">
        <BigButton
          variant="secondary"
          size="regular"
          committing={backCommit.committing}
          onClick={() =>
            backCommit.commit(() => navigate("/staff/school-admin/learners"))
          }
        >
          Back to Learners
        </BigButton>

        {detailQuery.isError || validLearnerId === null ? (
          <Surface kind="notice" padding="normal" role="alert">
            <h1>Learner unavailable</h1>
            <p>
              {detailQuery.error?.message ??
                "The Learner identifier is invalid."}
            </p>
          </Surface>
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
                <span className="staff-count-badge">
                  {detailQuery.data.learner.learner_code}
                </span>
              }
            />
            <Surface kind="notice" padding="compact">
              Read-only persisted evidence. No control on this page can alter
              the Learner’s assessment, lesson, score, progression, or
              achievement records.
            </Surface>
            <section className="school-admin-learner-summary-grid">
              <Surface kind="panel" padding="normal">
                <p className="teacher-learner-card-eyebrow">
                  Persisted progression
                </p>
                <h2>{detailQuery.data.progression.stage_label}</h2>
                <p>
                  Current required lesson:{" "}
                  {detailQuery.data.progression.current_required_lesson_order ??
                    "Not applicable"}
                </p>
              </Surface>
              <Surface kind="panel" padding="normal">
                <p className="teacher-learner-card-eyebrow">
                  Diagnostic Assessment
                </p>
                <h2>
                  {assessmentLabel(detailQuery.data.assessments.diagnostic)}
                </h2>
              </Surface>
              <Surface kind="panel" padding="normal">
                <p className="teacher-learner-card-eyebrow">Final Assessment</p>
                <h2>{assessmentLabel(detailQuery.data.assessments.final)}</h2>
              </Surface>
            </section>
            <Surface kind="panel" padding="normal">
              <header className="staff-section-header">
                <p>Lesson evidence</p>
                <h2>Required lesson status</h2>
                <span>
                  Counts are taken directly from persisted lesson responses.
                </span>
              </header>
              <div className="school-admin-lesson-summary-list">
                {detailQuery.data.lessons.map((lesson) => (
                  <article key={lesson.lesson_key}>
                    <span>
                      <strong>
                        Lesson {lesson.order} · {lesson.title}
                      </strong>
                      <small>{lesson.status.replaceAll("_", " ")}</small>
                    </span>
                    <span>
                      {lesson.items_recorded}/{lesson.items_total} items ·{" "}
                      {lesson.performance.review_recommended} review
                    </span>
                  </article>
                ))}
              </div>
            </Surface>
            <Surface kind="panel" padding="normal">
              <header className="staff-section-header">
                <p>Evidence-based follow-up</p>
                <h2>Saved review recommendations</h2>
                <span>
                  No AI-generated or unsupported conclusions are added.
                </span>
              </header>
              <ul className="school-admin-review-summary">
                {detailQuery.data.recommendations.map((recommendation) => (
                  <li key={recommendation.key}>
                    <strong>{recommendation.title}</strong>
                    <span>{recommendation.reason}</span>
                  </li>
                ))}
              </ul>
              {detailQuery.data.recommendations.length === 0 ? (
                <p>No persisted review flags or skipped items.</p>
              ) : null}
            </Surface>
          </>
        ) : null}
      </div>
    </StaffShell>
  );
}
