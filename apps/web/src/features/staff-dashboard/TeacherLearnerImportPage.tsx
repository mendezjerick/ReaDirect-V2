import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import {
  StaffContentGrid,
  StaffWorkspacePage,
} from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffFileField } from "../../components/staff/StaffFormControls";
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
  importTeacherLearners,
  loadStaffSession,
  type LearnerImportRow,
  type ResetLearnerCredentials,
} from "../staff-auth/staffApi";
import { parseLearnerImportCsv } from "./learnerImportCsv";

const TEMPLATE =
  "first_name,middle_name,last_name,suffix,lrn\r\nDorothy,Gale,Wright,,123456789012\r\n";

export function TeacherLearnerImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exitCommit = useButtonCommit();
  const importCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const [rows, setRows] = useState<LearnerImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [credentials, setCredentials] = useState<
    ResetLearnerCredentials[] | null
  >(null);
  const teacherSession = session?.staff.role === "teacher" ? session : null;
  const teacher = teacherSession?.staff ?? null;
  const assignmentReady = Boolean(
    teacher?.school && teacher.grade_level && teacher.section,
  );
  const importMutation = useMutation({
    mutationFn: (learners: LearnerImportRow[]) =>
      importTeacherLearners({
        staffUserId: teacher!.id,
        learners,
      }),
    onSuccess: (createdCredentials) => {
      setCredentials(createdCredentials);
      setRows([]);
      setFileName("");
      void queryClient.invalidateQueries({
        queryKey: ["teacher-learners", teacher?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["teacher-overview", teacher?.id],
      });
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

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setCredentials(null);
    importMutation.reset();
    setRows([]);
    setFileError("");
    setFileName(file?.name ?? "");

    if (!file) {
      return;
    }

    try {
      setRows(parseLearnerImportCsv(await file.text()));
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "The CSV could not be read.",
      );
    }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(
      new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "readirect-learner-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
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
          title="Import Learners"
          description="Create up to 100 Learner accounts from one validated CSV. Every account inherits your school, grade, and section."
          badge={<StaffBadge>CSV roster</StaffBadge>}
        />

        {credentials ? (
          <StaffCard tone="success" role="status">
            <StaffSectionHeader
              eyebrow="Import complete"
              title="Save these credentials now"
              description="Passwords are shown only in this confirmation. Print or save them before dismissing it."
            />
            <StaffDataTable
              accessibleLabel="Imported Learner credentials"
              rows={credentials}
              rowKey={(credential) => credential.id}
              columns={[
                {
                  key: "learner",
                  label: "Learner",
                  render: (credential) => (
                    <strong>{credential.full_name}</strong>
                  ),
                },
                {
                  key: "code",
                  label: "Learner Code",
                  render: (credential) => credential.learner_code,
                },
                {
                  key: "password",
                  label: "Temporary password",
                  render: (credential) => credential.temporary_password,
                },
              ]}
            />
            <StaffButton
              tone="secondary"
              size="regular"
              onClick={() => setCredentials(null)}
            >
              Credentials saved
            </StaffButton>
          </StaffCard>
        ) : null}

        <StaffContentGrid className="staff-content-grid--two">
          <StaffCard>
            <StaffSectionHeader
              eyebrow="CSV file"
              title="Select a roster"
              description="Required columns are first_name, middle_name, and last_name. Keep suffix and lrn columns even when their values are blank."
            />
            <div className="staff-form-stack">
              <StaffFileField
                label="Roster CSV"
                accept=".csv,text/csv"
                disabled={!assignmentReady || importMutation.isPending}
                onChange={(event) => void readFile(event)}
              />
              <StaffButton
                tone="quiet"
                size="regular"
                onClick={downloadTemplate}
              >
                Download template
              </StaffButton>
            </div>
            {fileName ? (
              <StaffNotice>
                <span>{fileName}</span>
              </StaffNotice>
            ) : null}
            {fileError ? (
              <StaffNotice tone="danger">
                <span>{fileError}</span>
              </StaffNotice>
            ) : null}
            {importMutation.isError ? (
              <StaffNotice tone="danger">
                <span>{importMutation.error.message}</span>
              </StaffNotice>
            ) : null}
          </StaffCard>

          <StaffCard>
            <StaffSectionHeader
              eyebrow="Validated preview"
              title={
                rows.length
                  ? `${rows.length} Learners ready`
                  : "No roster selected"
              }
              description="The import is all-or-nothing. Invalid rows create no accounts."
            />
            {rows.length ? (
              <StaffDataTable
                accessibleLabel="Validated Learner import preview"
                rows={rows.slice(0, 8).map((row, index) => ({ ...row, index }))}
                rowKey={(row) =>
                  `${row.first_name}-${row.last_name}-${row.index}`
                }
                columns={[
                  {
                    key: "learner",
                    label: "Learner",
                    render: (row) => (
                      <strong>
                        {row.first_name} {row.middle_name} {row.last_name}{" "}
                        {row.suffix}
                      </strong>
                    ),
                  },
                  {
                    key: "lrn",
                    label: "LRN",
                    render: (row) => row.lrn || "No LRN",
                  },
                ]}
              />
            ) : (
              <StaffState
                title="Choose the completed template"
                description="A validated preview will appear before import."
              />
            )}
            <StaffButton
              tone="primary"
              size="roomy"
              disabled={!rows.length || !assignmentReady}
              committing={importCommit.committing}
              busy={importMutation.isPending}
              busyLabel="Importing Learners"
              onClick={() => {
                const validatedRows = [...rows];
                importCommit.commit(() => importMutation.mutate(validatedRows));
              }}
            >
              Import {rows.length || ""} Learners
            </StaffButton>
          </StaffCard>
        </StaffContentGrid>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
