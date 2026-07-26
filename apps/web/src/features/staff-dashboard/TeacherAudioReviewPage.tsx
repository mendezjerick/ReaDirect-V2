import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import {
  StaffContentGrid,
  StaffFactGrid,
  StaffSelectionButton,
  StaffSelectionList,
  StaffWorkspacePage,
} from "../../components/staff/StaffContentPatterns";
import {
  StaffSelectControl,
  StaffTextAreaField,
} from "../../components/staff/StaffFormControls";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
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
      <StaffWorkspacePage>
        <StaffPageHeader
          eyebrow="Assessment review"
          title="Audio Review"
          description="Listen to saved assigned-Learner recordings and add an audited staff-only review without changing learner-flow evidence or scores."
          badge={
            <StaffBadge tone="warning">
              {reviewQuery.data?.summary.pending ?? 0} pending
            </StaffBadge>
          }
        />

        <StaffNotice
          tone="warning"
          title="Canonical learner data is protected."
        >
          <span>
            A saved review is a separate staff annotation. It never overwrites
            the original transcript, decision, score, progression, or Learner
            experience.
          </span>
        </StaffNotice>

        <StaffContentGrid className="staff-content-grid--sidebar">
          <StaffCard padding="none">
            <StaffSectionHeader
              bordered
              eyebrow="Saved recordings"
              title="Review queue"
              meta={
                <StaffBadge>
                  {reviewQuery.data?.summary.recordings ?? 0} total
                </StaffBadge>
              }
            />
            {reviewQuery.isLoading ? (
              <StaffState title="Loading recordings…" />
            ) : null}
            {reviewQuery.isError ? (
              <StaffState
                tone="danger"
                role="alert"
                title="Recordings could not be loaded."
              />
            ) : null}
            {reviewQuery.data?.items.length === 0 ? (
              <StaffState
                title="No saved recordings"
                description="Recorded assessment and lesson items will appear here."
              />
            ) : null}
            <StaffSelectionList>
              {reviewQuery.data?.items.map((item) => (
                <StaffSelectionButton
                  selected={item.id === selectedId}
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
                  <StaffBadge tone={item.latest_review ? "success" : "warning"}>
                    {item.latest_review ? "Reviewed" : "Pending"}
                  </StaffBadge>
                </StaffSelectionButton>
              ))}
            </StaffSelectionList>
          </StaffCard>

          <StaffCard>
            {selectedItem ? (
              <div className="staff-form-stack staff-form-stack--flush">
                <StaffSectionHeader
                  eyebrow={selectedItem.source_title}
                  title={selectedItem.learner.full_name}
                  description={
                    <>
                      {selectedItem.group_key} · {selectedItem.item_key}
                    </>
                  }
                />

                <StaffFactGrid
                  facts={[
                    {
                      label: "Canonical transcript",
                      value:
                        selectedItem.original_transcript ?? "Not available",
                    },
                    {
                      label: "Canonical decision",
                      value: selectedItem.original_decision ?? "Not available",
                    },
                  ]}
                />

                <div className="staff-audio-player">
                  <StaffButton
                    tone="secondary"
                    size="regular"
                    busy={audioMutation.isPending}
                    busyLabel="Loading recording"
                    onClick={() => audioMutation.mutate(selectedItem)}
                  >
                    Load secure recording
                  </StaffButton>
                  {audioUrl ? (
                    <audio controls autoPlay src={audioUrl}>
                      Your browser does not support audio playback.
                    </audio>
                  ) : null}
                  {audioMutation.isError ? (
                    <p role="alert">{audioMutation.error.message}</p>
                  ) : null}
                </div>

                <StaffTextAreaField
                  label="Reviewed transcript"
                  rows={3}
                  maxLength={500}
                  value={reviewedTranscript}
                  onChange={(event) =>
                    setReviewedTranscript(event.target.value)
                  }
                />
                <StaffSelectControl
                  label="Reviewed decision"
                  value={reviewedDecision}
                  onChange={(event) =>
                    setReviewedDecision(event.target.value as ReviewDecision)
                  }
                >
                  <option value="CORRECT">Correct</option>
                  <option value="INCORRECT">Incorrect</option>
                  <option value="UNSCORABLE">Unscorable</option>
                  <option value="SKIPPED">Skipped</option>
                </StaffSelectControl>
                <StaffTextAreaField
                  label="Review note (optional)"
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                {saved ? (
                  <StaffNotice tone="success" role="status">
                    <span>
                      Staff review saved. Canonical learner records were not
                      changed.
                    </span>
                  </StaffNotice>
                ) : null}
                {reviewMutation.isError ? (
                  <StaffNotice tone="danger">
                    <span>{reviewMutation.error.message}</span>
                  </StaffNotice>
                ) : null}
                <StaffButton
                  tone="primary"
                  size="roomy"
                  disabled={!reviewedTranscript.trim()}
                  committing={saveCommit.committing}
                  busy={reviewMutation.isPending}
                  busyLabel="Saving review"
                  onClick={() =>
                    saveCommit.commit(() => reviewMutation.mutate())
                  }
                >
                  Save staff-only review
                </StaffButton>
              </div>
            ) : (
              <StaffState
                title="Select a recording"
                description="Canonical evidence and review controls will appear here."
              />
            )}
          </StaffCard>
        </StaffContentGrid>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
