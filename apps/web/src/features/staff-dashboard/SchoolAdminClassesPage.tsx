import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import {
  StaffContentGrid,
  StaffSelectionButton,
  StaffSelectionList,
  StaffWorkspacePage,
} from "../../components/staff/StaffContentPatterns";
import { StaffSelectControl } from "../../components/staff/StaffFormControls";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { schoolAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { TextField } from "../../components/ui/TextField";
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
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="School management"
          title="Classes"
          description="Each class is the grade-and-section assignment owned by one Teacher account."
          badge={
            <StaffBadge>{classesQuery.data?.length ?? 0} classes</StaffBadge>
          }
        />

        <StaffNotice tone="accent">
          <span>
            Class assignment changes update the matching Learner account
            context. Assessment, lesson, score, progression, and achievement
            records are never changed.
          </span>
        </StaffNotice>

        <StaffContentGrid className="staff-content-grid--sidebar">
          <StaffCard padding="none">
            <StaffSectionHeader
              bordered
              eyebrow="Teacher assignments"
              title="School classes"
              actions={
                <StaffButton
                  size="compact"
                  tone="secondary"
                  committing={createCommit.committing}
                  onClick={() =>
                    createCommit.commit(() =>
                      navigate("/staff/school-admin/teachers"),
                    )
                  }
                >
                  Create class with Teacher
                </StaffButton>
              }
            />
            {classesQuery.data?.length === 0 ? (
              <StaffState
                compact
                title="No classes yet"
                description="Create a Teacher account with a grade and section."
              />
            ) : null}
            <StaffSelectionList>
              {classesQuery.data?.map((schoolClass) => (
                <StaffSelectionButton
                  key={schoolClass.id}
                  selected={selected?.id === schoolClass.id}
                  onClick={() => selectClass(schoolClass)}
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
                </StaffSelectionButton>
              ))}
            </StaffSelectionList>
          </StaffCard>

          <StaffCard>
            {selected ? (
              <form
                className="staff-form-stack staff-form-stack--flush"
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
                <StaffSectionHeader
                  eyebrow="Class assignment"
                  title={selected.username ?? selected.teacher_name}
                  description={
                    <>
                      Assigned Learners remain with this Teacher after the class
                      context is updated.
                    </>
                  }
                />
                <StaffSelectControl
                  label="Grade level"
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
                </StaffSelectControl>
                <TextField
                  label="Section"
                  required
                  maxLength={80}
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                />
                {updateMutation.isSuccess ? (
                  <StaffNotice tone="success" role="status">
                    <span>
                      Class assignment updated. Learner-flow records were not
                      changed.
                    </span>
                  </StaffNotice>
                ) : null}
                {updateMutation.isError ? (
                  <StaffNotice tone="danger">
                    <span>{updateMutation.error.message}</span>
                  </StaffNotice>
                ) : null}
                <StaffButton
                  type="submit"
                  size="roomy"
                  tone="primary"
                  disabled={!section.trim()}
                  busy={updateMutation.isPending}
                  busyLabel="Saving class"
                  committing={saveCommit.committing}
                >
                  Save class assignment
                </StaffButton>
              </form>
            ) : (
              <StaffState
                title="Select a class"
                description="Its assignment controls will appear here."
              />
            )}
          </StaffCard>
        </StaffContentGrid>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
