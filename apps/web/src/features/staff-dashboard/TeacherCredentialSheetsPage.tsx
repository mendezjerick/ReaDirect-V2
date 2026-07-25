import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { teacherNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getTeacherLearners,
  issueTeacherCredentialSheet,
  loadStaffSession,
  type ResetLearnerCredentials,
} from "../staff-auth/staffApi";

export function TeacherCredentialSheetsPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const issueCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [credentials, setCredentials] = useState<
    ResetLearnerCredentials[] | null
  >(null);
  const teacherSession = session?.staff.role === "teacher" ? session : null;
  const teacher = teacherSession?.staff ?? null;
  const learnersQuery = useQuery({
    queryKey: ["teacher-learners", teacher?.id],
    queryFn: () => getTeacherLearners(teacher!.id),
    enabled: Boolean(teacher),
  });
  const activeLearners =
    learnersQuery.data?.filter((learner) => learner.is_active) ?? [];
  const issueMutation = useMutation({
    mutationFn: () =>
      issueTeacherCredentialSheet({
        staffUserId: teacher!.id,
        learnerIds: selectedIds,
      }),
    onSuccess: (issuedCredentials) => {
      setCredentials(issuedCredentials);
      setConfirming(false);
    },
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

  const toggleLearner = (learnerId: number) => {
    setCredentials(null);
    issueMutation.reset();
    setSelectedIds((current) =>
      current.includes(learnerId)
        ? current.filter((id) => id !== learnerId)
        : [...current, learnerId].slice(0, 50),
    );
  };

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
      <div className="staff-workspace-page teacher-credential-page">
        <StaffPageHeader
          eyebrow="Class management"
          title="Credential Sheets"
          description="Issue printable sign-in credentials for up to 50 active Learners assigned to your class."
          badge={
            <span className="staff-count-badge">
              {selectedIds.length} selected
            </span>
          }
        />

        {credentials ? (
          <Surface
            kind="panel"
            padding="normal"
            className="teacher-credential-sheet"
            role="status"
          >
            <header className="teacher-credential-sheet__header">
              <div>
                <p>New credentials</p>
                <h2>
                  Grade {teacher.grade_level} · {teacher.section}
                </h2>
                <span>
                  Existing sessions were signed out. These passwords are shown
                  only on this sheet.
                </span>
              </div>
              <div className="teacher-credential-sheet__actions">
                <BigButton
                  variant="secondary"
                  size="regular"
                  onClick={() => window.print()}
                >
                  Print sheet
                </BigButton>
                <BigButton
                  variant="quiet"
                  size="regular"
                  onClick={() => {
                    setCredentials(null);
                    setSelectedIds([]);
                  }}
                >
                  Credentials saved
                </BigButton>
              </div>
            </header>
            <div className="teacher-credential-sheet__grid">
              {credentials.map((credential) => (
                <article key={credential.id}>
                  <strong>{credential.full_name}</strong>
                  <dl>
                    <div>
                      <dt>Learner Code</dt>
                      <dd>{credential.learner_code}</dd>
                    </div>
                    <div>
                      <dt>Password</dt>
                      <dd>{credential.temporary_password}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </Surface>
        ) : (
          <Surface
            kind="panel"
            padding="none"
            className="staff-account-list-card"
          >
            <header className="staff-section-header staff-section-header--list">
              <div>
                <p>Assigned class</p>
                <h2>Select Learners</h2>
              </div>
              <span>Maximum 50</span>
            </header>
            {learnersQuery.isLoading ? (
              <div className="staff-account-list-state">Loading Learners…</div>
            ) : null}
            {learnersQuery.isError ? (
              <div className="staff-account-list-state" role="alert">
                Learners could not be loaded.
              </div>
            ) : null}
            {activeLearners.length ? (
              <div className="teacher-credential-select-list">
                <label className="teacher-credential-select-all">
                  <input
                    type="checkbox"
                    checked={
                      activeLearners.length > 0 &&
                      selectedIds.length === Math.min(activeLearners.length, 50)
                    }
                    onChange={(event) =>
                      setSelectedIds(
                        event.target.checked
                          ? activeLearners
                              .slice(0, 50)
                              .map((learner) => learner.id)
                          : [],
                      )
                    }
                  />
                  <span>Select all active Learners</span>
                </label>
                {activeLearners.map((learner) => (
                  <label key={learner.id}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(learner.id)}
                      disabled={
                        selectedIds.length >= 50 &&
                        !selectedIds.includes(learner.id)
                      }
                      onChange={() => toggleLearner(learner.id)}
                    />
                    <span>
                      <strong>{learner.full_name}</strong>
                      <small>{learner.learner_code}</small>
                    </span>
                  </label>
                ))}
              </div>
            ) : null}
            <div className="teacher-credential-submit">
              <p>
                Issuing a sheet replaces the selected passwords and signs those
                Learners out. Progress is not changed.
              </p>
              <BigButton
                size="regular"
                disabled={!selectedIds.length}
                onClick={() => setConfirming(true)}
              >
                Prepare credential sheet
              </BigButton>
            </div>
          </Surface>
        )}

        {confirming && !credentials ? (
          <Surface
            kind="notice"
            padding="normal"
            className="learner-password-reset-confirmation"
            role="group"
            aria-label="Confirm credential sheet"
          >
            <div>
              <p>Credential rotation</p>
              <h2>Replace passwords for {selectedIds.length} Learners?</h2>
              <span>
                Their current passwords will stop working and their active
                sessions will be signed out. Learning progress is preserved.
              </span>
              {issueMutation.isError ? (
                <strong
                  className="learner-password-reset-confirmation__error"
                  role="alert"
                >
                  {issueMutation.error.message}
                </strong>
              ) : null}
            </div>
            <div className="learner-password-reset-confirmation__actions">
              <BigButton
                variant="quiet"
                size="regular"
                disabled={issueMutation.isPending || issueCommit.committing}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </BigButton>
              <BigButton
                variant="secondary"
                size="regular"
                committing={issueCommit.committing}
                busy={issueMutation.isPending}
                busyLabel="Issuing credentials"
                onClick={() => issueCommit.commit(() => issueMutation.mutate())}
              >
                Confirm and issue
              </BigButton>
            </div>
          </Surface>
        ) : null}
      </div>
    </StaffShell>
  );
}
