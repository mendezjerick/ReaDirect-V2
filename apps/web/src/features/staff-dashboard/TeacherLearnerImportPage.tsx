import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
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
      <div className="staff-workspace-page teacher-import-page">
        <StaffPageHeader
          eyebrow="Class management"
          title="Import Learners"
          description="Create up to 100 Learner accounts from one validated CSV. Every account inherits your school, grade, and section."
          badge={<span className="staff-count-badge">CSV roster</span>}
        />

        {credentials ? (
          <Surface
            kind="notice"
            padding="normal"
            className="teacher-import-credentials"
            role="status"
          >
            <header>
              <p>Import complete</p>
              <h2>Save these credentials now</h2>
              <span>
                Passwords are shown only in this confirmation. Print or save
                them before dismissing it.
              </span>
            </header>
            <div className="teacher-import-credentials__table" role="table">
              {credentials.map((credential) => (
                <div role="row" key={credential.id}>
                  <strong role="cell">{credential.full_name}</strong>
                  <span role="cell">{credential.learner_code}</span>
                  <span role="cell">{credential.temporary_password}</span>
                </div>
              ))}
            </div>
            <BigButton
              variant="secondary"
              size="regular"
              onClick={() => setCredentials(null)}
            >
              Credentials saved
            </BigButton>
          </Surface>
        ) : null}

        <div className="teacher-import-layout">
          <Surface kind="panel" padding="normal">
            <header className="staff-section-header">
              <p>CSV file</p>
              <h2>Select a roster</h2>
              <span>
                Required columns are first_name, middle_name, and last_name.
                Keep suffix and lrn columns even when their values are blank.
              </span>
            </header>
            <div className="teacher-import-controls">
              <label className="teacher-import-file">
                <span>Roster CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={!assignmentReady || importMutation.isPending}
                  onChange={(event) => void readFile(event)}
                />
              </label>
              <BigButton
                variant="quiet"
                size="regular"
                onClick={downloadTemplate}
              >
                Download template
              </BigButton>
            </div>
            {fileName ? (
              <p className="teacher-import-file-name">{fileName}</p>
            ) : null}
            {fileError ? (
              <p className="staff-form-notice--error" role="alert">
                {fileError}
              </p>
            ) : null}
            {importMutation.isError ? (
              <p className="staff-form-notice--error" role="alert">
                {importMutation.error.message}
              </p>
            ) : null}
          </Surface>

          <Surface kind="panel" padding="normal">
            <header className="staff-section-header">
              <p>Validated preview</p>
              <h2>
                {rows.length
                  ? `${rows.length} Learners ready`
                  : "No roster selected"}
              </h2>
              <span>
                The import is all-or-nothing. Invalid rows create no accounts.
              </span>
            </header>
            {rows.length ? (
              <ol className="teacher-import-preview">
                {rows.slice(0, 8).map((row, index) => (
                  <li key={`${row.first_name}-${row.last_name}-${index}`}>
                    <strong>
                      {row.first_name} {row.middle_name} {row.last_name}{" "}
                      {row.suffix}
                    </strong>
                    <span>{row.lrn || "No LRN"}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="staff-empty-state">
                <span aria-hidden="true">CSV</span>
                <div>
                  <strong>Choose the completed template</strong>
                  <p>A validated preview will appear before import.</p>
                </div>
              </div>
            )}
            <BigButton
              className="teacher-import-submit"
              size="regular"
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
            </BigButton>
          </Surface>
        </div>
      </div>
    </StaffShell>
  );
}
