import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import {
  StaffContentGrid,
  StaffFactGrid,
  StaffWorkspacePage,
} from "../../components/staff/StaffContentPatterns";
import { StaffCheckbox } from "../../components/staff/StaffFormControls";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
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
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="Class management"
          title="Credential Sheets"
          description="Issue printable sign-in credentials for up to 50 active Learners assigned to your class."
          badge={<StaffBadge>{selectedIds.length} selected</StaffBadge>}
        />

        {credentials ? (
          <StaffCard className="staff-print-region" role="status">
            <StaffSectionHeader
              eyebrow="New credentials"
              title={`Grade ${teacher.grade_level} · ${teacher.section}`}
              description="Existing sessions were signed out. These passwords are shown only on this sheet."
              actions={
                <>
                  <StaffButton
                    tone="secondary"
                    size="regular"
                    onClick={() => window.print()}
                  >
                    Print sheet
                  </StaffButton>
                  <StaffButton
                    tone="quiet"
                    size="regular"
                    onClick={() => {
                      setCredentials(null);
                      setSelectedIds([]);
                    }}
                  >
                    Credentials saved
                  </StaffButton>
                </>
              }
            />
            <StaffContentGrid className="staff-content-grid--two">
              {credentials.map((credential) => (
                <StaffCard depth="flat" tone="muted" key={credential.id}>
                  <StaffSectionHeader title={credential.full_name} />
                  <StaffFactGrid
                    facts={[
                      {
                        label: "Learner Code",
                        value: credential.learner_code,
                      },
                      {
                        label: "Password",
                        value: credential.temporary_password,
                      },
                    ]}
                  />
                </StaffCard>
              ))}
            </StaffContentGrid>
          </StaffCard>
        ) : (
          <StaffCard padding="none">
            <StaffSectionHeader
              bordered
              eyebrow="Assigned class"
              title="Select Learners"
              meta={<StaffBadge>Maximum 50</StaffBadge>}
            />
            {learnersQuery.isLoading ? (
              <StaffState title="Loading Learners…" />
            ) : null}
            {learnersQuery.isError ? (
              <StaffState
                tone="danger"
                role="alert"
                title="Learners could not be loaded."
              />
            ) : null}
            {activeLearners.length ? (
              <div className="staff-checkbox-list">
                <StaffCheckbox
                  label="Select all active Learners"
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
                {activeLearners.map((learner) => (
                  <StaffCheckbox
                    key={learner.id}
                    label={learner.full_name}
                    description={learner.learner_code}
                    checked={selectedIds.includes(learner.id)}
                    disabled={
                      selectedIds.length >= 50 &&
                      !selectedIds.includes(learner.id)
                    }
                    onChange={() => toggleLearner(learner.id)}
                  />
                ))}
              </div>
            ) : null}
            <StaffNotice
              title="Password rotation"
              actions={
                <StaffButton
                  tone="primary"
                  size="regular"
                  disabled={!selectedIds.length}
                  onClick={() => setConfirming(true)}
                >
                  Prepare credential sheet
                </StaffButton>
              }
            >
              <p>
                Issuing a sheet replaces the selected passwords and signs those
                Learners out. Progress is not changed.
              </p>
            </StaffNotice>
          </StaffCard>
        )}

        {confirming && !credentials ? (
          <StaffNotice
            tone="warning"
            title={`Replace passwords for ${selectedIds.length} Learners?`}
            role="group"
            aria-label="Confirm credential sheet"
            actions={
              <>
                <StaffButton
                  tone="quiet"
                  size="regular"
                  disabled={issueMutation.isPending || issueCommit.committing}
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </StaffButton>
                <StaffButton
                  tone="secondary"
                  size="regular"
                  committing={issueCommit.committing}
                  busy={issueMutation.isPending}
                  busyLabel="Issuing credentials"
                  onClick={() =>
                    issueCommit.commit(() => issueMutation.mutate())
                  }
                >
                  Confirm and issue
                </StaffButton>
              </>
            }
          >
            <span>
              Their current passwords will stop working and their active
              sessions will be signed out. Learning progress is preserved.
            </span>
            {issueMutation.isError ? (
              <strong role="alert">{issueMutation.error.message}</strong>
            ) : null}
          </StaffNotice>
        ) : null}
      </StaffWorkspacePage>
    </StaffShell>
  );
}
