import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import { StaffWorkspacePage } from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffSearchField } from "../../components/staff/StaffFormControls";
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
import { getSchoolAdminLearners } from "./schoolAdminApi";

function stageLabel(stage: string) {
  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SchoolAdminLearnersPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const reviewCommit = useButtonCommit();
  const [search, setSearch] = useState("");
  const [session] = useState(loadStaffSession);
  const administrator =
    session?.staff.role === "school_admin" ? session.staff : null;
  const learnersQuery = useQuery({
    queryKey: ["school-admin-learners", administrator?.id],
    queryFn: () => getSchoolAdminLearners(administrator!.id),
    enabled: Boolean(administrator?.school),
  });
  const learners = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return learnersQuery.data ?? [];

    return (learnersQuery.data ?? []).filter((learner) =>
      [
        learner.full_name,
        learner.learner_code,
        learner.section ?? "",
        learner.teacher?.username ?? "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [learnersQuery.data, search]);

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
        <StaffPageHeader
          eyebrow="School management"
          title="Learners"
          description="Review standard Learners assigned anywhere in your school."
          badge={
            <StaffBadge>{learnersQuery.data?.length ?? 0} Learners</StaffBadge>
          }
        />
        <StaffNotice tone="accent">
          <span>
            This directory is read-only. Portal-system Learners, including
            KW000, are always excluded.
          </span>
        </StaffNotice>
        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="School roster"
            title="Learner directory"
            actions={
              <StaffSearchField
                label="Search Learners"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, code, section, or Teacher"
              />
            }
          />
          {learnersQuery.isError ? (
            <StaffState
              compact
              tone="danger"
              role="alert"
              title="The school Learner directory could not be loaded."
            />
          ) : null}
          <StaffDataTable
            accessibleLabel="School Learner directory"
            rows={learners}
            rowKey={(learner) => learner.id}
            columns={[
              {
                key: "learner",
                label: "Learner",
                width: "minmax(12rem, 1.4fr)",
                render: (learner) => (
                  <span className="staff-primary-value">
                    <strong>{learner.full_name}</strong>
                    <small>{learner.learner_code}</small>
                  </span>
                ),
              },
              {
                key: "class",
                label: "Class",
                render: (learner) => (
                  <>
                    Grade {learner.grade_level ?? "—"} ·{" "}
                    {learner.section ?? "No section"}
                  </>
                ),
              },
              {
                key: "teacher",
                label: "Teacher",
                render: (learner) =>
                  learner.teacher?.username ?? "Teacher unavailable",
              },
              {
                key: "stage",
                label: "Progress",
                render: (learner) => stageLabel(learner.progress_stage),
              },
              {
                key: "action",
                label: "Action",
                width: "auto",
                render: (learner) => (
                  <StaffButton
                    size="compact"
                    committing={reviewCommit.committing}
                    onClick={() =>
                      reviewCommit.commit(() =>
                        navigate(`/staff/school-admin/learners/${learner.id}`),
                      )
                    }
                  >
                    Review
                  </StaffButton>
                ),
              },
            ]}
            empty={
              !learnersQuery.isLoading ? (
                <StaffState
                  title="No matching Learners"
                  description="Only standard Learners in this school can appear."
                />
              ) : null
            }
          />
        </StaffCard>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
