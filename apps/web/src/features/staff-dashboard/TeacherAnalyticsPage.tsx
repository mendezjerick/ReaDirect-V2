import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { teacherNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { clearStaffSession, loadStaffSession } from "../staff-auth/staffApi";
import { getTeacherAnalytics } from "./teacherAnalyticsApi";

function EvidenceMetric({
  label,
  value,
  denominator,
}: {
  label: string;
  value: number;
  denominator?: number;
}) {
  return (
    <article className="teacher-analytics-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        {denominator === undefined
          ? "Persisted events"
          : `of ${denominator} recorded items`}
      </small>
    </article>
  );
}

export function TeacherAnalyticsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const teacherSession = session?.staff.role === "teacher" ? session : null;
  const teacher = teacherSession?.staff ?? null;
  const analyticsQuery = useQuery({
    queryKey: ["teacher-analytics", teacher?.id],
    queryFn: () => getTeacherAnalytics(teacher!.id),
    enabled: Boolean(teacher),
  });

  if (!teacherSession || !teacher) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>Teacher sign-in required</h1>
          <BigButton onClick={() => navigate("/staff/login")}>
            Go to staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  const analytics = analyticsQuery.data;

  return (
    <StaffShell
      accountLabel={teacher.username ?? teacher.display_name}
      accountMeta={`${teacher.school?.name ?? "School"} · Grade ${teacher.grade_level ?? "—"} ${teacher.section ?? ""}`}
      administrationLabel="Teacher workspace"
      avatarLabel="TR"
      brandIcon={<StaffBrandIcon />}
      exitCommitting={exitCommit.committing}
      navigationGroups={teacherNavigationGroups}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      workspaceLabel="Teacher"
    >
      <div className="staff-workspace-page teacher-analytics-page">
        <StaffPageHeader
          eyebrow="Assessment review"
          title="Class Analytics"
          description="Deterministic cohort counts from saved learner evidence. Values are separated by outcome and never used to rank Learners."
          badge={
            <span className="staff-count-badge">
              {analytics?.cohort_size ?? 0} Learners
            </span>
          }
        />

        {analyticsQuery.isLoading ? (
          <Surface
            kind="panel"
            padding="roomy"
            className="teacher-report-state"
          >
            Loading analytics…
          </Surface>
        ) : null}
        {analyticsQuery.isError ? (
          <Surface
            kind="notice"
            padding="normal"
            className="teacher-report-state"
            role="alert"
          >
            <strong>Analytics could not be loaded.</strong>
            <BigButton
              variant="secondary"
              size="regular"
              onClick={() => void analyticsQuery.refetch()}
            >
              Retry
            </BigButton>
          </Surface>
        ) : null}

        {analytics ? (
          <>
            <section
              className="teacher-analytics-metrics"
              aria-label="Lesson evidence totals"
            >
              <EvidenceMetric
                label="Independent success"
                value={analytics.lesson_evidence.independent_success}
                denominator={analytics.lesson_evidence.recorded_items}
              />
              <EvidenceMetric
                label="Supported success"
                value={analytics.lesson_evidence.supported_success}
                denominator={analytics.lesson_evidence.recorded_items}
              />
              <EvidenceMetric
                label="Demonstrated"
                value={analytics.lesson_evidence.demonstrated_items}
                denominator={analytics.lesson_evidence.recorded_items}
              />
              <EvidenceMetric
                label="Not yet correct"
                value={analytics.lesson_evidence.not_yet_correct}
                denominator={analytics.lesson_evidence.recorded_items}
              />
              <EvidenceMetric
                label="Unscorable audio"
                value={analytics.lesson_evidence.unscorable_recordings}
                denominator={analytics.lesson_evidence.recorded_items}
              />
              <EvidenceMetric
                label="Review recommended"
                value={analytics.lesson_evidence.review_recommended}
                denominator={analytics.lesson_evidence.recorded_items}
              />
              <EvidenceMetric
                label="Technical retries"
                value={analytics.lesson_evidence.technical_retries}
              />
              <EvidenceMetric
                label="Assessment skips"
                value={
                  analytics.assessment_skips.diagnostic +
                  analytics.assessment_skips.final
                }
              />
            </section>

            <div className="teacher-analytics-layout">
              <Surface kind="panel" padding="none">
                <header className="staff-section-header staff-section-header--list">
                  <div>
                    <p>Required lessons</p>
                    <h2>Completion and support evidence</h2>
                  </div>
                  <span>Denominators shown</span>
                </header>
                <div className="teacher-analytics-lessons">
                  {analytics.lesson_breakdown.map((lesson) => (
                    <article key={lesson.lesson_key}>
                      <header>
                        <strong>{lesson.title}</strong>
                        <span>
                          {lesson.learners_completed} of {lesson.cohort_size}{" "}
                          completed
                        </span>
                      </header>
                      <meter
                        min={0}
                        max={Math.max(lesson.cohort_size, 1)}
                        value={lesson.learners_completed}
                      >
                        {lesson.learners_completed} of {lesson.cohort_size}
                      </meter>
                      <dl>
                        <div>
                          <dt>Started</dt>
                          <dd>{lesson.learners_started}</dd>
                        </div>
                        <div>
                          <dt>Recorded items</dt>
                          <dd>{lesson.recorded_items}</dd>
                        </div>
                        <div>
                          <dt>Independent</dt>
                          <dd>{lesson.independent_success}</dd>
                        </div>
                        <div>
                          <dt>Supported</dt>
                          <dd>{lesson.supported_success}</dd>
                        </div>
                        <div>
                          <dt>Review flags</dt>
                          <dd>{lesson.review_recommended}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              </Surface>

              <Surface kind="panel" padding="normal">
                <header className="staff-section-header">
                  <p>Saved diagnoses</p>
                  <h2>Recurring evidence</h2>
                  <span>
                    Counts reflect persisted deterministic diagnosis keys, not
                    conclusions about a Learner.
                  </span>
                </header>
                {analytics.diagnoses.length ? (
                  <ol className="teacher-analytics-diagnoses">
                    {analytics.diagnoses.map((diagnosis) => (
                      <li key={diagnosis.diagnosis_key}>
                        <span>{diagnosis.label}</span>
                        <strong>{diagnosis.items}</strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="staff-empty-state">
                    <span aria-hidden="true">0</span>
                    <div>
                      <strong>No saved diagnosis evidence</strong>
                      <p>No deterministic diagnosis keys are persisted yet.</p>
                    </div>
                  </div>
                )}
              </Surface>
            </div>
          </>
        ) : null}
      </div>
    </StaffShell>
  );
}
