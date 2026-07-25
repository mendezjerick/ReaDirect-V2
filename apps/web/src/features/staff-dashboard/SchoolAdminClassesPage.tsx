import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { schoolAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { clearStaffSession, loadStaffSession } from "../staff-auth/staffApi";
import {
  getSchoolAdminClasses,
  updateSchoolAdminClass,
  type SchoolAdminClass,
} from "./schoolAdminApi";

export function SchoolAdminClassesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exitCommit = useButtonCommit();
  const createCommit = useButtonCommit();
  const saveCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const [selected, setSelected] = useState<SchoolAdminClass | null>(null);
  const [gradeLevel, setGradeLevel] = useState(1);
  const [section, setSection] = useState("");
  const administrator =
    session?.staff.role === "school_admin" ? session.staff : null;
  const classesQuery = useQuery({
    queryKey: ["school-admin-classes", administrator?.id],
    queryFn: () => getSchoolAdminClasses(administrator!.id),
    enabled: Boolean(administrator?.school),
  });
  const updateMutation = useMutation({
    mutationFn: (assignment: {
      teacherId: number;
      gradeLevel: number;
      section: string;
    }) =>
      updateSchoolAdminClass({
        staffUserId: administrator!.id,
        ...assignment,
      }),
    onSuccess: (updatedClass) => {
      queryClient.setQueryData<SchoolAdminClass[]>(
        ["school-admin-classes", administrator?.id],
        (classes) =>
          classes?.map((item) =>
            item.id === updatedClass.id ? updatedClass : item,
          ),
      );
      setSelected(updatedClass);
    },
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

  const selectClass = (schoolClass: SchoolAdminClass) => {
    setSelected(schoolClass);
    setGradeLevel(schoolClass.grade_level);
    setSection(schoolClass.section);
    updateMutation.reset();
  };

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
      <div className="staff-workspace-page school-admin-classes-page">
        <StaffPageHeader
          eyebrow="School management"
          title="Classes"
          description="Each class is the grade-and-section assignment owned by one Teacher account."
          badge={
            <span className="staff-count-badge">
              {classesQuery.data?.length ?? 0} classes
            </span>
          }
        />

        <Surface kind="notice" padding="compact">
          Class assignment changes update the matching Learner account context.
          Assessment, lesson, score, progression, and achievement records are
          never changed.
        </Surface>

        <div className="school-admin-class-layout">
          <Surface kind="panel" padding="none">
            <header className="staff-section-header staff-section-header--list">
              <div>
                <p>Teacher assignments</p>
                <h2>School classes</h2>
              </div>
              <BigButton
                size="regular"
                variant="secondary"
                committing={createCommit.committing}
                onClick={() =>
                  createCommit.commit(() =>
                    navigate("/staff/school-admin/teachers"),
                  )
                }
              >
                Create class with Teacher
              </BigButton>
            </header>
            {classesQuery.data?.length === 0 ? (
              <div className="staff-empty-state">
                <span aria-hidden="true">0</span>
                <div>
                  <strong>No classes yet</strong>
                  <p>Create a Teacher account with a grade and section.</p>
                </div>
              </div>
            ) : null}
            <div className="school-admin-class-list">
              {classesQuery.data?.map((schoolClass) => (
                <button
                  type="button"
                  key={schoolClass.id}
                  className={
                    selected?.id === schoolClass.id ? "is-selected" : undefined
                  }
                  onClick={() => selectClass(schoolClass)}
                  aria-pressed={selected?.id === schoolClass.id}
                >
                  <span>
                    <strong>
                      Grade {schoolClass.grade_level} · {schoolClass.section}
                    </strong>
                    <small>
                      {schoolClass.username ?? schoolClass.teacher_name}
                    </small>
                  </span>
                  <span>
                    {schoolClass.active_learner_count} active ·{" "}
                    {schoolClass.learner_count} total
                  </span>
                </button>
              ))}
            </div>
          </Surface>

          <Surface kind="panel" padding="normal">
            {selected ? (
              <form
                className="school-admin-class-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const assignment = {
                    teacherId: selected.id,
                    gradeLevel,
                    section,
                  };
                  saveCommit.commit(() => updateMutation.mutate(assignment));
                }}
              >
                <header className="staff-section-header">
                  <p>Class assignment</p>
                  <h2>{selected.username ?? selected.teacher_name}</h2>
                  <span>
                    Assigned Learners remain with this Teacher after the class
                    context is updated.
                  </span>
                </header>
                <label>
                  <span>Grade level</span>
                  <select
                    value={gradeLevel}
                    onChange={(event) =>
                      setGradeLevel(Number(event.target.value))
                    }
                  >
                    {[1, 2, 3, 4, 5, 6].map((grade) => (
                      <option value={grade} key={grade}>
                        Grade {grade}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Section</span>
                  <input
                    required
                    maxLength={80}
                    value={section}
                    onChange={(event) => setSection(event.target.value)}
                  />
                </label>
                {updateMutation.isSuccess ? (
                  <p className="staff-form-notice" role="status">
                    Class assignment updated. Learner-flow records were not
                    changed.
                  </p>
                ) : null}
                {updateMutation.isError ? (
                  <p className="staff-form-notice--error" role="alert">
                    {updateMutation.error.message}
                  </p>
                ) : null}
                <BigButton
                  type="submit"
                  size="regular"
                  disabled={!section.trim()}
                  busy={updateMutation.isPending}
                  busyLabel="Saving class"
                  committing={saveCommit.committing}
                >
                  Save class assignment
                </BigButton>
              </form>
            ) : (
              <div className="staff-empty-state">
                <span aria-hidden="true">CL</span>
                <div>
                  <strong>Select a class</strong>
                  <p>Its assignment controls will appear here.</p>
                </div>
              </div>
            )}
          </Surface>
        </div>
      </div>
    </StaffShell>
  );
}
