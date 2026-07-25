import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
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
      <div className="staff-workspace-page school-admin-learners-page">
        <StaffPageHeader
          eyebrow="School management"
          title="Learners"
          description="Review standard Learners assigned anywhere in your school."
          badge={
            <span className="staff-count-badge">
              {learnersQuery.data?.length ?? 0} Learners
            </span>
          }
        />
        <Surface kind="notice" padding="compact">
          This directory is read-only. Portal-system Learners, including KW000,
          are always excluded.
        </Surface>
        <Surface kind="panel" padding="none">
          <header className="staff-section-header staff-section-header--list">
            <div>
              <p>School roster</p>
              <h2>Learner directory</h2>
            </div>
            <label className="school-admin-learner-search">
              <span>Search Learners</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, code, section, or Teacher"
              />
            </label>
          </header>
          {learnersQuery.isError ? (
            <p className="staff-account-list-state" role="alert">
              The school Learner directory could not be loaded.
            </p>
          ) : null}
          <div className="school-admin-learner-table" role="table">
            {learners.map((learner) => (
              <div role="row" key={learner.id}>
                <span role="cell">
                  <strong>{learner.full_name}</strong>
                  <small>{learner.learner_code}</small>
                </span>
                <span role="cell">
                  Grade {learner.grade_level ?? "—"} ·{" "}
                  {learner.section ?? "No section"}
                </span>
                <span role="cell">
                  {learner.teacher?.username ?? "Teacher unavailable"}
                </span>
                <span role="cell">{stageLabel(learner.progress_stage)}</span>
                <BigButton
                  variant="secondary"
                  size="regular"
                  committing={reviewCommit.committing}
                  onClick={() =>
                    reviewCommit.commit(() =>
                      navigate(`/staff/school-admin/learners/${learner.id}`),
                    )
                  }
                >
                  Review
                </BigButton>
              </div>
            ))}
          </div>
          {!learnersQuery.isLoading && learners.length === 0 ? (
            <div className="staff-empty-state">
              <span aria-hidden="true">0</span>
              <div>
                <strong>No matching Learners</strong>
                <p>Only standard Learners in this school can appear.</p>
              </div>
            </div>
          ) : null}
        </Surface>
      </div>
    </StaffShell>
  );
}
