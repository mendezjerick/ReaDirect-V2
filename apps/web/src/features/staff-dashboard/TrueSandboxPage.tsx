import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SpeechCapture } from "../../components/staff/SpeechCapture";
import { SpeechSandboxShell } from "../../components/staff/SpeechSandboxShell";
import { useSystemAdminSpeechSession } from "../../components/staff/useSystemAdminSpeechSession";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  createEquivalenceRule,
  getSpeechContentCatalog,
  getSpeechModelStatus,
  transcribeWithMu,
} from "./speechSandboxApi";

type ReviewOutcome = "expected_correct" | "expected_wrong" | null;

export function TrueSandboxPage() {
  const staffUserId = useSystemAdminSpeechSession();
  const [expectedText, setExpectedText] = useState("");
  const [taskType, setTaskType] = useState("word");
  const [selectedContentId, setSelectedContentId] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome>(null);
  const [ruleType, setRuleType] = useState("accepted_variant");
  const [scope, setScope] = useState("global");
  const [itemKey, setItemKey] = useState("");
  const [notes, setNotes] = useState("");
  const runCommit = useButtonCommit();
  const saveCommit = useButtonCommit();
  const statusQuery = useQuery({
    queryKey: ["speech-model-status", staffUserId],
    queryFn: () => getSpeechModelStatus(staffUserId as number),
    enabled: staffUserId !== null,
  });
  const catalogQuery = useQuery({
    queryKey: ["speech-content-catalog", staffUserId],
    queryFn: () => getSpeechContentCatalog(staffUserId as number),
    enabled: staffUserId !== null,
  });
  const transcribeMutation = useMutation({
    mutationFn: () =>
      transcribeWithMu(
        staffUserId as number,
        audio as File,
        expectedText,
        taskType,
        itemKey || undefined,
      ),
    onSuccess: () => setReviewOutcome(null),
  });
  const ruleMutation = useMutation({
    mutationFn: () =>
      createEquivalenceRule(staffUserId as number, {
        rule_type: ruleType,
        expected_text: transcribeMutation.data?.expected_text ?? expectedText,
        recognized_text: transcribeMutation.data?.raw_transcript ?? "",
        scope,
        item_key: scope === "item" ? itemKey : undefined,
        notes: notes || undefined,
        sandbox_attempt_id: transcribeMutation.data?.sandbox_attempt_id,
      }),
  });
  const result = transcribeMutation.data;
  const selectedItem = catalogQuery.data?.groups
    .flatMap((group) => group.items)
    .find((item) => item.content_id === selectedContentId);

  const resetResult = () => {
    setAudio(null);
    setReviewOutcome(null);
    transcribeMutation.reset();
    ruleMutation.reset();
  };

  return (
    <SpeechSandboxShell
      eyebrow="Agents and AI"
      title="True Sandbox"
      description="Inspect Mu's raw transcription evidence, compare it with expected reading text, and author reviewed Equivalence Book rules."
      badge={
        <span
          className={`speech-model-badge speech-model-badge--${statusQuery.data?.mu.available ? "ready" : "offline"}`}
        >
          Mu {statusQuery.data?.mu.available ? "available" : "unavailable"}
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
              <p>Mu input</p>
              <h2>Reading sample</h2>
            </div>
            <span>{catalogQuery.data?.summary.total_items ?? 0} items</span>
          </header>

          <label className="speech-sandbox-field">
            <span>Assessment or lesson item</span>
            <select
              value={selectedContentId}
              onChange={(event) => {
                const contentId = event.target.value;
                setSelectedContentId(contentId);
                const item = catalogQuery.data?.groups
                  .flatMap((group) => group.items)
                  .find((candidate) => candidate.content_id === contentId);

                if (item) {
                  setExpectedText(item.expected_text);
                  setTaskType(item.task_type);
                  setItemKey(item.content_id);
                  setScope("item");
                } else {
                  setItemKey("");
                  setScope("global");
                }
                resetResult();
              }}
              disabled={catalogQuery.isPending || catalogQuery.isError}
            >
              <option value="">Custom expected text</option>
              {catalogQuery.data?.groups.map((group) => (
                <optgroup key={group.key} label={group.label}>
                  {group.items.map((item) => (
                    <option key={item.content_id} value={item.content_id}>
                      {item.display_text}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          {catalogQuery.isError ? (
            <p className="speech-sandbox-error" role="alert">
              {catalogQuery.error.message}
            </p>
          ) : null}
          {selectedItem ? (
            <p className="speech-content-selection-note">
              Exact authored target · {selectedItem.content_id}
            </p>
          ) : (
            <p className="speech-content-selection-note">
              Letters stay in IsoLetter. Rhyme choices and assessment
              comprehension questions are intentionally excluded.
            </p>
          )}

          <div className="speech-sandbox-field-row">
            <label className="speech-sandbox-field">
              <span>Reading type</span>
              <select
                value={taskType}
                onChange={(event) => setTaskType(event.target.value)}
                disabled={Boolean(selectedItem)}
              >
                <option value="word">Word</option>
                <option value="phrase">Phrase</option>
                <option value="sentence">Sentence</option>
                <option value="passage">Passage</option>
                <option value="comprehension">Comprehension answer</option>
                <option value="free_speech">Free speech</option>
              </select>
            </label>
          </div>
          <label className="speech-sandbox-field">
            <span>Expected text</span>
            <textarea
              rows={5}
              value={expectedText}
              onChange={(event) => setExpectedText(event.target.value)}
              readOnly={Boolean(selectedItem)}
              placeholder="Type the exact expected word, phrase, sentence, passage, or answer."
            />
          </label>

          <SpeechCapture
            audio={audio}
            disabled={transcribeMutation.isPending}
            onAudioChange={(file) => {
              setAudio(file);
              transcribeMutation.reset();
              ruleMutation.reset();
              setReviewOutcome(null);
            }}
          />

          <BigButton
            className="speech-sandbox-run"
            size="regular"
            disabled={
              !audio || !expectedText.trim() || !statusQuery.data?.mu.available
            }
            busy={transcribeMutation.isPending}
            busyLabel="Mu is transcribing"
            committing={runCommit.committing}
            onClick={() => runCommit.commit(() => transcribeMutation.mutate())}
          >
            Run Mu transcription
          </BigButton>
          {transcribeMutation.isError ? (
            <p className="speech-sandbox-error" role="alert">
              {transcribeMutation.error.message}
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
              <p>Mu evidence</p>
              <h2>Transcript review</h2>
            </div>
            {result ? (
              <span>
                {result.performance.total_request_seconds.toFixed(2)} s
              </span>
            ) : null}
          </header>

          {result ? (
            <>
              <div className="speech-transcript-pair">
                <div>
                  <span>Expected</span>
                  <p>{result.expected_text}</p>
                </div>
                <div>
                  <span>Raw Mu transcript</span>
                  <p>{result.raw_transcript || "No speech transcribed"}</p>
                </div>
              </div>

              <section className="speech-evidence-section speech-audio-quality">
                <h3>Conditional Mu noise reduction</h3>
                <p>
                  <strong>
                    {result.noise_reduction.enabled ? "Enabled" : "Disabled"}
                  </strong>{" "}
                  · {result.noise_reduction.reason.replaceAll("_", " ")}
                </p>
                {result.noise_reduction.enhanced ? (
                  <p>
                    Second-pass transcript:{" "}
                    {result.noise_reduction.enhanced.raw_transcript ||
                      "No speech transcribed"}
                  </p>
                ) : null}
                {result.noise_reduction.requires_retry ? (
                  <p>
                    The two passes disagree. Keep the original evidence and
                    retry or review this sample.
                  </p>
                ) : null}
              </section>

              <section className="speech-evidence-section">
                <h3>Word comparison</h3>
                <div className="speech-difference-list">
                  {result.comparison.differences.map((difference, index) => (
                    <span
                      className={`speech-difference speech-difference--${difference.status}`}
                      key={`${difference.status}-${index}`}
                    >
                      {difference.expected || "∅"} →{" "}
                      {difference.recognized || "∅"}
                    </span>
                  ))}
                </div>
                <p className="speech-comparison-summary">
                  {result.comparison.matched_word_count} of{" "}
                  {result.comparison.expected_word_count} expected words aligned
                  exactly.
                </p>
                {result.equivalence_resolution?.equivalent_word_count ? (
                  <p className="speech-comparison-summary">
                    {result.equivalence_resolution.equivalent_word_count} word
                    {result.equivalence_resolution.equivalent_word_count === 1
                      ? ""
                      : "s"}{" "}
                    accepted through item-scoped Equivalence Book rules.
                  </p>
                ) : null}
              </section>

              <section className="speech-evidence-section">
                <h3>Segment evidence</h3>
                <div className="speech-segment-list">
                  {result.segments.map((segment, index) => (
                    <div key={`${segment.start}-${index}`}>
                      <span>
                        {segment.start.toFixed(2)}–{segment.end.toFixed(2)} s
                      </span>
                      <strong>{segment.text}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="speech-evidence-section speech-review-decision">
                <h3>Administrator review</h3>
                <p>Was the learner's spoken response actually correct?</p>
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
                    Expected correct
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
                    Expected wrong
                  </BigButton>
                </div>
              </section>

              {reviewOutcome === "expected_correct" &&
              !result.comparison.exact_match ? (
                <section className="speech-equivalence-authoring">
                  <h3>Create Equivalence Book rule</h3>
                  <p>
                    Only this expected-correct review can authorize an accepted
                    transcript difference.
                  </p>
                  <div className="speech-sandbox-field-row">
                    <label className="speech-sandbox-field">
                      <span>Rule type</span>
                      <select
                        value={ruleType}
                        onChange={(event) => setRuleType(event.target.value)}
                      >
                        <option value="accepted_variant">
                          Accepted variant
                        </option>
                        <option value="homophone">Homophone</option>
                        <option value="punctuation">Punctuation</option>
                        <option value="contraction">Contraction</option>
                        <option value="spelling_variant">
                          Spelling variant
                        </option>
                        <option value="accent_safe_variant">
                          Accent-safe variant
                        </option>
                      </select>
                    </label>
                    <label className="speech-sandbox-field">
                      <span>Scope</span>
                      <select
                        value={scope}
                        onChange={(event) => setScope(event.target.value)}
                      >
                        <option value="global">Global</option>
                        <option value="item">Item only</option>
                      </select>
                    </label>
                  </div>
                  {scope === "item" ? (
                    <label className="speech-sandbox-field">
                      <span>Item key</span>
                      <input
                        value={itemKey}
                        onChange={(event) => setItemKey(event.target.value)}
                        placeholder="assessment-v1-task-2b-01"
                      />
                    </label>
                  ) : null}
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
                    disabled={scope === "item" && !itemKey.trim()}
                    busy={ruleMutation.isPending}
                    busyLabel="Saving rule"
                    committing={saveCommit.committing}
                    onClick={() =>
                      saveCommit.commit(() => ruleMutation.mutate())
                    }
                  >
                    Save reviewed rule
                  </BigButton>
                  {ruleMutation.isSuccess ? (
                    <p className="speech-sandbox-success" role="status">
                      Equivalence Book rule saved.
                    </p>
                  ) : null}
                  {ruleMutation.isError ? (
                    <p className="speech-sandbox-error" role="alert">
                      {ruleMutation.error.message}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {reviewOutcome === "expected_wrong" ? (
                <p className="speech-review-locked">
                  Equivalence authoring is disabled because this sample was
                  marked expected-wrong.
                </p>
              ) : null}
            </>
          ) : (
            <div className="speech-sandbox-empty">
              <strong>No Mu result yet</strong>
              <p>
                Provide expected text and audio, then run Mu to inspect the raw
                evidence.
              </p>
            </div>
          )}
        </Surface>
      </div>
    </SpeechSandboxShell>
  );
}
