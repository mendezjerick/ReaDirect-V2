import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  SpeechSandboxShell,
  useSystemAdminSpeechSession,
} from "../../components/staff/SpeechSandboxShell";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  getEquivalenceBook,
  updateEquivalenceRuleStatus,
} from "./speechSandboxApi";

function readableRuleType(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function EquivalenceBookPage() {
  const staffUserId = useSystemAdminSpeechSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [ruleType, setRuleType] = useState("all");
  const [status, setStatus] = useState("all");
  const [pendingRuleId, setPendingRuleId] = useState<number | null>(null);
  const toggleCommit = useButtonCommit();
  const rulesQuery = useQuery({
    queryKey: ["equivalence-book", staffUserId],
    queryFn: () => getEquivalenceBook(staffUserId as number),
    enabled: staffUserId !== null,
  });
  const updateMutation = useMutation({
    mutationFn: (input: { ruleId: number; isActive: boolean }) =>
      updateEquivalenceRuleStatus(
        staffUserId as number,
        input.ruleId,
        input.isActive,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["equivalence-book", staffUserId],
      }),
    onSettled: () => setPendingRuleId(null),
  });

  const availableTypes = useMemo(
    () =>
      Array.from(
        new Set((rulesQuery.data?.rules ?? []).map((rule) => rule.rule_type)),
      ).sort(),
    [rulesQuery.data?.rules],
  );
  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (rulesQuery.data?.rules ?? []).filter((rule) => {
      const matchesText =
        !query ||
        rule.expected_text.toLowerCase().includes(query) ||
        rule.recognized_text.toLowerCase().includes(query) ||
        rule.item_key?.toLowerCase().includes(query);
      const matchesType = ruleType === "all" || rule.rule_type === ruleType;
      const matchesStatus =
        status === "all" ||
        (status === "active" ? rule.is_active : !rule.is_active);

      return matchesText && matchesType && matchesStatus;
    });
  }, [ruleType, rulesQuery.data?.rules, search, status]);

  const summary = rulesQuery.data?.summary;

  return (
    <SpeechSandboxShell
      eyebrow="Agents and AI"
      title="Equivalence Book"
      description="Review the transcript mappings approved through IsoLetter and True Sandbox, and control which rules are active."
      sessionPurpose="the Equivalence Book"
      badge={
        <span className="staff-environment-badge">
          {summary?.active ?? 0} active
        </span>
      }
    >
      <div className="equivalence-summary" aria-label="Equivalence summary">
        <Surface kind="panel" padding="normal">
          <span>Total rules</span>
          <strong>{summary?.total ?? 0}</strong>
        </Surface>
        <Surface kind="panel" padding="normal">
          <span>Active</span>
          <strong>{summary?.active ?? 0}</strong>
        </Surface>
        <Surface kind="panel" padding="normal">
          <span>Inactive</span>
          <strong>{summary?.inactive ?? 0}</strong>
        </Surface>
      </div>

      <Surface
        kind="panel"
        padding="normal"
        className="staff-data-card equivalence-workspace"
      >
        <header className="staff-data-card__header">
          <div>
            <p>Reviewed mappings</p>
            <h2>Approved transcript equivalences</h2>
          </div>
          <span>{filteredRules.length} shown</span>
        </header>

        <div className="equivalence-filters">
          <label className="speech-sandbox-field">
            <span>Search rules</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Expected text, Mu transcript, or item key"
            />
          </label>
          <label className="speech-sandbox-field">
            <span>Rule type</span>
            <select
              value={ruleType}
              onChange={(event) => setRuleType(event.target.value)}
            >
              <option value="all">All types</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {readableRuleType(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="speech-sandbox-field">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        {rulesQuery.isError ? (
          <p className="speech-sandbox-error" role="alert">
            {rulesQuery.error.message}
          </p>
        ) : null}

        {rulesQuery.isPending ? (
          <div className="speech-sandbox-empty" aria-busy="true">
            <strong>Opening the Equivalence Book</strong>
            <p>Loading reviewed rules.</p>
          </div>
        ) : filteredRules.length ? (
          <div className="equivalence-table-scroll">
            <table className="equivalence-table">
              <caption className="visually-hidden">
                Approved transcript equivalence rules
              </caption>
              <thead>
                <tr>
                  <th scope="col">Expected</th>
                  <th scope="col">Mu recognized</th>
                  <th scope="col">Type</th>
                  <th scope="col">Scope</th>
                  <th scope="col">Status</th>
                  <th scope="col">Added by</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr
                    className={
                      rule.is_active ? "" : "equivalence-table__row--inactive"
                    }
                    key={rule.id}
                    title={rule.notes ?? undefined}
                  >
                    <td>
                      <strong>{rule.expected_text}</strong>
                    </td>
                    <td>
                      <strong>{rule.recognized_text}</strong>
                    </td>
                    <td>{readableRuleType(rule.rule_type)}</td>
                    <td>
                      {rule.scope === "global" ? "Global" : rule.item_key}
                    </td>
                    <td>
                      <span
                        className={`equivalence-table__status equivalence-table__status--${rule.is_active ? "active" : "inactive"}`}
                      >
                        {rule.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <span className="equivalence-table__author">
                        <strong>{rule.created_by}</strong>
                        <small>{formatDate(rule.created_at)}</small>
                      </span>
                    </td>
                    <td>
                      <BigButton
                        className="equivalence-table__action"
                        variant="secondary"
                        size="regular"
                        busy={
                          updateMutation.isPending && pendingRuleId === rule.id
                        }
                        busyLabel={rule.is_active ? "Disabling" : "Enabling"}
                        committing={
                          toggleCommit.committing && pendingRuleId === rule.id
                        }
                        onClick={() => {
                          setPendingRuleId(rule.id);
                          toggleCommit.commit(() =>
                            updateMutation.mutate({
                              ruleId: rule.id,
                              isActive: !rule.is_active,
                            }),
                          );
                        }}
                      >
                        {rule.is_active ? "Disable rule" : "Enable rule"}
                      </BigButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="speech-sandbox-empty">
            <strong>No matching rules</strong>
            <p>
              Rules appear here after an expected-correct review is saved from
              IsoLetter or True Sandbox.
            </p>
          </div>
        )}
      </Surface>
    </SpeechSandboxShell>
  );
}
