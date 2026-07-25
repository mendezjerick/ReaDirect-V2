import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { teacherNavigationGroups } from "../../components/staff/staffNavigation";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { clearStaffSession, loadStaffSession } from "../staff-auth/staffApi";
import {
  createTeacherAudioReview,
  getTeacherAudioReviews,
  loadTeacherReviewAudio,
  type TeacherAudioReviewItem,
} from "./teacherAudioReviewApi";

type ReviewDecision = "CORRECT" | "INCORRECT" | "UNSCORABLE" | "SKIPPED";

export function TeacherAudioReviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exitCommit = useButtonCommit();
  const saveCommit = useButtonCommit();
  const [session] = useState(loadStaffSession);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewedTranscript, setReviewedTranscript] = useState("");
  const [reviewedDecision, setReviewedDecision] =
    useState<ReviewDecision>("CORRECT");
  const [notes, setNotes] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const teacherSession = session?.staff.role === "teacher" ? session : null;
  const teacher = teacherSession?.staff ?? null;
  const reviewQuery = useQuery({
    queryKey: ["teacher-audio-reviews", teacher?.id],
    queryFn: () => getTeacherAudioReviews(teacher!.id),
    enabled: Boolean(teacher),
  });
  const selectedItem = useMemo(
    () =>
      reviewQuery.data?.items.find((item) => item.id === selectedId) ?? null,
    [reviewQuery.data?.items, selectedId],
  );
  const audioMutation = useMutation({
    mutationFn: (item: TeacherAudioReviewItem) =>
      loadTeacherReviewAudio(item.audio_url),
    onSuccess: (blob) => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(URL.createObjectURL(blob));
    },
  });
  const reviewMutation = useMutation({
    mutationFn: () =>
      createTeacherAudioReview({
        staffUserId: teacher!.id,
        item: selectedItem!,
        reviewedTranscript,
        reviewedDecision,
        notes,
      }),
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({
        queryKey: ["teacher-audio-reviews", teacher?.id],
      });
    },
  });

  useEffect(
    () => () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    },
    [audioUrl],
  );

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

  const selectItem = (item: TeacherAudioReviewItem) => {
    setSelectedId(item.id);
    setReviewedTranscript(
      item.latest_review?.reviewed_transcript ?? item.original_transcript ?? "",
    );
    setReviewedDecision(
      item.latest_review?.reviewed_decision ??
        (["CORRECT", "INCORRECT", "UNSCORABLE", "SKIPPED"].includes(
          item.original_decision ?? "",
        )
          ? (item.original_decision as ReviewDecision)
          : "CORRECT"),
    );
    setNotes(item.latest_review?.notes ?? "");
    setSaved(false);
    reviewMutation.reset();
    audioMutation.reset();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
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
      <div className="staff-workspace-page teacher-audio-review-page">
        <StaffPageHeader
          eyebrow="Assessment review"
          title="Audio Review"
          description="Listen to saved assigned-Learner recordings and add an audited staff-only review without changing learner-flow evidence or scores."
          badge={
            <span className="staff-count-badge">
              {reviewQuery.data?.summary.pending ?? 0} pending
            </span>
          }
        />

        <Surface
          kind="notice"
          padding="compact"
          className="teacher-audio-review-boundary"
        >
          <strong>Canonical learner data is protected.</strong>
          <span>
            A saved review is a separate staff annotation. It never overwrites
            the original transcript, decision, score, progression, or Learner
            experience.
          </span>
        </Surface>

        <div className="teacher-audio-review-layout">
          <Surface kind="panel" padding="none">
            <header className="staff-section-header staff-section-header--list">
              <div>
                <p>Saved recordings</p>
                <h2>Review queue</h2>
              </div>
              <span>{reviewQuery.data?.summary.recordings ?? 0} total</span>
            </header>
            {reviewQuery.isLoading ? (
              <div className="staff-account-list-state">
                Loading recordings…
              </div>
            ) : null}
            {reviewQuery.isError ? (
              <div className="staff-account-list-state" role="alert">
                Recordings could not be loaded.
              </div>
            ) : null}
            {reviewQuery.data?.items.length === 0 ? (
              <div className="staff-empty-state">
                <span aria-hidden="true">0</span>
                <div>
                  <strong>No saved recordings</strong>
                  <p>Recorded assessment and lesson items will appear here.</p>
                </div>
              </div>
            ) : null}
            <div className="teacher-audio-review-list">
              {reviewQuery.data?.items.map((item) => (
                <button
                  type="button"
                  className={item.id === selectedId ? "is-selected" : undefined}
                  aria-pressed={item.id === selectedId}
                  onClick={() => selectItem(item)}
                  key={item.id}
                >
                  <span>
                    <strong>{item.learner.full_name}</strong>
                    <small>{item.learner.learner_code}</small>
                  </span>
                  <span>
                    <strong>{item.source_title}</strong>
                    <small>{item.item_key}</small>
                  </span>
                  <em>{item.latest_review ? "Reviewed" : "Pending"}</em>
                </button>
              ))}
            </div>
          </Surface>

          <Surface kind="panel" padding="normal">
            {selectedItem ? (
              <div className="teacher-audio-review-editor">
                <header className="staff-section-header">
                  <p>{selectedItem.source_title}</p>
                  <h2>{selectedItem.learner.full_name}</h2>
                  <span>
                    {selectedItem.group_key} · {selectedItem.item_key}
                  </span>
                </header>

                <dl className="teacher-audio-review-original">
                  <div>
                    <dt>Canonical transcript</dt>
                    <dd>
                      {selectedItem.original_transcript ?? "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt>Canonical decision</dt>
                    <dd>{selectedItem.original_decision ?? "Not available"}</dd>
                  </div>
                </dl>

                <div className="teacher-audio-review-player">
                  <BigButton
                    variant="secondary"
                    size="regular"
                    busy={audioMutation.isPending}
                    busyLabel="Loading recording"
                    onClick={() => audioMutation.mutate(selectedItem)}
                  >
                    Load secure recording
                  </BigButton>
                  {audioUrl ? (
                    <audio controls autoPlay src={audioUrl}>
                      Your browser does not support audio playback.
                    </audio>
                  ) : null}
                  {audioMutation.isError ? (
                    <p role="alert">{audioMutation.error.message}</p>
                  ) : null}
                </div>

                <label className="teacher-audio-review-field">
                  <span>Reviewed transcript</span>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={reviewedTranscript}
                    onChange={(event) =>
                      setReviewedTranscript(event.target.value)
                    }
                  />
                </label>
                <label className="teacher-audio-review-field">
                  <span>Reviewed decision</span>
                  <select
                    value={reviewedDecision}
                    onChange={(event) =>
                      setReviewedDecision(event.target.value as ReviewDecision)
                    }
                  >
                    <option value="CORRECT">Correct</option>
                    <option value="INCORRECT">Incorrect</option>
                    <option value="UNSCORABLE">Unscorable</option>
                    <option value="SKIPPED">Skipped</option>
                  </select>
                </label>
                <label className="teacher-audio-review-field">
                  <span>Review note (optional)</span>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
                {saved ? (
                  <p className="teacher-audio-review-success" role="status">
                    Staff review saved. Canonical learner records were not
                    changed.
                  </p>
                ) : null}
                {reviewMutation.isError ? (
                  <p className="staff-form-notice--error" role="alert">
                    {reviewMutation.error.message}
                  </p>
                ) : null}
                <BigButton
                  className="teacher-audio-review-save"
                  size="regular"
                  disabled={!reviewedTranscript.trim()}
                  committing={saveCommit.committing}
                  busy={reviewMutation.isPending}
                  busyLabel="Saving review"
                  onClick={() =>
                    saveCommit.commit(() => reviewMutation.mutate())
                  }
                >
                  Save staff-only review
                </BigButton>
              </div>
            ) : (
              <div className="staff-empty-state">
                <span aria-hidden="true">▶</span>
                <div>
                  <strong>Select a recording</strong>
                  <p>
                    Canonical evidence and review controls will appear here.
                  </p>
                </div>
              </div>
            )}
          </Surface>
        </div>
      </div>
    </StaffShell>
  );
}
