import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffDistributionList } from "../../components/staff/StaffDistributionList";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { teacherNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  acknowledgeTeacherAssignment,
  clearStaffSession,
  getTeacherOverview,
  loadStaffSession,
  saveStaffSession,
  type TeacherOverview,
} from "../staff-auth/staffApi";

function LearnersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 8h5M19.5 5.5v5" />
    </svg>
  );
}

function CompleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 7 9 18l-5-5" />
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ReadyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 14 6-6 4 4 6-6" />
      <path d="M15 6h5v5" />
      <path d="M4 20h16" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 21V4" />
      <path d="M5 5h11l-2 4 2 4H5" />
    </svg>
  );
}

function formatActivityDate(value: string | null) {
  if (!value) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TeacherDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exitCommit = useButtonCommit();
  const acknowledgementCommit = useButtonCommit();
  const learnerCommit = useButtonCommit();
  const importCommit = useButtonCommit();
  const credentialCommit = useButtonCommit();
  const reportsCommit = useButtonCommit();
  const analyticsCommit = useButtonCommit();
  const audioReviewCommit = useButtonCommit();
  const activityCommit = useButtonCommit();
  const [session, setSession] = useState(loadStaffSession);
  const [assignmentAcknowledged, setAssignmentAcknowledged] = useState(false);
  const teacherSession = session?.staff.role === "teacher" ? session : null;
  const assignedSchool = teacherSession?.staff.school ?? null;
  const assignedGrade = teacherSession?.staff.grade_level ?? null;
  const assignedSection = teacherSession?.staff.section ?? null;
  const hasCompleteAssignment =
    teacherSession !== null &&
    assignedSchool !== null &&
    assignedGrade !== null &&
    assignedSection !== null;
  const overviewQuery = useQuery({
    queryKey: ["teacher-overview", teacherSession?.staff.id],
    queryFn: () => getTeacherOverview(teacherSession!.staff.id),
    enabled: hasCompleteAssignment,
  });
  const acknowledgementMutation = useMutation({
    mutationFn: () => acknowledgeTeacherAssignment(teacherSession!.staff.id),
    onSuccess: () => {
      setAssignmentAcknowledged(true);
      queryClient.setQueryData<TeacherOverview>(
        ["teacher-overview", teacherSession?.staff.id],
        (current) =>
          current
            ? { ...current, requires_assignment_acknowledgement: false }
            : current,
      );

      if (teacherSession) {
        const updatedSession = {
          ...teacherSession,
          staff: {
            ...teacherSession.staff,
            requires_assignment_acknowledgement: false,
          },
        };
        saveStaffSession(updatedSession);
        setSession(updatedSession);
      }
    },
  });

  if (!teacherSession) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>Teacher sign-in required</h1>
          <p>Return to staff login to open the Teacher Dashboard.</p>
          <BigButton onClick={() => navigate("/staff/login")}>
            Go to staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  if (!hasCompleteAssignment || !assignedSchool) {
    return (
      <main className="staff-session-required-page">
        <Surface
          kind="panel"
          padding="roomy"
          className="staff-session-required"
        >
          <h1>Class assignment required</h1>
          <p>
            Ask your School Administrator to assign your school, grade level,
            and section.
          </p>
          <BigButton
            variant="secondary"
            onClick={() => {
              clearStaffSession();
              navigate("/staff/login");
            }}
          >
            Return to staff login
          </BigButton>
        </Surface>
      </main>
    );
  }

  const overview = overviewQuery.data;
  const gradeLevel = overview?.assignment.grade_level ?? assignedGrade;
  const section = overview?.assignment.section ?? assignedSection;
  const requiresAcknowledgement =
    !assignmentAcknowledged &&
    (overview?.requires_assignment_acknowledgement ??
      teacherSession.staff.requires_assignment_acknowledgement ??
      false);
  const accountLabel =
    teacherSession.staff.username ?? teacherSession.staff.display_name;

  return (
    <StaffShell
      accountLabel={accountLabel}
      accountMeta={`${assignedSchool.name} · Grade ${gradeLevel} ${section}`}
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
      <div className="staff-workspace-page teacher-dashboard">
        <StaffPageHeader
          eyebrow={overview?.school.name ?? assignedSchool.name}
          title={`Grade ${gradeLevel} · Section ${section}`}
          description="Review your class, follow assessment progress, and prepare learner activities."
          badge={<span className="staff-count-badge">Teacher</span>}
        />

        {requiresAcknowledgement ? (
          <Surface
            kind="notice"
            padding="normal"
            className="teacher-assignment-notice"
            role="status"
            aria-labelledby="teacher-assignment-title"
          >
            <div className="teacher-assignment-notice__mark" aria-hidden="true">
              ✓
            </div>
            <div className="teacher-assignment-notice__content">
              <p>Your class assignment</p>
              <h2 id="teacher-assignment-title">
                You are part of Grade {gradeLevel} Section {section}
              </h2>
              <span>{assignedSchool.name}</span>
            </div>
            <BigButton
              size="regular"
              committing={acknowledgementCommit.committing}
              busy={acknowledgementMutation.isPending}
              busyLabel="Saving"
              onClick={() =>
                acknowledgementCommit.commit(() =>
                  acknowledgementMutation.mutate(),
                )
              }
            >
              Got it
            </BigButton>
            {acknowledgementMutation.isError ? (
              <p className="teacher-assignment-notice__error" role="alert">
                {acknowledgementMutation.error.message}
              </p>
            ) : null}
          </Surface>
        ) : null}

        {overviewQuery.isError ? (
          <Surface
            kind="notice"
            padding="normal"
            className="staff-dashboard-error"
            role="alert"
          >
            <div>
              <strong>The Teacher Dashboard could not be loaded.</strong>
              <p>Check the API connection, then retry this request.</p>
            </div>
            <BigButton
              variant="secondary"
              size="regular"
              onClick={() => void overviewQuery.refetch()}
            >
              Retry
            </BigButton>
          </Surface>
        ) : null}

        <section
          className="staff-metric-grid staff-metric-grid--teacher"
          aria-label="Class totals"
          aria-busy={overviewQuery.isLoading}
        >
          <MetricCard
            label="Total learners"
            value={overview?.metrics.total_learners ?? null}
            icon={<LearnersIcon />}
          />
          <MetricCard
            label="Diagnostic complete"
            value={overview?.metrics.diagnostic_complete ?? null}
            icon={<CompleteIcon />}
          />
          <MetricCard
            label="Diagnostic pending"
            value={overview?.metrics.diagnostic_pending ?? null}
            icon={<PendingIcon />}
          />
          <MetricCard
            label="Ready for Final Assessment"
            value={overview?.metrics.ready_for_final ?? null}
            icon={<ReadyIcon />}
          />
          <MetricCard
            label="Final Assessment complete"
            value={overview?.metrics.final_complete ?? null}
            icon={<FlagIcon />}
          />
        </section>

        <section className="staff-dashboard-grid staff-dashboard-grid--primary teacher-dashboard__distributions">
          <Surface kind="panel" padding="normal" className="staff-data-card">
            <header className="staff-data-card__header">
              <div>
                <p>ReaDirect Assessment</p>
                <h2>Part 1 Score levels</h2>
              </div>
              <span>Your class</span>
            </header>
            {overview ? (
              <StaffDistributionList items={overview.part_one_distribution} />
            ) : (
              <div className="staff-loading-block" />
            )}
          </Surface>

          <Surface kind="panel" padding="normal" className="staff-data-card">
            <header className="staff-data-card__header">
              <div>
                <p>Diagnostic Assessment</p>
                <h2>Reading profiles</h2>
              </div>
              <span>Your class</span>
            </header>
            {overview ? (
              <StaffDistributionList
                items={overview.diagnostic_reading_profile_distribution}
              />
            ) : (
              <div className="staff-loading-block" />
            )}
          </Surface>

          <Surface kind="panel" padding="normal" className="staff-data-card">
            <header className="staff-data-card__header">
              <div>
                <p>Final Assessment</p>
                <h2>Reading profiles</h2>
              </div>
              <span>Your class</span>
            </header>
            {overview ? (
              <StaffDistributionList
                items={overview.final_reading_profile_distribution}
              />
            ) : (
              <div className="staff-loading-block" />
            )}
          </Surface>
        </section>

        <section className="staff-dashboard-grid staff-dashboard-grid--secondary">
          <Surface kind="panel" padding="normal" className="staff-data-card">
            <header className="staff-data-card__header">
              <div>
                <p>Learner activity</p>
                <h2>Recent progress</h2>
              </div>
            </header>
            {overview?.recent_learner_activity.length ? (
              <ol className="teacher-recent-activity">
                {overview.recent_learner_activity.map((activity) => (
                  <li key={activity.id}>
                    <div className="teacher-recent-activity__summary">
                      <div>
                        <strong>{activity.learner_name}</strong>
                        <span>{activity.learner_code}</span>
                      </div>
                      <span
                        className={[
                          "teacher-recent-activity__status",
                          activity.status === "completed"
                            ? "teacher-recent-activity__status--success"
                            : "teacher-recent-activity__status--neutral",
                        ].join(" ")}
                      >
                        {activity.status === "completed"
                          ? "Completed"
                          : "In progress"}
                      </span>
                    </div>
                    <div className="teacher-recent-activity__details">
                      <div>
                        <span>{activity.title}</span>
                        <time dateTime={activity.occurred_at ?? undefined}>
                          {formatActivityDate(activity.occurred_at)}
                        </time>
                      </div>
                      <BigButton
                        className="teacher-recent-activity__review"
                        variant="secondary"
                        size="regular"
                        committing={activityCommit.committing}
                        onClick={() =>
                          activityCommit.commit(() =>
                            navigate(
                              `/staff/teacher/learners/${activity.learner_id}`,
                            ),
                          )
                        }
                      >
                        Review
                      </BigButton>
                    </div>
                  </li>
                ))}
              </ol>
            ) : overview ? (
              <div className="staff-empty-state">
                <span aria-hidden="true">0</span>
                <div>
                  <strong>No learner activity yet</strong>
                  <p>Assessment and lesson activity will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="staff-loading-block" />
            )}
          </Surface>
        </section>

        <Surface
          kind="panel"
          padding="normal"
          className="staff-data-card staff-quick-links"
        >
          <header className="staff-data-card__header">
            <div>
              <p>Class management</p>
              <h2>Quick actions</h2>
            </div>
            <span>Teacher tools</span>
          </header>
          <div className="staff-quick-links__grid">
            <BigButton
              variant="secondary"
              size="regular"
              committing={learnerCommit.committing}
              onClick={() =>
                learnerCommit.commit(() => navigate("/staff/teacher/learners"))
              }
            >
              Create Learner
            </BigButton>
            <BigButton
              variant="secondary"
              size="regular"
              committing={importCommit.committing}
              onClick={() =>
                importCommit.commit(() =>
                  navigate("/staff/teacher/learners/import"),
                )
              }
            >
              Import Learners
            </BigButton>
            <BigButton
              variant="secondary"
              size="regular"
              committing={credentialCommit.committing}
              onClick={() =>
                credentialCommit.commit(() =>
                  navigate("/staff/teacher/learners/credentials"),
                )
              }
            >
              Credential Sheets
            </BigButton>
            <BigButton
              variant="secondary"
              size="regular"
              committing={reportsCommit.committing}
              onClick={() =>
                reportsCommit.commit(() => navigate("/staff/teacher/reports"))
              }
            >
              Reports
            </BigButton>
            <BigButton
              variant="secondary"
              size="regular"
              committing={analyticsCommit.committing}
              onClick={() =>
                analyticsCommit.commit(() =>
                  navigate("/staff/teacher/analytics"),
                )
              }
            >
              Analytics
            </BigButton>
            <BigButton
              variant="secondary"
              size="regular"
              committing={audioReviewCommit.committing}
              onClick={() =>
                audioReviewCommit.commit(() =>
                  navigate("/staff/teacher/audio-review"),
                )
              }
            >
              Audio Review
            </BigButton>
          </div>
        </Surface>
      </div>
    </StaffShell>
  );
}
