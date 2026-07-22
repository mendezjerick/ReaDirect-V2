import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SpeechCapture } from "../../components/staff/SpeechCapture";
import { SpeechSandboxShell } from "../../components/staff/SpeechSandboxShell";
import { useSystemAdminSpeechSession } from "../../components/staff/useSystemAdminSpeechSession";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  classifyWithNu,
  createEquivalenceRule,
  getSpeechModelStatus,
} from "./speechSandboxApi";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
type ReviewOutcome = "expected_correct" | "expected_wrong" | null;

export function IsoLetterSandboxPage() {
  const staffUserId = useSystemAdminSpeechSession();
  const [expectedLetter, setExpectedLetter] = useState("A");
  const [audio, setAudio] = useState<File | null>(null);
  const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome>(null);
  const [notes, setNotes] = useState("");
  const runCommit = useButtonCommit();
  const saveCommit = useButtonCommit();
  const statusQuery = useQuery({
    queryKey: ["speech-model-status", staffUserId],
    queryFn: () => getSpeechModelStatus(staffUserId as number),
    enabled: staffUserId !== null,
    refetchInterval: (query) =>
      query.state.data?.nu.available ? false : 2_000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
  const classifyMutation = useMutation({
    mutationFn: () =>
      classifyWithNu(staffUserId as number, audio as File, expectedLetter),
    onSuccess: () => setReviewOutcome(null),
  });
  const ruleMutation = useMutation({
    mutationFn: () =>
      createEquivalenceRule(staffUserId as number, {
        rule_type: "letter_alias",
        expected_text: classifyMutation.data?.expected_letter ?? expectedLetter,
        recognized_text: classifyMutation.data?.raw_transcript ?? "",
        scope: "global",
        notes: notes || undefined,
        sandbox_attempt_id: classifyMutation.data?.sandbox_attempt_id,
      }),
  });
  const result = classifyMutation.data;
  const nuAvailable = statusQuery.data?.nu.available === true;
  const nuStatusLabel = nuAvailable
    ? "available"
    : statusQuery.isPending || statusQuery.isFetching
      ? "checking"
      : "unavailable";

  return (
    <SpeechSandboxShell
      eyebrow="Agents and AI"
      title="IsoLetter Sandbox"
      description="Test one isolated A-Z letter through Nu, Mu's strict letter-resolution mode. Words, phrases, and sentences do not belong in this workspace."
      badge={
        <span
          className={`speech-model-badge speech-model-badge--${nuAvailable ? "ready" : "offline"}`}
        >
          Nu {nuStatusLabel}
        </span>
      }
    >
      <div className="speech-sandbox-layout">
        <Surface
          kind="panel"
          padding="normal"
          className="staff-data-card speech-sandbox-input"
        >
          <header className="staff-data-card__header">
            <div>
              <p>Nu input</p>
              <h2>Isolated letter sample</h2>
            </div>
            <span>A-Z only</span>
          </header>

          <label className="speech-sandbox-field">
            <span>Expected letter</span>
            <select
              value={expectedLetter}
              onChange={(event) => {
                setExpectedLetter(event.target.value);
                classifyMutation.reset();
                ruleMutation.reset();
                setReviewOutcome(null);
              }}
            >
              {LETTERS.map((letter) => (
                <option key={letter} value={letter}>
                  {letter}
                </option>
              ))}
            </select>
          </label>

          <SpeechCapture
            audio={audio}
            disabled={classifyMutation.isPending}
            onAudioChange={(file) => {
              setAudio(file);
              classifyMutation.reset();
              ruleMutation.reset();
              setReviewOutcome(null);
            }}
          />

          <BigButton
            className="speech-sandbox-run"
            size="regular"
            disabled={!audio || !nuAvailable}
            busy={classifyMutation.isPending}
            busyLabel="Nu is resolving"
            committing={runCommit.committing}
            onClick={() => runCommit.commit(() => classifyMutation.mutate())}
          >
            Run Nu letter resolution
          </BigButton>
          {classifyMutation.isError ? (
            <p className="speech-sandbox-error" role="alert">
              {classifyMutation.error.message}
            </p>
          ) : null}
        </Surface>

        <Surface
          kind="panel"
          padding="normal"
          className="staff-data-card speech-sandbox-result"
          aria-live="polite"
        >
          <header className="staff-data-card__header">
            <div>
              <p>Nu evidence</p>
              <h2>Mu letter resolution</h2>
            </div>
            {result ? (
              <span>
                {result.performance.total_request_seconds.toFixed(2)} s
              </span>
            ) : null}
          </header>

          {result ? (
            <>
              <div className="speech-result-hero">
                <div>
                  <span>Decision</span>
                  <strong>{result.decision}</strong>
                </div>
                <div>
                  <span>Resolved class</span>
                  <strong>{result.predicted_class}</strong>
                </div>
                <div>
                  <span>Raw Mu transcript</span>
                  <strong>{result.raw_transcript || "No transcript"}</strong>
                </div>
                <div>
                  <span>Normalized alias</span>
                  <strong>{result.normalized_transcript || "None"}</strong>
                </div>
              </div>

              <section className="speech-evidence-section">
                <h3>Resolver evidence</h3>
                <p>
                  <strong>
                    {result.mapping.mapping_source.replaceAll("_", " ")}
                  </strong>
                  {result.mapping.matched_alias
                    ? ` · matched “${result.mapping.matched_alias}”`
                    : " · no safe alias matched"}
                </p>
                {result.mapping.equivalence_rule_ids.length ? (
                  <p>
                    Equivalence rule:{" "}
                    {result.mapping.equivalence_rule_ids.join(", ")}
                  </p>
                ) : null}
                {result.mapping.candidate_letters.length > 1 ? (
                  <p>
                    Approved candidates:{" "}
                    {result.mapping.candidate_letters.join(", ")}
                  </p>
                ) : null}
              </section>

              <section className="speech-evidence-section speech-audio-quality">
                <h3>Audio quality</h3>
                <p>
                  <strong>{result.audio_quality.status}</strong> ·{" "}
                  {result.audio_quality.duration_seconds.toFixed(2)} seconds ·{" "}
                  {result.audio_quality.sample_rate} Hz
                </p>
                {result.audio_quality.warnings.length ? (
                  <p>{result.audio_quality.warnings.join(", ")}</p>
                ) : (
                  <p>No quality warnings.</p>
                )}
              </section>

              <section className="speech-evidence-section">
                <h3>Mu segment evidence</h3>
                {result.segments.length ? (
                  <div className="speech-segment-list">
                    {result.segments.map((segment, index) => (
                      <div key={`${segment.start}-${index}`}>
                        <span>
                          {segment.start.toFixed(2)}-{segment.end.toFixed(2)} s
                        </span>
                        <strong>{segment.text}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No speech segment was returned.</p>
                )}
              </section>

              {result.decision !== "CORRECT" ? (
                <section className="speech-evidence-section speech-review-decision">
                  <h3>Administrator review</h3>
                  <p>
                    Did the speaker actually say {result.expected_letter}{" "}
                    correctly?
                  </p>
                  <div>
                    <BigButton
                      variant={
                        reviewOutcome === "expected_correct"
                          ? "primary"
                          : "secondary"
                      }
                      size="regular"
                      onClick={() => setReviewOutcome("expected_correct")}
                    >
                      Mark spoken letter correct
                    </BigButton>
                    <BigButton
                      variant={
                        reviewOutcome === "expected_wrong"
                          ? "primary"
                          : "secondary"
                      }
                      size="regular"
                      onClick={() => setReviewOutcome("expected_wrong")}
                    >
                      Keep Nu result
                    </BigButton>
                  </div>
                </section>
              ) : null}

              {reviewOutcome === "expected_correct" ? (
                <section className="speech-equivalence-authoring">
                  <h3>Add letter equivalence</h3>
                  <p>
                    Save Mu's complete transcript as a reviewed global alias for{" "}
                    {result.expected_letter}. Future letter items can resolve it
                    without retraining.
                  </p>
                  <label className="speech-sandbox-field">
                    <span>Review notes</span>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </label>
                  <BigButton
                    size="regular"
                    disabled={!result.normalized_transcript}
                    busy={ruleMutation.isPending}
                    busyLabel="Saving letter alias"
                    committing={saveCommit.committing}
                    onClick={() =>
                      saveCommit.commit(() => ruleMutation.mutate())
                    }
                  >
                    Save letter equivalence
                  </BigButton>
                  {!result.normalized_transcript ? (
                    <p className="speech-review-locked">
                      Mu returned no spoken transcript, so there is no safe
                      alias to save.
                    </p>
                  ) : null}
                  {ruleMutation.isSuccess ? (
                    <p className="speech-sandbox-success" role="status">
                      Letter equivalence saved. The next matching attempt will
                      use it.
                    </p>
                  ) : null}
                  {ruleMutation.isError ? (
                    <p className="speech-sandbox-error" role="alert">
                      {ruleMutation.error.message}
                    </p>
                  ) : null}
                </section>
              ) : null}
            </>
          ) : (
            <div className="speech-sandbox-empty">
              <strong>No Nu result yet</strong>
              <p>
                Choose one expected letter, record or upload it, then run Nu.
              </p>
            </div>
          )}
        </Surface>
      </div>
    </SpeechSandboxShell>
  );
}
